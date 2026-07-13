from __future__ import annotations

import json
import hmac
import io
import os
import secrets
import sqlite3
import time
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any

import requests
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image, UnidentifiedImageError
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env.local")
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
BACKUP_DIR = DATA_DIR / "backups"
DB_PATH = DATA_DIR / "records.sqlite3"
SLICER_URL = os.getenv("SLICER_URL", "http://127.0.0.1:18901")
MODEL_PATH = Path(os.getenv("MODEL_PATH", r"D:\dental_ai_system\models\current_model.pt"))
MODEL_DIR = MODEL_PATH.parent
active_model_path = MODEL_PATH
ALLOW_MOCK = os.getenv("ALLOW_MOCK", "0") == "1"
API_TOKEN = os.getenv("API_TOKEN", "")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "dentex-admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
LOCAL_TRUSTED_MODE = os.getenv("LOCAL_TRUSTED_MODE", "0") == "1"
ENABLE_SLICER_BRIDGE = os.getenv("ENABLE_SLICER_BRIDGE", "0") == "1"
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))
BACKUP_INTERVAL_SECONDS = int(os.getenv("BACKUP_INTERVAL_SECONDS", "300"))
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", str(8 * 60 * 60)))
last_backup_at = 0.0

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Tooth AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS",
        "http://127.0.0.1:8765,http://localhost:8765,https://astounding-cascaron-273497.netlify.app,https://jack3712222.github.io",
    ).split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


@app.middleware("http")
async def allow_private_network_access(request, call_next):
    """Allow the HTTPS dashboard to call a loopback-only local API."""
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        create table if not exists records (
            id text primary key,
            created_at real not null,
            image_name text not null,
            image_type text not null,
            image_size integer not null,
            image_path text not null,
            prediction text not null,
            confidence real not null,
            inference_ms real not null,
            boxes_json text not null,
            slicer_json text not null,
            review_status text not null default 'pending',
            review_note text not null default '',
            manual_findings_json text not null default '{}',
            reviewed_at real,
            reviewed_by text
        )
        """
    )
    # Existing local databases predate the review fields. SQLite needs an
    # explicit migration for those installations.
    existing_columns = {column[1] for column in conn.execute("pragma table_info(records)").fetchall()}
    migrations = {
        "review_status": "alter table records add column review_status text not null default 'pending'",
        "review_note": "alter table records add column review_note text not null default ''",
        "manual_findings_json": "alter table records add column manual_findings_json text not null default '{}'",
        "reviewed_at": "alter table records add column reviewed_at real",
        "reviewed_by": "alter table records add column reviewed_by text",
    }
    for name, statement in migrations.items():
        if name not in existing_columns:
            conn.execute(statement)
    conn.execute(
        """
        create table if not exists sessions (
            token_hash text primary key,
            username text not null,
            expires_at real not null,
            created_at real not null
        )
        """
    )
    conn.execute(
        """
        create table if not exists audit_log (
            id text primary key,
            created_at real not null,
            username text not null,
            action text not null,
            record_id text
        )
        """
    )
    return conn


def hash_token(token: str) -> str:
    import hashlib
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def log_audit(username: str, action: str, record_id: str | None = None) -> None:
    with db() as conn:
        conn.execute("insert into audit_log values (?, ?, ?, ?, ?)", (uuid.uuid4().hex, time.time(), username, action, record_id))


def require_editor(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="editor authentication required")
    token_hash = hash_token(authorization.removeprefix("Bearer ").strip())
    with db() as conn:
        row = conn.execute("select username, expires_at from sessions where token_hash = ?", (token_hash,)).fetchone()
        conn.execute("delete from sessions where expires_at < ?", (time.time(),))
    if row is None or row["expires_at"] < time.time():
        raise HTTPException(status_code=401, detail="editor session expired")
    return str(row["username"])


def optional_editor(authorization: str | None = Header(default=None)) -> str | None:
    if not authorization:
        return None
    return require_editor(authorization)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=256)


class RecordReviewUpdate(BaseModel):
    cavity_count: int = Field(ge=0, le=50)
    wisdom_tooth_count: int = Field(ge=0, le=50)
    review_status: str = Field(pattern="^(pending|reviewed|needs_follow_up)$")
    note: str = Field(default="", max_length=800)


class ModelSelection(BaseModel):
    model: str = Field(pattern=r"^[A-Za-z0-9_.-]+\.pt$")


def normalized_detection_class(value: Any) -> str:
    normalized = str(value or "").strip().lower().replace(" ", "_").replace("-", "_")
    if normalized in {"wisdom_tooth", "impacted_wisdom_tooth", "wisdom", "阻生智齒", "智齒阻生", "阻升智齒"}:
        return "wisdom_tooth"
    return "cavity"


def findings_from_boxes(boxes: list[dict[str, Any]]) -> dict[str, Any]:
    findings = {
        "cavity": {"label": "蛀牙", "count": 0, "max_confidence": 0.0},
        "wisdom_tooth": {"label": "阻生智齒", "count": 0, "max_confidence": 0.0},
    }
    for box in boxes:
        key = normalized_detection_class(box.get("class") or box.get("label") or box.get("name") or box.get("class_name"))
        confidence = float(box.get("confidence") or 0)
        findings[key]["count"] += 1
        findings[key]["max_confidence"] = max(float(findings[key]["max_confidence"]), confidence)
    total = int(findings["cavity"]["count"]) + int(findings["wisdom_tooth"]["count"])
    return {"total": total, "classes": findings}


def create_backup_if_due() -> None:
    global last_backup_at
    now = time.time()
    if now - last_backup_at < BACKUP_INTERVAL_SECONDS or not DB_PATH.exists():
        return
    stamp = time.strftime("%Y%m%d-%H%M%S")
    target = BACKUP_DIR / f"records-{stamp}.sqlite3"
    if target.exists():
        target = BACKUP_DIR / f"records-{stamp}-{uuid.uuid4().hex[:6]}.sqlite3"
    with sqlite3.connect(DB_PATH) as source, sqlite3.connect(target) as destination:
        source.backup(destination)
    backups = sorted(BACKUP_DIR.glob("records-*.sqlite3"), key=lambda path: path.stat().st_mtime, reverse=True)
    for old_backup in backups[20:]:
        old_backup.unlink(missing_ok=True)
    last_backup_at = now


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    item.pop("image_path", None)
    item["boxes"] = json.loads(item.pop("boxes_json"))
    item["slicer"] = json.loads(item.pop("slicer_json"))
    item["model_findings"] = findings_from_boxes(item["boxes"])
    try:
        manual_findings = json.loads(item.pop("manual_findings_json", "{}"))
    except json.JSONDecodeError:
        manual_findings = {}
    item["manual_findings"] = manual_findings if isinstance(manual_findings, dict) else {}
    item["findings"] = item["manual_findings"] or item["model_findings"]
    return item


def validated_image(content: bytes) -> tuple[str, str]:
    if not content:
        raise HTTPException(status_code=400, detail="empty upload")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    try:
        image = Image.open(io.BytesIO(content))
        image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=415, detail="invalid image file") from exc
    image_type = Image.open(io.BytesIO(content)).format or ""
    formats = {"JPEG": (".jpg", "image/jpeg"), "PNG": (".png", "image/png"), "WEBP": (".webp", "image/webp"), "BMP": (".bmp", "image/bmp")}
    if image_type not in formats:
        raise HTTPException(status_code=415, detail="unsupported image format")
    return formats[image_type]


def call_slicer(image_path: Path) -> dict[str, Any]:
    try:
        response = requests.post(
            f"{SLICER_URL}/load-image",
            json={"path": str(image_path)},
            timeout=3,
        )
        response.raise_for_status()
        return {"connected": True, "response": response.json()}
    except requests.RequestException as exc:
        return {"connected": False, "error": str(exc)}


@lru_cache(maxsize=4)
def load_model(model_path: str):
    path = Path(model_path)
    if not path.exists():
        raise FileNotFoundError(f"model file not found: {path}")
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError("ultralytics is not installed; run: pip install ultralytics") from exc
    return YOLO(str(path))


def yolo_result(image_path: Path) -> tuple[str, float, list[dict[str, Any]], float]:
    start = time.perf_counter()
    model = load_model(str(active_model_path))
    results = model.predict(str(image_path), conf=0.25, verbose=False)
    inference_ms = round((time.perf_counter() - start) * 1000, 2)
    names = getattr(model, "names", {}) or {}
    boxes: list[dict[str, Any]] = []
    for result in results:
        result_boxes = getattr(result, "boxes", None)
        if result_boxes is None:
            continue
        for box in result_boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            xyxy = [round(float(value), 2) for value in box.xyxy[0].tolist()]
            boxes.append({
                "class": str(names.get(cls_id, cls_id)),
                "confidence": round(conf, 4),
                "xyxy": xyxy,
            })
    if not boxes:
        return "No Finding", 0.0, [], inference_ms
    top = max(boxes, key=lambda item: item["confidence"])
    return str(top["class"]), float(top["confidence"]), boxes, inference_ms


def mock_yolo_result(prediction: str | None, confidence: float | None) -> tuple[str, float, list[dict[str, Any]], float]:
    start = time.perf_counter()
    label = prediction or "Cavity"
    conf = confidence if confidence is not None else 0.88
    conf = max(0.0, min(1.0, float(conf)))
    boxes = [] if label == "No Finding" else [
        {"class": label, "confidence": round(conf, 4), "xyxy": [0.52, 0.36, 0.74, 0.61]}
    ]
    return label, conf, boxes, round((time.perf_counter() - start) * 1000 + 42.0, 2)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "mode": "local" if LOCAL_TRUSTED_MODE else "protected",
        "model_available": active_model_path.exists(),
        "model_name": active_model_path.name,
    }


@app.get("/models")
def models(username: str = Depends(require_editor)) -> dict[str, Any]:
    available = sorted(path.name for path in MODEL_DIR.glob("*.pt") if path.is_file())
    return {"active": active_model_path.name, "available": available}


@app.patch("/models/active")
def set_active_model(selection: ModelSelection, username: str = Depends(require_editor)) -> dict[str, str]:
    global active_model_path
    candidate = (MODEL_DIR / selection.model).resolve()
    if candidate.parent != MODEL_DIR.resolve() or not candidate.is_file():
        raise HTTPException(status_code=404, detail="model not found")
    active_model_path = candidate
    load_model.cache_clear()
    log_audit(username, "set_active_model")
    return {"active": active_model_path.name}


@app.post("/auth/login")
def login(credentials: LoginRequest) -> dict[str, Any]:
    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=503, detail="ADMIN_PASSWORD is not configured")
    if not hmac.compare_digest(credentials.username, ADMIN_USERNAME) or not hmac.compare_digest(credentials.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="invalid username or password")
    token = secrets.token_urlsafe(32)
    expires_at = time.time() + SESSION_TTL_SECONDS
    with db() as conn:
        conn.execute("insert into sessions values (?, ?, ?, ?)", (hash_token(token), ADMIN_USERNAME, expires_at, time.time()))
    log_audit(ADMIN_USERNAME, "login")
    return {"access_token": token, "token_type": "bearer", "expires_at": expires_at, "username": ADMIN_USERNAME}


@app.get("/auth/session")
def session(username: str = Depends(require_editor)) -> dict[str, str]:
    return {"username": username, "role": "editor"}


@app.post("/auth/logout")
def logout(authorization: str | None = Header(default=None), username: str = Depends(require_editor)) -> dict[str, bool]:
    token_hash = hash_token((authorization or "").removeprefix("Bearer ").strip())
    with db() as conn:
        conn.execute("delete from sessions where token_hash = ?", (token_hash,))
    log_audit(username, "logout")
    return {"ok": True}


@app.get("/slicer/status", dependencies=[Depends(require_editor)])
def slicer_status() -> dict[str, Any]:
    try:
        response = requests.get(f"{SLICER_URL}/health", timeout=2)
        response.raise_for_status()
        return {"connected": True, "slicer": response.json()}
    except requests.RequestException as exc:
        return {"connected": False, "error": str(exc)}



@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    prediction: str | None = Form(default=None),
    confidence: float | None = Form(default=None),
    username: str | None = Depends(optional_editor),
) -> dict[str, Any]:
    if not LOCAL_TRUSTED_MODE and username is None:
        raise HTTPException(status_code=401, detail="editor authentication required")
    filename = file.filename or "image"
    record_id = uuid.uuid4().hex
    content = await file.read()
    suffix, image_type = validated_image(content)
    image_path = UPLOAD_DIR / f"{record_id}{suffix}"
    image_path.write_bytes(content)

    try:
        label, conf, boxes, inference_ms = yolo_result(image_path)
    except Exception as exc:
        if not ALLOW_MOCK:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        label, conf, boxes, inference_ms = mock_yolo_result(prediction, confidence)
    slicer_result = call_slicer(image_path) if ENABLE_SLICER_BRIDGE else {"connected": False, "status": "disabled"}

    record = {
        "id": record_id,
        "created_at": time.time(),
        "image_name": filename,
        "image_type": image_type,
        "image_size": len(content),
        "image_path": str(image_path),
        "prediction": label,
        "confidence": conf,
        "inference_ms": inference_ms,
        "boxes": boxes,
        "slicer": slicer_result,
    }
    if username:
        with db() as conn:
            conn.execute(
                """
                insert into records (
                    id, created_at, image_name, image_type, image_size, image_path,
                    prediction, confidence, inference_ms, boxes_json, slicer_json
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"], record["created_at"], record["image_name"], record["image_type"],
                    record["image_size"], record["image_path"], record["prediction"], record["confidence"],
                    record["inference_ms"], json.dumps(record["boxes"]), json.dumps(record["slicer"]),
                ),
            )
        create_backup_if_due()
        log_audit(username, "predict", record_id)
    else:
        record["id"] = None
        image_path.unlink(missing_ok=True)
    public_record = dict(record)
    public_record.pop("image_path", None)
    return public_record


@app.get("/records")
def records(username: str = Depends(require_editor)) -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("select * from records order by created_at desc limit 50").fetchall()
    return [row_to_dict(row) for row in rows]


@app.get("/records/{record_id}")
def record(record_id: str, username: str = Depends(require_editor)) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("select * from records where id = ?", (record_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="record not found")
    return row_to_dict(row)


@app.get("/records/{record_id}/image")
def record_image(record_id: str, username: str = Depends(require_editor)) -> FileResponse:
    with db() as conn:
        row = conn.execute("select image_name, image_path from records where id = ?", (record_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="record not found")
    image_path = Path(str(row["image_path"])).resolve()
    if not image_path.is_file() or image_path.parent != UPLOAD_DIR.resolve():
        raise HTTPException(status_code=404, detail="record image not found")
    return FileResponse(image_path, filename=str(row["image_name"]), media_type="application/octet-stream")


@app.patch("/records/{record_id}")
def update_record(record_id: str, update: RecordReviewUpdate, username: str = Depends(require_editor)) -> dict[str, Any]:
    manual_findings = {
        "total": update.cavity_count + update.wisdom_tooth_count,
        "classes": {
            "cavity": {"label": "蛀牙", "count": update.cavity_count, "max_confidence": 0.0},
            "wisdom_tooth": {"label": "阻生智齒", "count": update.wisdom_tooth_count, "max_confidence": 0.0},
        },
    }
    with db() as conn:
        row = conn.execute("select * from records where id = ?", (record_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="record not found")
        conn.execute(
            """
            update records set review_status = ?, review_note = ?, manual_findings_json = ?,
                reviewed_at = ?, reviewed_by = ? where id = ?
            """,
            (update.review_status, update.note.strip(), json.dumps(manual_findings), time.time(), username, record_id),
        )
        updated = conn.execute("select * from records where id = ?", (record_id,)).fetchone()
    create_backup_if_due()
    log_audit(username, "update_record", record_id)
    return row_to_dict(updated)


@app.delete("/records/{record_id}")
def delete_record(record_id: str, username: str = Depends(require_editor)) -> dict[str, bool]:
    with db() as conn:
        row = conn.execute("select image_path from records where id = ?", (record_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="record not found")
        image_path = Path(str(row["image_path"]))
        conn.execute("delete from records where id = ?", (record_id,))
    if image_path.is_file() and image_path.resolve().parent == UPLOAD_DIR.resolve():
        image_path.unlink(missing_ok=True)
    create_backup_if_due()
    log_audit(username, "delete_record", record_id)
    return {"ok": True}


@app.get("/backups")
def backups(username: str = Depends(require_editor)) -> list[dict[str, Any]]:
    return [
        {"name": path.name, "created_at": path.stat().st_mtime, "size": path.stat().st_size}
        for path in sorted(BACKUP_DIR.glob("records-*.sqlite3"), key=lambda item: item.stat().st_mtime, reverse=True)
    ]


@app.post("/backups")
def create_manual_backup(username: str = Depends(require_editor)) -> dict[str, Any]:
    global last_backup_at
    last_backup_at = 0.0
    create_backup_if_due()
    latest = max(BACKUP_DIR.glob("records-*.sqlite3"), key=lambda path: path.stat().st_mtime, default=None)
    if latest is None:
        raise HTTPException(status_code=500, detail="backup could not be created")
    log_audit(username, "create_backup")
    return {"name": latest.name, "created_at": latest.stat().st_mtime, "size": latest.stat().st_size}


@app.get("/admin/summary")
def admin_summary(username: str = Depends(require_editor)) -> dict[str, Any]:
    with db() as conn:
        record_count = conn.execute("select count(*) from records").fetchone()[0]
        latest = conn.execute("select created_at from records order by created_at desc limit 1").fetchone()
        reviewed_count = conn.execute("select count(*) from records where review_status = 'reviewed'").fetchone()[0]
        follow_up_count = conn.execute("select count(*) from records where review_status = 'needs_follow_up'").fetchone()[0]
        storage_bytes = conn.execute("select coalesce(sum(image_size), 0) from records").fetchone()[0]
    return {
        "record_count": record_count,
        "backup_count": len(list(BACKUP_DIR.glob("records-*.sqlite3"))),
        "latest_record_at": latest[0] if latest else None,
        "active_model": active_model_path.name,
        "reviewed_count": reviewed_count,
        "follow_up_count": follow_up_count,
        "storage_bytes": storage_bytes,
        "session_ttl_minutes": SESSION_TTL_SECONDS // 60,
        "max_upload_bytes": MAX_UPLOAD_BYTES,
    }


@app.get("/audit")
def audit_log(username: str = Depends(require_editor)) -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("select created_at, username, action, record_id from audit_log order by created_at desc limit 50").fetchall()
    return [dict(row) for row in rows]
