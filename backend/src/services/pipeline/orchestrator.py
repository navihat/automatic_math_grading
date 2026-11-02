"""
Runs the stages in order on a PipelineContext.

Default order (no LLM sees the image and issues a verdict in one jump):
  L1 image_quality → L2–L4 recognition → L5 verification (SymPy)
  → L6–L8 diagnosis (LLM) → review gate
"""
from __future__ import annotations

import logging
import time
from typing import Sequence

from src.services.pipeline.context import PipelineContext
from src.services.pipeline.stages import (
    DiagnosisStage,
    ImageQualityStage,
    RecognitionStage,
    ReviewGateStage,
    Stage,
    VerificationStage,
)

logger = logging.getLogger(__name__)


def default_stages() -> list[Stage]:
    return [
        ImageQualityStage(),
        RecognitionStage(),
        VerificationStage(),
        DiagnosisStage(),
        ReviewGateStage(),
    ]


def execute(ctx: PipelineContext, stages: Sequence[Stage] | None = None) -> PipelineContext:
    for stage in stages if stages is not None else default_stages():
        started = time.perf_counter()
        stage.run(ctx)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        ctx.trace.setdefault("timings_ms", {})[stage.name] = elapsed_ms
        logger.debug("pipeline stage %s took %.1f ms", stage.name, elapsed_ms)
    return ctx
