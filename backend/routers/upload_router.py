import os
import uuid

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from services.auth_service import is_logged_in

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── 文件大小限制：5MB ────────────────────────────────────────────────────────
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

# ── 允许的扩展名白名单 ────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}

# ── 允许的文件魔数（magic bytes）→ 真实文件类型验证 ──────────────────────────
# 格式：(偏移量, 魔数字节)
MAGIC_BYTES: dict[str, list[tuple[int, bytes]]] = {
    "jpg":  [(0, b"\xff\xd8\xff")],
    "jpeg": [(0, b"\xff\xd8\xff")],
    "png":  [(0, b"\x89PNG\r\n\x1a\n")],
    "gif":  [(0, b"GIF87a"), (0, b"GIF89a")],
    "webp": [(0, b"RIFF"), (8, b"WEBP")],
}


def _require_login(request: Request) -> None:
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="unauthorized")


def _validate_image(contents: bytes, ext: str) -> bool:
    """通过文件魔数验证是否为真实图片，不信任客户端提供的 Content-Type"""
    signatures = MAGIC_BYTES.get(ext, [])
    if not signatures:
        return False
    for offset, magic in signatures:
        if contents[offset : offset + len(magic)] == magic:
            return True
    return False


@router.post("")
async def upload_image(request: Request, file: UploadFile = File(...)):
    _require_login(request)

    # 1. 读取全部内容（用于大小校验和魔数检测）
    contents = await file.read()

    # 2. 文件大小限制
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")

    # 3. 扩展名白名单（强制小写）
    original_name = file.filename or ""
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 4. 魔数验证（防止伪造 Content-Type / 扩展名的恶意文件）
    if not _validate_image(contents, ext):
        raise HTTPException(status_code=400, detail="Invalid image file content")

    # 5. 使用 UUID 生成安全文件名，防止路径穿越
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    return {"url": f"/api/uploads/{filename}"}
