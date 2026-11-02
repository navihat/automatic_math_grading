"""
Shared state passed through the pipeline stages.

Each stage reads the fields produced by earlier stages and fills its own.
Field layout mirrors the 8 persisted layers in `Result` (see db/models/result.py):

  L1 image_quality  → L2 ocr_text / uncertain_symbols → L3 steps → L4 ir
  → L5 verification → L6 milestones → L7 misconceptions → L8 feedback
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional, TypedDict


ImageItem = tuple[bytes, str]  # (image_bytes, mime_type), in page order


class IRStep(TypedDict, total=False):
    """Layer 4 — one solution step in sympy-parseable form."""
    step_no: int
    lhs: str
    rhs: str
    operation: str
    relation_to_prev: Optional[int]


class StepVerification(TypedDict, total=False):
    """Layer 5 — verdict on the transition from_step → to_step."""
    from_step: int
    to_step: int
    is_valid: Optional[bool]          # None = could not decide automatically
    method: str
    error_description: Optional[str]


@dataclass
class PipelineContext:
    # ── Inputs ───────────────────────────────────────────────────────────────
    images: list[ImageItem]
    problem_statement: str
    milestones: list[dict]            # locked rubric milestones (Rubric.content["milestones"])
    misconception_catalog: list[dict] # [{code, name, description}]

    # ── L1: image quality ────────────────────────────────────────────────────
    image_quality: dict = field(default_factory=dict)
    # ── L2–L4: recognition ───────────────────────────────────────────────────
    ocr_text: str = ""
    uncertain_symbols: list[str] = field(default_factory=list)
    steps: list[dict] = field(default_factory=list)
    ir: list[IRStep] = field(default_factory=list)
    # ── L5: symbolic verification ────────────────────────────────────────────
    verification: list[StepVerification] = field(default_factory=list)
    # ── L6–L8: diagnosis ─────────────────────────────────────────────────────
    milestone_results: list[dict] = field(default_factory=list)
    misconceptions: list[dict] = field(default_factory=list)
    feedback: str = ""
    # ── Review gate / summary ────────────────────────────────────────────────
    needs_review: bool = False
    total_score: int = 0
    confidence: float = 0.0

    # Free-form per-stage diagnostics (timings, raw responses, …); not persisted.
    trace: dict[str, Any] = field(default_factory=dict)
