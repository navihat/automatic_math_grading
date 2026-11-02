from src.services.ai.json_utils import parse_llm_json


def test_plain_json():
    assert parse_llm_json('{"a": 1}') == {"a": 1}


def test_fenced_json_with_trailing_text():
    assert parse_llm_json('```json\n{"a": [1, 2]}\n```') == {"a": [1, 2]}
    assert parse_llm_json('{"a": 1} trailing words') == {"a": 1}
