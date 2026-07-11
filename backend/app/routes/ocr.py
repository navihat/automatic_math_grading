from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.ai.ocr.factory import get_ocr_provider
from app.services.ai.ocr.service import OCRService
from app.services.ai.ocr.exceptions import OCRProviderNotFoundError
from app.schemas.ocr import OCRResponse

router = APIRouter(prefix="/ocr", tags=["ocr"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/extract", response_model=OCRResponse)
async def extract_ocr(
    file: UploadFile = File(..., description="Ảnh handwritten toán để trích xuất OCR"),
    provider: str = "gemini",
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Định dạng file không được hỗ trợ.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File vượt quá giới hạn 10 MB.")

    try:
        provider_instance = get_ocr_provider(provider)
        service = OCRService(provider=provider_instance)
        result = service.extract_text(image_bytes=file_bytes, mime_type=file.content_type)
    except OCRProviderNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result
