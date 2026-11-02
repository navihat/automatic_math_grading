"""
L6–L8 — milestone achievement, misconception mapping and feedback.

Currently one Gemini call (ai/diagnostic.py) produces all three layers.
Plug point for open problem P3 (milestone detection): a dedicated milestone
checker can be inserted as its own stage before this one and its results
passed in as evidence, or this stage can be split along the L6/L7/L8 fields.
"""
from typing import Callable

from src.services.ai import diagnostic as diag_service
from src.services.pipeline.context import PipelineContext
from src.services.pipeline.stages.base import StageError

Analyzer = Callable[..., dict]


class DiagnosisStage:
    name = "diagnosis"

    def __init__(self, analyze: Analyzer | None = None):
        self._analyze = analyze or diag_service.analyze

    def run(self, ctx: PipelineContext) -> None:
        try:
            diag = self._analyze(
                problem_statement=ctx.problem_statement,
                milestones=ctx.milestones,
                ir_steps=ctx.ir,
                verification=ctx.verification,
                misconceptions_catalog=ctx.misconception_catalog,
                uncertain_symbols=ctx.uncertain_symbols,
            )
        except Exception as e:
            raise StageError(f"Lỗi phân tích diagnostic: {e}") from e

        ctx.milestone_results = diag["milestones"]
        ctx.misconceptions = diag["misconceptions"]
        ctx.feedback = diag["feedback"]
        ctx.needs_review = diag["needs_review"]
