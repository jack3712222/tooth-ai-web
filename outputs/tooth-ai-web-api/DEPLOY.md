# 實驗版 API 部署說明

此 API 使用 `current_model.pt` 做 YOLO 推論，並以 SQLite 儲存紀錄。公開前端不會內建 API 金鑰，也不會把上傳影像傳送到未受保護的網址。

## 本機啟動

```powershell
cd outputs\tooth-ai-web-api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
$env:MODEL_PATH="D:\dental_ai_system\models\current_model.pt"
$env:API_TOKEN="請設定一組長而隨機的密碼"
$env:CORS_ORIGINS="http://127.0.0.1:8765"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

## 本機推論模式（目前網站使用）

本機模式不需要把模型上傳雲端。請維持 `--host 127.0.0.1`，使 API 只能由同一台電腦存取：

```powershell
$env:MODEL_PATH="D:\dental_ai_system\models\current_model.pt"
$env:LOCAL_TRUSTED_MODE="1"
$env:ADMIN_USERNAME="dentex-admin"
$env:ADMIN_PASSWORD="設定一組只有你知道的長密碼"
$env:CORS_ORIGINS="https://astounding-cascaron-273497.netlify.app,http://127.0.0.1:8765"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

公開網站會連到同一台電腦的 `http://127.0.0.1:8000`。其他人可瀏覽網站，但無法使用你的本機模型；這是預期的安全行為。

## 安全規則

- `/health` 可公開檢查服務存活。
- `/predict`、`/records`、`/slicer/status`、`/backups` 都要求 `X-API-Key`。
- 上傳限制預設為 8 MB；僅接受圖片或 DICOM 副檔名。
- 每五分鐘最多建立一次 SQLite 自動備份，保留最近 20 份。
- `current_model.pt`、上傳影像、SQLite 紀錄與 `.env` 都不得提交至 GitHub。

## 雲端前的必要條件

部署主機必須有 Python/Docker 執行環境，並能安全保存 `current_model.pt`。Netlify 只部署前端，不能執行這個 Python 推論服務。使用 Render、Railway 或學校伺服器時，將模型以私有磁碟或私有物件儲存掛載到 `MODEL_PATH`。
