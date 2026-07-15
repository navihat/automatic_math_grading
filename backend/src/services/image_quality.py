"""
Image quality heuristics using OpenCV.
Returns blur score, contrast, and whether the image is acceptable for OCR.
"""
import cv2
import numpy as np


BLUR_THRESHOLD = 80.0    # Laplacian variance below this → blurry
CONTRAST_THRESHOLD = 30.0  # Std-dev of grayscale below this → low contrast


def assess(image_bytes: bytes) -> dict:
    """
    Assess image quality from raw bytes.

    Returns:
        {
          "blur_score": float,        # higher = sharper
          "is_sharp": bool,
          "contrast": float,          # grayscale std-dev
          "has_contrast": bool,
          "is_acceptable": bool,      # True if both checks pass
          "confidence": float,        # 0.0–1.0 derived from quality
          "warning": str | None       # human-readable reason if not acceptable
        }
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)

    if img is None:
        return {
            "blur_score": 0.0,
            "is_sharp": False,
            "contrast": 0.0,
            "has_contrast": False,
            "is_acceptable": False,
            "confidence": 0.0,
            "warning": "Không thể đọc file ảnh.",
        }

    blur_score = float(cv2.Laplacian(img, cv2.CV_64F).var())
    contrast = float(img.std())

    is_sharp = blur_score >= BLUR_THRESHOLD
    has_contrast = contrast >= CONTRAST_THRESHOLD
    is_acceptable = is_sharp and has_contrast

    warnings = []
    if not is_sharp:
        warnings.append(f"Ảnh mờ (blur={blur_score:.1f} < {BLUR_THRESHOLD})")
    if not has_contrast:
        warnings.append(f"Độ tương phản thấp (contrast={contrast:.1f} < {CONTRAST_THRESHOLD})")

    # Normalise to 0–1 confidence (both metrics contribute equally)
    blur_conf = min(blur_score / (BLUR_THRESHOLD * 3), 1.0)
    contrast_conf = min(contrast / (CONTRAST_THRESHOLD * 3), 1.0)
    confidence = round((blur_conf + contrast_conf) / 2, 3)

    return {
        "blur_score": round(blur_score, 2),
        "is_sharp": is_sharp,
        "contrast": round(contrast, 2),
        "has_contrast": has_contrast,
        "is_acceptable": is_acceptable,
        "confidence": confidence,
        "warning": "; ".join(warnings) if warnings else None,
    }
