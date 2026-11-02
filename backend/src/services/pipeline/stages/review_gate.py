"""
Final gate — summary score, confidence and the teacher-review flag.

The system never issues a final grade: `total_score` is the count of achieved
milestones and `needs_review` routes the result to a teacher. Confidence is
currently image-quality based; this is where a self-consistency estimate
(locked decision #2) would be combined in.
"""
from src.services.pipeline.context import PipelineContext


class ReviewGateStage:
    name = "review_gate"

    def run(self, ctx: PipelineContext) -> None:
        ctx.total_score = sum(1 for m in ctx.milestone_results if m.get("achieved"))
        ctx.needs_review = ctx.needs_review or not ctx.image_quality["is_acceptable"]
        ctx.confidence = ctx.image_quality["confidence"]
