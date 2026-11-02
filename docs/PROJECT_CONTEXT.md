# AutoGrade THCS — Project Context

> Tài liệu context cho phiên làm việc với Claude Code (bàn luận + refactor codebase).
> Tổng hợp từ các trao đổi trước. Phần nào ghi "chưa giải quyết" thì KHÔNG được coi là đã chốt.

---

## 1. Tổng quan dự án

**AutoGrade THCS** — hệ thống chấm tự động bài làm Toán THCS viết tay (tiếng Việt).

- Mục đích: đồ án tốt nghiệp + tài sản portfolio/CV; ưu tiên nghiên cứu sâu và giá trị khoa học.
- Đầu vào: bài làm viết tay, trộn chữ tiếng Việt và công thức toán.
- Đầu ra: điểm theo từng bước (step-level) kèm **confidence score**, để giáo viên review các trường hợp biên.
- Phạm vi hiện tại: **Đại số THCS**. Hình học là mở rộng trong tương lai, chưa làm.

### Đóng góp kỹ thuật chính

- **Kiểm chứng ký hiệu bằng SymPy** + **chấm theo milestone rubric** (chấm từng bước).
- Multi-agent chỉ là hướng mở rộng phụ, **không phải** đóng góp cốt lõi.

### Ràng buộc

- Compute free-tier: Google Colab Free (T4), Kaggle Free (2×T4).
- Dataset lấy hoàn toàn từ nguồn online; không có năng lực tự tạo dữ liệu.

---

## 2. Tech stack thực tế

| Thành phần | Vai trò |
|---|---|
| Gemini Flash/Pro | Engine chính — 1 lần gọi cho cả OCR + chấm |
| SymPy | Kiểm chứng biểu thức / tương đương |
| PaddleOCR | Tiền xử lý nhẹ |
| FastAPI | API backend |
| Celery + Redis | Hàng đợi tác vụ |
| Supabase | Database / auth |

Framework đã được nhắc tới (tham khảo, chưa chắc đã có trong code): LangGraph, LoRA/QLoRA, PaddleOCR-VL, Qwen2.5-VL-3B.

> Lưu ý cho Claude Code: phản ánh đúng stack có trong repo, không suy diễn từ các pattern kiến trúc từng được bàn qua.

---

## 3. Trạng thái hiện tại

- Pipeline **8 layer** đã chạy với stack trên.
- Hệ thống quản lý người dùng: **hoàn thành**.
- Phase 1 (gọi API trực tiếp, không fine-tune): **xong**.
- Fine-tuning: **hoãn sang Phase 2**.
- Kế hoạch tháng 10/2026: ~74h (2–3h/ngày) xử lý 4 open problems dưới dạng **module**, chia đều thời gian, mục tiêu là tích hợp vào pipeline.

---

## 4. Quyết định đã khóa — KHÔNG bàn lại

1. **SymPy chạy trước LLM** khi kiểm tra tương đương.
2. **Self-consistency** dùng để ước lượng confidence.
3. **Multi-agent/LangGraph là phụ**; framing đề tài phải xoay quanh SymPy + milestone rubric.
4. **Phase 1 dùng Gemini API, không fine-tune.** Lý do: chỉ fine-tune khi (a) baseline dưới mức chấp nhận được, (b) đã tối ưu prompt hết mức, hoặc (c) yêu cầu về privacy/chi phí ở quy mô lớn.

### Hướng đã thử và loại bỏ

- Thay ViT encoder của Qwen2.5-VL bằng backbone ngoài (vd. NaViT): **bị chặn** do lệch chiều, xung đột positional encoding, không tương thích framework.
- Hướng khả thi thay thế: giữ nguyên kiến trúc, chỉ fine-tune **MLP projection layer** bằng LoRA.

---

## 5. Open problems — CHƯA GIẢI QUYẾT

> Trạng thái chung: **chưa nghiên cứu, chưa có giải pháp chi tiết cụ thể.**
> Các ý tưởng bên dưới chỉ là ý tưởng thô từ các buổi bàn trước. Claude Code không được coi chúng là giải pháp đã chốt.

### P1. OCR chữ viết tay tiếng Việt + công thức toán
- Không có dataset kết hợp phù hợp.
- Ý tưởng thô: VLM (Qwen2.5-VL-3B + LoRA/QLoRA) có vẻ hợp hơn OCR truyền thống.

### P2. Kiểm chứng chuỗi biến đổi tương đương (⟺)
- Bình phương, nhân/chia biểu thức chứa ẩn có thể **sinh nghiệm ngoại lai** hoặc **mất nghiệm**.
- Ý tưởng thô: hướng dùng SymPy `solveset`.

### P3. Phát hiện milestone thực sự đạt được
- Vấn đề: false positive, template matching cứng nhắc, lỗi parse lan truyền, các bước lập luận không biểu diễn được bằng ký hiệu.
- Ý tưởng thô: tách vai trò SymPy và PRM (Process Reward Model).

### P4. Xác định điểm sai đầu tiên + phân loại lỗi kéo theo / lỗi độc lập
- Đã có demo code đơn giản.
- Chưa xử lý: LaTeX parser với bài làm thực tế, các kịch bản ⟺ phức tạp.

---

## 6. Hướng mở rộng (chưa làm, để tham chiếu khi thiết kế module)

- **Multi-agent (LangGraph)**: Router, Rubric, Review Triage, Correction Memory agents — Rubric agent được đề xuất làm MVP đầu tiên.
- **Hình học**: IR schema biểu diễn dạng graph.
- **Phase 2 fine-tuning**: LoRA/QLoRA trên Qwen2.5-VL-3B cho layer OCR; PRM cho kiểm chứng bước. Layer feedback tiếng Việt **không** fine-tune.

---

## 7. Câu hỏi còn mở

- [ ] **"Milestone rubric"** nghĩa là gì: từng bước giải riêng lẻ, hay các mốc lớn (đặt vấn đề → giải → kết luận)? Ảnh hưởng trực tiếp tới thiết kế P3 và schema dữ liệu.
- [ ] Tên đề tài cuối cùng (phải phản ánh SymPy + milestone rubric).
- [ ] Ranh giới giữa 8 layer hiện tại và 4 module mới: module nào chèn vào layer nào?

---

## 8. Khung refactor (Claude Code điền)

### 8.1 Cấu trúc repo hiện tại

```
backend/src/
  api/routes/            FastAPI routes; analysis.py + submission.py gọi pipeline.run / reanalyze
  api/schemas/           Pydantic I/O
  core/                  config (Settings, tên model Gemini), database
  db/models/             SQLAlchemy; Result lưu 8 layer dưới dạng cột JSON riêng
  services/
    image_quality.py     L1 (OpenCV)
    ai/                  ocr_extractor (Gemini call 1), diagnostic (Gemini call 2),
                         milestone_generator + rubric_generator (soạn rubric offline), json_utils
    symbolic/verifier.py L5 (SymPy)
    pipeline/            orchestrator + stages/ + persistence + context  ← điểm cắm P1–P4
backend/tests/           pytest (uv run --group dev pytest)
data/storage/            LocalStorage (ảnh vào data/uploads)
frontend/                React + Vite
```

### 8.2 Ánh xạ pipeline 8 layer → code
| # | Layer | File/module | Ghi chú |
|---|---|---|---|
| 1 | Image quality | `pipeline/stages/image_quality.py` → `services/image_quality.py` | Chỉ ảnh trang đầu |
| 2 | OCR | `pipeline/stages/recognition.py` → `ai/ocr_extractor.extract` | Gemini call 1 (`GEMINI_OCR_MODEL`) |
| 3 | Step segmentation | (cùng call 1) | |
| 4 | IR | (cùng call 1) | LLM tự viết chuỗi SymPy → không có provenance |
| 5 | Symbolic verification | `pipeline/stages/verification.py` → `symbolic/verifier.verify_all` | Chạy trước LLM (quyết định #1) |
| 6 | Milestone | `pipeline/stages/diagnosis.py` → `ai/diagnostic.analyze` | Gemini call 2 (`GEMINI_DIAGNOSTIC_MODEL`) |
| 7 | Misconception | (cùng call 2) | Catalog từ bảng `misconceptions` |
| 8 | Feedback | (cùng call 2) | |
| — | Review gate | `pipeline/stages/review_gate.py` | total_score, needs_review, confidence |

### 8.3 Vấn đề phát hiện
- §2 liệt kê Celery/Redis/PaddleOCR/Supabase nhưng repo **không có**: pipeline chạy đồng bộ trong request, storage local.
- Là **2** lần gọi Gemini, không phải 1.
- `confidence` chỉ lấy từ chất lượng ảnh; **self-consistency (quyết định #2) chưa được cài**.
- Verifier chỉ thay **nghiệm đầu tiên** → bỏ sót mất nghiệm, đúng/sai phụ thuộc thứ tự nghiệm (đã ghi thành test xfail).
- IR do LLM viết → rủi ro code-verifier mismatch, không có provenance.
- Đã sửa trong refactor: `run`/`reanalyze` lặp toàn bộ luồng; `_parse_json` lặp 4 lần; tên model hard-code; code chết (`grading.py`, `step_grader.py` (chấm 1 lần bằng LLM, trái quyết định #1), `confidence_scorer.py` rỗng); không có test.
- Còn tồn tại (chưa sửa, ngoài phạm vi): ảnh được lưu trước khi chạy stage nên nếu stage lỗi sẽ để lại file mồ côi; `TesseractOCRAdapter` không được dùng.

### 8.4 Điểm cắm cho 4 module P1–P4
| Module | Layer liên quan | Interface đề xuất (input → output) |
|---|---|---|
| P1 OCR | L2–L4, `RecognitionStage(extract=...)` | `list[(bytes, mime)] → {ocr_text, uncertain_symbols, steps, ir}` (đề xuất D2: thêm `lines[]` + provenance) |
| P2 ⟺ chain | L5, `VerificationStage(verify=...)` | `list[IRStep] → list[StepVerification]` (đề xuất D3: thêm `relation` ∈ EQUIV/WIDENING/NARROWING/INVALID/UNDECIDED + `obligations`) |
| P3 Milestone | L6, stage mới trước `DiagnosisStage` hoặc tách `DiagnosisStage` | `(ir, verification, milestones) → list[{id, achieved, evidence{step_no, quote, strength}}]` |
| P4 First error | Stage mới giữa L5 và L6 | `(ir, verification) → {first_error_step, steps: [{step_no, kind: carried_forward/independent}], mal_rule_matches}` |

### 8.5 Kế hoạch refactor
Đã xong (không đổi hành vi/API/DB, đã test):
1. Tách `services/pipeline.py` → package `pipeline/` (context, stages, orchestrator, persistence).
2. Gom `_parse_json` → `ai/json_utils.py`; tên model → `config.py`.
3. Tách `generate_milestones` → `ai/milestone_generator.py`.
4. Xóa code chết; thêm pytest + test orchestrator, verifier (xfail cho P2), json_utils.

Bước tiếp theo — **chờ duyệt** `docs/RESEARCH_PROPOSAL.md` (D1–D8) trước khi cài bất kỳ thuật toán P1–P4 nào.
