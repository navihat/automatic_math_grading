class OCRExtractionError(RuntimeError):
    """Lỗi khi gọi dịch vụ OCR bên ngoài hoặc parse kết quả."""


class OCRProviderNotFoundError(ValueError):
    """Tên provider OCR không được hỗ trợ."""
