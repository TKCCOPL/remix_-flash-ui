import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from services.auth_service import is_logged_in

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _require_login(request: Request):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="unauthorized")

@router.post("")
async def upload_image(request: Request, file: UploadFile = File(...)):
    _require_login(request)
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
        
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/api/uploads/{filename}"}
