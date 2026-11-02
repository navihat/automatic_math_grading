"""Shared helpers for parsing JSON returned by LLM calls."""
import json


def parse_llm_json(text: str) -> dict:
    """Parse a JSON object from an LLM response, tolerating ```json fences and trailing text."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        lines = lines[1:] if lines[0].startswith("```") else lines
        lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
        text = "\n".join(lines).strip()
    result, _ = json.JSONDecoder().raw_decode(text)
    return result
