"""L1 — image quality heuristics (OpenCV, local). Uses the first page only."""
from src.services import image_quality as iq
from src.services.pipeline.context import PipelineContext


class ImageQualityStage:
    name = "image_quality"

    def run(self, ctx: PipelineContext) -> None:
        ctx.image_quality = iq.assess(ctx.images[0][0])
