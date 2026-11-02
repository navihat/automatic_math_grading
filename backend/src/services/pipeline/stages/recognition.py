"""
L2–L4 — OCR + step segmentation + intermediate representation.

Plug point for open problem P1 (Vietnamese handwriting + math OCR): swap the
`extract` callable for another recognizer that returns the same dict shape
{ocr_text, uncertain_symbols, steps, ir}.
"""
from typing import Callable

from src.services.ai import ocr_extractor
from src.services.pipeline.context import ImageItem, PipelineContext
from src.services.pipeline.stages.base import StageError

Recognizer = Callable[[list[ImageItem]], dict]


class RecognitionStage:
    name = "recognition"

    def __init__(self, extract: Recognizer | None = None):
        self._extract = extract or ocr_extractor.extract

    def run(self, ctx: PipelineContext) -> None:
        try:
            result = self._extract(ctx.images)
        except Exception as e:
            raise StageError(f"Lỗi OCR: {e}") from e

        ctx.ocr_text = result["ocr_text"]
        ctx.uncertain_symbols = result["uncertain_symbols"]
        ctx.steps = result["steps"]
        ctx.ir = result["ir"]
