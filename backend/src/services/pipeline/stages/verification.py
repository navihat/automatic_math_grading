"""
L5 — symbolic verification of consecutive IR steps (SymPy, local).

Runs before any LLM judgement (locked decision #1). Plug point for open
problem P2 (equivalence chains: extraneous / lost roots): swap `verify` for a
verifier with the same signature list[IRStep] -> list[StepVerification].
"""
from typing import Callable

from src.services.pipeline.context import IRStep, PipelineContext, StepVerification
from src.services.symbolic import verifier as sym_verifier

Verifier = Callable[[list[IRStep]], list[StepVerification]]


class VerificationStage:
    name = "verification"

    def __init__(self, verify: Verifier | None = None):
        self._verify = verify or sym_verifier.verify_all

    def run(self, ctx: PipelineContext) -> None:
        ctx.verification = self._verify(ctx.ir)
