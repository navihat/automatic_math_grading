"""
Regression tests for the current SymPy verifier (Layer 5).

The xfail cases document known gaps that open problem P2 (equivalence chains:
lost / extraneous roots) must close. They are strict: once P2 fixes a case the
test starts passing and the xfail marker must be removed.
"""
import pytest

from src.services.symbolic.verifier import verify_all


def eq(step_no, lhs, rhs):
    return {"step_no": step_no, "lhs": lhs, "rhs": rhs}


def verdict(a, b):
    (result,) = verify_all([eq(1, *a), eq(2, *b)])
    return result["is_valid"]


@pytest.mark.parametrize("a, b, expected", [
    (("2*x+3", "7"), ("2*x", "4"), True),       # correct transposition
    (("2*x+3", "7"), ("2*x", "5"), False),      # sign error when transposing
    (("2*x+3", "7"), ("2*x", "10"), False),
    (("2*(x+3)", "10"), ("2*x+6", "10"), True), # distribution
    (("2*(x+3)", "10"), ("2*x+3", "10"), False),
])
def test_linear_steps(a, b, expected):
    assert verdict(a, b) is expected


def test_non_equation_steps_are_skipped():
    steps = [eq(1, "2*x+3", "7"), {"step_no": 2, "lhs": "", "rhs": ""}, eq(3, "2*x", "4")]
    (result,) = verify_all(steps)
    assert (result["from_step"], result["to_step"], result["is_valid"]) == (1, 3, True)


def test_unparseable_step_is_undecided_not_wrong():
    (result,) = verify_all([eq(1, "2*x+3", "7"), eq(2, "2x+=", "4")])
    assert result["is_valid"] is None
    assert result["method"] == "parse_failed"


@pytest.mark.xfail(strict=True, reason="P2: only the first root is substituted, lost roots go undetected")
@pytest.mark.parametrize("a, b", [
    (("x**2", "4"), ("x", "-2")),
    (("x**2-5*x+6", "0"), ("x", "2")),
    (("x**2", "3*x"), ("x", "0")),
])
def test_lost_root_is_flagged(a, b):
    assert verdict(a, b) is not True

