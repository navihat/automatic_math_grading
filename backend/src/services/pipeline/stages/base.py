"""Stage contract: a stage reads earlier fields of PipelineContext and writes its own."""
from __future__ import annotations

from typing import Protocol

from src.services.pipeline.context import PipelineContext


class StageError(RuntimeError):
    """A stage failed in a way that should abort the pipeline (surfaced as HTTP 500)."""


class Stage(Protocol):
    name: str

    def run(self, ctx: PipelineContext) -> None: ...
