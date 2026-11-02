import pytest

from src.services.pipeline.context import PipelineContext
from src.services.pipeline.orchestrator import execute
from src.services.pipeline.stages import (
    DiagnosisStage,
    RecognitionStage,
    ReviewGateStage,
    StageError,
    VerificationStage,
)


class FixedQualityStage:
    name = "image_quality"

    def __init__(self, acceptable=True, confidence=0.9):
        self.quality = {"is_acceptable": acceptable, "confidence": confidence}

    def run(self, ctx):
        ctx.image_quality = self.quality


def fake_recognizer(images):
    return {
        "ocr_text": "2x+3=7; 2x=5; x=2.5",
        "uncertain_symbols": [],
        "steps": [{"step_no": i, "raw_text": t} for i, t in enumerate(["2x+3=7", "2x=5", "x=2.5"], 1)],
        "ir": [
            {"step_no": 1, "lhs": "2*x+3", "rhs": "7"},
            {"step_no": 2, "lhs": "2*x", "rhs": "5"},
            {"step_no": 3, "lhs": "x", "rhs": "2.5"},
        ],
    }


def make_analyzer(seen):
    def analyze(**kwargs):
        seen.update(kwargs)
        return {
            "milestones": [{"id": "m1", "achieved": True}, {"id": "m2", "achieved": False}],
            "misconceptions": [{"code": "SIGN_TRANSPOSITION", "step_no": 2}],
            "feedback": "Em cần chuyển 3 sang vế phải thành -3.",
            "needs_review": False,
        }
    return analyze


def make_ctx():
    return PipelineContext(
        images=[(b"img", "image/png")],
        problem_statement="Giải phương trình 2x+3=7",
        milestones=[{"id": "m1"}, {"id": "m2"}],
        misconception_catalog=[],
    )


def stages(quality_stage, analyzer):
    return [
        quality_stage,
        RecognitionStage(extract=fake_recognizer),
        VerificationStage(),  # real SymPy verifier
        DiagnosisStage(analyze=analyzer),
        ReviewGateStage(),
    ]


def test_end_to_end_example_from_problem_statement():
    seen = {}
    ctx = execute(make_ctx(), stages(FixedQualityStage(), make_analyzer(seen)))

    # Verifier runs before the LLM and its output is what the LLM receives.
    assert [v["is_valid"] for v in ctx.verification] == [False, True]
    assert seen["verification"] is ctx.verification
    assert ctx.total_score == 1
    assert ctx.needs_review is False
    assert ctx.confidence == 0.9
    assert set(ctx.trace["timings_ms"]) == {"image_quality", "recognition", "verification", "diagnosis", "review_gate"}


def test_bad_image_forces_teacher_review():
    ctx = execute(make_ctx(), stages(FixedQualityStage(acceptable=False, confidence=0.2), make_analyzer({})))
    assert ctx.needs_review is True
    assert ctx.confidence == 0.2


def test_recognition_failure_is_wrapped_as_stage_error():
    def broken(images):
        raise ValueError("boom")

    with pytest.raises(StageError, match="Lỗi OCR: boom"):
        execute(make_ctx(), [FixedQualityStage(), RecognitionStage(extract=broken)])


def test_diagnosis_failure_is_wrapped_as_stage_error():
    def broken(**kwargs):
        raise ValueError("bad json")

    with pytest.raises(StageError, match="Lỗi phân tích diagnostic: bad json"):
        execute(make_ctx(), [DiagnosisStage(analyze=broken)])


def test_stage_error_is_runtime_error_for_route_mapping():
    # Routes map RuntimeError → HTTP 500; StageError must stay a RuntimeError.
    assert issubclass(StageError, RuntimeError)
