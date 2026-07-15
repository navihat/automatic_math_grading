"""
Symbolic verifier using SymPy.
Checks whether each consecutive step in the IR is mathematically valid.
Scope: THCS algebra — linear equations, expression simplification, basic systems.
"""
from __future__ import annotations

from typing import Optional

from sympy import (
    Eq, Symbol, symbols, simplify, solve,
    SympifyError, zoo, nan, oo, S,
)
from sympy.core.relational import Relational
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
)

_TRANSFORMS = standard_transformations + (implicit_multiplication_application,)
_COMMON_SYMBOLS = {s: Symbol(s) for s in "xyzabc"}


def _parse(expr_str: str) -> Optional[object]:
    if not expr_str or not expr_str.strip():
        return None
    try:
        result = parse_expr(expr_str.strip(), local_dict=_COMMON_SYMBOLS, transformations=_TRANSFORMS)
        # Reject SymPy singletons/modules that aren't valid math expressions
        if not hasattr(result, 'free_symbols'):
            return None
        return result
    except (SympifyError, SyntaxError, TypeError, ValueError):
        return None


def _is_degenerate(val) -> bool:
    return val in (zoo, nan, oo, -oo) if val is not None else False


def _verify_step_pair(ir_a: dict, ir_b: dict) -> dict:
    """Check that ir_b is a valid algebraic consequence of ir_a."""
    lhs_a = _parse(ir_a.get("lhs", ""))
    rhs_a = _parse(ir_a.get("rhs", ""))
    lhs_b = _parse(ir_b.get("lhs", ""))
    rhs_b = _parse(ir_b.get("rhs", ""))

    step_a = ir_a.get("step_no")
    step_b = ir_b.get("step_no")

    if any(v is None for v in [lhs_a, rhs_a, lhs_b, rhs_b]):
        return {
            "from_step": step_a,
            "to_step": step_b,
            "is_valid": None,
            "method": "parse_failed",
            "error_description": "Không thể parse biểu thức để kiểm tra tự động.",
        }

    is_valid = False
    method = "substitution"
    error_desc = None

    try:
        eq_a = Eq(lhs_a, rhs_a)
        eq_b = Eq(lhs_b, rhs_b)
        free = eq_a.free_symbols | eq_b.free_symbols
        if free:
            primary_sym = sorted(free, key=str)[0]
            sol = solve(eq_a, primary_sym)

            if not sol:
                # No solution from eq_a (degenerate/identity) — check symbolic equiv
                diff = simplify((lhs_a - rhs_a) - (lhs_b - rhs_b))
                is_valid = diff == 0
                method = "symbolic_equivalence"
            else:
                val = sol[0] if isinstance(sol, list) else list(sol)[0]
                if _is_degenerate(val):
                    return {
                        "from_step": step_a,
                        "to_step": step_b,
                        "is_valid": None,
                        "method": "degenerate_solution",
                        "error_description": "Nghiệm của bước trước không xác định.",
                    }

                # Substitute into eq_b
                substituted = eq_b.subs(primary_sym, val)

                # substituted may be BooleanTrue, BooleanFalse, or Eq(...)
                if substituted is S.true or substituted == True:
                    is_valid = True
                elif substituted is S.false or substituted == False:
                    is_valid = False
                    error_desc = (
                        f"Thay {primary_sym}={val} vào bước {step_b}: "
                        f"{lhs_b}={rhs_b} không thỏa mãn (nhận được False)."
                    )
                elif hasattr(substituted, "lhs") and hasattr(substituted, "rhs"):
                    diff = simplify(substituted.lhs - substituted.rhs)
                    is_valid = diff == 0
                    if not is_valid:
                        error_desc = (
                            f"Thay {primary_sym}={val} vào bước {step_b}: "
                            f"vế trái - vế phải = {diff} ≠ 0."
                        )
                else:
                    # Fallback: try evaluating as boolean
                    try:
                        is_valid = bool(substituted)
                    except Exception:
                        is_valid = None
                        method = "bool_eval_failed"
        else:
            # No variables — numeric check
            diff = simplify((lhs_a - rhs_a) - (lhs_b - rhs_b))
            is_valid = diff == 0
            method = "numeric"

    except Exception as exc:
        return {
            "from_step": step_a,
            "to_step": step_b,
            "is_valid": None,
            "method": "exception",
            "error_description": str(exc),
        }

    return {
        "from_step": step_a,
        "to_step": step_b,
        "is_valid": is_valid,
        "method": method,
        "error_description": error_desc,
    }


def verify_all(ir_steps: list[dict]) -> list[dict]:
    """Verify every consecutive pair in ir_steps that has valid lhs/rhs."""
    equation_steps = [s for s in ir_steps if s.get("lhs") and s.get("rhs")]
    results = []
    for i in range(len(equation_steps) - 1):
        results.append(_verify_step_pair(equation_steps[i], equation_steps[i + 1]))
    return results
