# AutoGrade THCS

Hệ thống AI **hỗ trợ giáo viên** chẩn đoán lời giải đại số THCS viết tay (tiếng Việt).
KHÔNG phải máy chấm điểm tự động: output là bằng chứng, milestone đạt/chưa đạt,
misconception, phản hồi và cờ `needs_review`; giáo viên quyết định điểm cuối.
Phạm vi MVP: đại số THCS (phương trình bậc nhất, rút gọn, biến đổi tương đương, hệ tuyến tính).
Không mở rộng sang hình học trừ khi được yêu cầu.

Tài liệu (đọc khi task liên quan, không cần đọc mặc định):
- `docs/PROBLEM_STATEMENT.md` — problem statement, RQ1–RQ5, metric, rủi ro, roadmap M1–M6
- `docs/PROJECT_CONTEXT.md` — quyết định đã khóa (§4), open problems P1–P4 (§5)
- `docs/RESEARCH_PROPOSAL.md` — hướng giải quyết P1–P4 (bản chờ duyệt, chưa chốt)

## Lệnh

Backend — chạy trong `backend/`, quản lý bằng uv:
- `uv sync` — cài dependency
- `uv run --group dev pytest` — chạy test (bắt buộc pass trước khi commit)
- `uv run alembic upgrade head` — migrate DB
- `uv run python -m src.main` — chạy API (docs tại http://localhost:8000/docs)
- `.env` cần ít nhất `DATABASE_URL` và `GEMINI_API_KEY`

Frontend — chạy trong `frontend/` (React + Vite + KaTeX): `npm run dev`, `npm run lint`

## Kiến trúc backend

- `src/services/pipeline/` — pipeline chẩn đoán cho từng bài nộp, chạy tuần tự các stage:
  `image_quality → recognition (OCR + tách bước + IR) → verification (SymPy) → diagnosis (LLM) → review_gate`.
  - Thêm bước mới = thêm một `Stage` trong `stages/` và đăng ký ở `orchestrator.default_stages()`;
    không nhét logic vào orchestrator.
  - Stage chỉ đọc/ghi qua `PipelineContext`; mọi I/O DB/storage nằm trong `persistence.py`.
  - Stage lỗi thì raise `StageError`.
- `src/services/ai/` — các lời gọi Gemini (OCR, diagnosis, rubric). `milestone_generator` là
  bước **offline**: giáo viên duyệt và khóa rubric trước, không chạy theo từng bài nộp.
- `src/services/symbolic/` — SymPy verifier.
- `src/api/routes/` — FastAPI routes; `src/db/models/` — SQLAlchemy models (migration bằng Alembic).

## Quy ước

- Parse JSON trả về từ LLM bằng `ai/json_utils.parse_llm_json`, không tự viết lại.
- Tên model lấy từ `settings.GEMINI_OCR_MODEL` / `settings.GEMINI_DIAGNOSTIC_MODEL`, không hardcode.
- Prompt và message lỗi hiển thị cho người dùng viết bằng tiếng Việt.
- Test không gọi Gemini thật hay DB thật: thay stage bằng stage giả / hàm giả
  (xem `tests/test_pipeline_orchestrator.py`).
- `src.core.config` đòi `DATABASE_URL` ngay lúc import; `tests/conftest.py` đã set sẵn.

## Quyết định đã khóa — không đề xuất thay đổi

- Không để LLM đi thẳng từ ảnh sang phán quyết: luôn qua tách bước → IR → verifier.
- SymPy chạy TRƯỚC LLM khi kiểm tra tương đương; LLM không phải nguồn sự thật duy nhất.
- OCR mơ hồ / confidence thấp phải bật `needs_review`, không tự kết luận.
- Phase 1 dùng Gemini API, không fine-tune.
- Multi-agent/LangGraph là phụ; trọng tâm là SymPy + milestone rubric.
- Chỉ mô tả stack có thật trong repo; không suy diễn từ các ý tưởng từng được bàn.

## Git

- Không commit/push lên `main`. Tạo nhánh `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`.
- Commit nhỏ, mỗi commit một ý, theo Conventional Commits; test phải pass ở mỗi commit.
- Chỉ commit/push khi được yêu cầu; không dùng `--force` (dùng `--force-with-lease` nếu cần).
- Nếu làm theo issue: đặt tên nhánh kèm số issue (`feat/12-...`) và ghi `Closes #12` trong PR.
