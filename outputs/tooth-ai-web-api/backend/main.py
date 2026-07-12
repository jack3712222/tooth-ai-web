from __future__ import annotations

import json
import hmac
import os
import sqlite3
import time
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any

import requests
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
BACKUP_DIR = DATA_DIR / "backups"
DB_PATH = DATA_DIR / "records.sqlite3"
SLICER_URL = os.getenv("SLICER_URL", "http://127.0.0.1:18901")
MODEL_PATH = Path(os.getenv("MODEL_PATH", r"D:\dental_ai_system\models\current_model.pt"))
ALLOW_MOCK = os.getenv("ALLOW_MOCK", "0") == "1"
API_TOKEN = os.getenv("API_TOKEN", "")
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))
BACKUP_INTERVAL_SECONDS = int(os.getenv("BACKUP_INTERVAL_SECONDS", "300"))
last_backup_at = 0.0

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Tooth AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://127.0.0.1:8765,http://localhost:8765").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


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
            slicer_json text not null
        )
        """
    )
    return conn


def require_api_token(x_api_key: str | None = Header(default=None)) -> None:
    """Protect image records and inference from public access."""
    if not API_TOKEN:
        raise HTTPException(status_code=503, detail="API_TOKEN is not configured")
    if not x_api_key or not hmac.compare_digest(x_api_key, API_TOKEN):
        raise HTTPException(status_code=401, detail="invalid API key")


def create_backup_if_due() -> None:
    global last_backup_at
    now = time.time()
    if now - last_backup_at < BACKUP_INTERVAL_SECONDS or not DB_PATH.exists():
        return
    target = BACKUP_DIR / f"records-{time.strftime('%Y%m%d-%H%M%S')}.sqlite3"
    with sqlite3.connect(DB_PATH) as source, sqlite3.connect(target) as destination:
        source.backup(destination)
    backups = sorted(BACKUP_DIR.glob("records-*.sqlite3"), key=lambda path: path.stat().st_mtime, reverse=True)
    for old_backup in backups[20:]:
        old_backup.unlink(missing_ok=True)
    last_backup_at = now


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    item["boxes"] = json.loads(item.pop("boxes_json"))
    item["slicer"] = json.loads(item.pop("slicer_json"))
    return item


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


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"model file not found: {MODEL_PATH}")
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError("ultralytics is not installed; run: pip install ultralytics") from exc
    return YOLO(str(MODEL_PATH))


def yolo_result(image_path: Path) -> tuple[str, float, list[dict[str, Any]], float]:
    start = time.perf_counter()
    model = load_model()
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
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/slicer/status", dependencies=[Depends(require_api_token)])
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
    _: None = Depends(require_api_token),
) -> dict[str, Any]:
    filename = file.filename or "image"
    is_dicom = filename.lower().endswith(".dcm")
    if file.content_type not in {"image/png", "image/jpeg", "image/webp", "image/bmp", "image/gif", "application/dicom"} and not is_dicom:
        raise HTTPException(status_code=415, detail="unsupported image type")

    record_id = uuid.uuid4().hex
    suffix = Path(filename).suffix.lower() or ".bin"
    image_path = UPLOAD_DIR / f"{record_id}{suffix}"
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    image_path.write_bytes(content)

    try:
        label, conf, boxes, inference_ms = yolo_result(image_path)
    except Exception as exc:
        if not ALLOW_MOCK:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        label, conf, boxes, inference_ms = mock_yolo_result(prediction, confidence)
    slicer_result = call_slicer(image_path)

    record = {
        "id": record_id,
        "created_at": time.time(),
        "image_name": filename,
        "image_type": file.content_type or ("application/dicom" if is_dicom else "unknown"),
        "image_size": len(content),
        "image_path": str(image_path),
        "prediction": label,
        "confidence": conf,
        "inference_ms": inference_ms,
        "boxes": boxes,
        "slicer": slicer_result,
    }
    with db() as conn:
        conn.execute(
            """
            insert into records values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record["created_at"],
                record["image_name"],
                record["image_type"],
                record["image_size"],
                record["image_path"],
                record["prediction"],
                record["confidence"],
                record["inference_ms"],
                json.dumps(record["boxes"]),
                json.dumps(record["slicer"]),
            ),
        )
    create_backup_if_due()
    return record


@app.get("/records", dependencies=[Depends(require_api_token)])
def records() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("select * from records order by created_at desc limit 50").fetchall()
    return [row_to_dict(row) for row in rows]


@app.get("/records/{record_id}", dependencies=[Depends(require_api_token)])
def record(record_id: str) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("select * from records where id = ?", (record_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="record not found")
    return row_to_dict(row)


@app.get("/backups", dependencies=[Depends(require_api_token)])
def backups() -> list[dict[str, Any]]:
    return [
        {"name": path.name, "created_at": path.stat().st_mtime, "size": path.stat().st_size}
        for path in sorted(BACKUP_DIR.glob("records-*.sqlite3"), key=lambda item: item.stat().st_mtime, reverse=True)
    ]
