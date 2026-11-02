# Đề xuất hướng giải quyết P1–P4 — bản chờ duyệt

> Trạng thái: **ĐỀ XUẤT, CHƯA CHỐT.** Mọi mục đánh dấu **[Cần duyệt Dx]** là quyết định của bạn.
> Ngày: 2026-10-14. Không mục nào trong tài liệu này động vào 4 quyết định đã khóa (PROJECT_CONTEXT §4).
> Phần code đã refactor (không đổi hành vi) được mô tả ở §8; chưa có thuật toán P1–P4 nào được cài.

---

## 0. Tóm tắt một trang

| Vấn đề | Bằng chứng chính từ tài liệu | Đề xuất (chờ duyệt) |
|---|---|---|
| **P1 OCR** | Lỗi phiên âm (transcription) chiếm **87%** lỗi của hệ chấm tốt nhất [A1]; Gemini-2.5-flash zero-shot chỉ đạt **55% ExpRate** trên CROHME, trong khi VLM 3B fine-tune đạt 73–80% [A2]. Không tìm thấy dataset viết tay Toán + tiếng Việt công khai. | Giữ Gemini (Phase 1), nhưng **tách OCR khỏi việc sinh IR**: OCR chỉ trả LaTeX từng dòng + provenance; chuyển LaTeX→SymPy bằng parser tất định. Ước lượng độ chắc chắn bằng self-consistency **ở mức từng dòng OCR**. Dựng bộ đo baseline trước khi nghĩ tới fine-tune. |
| **P2 chuỗi ⟺** | STACK (Sangwin) phân loại quan hệ giữa hai dòng theo **tập nghiệm**: tương đương / kéo theo / bị kéo theo [B1–B3]; benchmark 2026 dùng ngữ nghĩa "bước sinh nghĩa vụ kiểm tra nghiệm" [B4]. LLM bác bỏ sai **75–85%** lời giải đúng nhưng không chuẩn [B4]. | Viết lại L5 theo **ngữ nghĩa tập nghiệm trên miền xác định**: EQUIV / WIDENING (nghiệm ngoại lai) / NARROWING (mất nghiệm) / INVALID / UNDECIDED, kèm **sổ nghĩa vụ** (obligation) cho bước bình phương, nhân biểu thức chứa ẩn. Đã prototype: đúng 9/9 ca thử. |
| **P3 milestone** | LLM chẩn đoán checklist kỹ năng đạt **F1 < 0.5**, lỗi chủ yếu là suy diễn quá mức (33%) và bịa bằng chứng (20%) [C1]; PRM khái quát kém ngoài GSM8K/MATH [C4, C5]. | Milestone = **mốc lớn kiểm chứng được** (3–6 mốc/bài, giống "hướng dẫn chấm" VN), chia 2 loại: **symbolic** (SymPy kiểm, không phụ thuộc cách giải) và **judgement** (LLM, bắt buộc trích dẫn bước + nhãn Evident/Vague, hậu kiểm trích dẫn). SymPy có quyền phủ quyết. PRM để Phase 2. |
| **P4 lỗi đầu tiên** | LLM định vị lỗi đầu tiên kém: micro-F1 0.29–0.57 [D2]; dù có lời giải mẫu, độ chính xác vẫn thấp [D3]. STACK dùng "follow-through marking" cho lỗi kéo theo [D4]. | Thuật toán **tất định** trên kết quả P2: lỗi đầu tiên = chuyển tiếp INVALID/NARROWING đầu tiên; mỗi bước sau được xét **so với bước trước của chính học sinh** → *lỗi kéo theo* vs *lỗi độc lập*; gắn misconception bằng **khớp mal-rule** bằng SymPy trước khi hỏi LLM. |

Thứ tự đề xuất: **P2 → P4 → P3 → P1** (P4 và milestone symbolic của P3 phụ thuộc P2; P1 độc lập nhưng tốn công đánh giá nhất). **[Cần duyệt D6]**

---

## 1. Codebase khác với PROJECT_CONTEXT

Đây là những gì đọc được từ code, không phải suy đoán:

1. **Stack.** Repo **không có** Celery, Redis, PaddleOCR hay Supabase (chỉ có một comment nhắc Supabase). Pipeline chạy đồng bộ trong request FastAPI; storage là local disk; DB là SQLAlchemy (SQLite/Postgres qua `DATABASE_URL`). Có `TesseractOCRAdapter` nhưng không được dùng.
2. **Số lần gọi LLM.** Là **2 lần gọi Gemini**, không phải 1: (1) OCR + tách bước + IR (`gemini-3.1-flash-lite`), (2) milestone + misconception + feedback (`gemini-2.5-flash`).
3. **Confidence.** `Result.confidence` hiện **chỉ lấy từ chất lượng ảnh** (OpenCV blur/contrast). **Self-consistency (quyết định khóa #2) chưa được cài.**
4. **Verifier có lỗi đúng/sai tùy may rủi** (đã chạy thử, xem `backend/tests/test_symbolic_verifier.py`):
   - Nó giải bước trước, lấy **nghiệm đầu tiên** SymPy trả về, rồi thay vào bước sau.
   - `x² = 4 → x = −2` bị chấm **đúng**, còn `x² = 4 → x = 2` bị chấm **sai**. Kết quả phụ thuộc thứ tự nghiệm, và cả hai đều là lỗi mất nghiệm.
   - `x² − 5x + 6 = 0 → x = 2` và `x² = 3x → x = 0` cũng bị chấm **đúng** (mất nghiệm).
   - `√x = x − 2 → x = (x−2)²` bị chấm **đúng** mà không ghi nhận nghĩa vụ loại nghiệm ngoại lai.
5. **IR do chính LLM viết dưới dạng chuỗi SymPy.** LLM có thể âm thầm "sửa" lỗi của học sinh khi chuyển sang `lhs`/`rhs`. Đây chính là rủi ro *code-verifier mismatch* trong AGENTS.md §16. Hiện không có provenance từ IR về dòng OCR/vị trí ảnh.
6. Không có test nào trước đợt refactor này.

---

## 2. Bằng chứng xuyên suốt (ảnh hưởng mọi module)

- **OCR là nút cổ chai.** Trong hệ chấm viết tay một lần gọi (PrairieLearn), 87% lỗi của model tốt nhất đến từ phiên âm, không phải từ áp dụng rubric [A1]. FERMAT ghi nhận nhiều VLM làm tốt hơn khi thay chữ viết tay bằng chữ in [A3].
- **Không giao phán quyết toán học cho LLM.** Trên lời giải phương trình bậc nhất đúng nhưng biến đổi "lạ", độ chính xác nhận diện "trace đúng" của các model cơ sở rơi từ 92–98% xuống 15–24% [B4]. Điều này củng cố quyết định khóa #1 (SymPy trước LLM).
- **Định vị lỗi đầu tiên khó với LLM.** ProcessBench [D1], MathTutorBench (micro-F1 0.29–0.57) [D2], và "LLMs cannot spot math errors…" [D3] đều cho cùng kết luận.
- **Chẩn đoán kỹ năng bằng LLM hay bịa bằng chứng** [C1]. Khuyến nghị của chính bài báo: bắt buộc trích bằng chứng, kiểm tra bằng chứng có thật trong bài, và giữ giáo viên trong vòng lặp.
- **Không nên fine-tune sớm.** VEHME (Qwen2.5-VL-7B, SFT + RL, khoảng 6 GPU-ngày A100) vẫn **thua Gemini-2.0-Flash** trên cả AIHub và FERMAT [A4]. Điều này khớp với quyết định khóa #4.

---

## 3. P1 — OCR chữ viết tay tiếng Việt + công thức

### 3.1 Tài liệu nói gì
- **HMER (biểu thức đơn lẻ).** Uni-MuMER (NeurIPS 2025) fine-tune toàn phần Qwen2.5-VL-**3B** đạt ExpRate 73.3% (CROHME avg) và 79.7% khi có thêm dữ liệu ngoài. So sánh zero-shot: Qwen2.5-VL-3B 38%, Gemini-2.5-flash 55%, GPT-4o 49%. Chi phí train khoảng 160 GPU-giờ A800, **vượt xa Colab/Kaggle free** [A2].
- **Dataset.** MathWriting (230k viết tay + 400k tổng hợp, online ink, rasterize được) [A5]; CROHME; HME100K; UIT-HWDB-line (7.273 dòng chữ viết tay tiếng Việt, offline) [A6]; AIHub (183k lời giải viết tay của học sinh, tiếng Hàn) và FERMAT (2.244 lời giải lớp 7–12, có nhãn lỗi) [A3, A4]. **Không tìm thấy** dataset viết tay Toán + tiếng Việt công khai. Ghép trang tổng hợp (dòng chữ VN + biểu thức) là khả thi về kỹ thuật [A7], nhưng chưa có công trình nào làm sẵn.
- **Tín hiệu bất định.** Logprobs của Gemini **không ổn định**: báo cáo trái chiều với 2.5-flash, và bị bỏ hẳn với họ 3.x [A8]. Vì vậy không nên dựa vào xác suất token. Self-consistency (quyết định khóa #2) là tín hiệu khả dụng.

### 3.2 Phương án

| | Mô tả | Ưu | Nhược |
|---|---|---|---|
| **A** (đề xuất) | Gemini OCR **tách riêng**: trả danh sách dòng `{line_id, kind: text/math/mixed, latex, bbox?}`. Chạy N=3–5 mẫu (temperature > 0), gióng hàng theo dòng; ký hiệu/dòng bất đồng → `uncertain`. IR sinh **tất định** từ LaTeX (latex2sympy2_extended / Math-Verify [A9]), không để LLM viết chuỗi SymPy. | Không cần GPU; giải quyết luôn provenance (§1.5); bất định đo được, đúng quyết định khóa #2. | Chi phí gọi API ×N; parser LaTeX cần lớp chuẩn hóa cho thói quen viết tay VN (`:` là chia, `,` thập phân, `⇔`). |
| **B** (thí nghiệm thêm) | Như A, nhưng dòng `math` được nhận diện **thêm** bằng một HMER mở (vd. checkpoint Uni-MuMER-3B, chạy fp16 trên T4). Hai bộ nhận diện bất đồng → cờ review. | Hai nguồn độc lập cho tín hiệu bất định tốt hơn tự-nhất-quán của cùng một model. | Mô hình chỉ học biểu thức đơn lẻ; cần cắt dòng; thêm phụ thuộc GPU khi inference. |
| **C** (Phase 2) | LoRA/QLoRA Qwen2.5-VL-3B trên MathWriting/CROHME + trang tổng hợp ghép UIT-HWDB. | Chủ động dữ liệu và quyền riêng tư. | Theo quyết định khóa #4, chỉ làm khi A/B dưới ngưỡng chấp nhận. |

**[Cần duyệt D5]** Đề xuất: A ngay, B nếu còn thời gian, C hoãn.
**[Cần duyệt D2]** Đổi hợp đồng IR: LLM chỉ OCR ra LaTeX; IR sinh tất định và lưu provenance `line_id → step_no`.

### 3.3 Đo lường
ExpRate và CER trên tập con CROHME-2019 test + MathWriting test (biểu thức); CER trên UIT-HWDB-line (chữ VN); **IR parse-validity rate** trên FERMAT (trang thật lớp 7–12). Cần thêm khoảng 30–50 trang bài THCS tiếng Việt thật (do giáo viên cung cấp) cho pilot; đây là ràng buộc dữ liệu cần bạn xác nhận.

---

## 4. P2 — Kiểm chứng chuỗi biến đổi (⟺)

### 4.1 Ngữ nghĩa (theo STACK [B1–B3] và [B4])
Gọi $S_i$ là tập nghiệm của dòng $i$ trên miền xác định tự nhiên $D_i$ (số thực). Mỗi chuyển tiếp $i \to i{+}1$ được gán một nhãn:

| Nhãn | Điều kiện | Ý nghĩa sư phạm |
|---|---|---|
| `EQUIV` | $S_i = S_{i+1}$ | Biến đổi tương đương hợp lệ |
| `WIDENING` | $S_i \subsetneq S_{i+1}$ | Có thể sinh **nghiệm ngoại lai** (bình phương, nhân biểu thức chứa ẩn, bỏ mẫu). **Hợp lệ khi và chỉ khi** sau đó học sinh loại các nghiệm thừa → mở *nghĩa vụ* |
| `NARROWING` | $S_{i+1} \subsetneq S_i$ | **Mất nghiệm** (chia cho biểu thức chứa ẩn, quên ±) → lỗi |
| `INVALID` | Không quan hệ bao hàm | Lỗi tính toán / biến đổi sai |
| `UNDECIDED` | SymPy trả `ConditionSet` / parse lỗi | Không kết luận, cờ review |

**Sổ nghĩa vụ.** Mỗi `WIDENING` sinh nghĩa vụ "loại $S_{i+1}\setminus S_i$". Nghĩa vụ được xả khi kết luận cuối của học sinh bằng đúng tập nghiệm thật, hoặc có bước thử lại/đối chiếu điều kiện. Nghĩa vụ còn treo ở cuối bài → lỗi "không loại nghiệm ngoại lai". Đây chính là định nghĩa "obligation-generating step" trong [B4].

**Chặn lạm dụng WIDENING.** Không phải mọi bao hàm đều chấp nhận được. Ví dụ `x²+1=0 → x=5` cũng thỏa ∅ ⊂ {5}. Vì vậy WIDENING chỉ được chấp nhận khi các ứng viên thừa thỏa **dạng bị nới** của bước trước: nghiệm của $l^2=r^2$ khi bước là bình phương, hoặc điểm nằm ngoài $D_i$ khi bước là bỏ mẫu. Nếu không thỏa → INVALID.

### 4.2 Thuật toán
1. Chuẩn hóa và parse (từ D2); xác định ẩn.
2. Tính $D_i$ = giao `continuous_domain` của mọi biểu thức con. Cộng thêm điều kiện học sinh tự viết (ĐKXĐ) nếu có.
3. Tính $S_i$ = `solveset(..., domain=D_i)`. Hệ phương trình dùng `linsolve`/`nonlinsolve` (IR cần nhóm các phương trình thành một "bước").
4. So sánh tập và gán nhãn; cập nhật sổ nghĩa vụ.
5. **Rút gọn biểu thức** (không phải phương trình): `simplify(a−b)==0`. Nếu không quyết được thì **thử số ngẫu nhiên** trong miền (kiểm tra đồng nhất xác suất).
6. **Bất phương trình**: so sánh tập nghiệm dạng khoảng (bắt được lỗi quên đổi chiều khi nhân số âm).
7. Bước cuối: so tập nghiệm kết luận với tập nghiệm thật của đề → tách "đáp án đúng nhưng quá trình sai" (loại T3 trong [B4]).

### 4.3 Prototype đã chạy (SymPy 1.14, chỉ là thử nghiệm, chưa đưa vào code)

| Bước | $S_i$ | $S_{i+1}$ | Nhãn |
|---|---|---|---|
| 2x+3=7 → 2x=4 | {2} | {2} | EQUIV |
| 2x+3=7 → 2x=5 | {2} | {5/2} | INVALID |
| x²=4 → x=2 | {−2, 2} | {2} | NARROWING (mất −2) |
| x²=3x → x=3 | {0, 3} | {3} | NARROWING (mất 0) |
| √x=x−2 → x=(x−2)² | {4} | {1, 4} | WIDENING (ứng viên thừa 1) |
| x/(x−1)=1/(x−1) → x=1 | ∅ | {1} | WIDENING (1 ∉ D) |
| \|x−1\|=2 → x−1=2 | {−1, 3} | {3} | NARROWING (mất −1) |

So với verifier hiện tại: 4 trong các ca trên bị chấm sai hoặc chấm đúng do may rủi.

**[Cần duyệt D3]** Chấp nhận ngữ nghĩa trên, với: miền số thực mặc định; nghiệm bội *không* tính khác biệt (giống `SAMEROOTS` của STACK).

### 4.4 Đánh giá
Sinh **tự động** một benchmark nhỏ theo 6 họ nhiễu của [B4] (cộng hai vế, chuyển vế, nhân/chia hằng ≠ 0, nhân biểu thức chứa ẩn, bình phương) cộng các lỗi mal-rule (§6.3). Đây là sinh bằng chương trình, không phải tự gán nhãn tay, nên hợp ràng buộc "không tự tạo dữ liệu". Metric: step-validity accuracy, precision/recall riêng cho NARROWING/WIDENING.

---

## 5. P3 — Phát hiện milestone thực sự đạt

### 5.1 Trả lời câu hỏi mở "milestone là gì" (đề xuất)
Milestone **không phải** từng dòng: tính đúng của từng dòng là việc của L5 (P2). Milestone là **mốc lớn kiểm chứng được**, 3–6 mốc/bài, tương ứng cách "hướng dẫn chấm" của đề thi VN chia điểm theo ý (vd. 0,25đ/ý) và nguyên tắc "học sinh làm cách khác đúng vẫn cho điểm tối đa". Cách này cũng giống checklist kỹ năng của MathCog [C1] và marking scheme của ProofBench [C2].
**[Cần duyệt D1]**

### 5.2 Hai loại milestone (đổi schema `Rubric.content.milestones`)
```jsonc
{"id": "m2", "name": "Đưa về phương trình bậc nhất", "kind": "symbolic",
 "check": {"type": "reaches_equivalent", "target": "2*x = 4"}}
{"id": "m3", "name": "Kết luận nghiệm", "kind": "symbolic",
 "check": {"type": "final_solution_set", "target": "{2}"}}
{"id": "m1", "name": "Đặt điều kiện xác định", "kind": "symbolic",
 "check": {"type": "states_domain", "target": "x != 1"}}
{"id": "m4", "name": "Lập luận chọn phương pháp", "kind": "judgement"}
```
- **symbolic**: SymPy kiểm. Đạt khi **tồn tại** một bước có tập nghiệm (hoặc biểu thức) tương đương `target`, và **đường dẫn tới bước đó không có lỗi chưa xử lý**. Ngoại lệ là tín chỉ cho lỗi kéo theo, nếu chọn ở D4. So bằng ngữ nghĩa nên không phụ thuộc cách giải; tránh template matching cứng (vấn đề nêu trong P3).
- **judgement**: LLM chấm, **bắt buộc** trả `{step_no, quote, strength: Evident|Vague}`. Hậu kiểm tất định:
  - `quote` phải xuất hiện trong dòng OCR `step_no`; nếu không → bác (chống bịa bằng chứng [C1]).
  - `Vague` → `needs_review`.
  - Nếu bước được trích bị L5 gắn INVALID → không được tính "đạt" (SymPy phủ quyết, quyết định khóa #1).
- Milestone generator (đã tách ra `ai/milestone_generator.py`) sẽ đề xuất `kind`/`check`; **giáo viên duyệt và khóa** trước khi dùng (chống rubric drift, AGENTS.md §16).

### 5.3 PRM
Qwen2.5-Math-PRM-7B đạt khoảng 73.5 F1 trên ProcessBench [C4], nhưng PRM khái quát kém ra ngoài phân bố huấn luyện [D1] và có thể phản ứng với "artifact định dạng" thay vì nội dung toán [C5]. Thêm nữa, 7B cần lượng tử 4-bit mới vừa T4. **Đề xuất: không đưa PRM vào MVP.** Nếu làm ở Phase 2, chỉ dùng như *tín hiệu phụ* cho milestone `judgement`, không bao giờ ghi đè SymPy.

**[Cần duyệt D7]** Tách lần gọi diagnosis hiện tại thành: (i) milestone judgement (LLM, chỉ cho mốc judgement), (ii) misconception + feedback. Đổi lại: thêm 1 lần gọi API mỗi bài.

### 5.4 Đánh giá
Precision/recall milestone so với giáo viên; **tỷ lệ bằng chứng bị bác** ở bước hậu kiểm; Cohen κ. Có thể tái dùng MathCog (639 bài, checklist + nhãn Evident/Vague) [C1] cho phần judgement nếu truy cập được dữ liệu.

---

## 6. P4 — Lỗi đầu tiên và lỗi kéo theo / độc lập

### 6.1 Định nghĩa (tất định, xây trên P2)
- **Lỗi đầu tiên** = chuyển tiếp đầu tiên có nhãn `INVALID` hoặc `NARROWING`, hoặc `WIDENING` mà nghĩa vụ không bao giờ được xả (khi đó gán vào bước kết luận).
- Mỗi bước $j$ sau lỗi đầu tiên được xét **so với bước $j{-}1$ của chính học sinh** (tức là coi tiền đề sai như đã cho):
  - hợp lệ cục bộ → **lỗi kéo theo** (carried forward): học sinh làm đúng trên tiền đề sai;
  - không hợp lệ cục bộ → **lỗi độc lập** mới.
- Thêm cờ **"quá trình sai, đáp án đúng"** khi tập nghiệm cuối trùng tập nghiệm thật dù chuỗi có lỗi (hai lỗi bù nhau).
- Dùng `relation_to_prev` trong IR (không chỉ dòng liền kề), vì học sinh có thể gạch bỏ hoặc làm lại. Bước `UNDECIDED` **cắt chuỗi**: không suy diễn kéo theo qua bước không parse được.

### 6.2 Chính sách tín chỉ cho lỗi kéo theo **[Cần duyệt D4]**
Tài liệu cho thấy người chấm và LLM bất đồng chính ở điểm này (ví dụ trong vật lý: LLM cho 4/5 theo ECF, người chấm cho 1/5) [D5]. Vì vậy chính sách **phải viết rõ trong rubric**. Ba lựa chọn:
- (a) có tín chỉ, theo follow-through marking của STACK [D4];
- (b) không có tín chỉ;
- (c) cấu hình theo từng rubric. **Đề xuất (c), mặc định (a).**

### 6.3 Gắn misconception bằng mal-rule trước, LLM sau
Truyền thống ITS dùng *buggy rules / mal-rules*: luật biến đổi sai điển hình [D6]. Cho bước sai $j$, áp từng mal-rule trong catalog (chuyển vế không đổi dấu, phân phối một phần, $(a+b)^2 \to a^2+b^2$, $x^a x^b \to x^{ab}$, $\sqrt a + \sqrt b \to \sqrt{a+b}$…) lên bước $j{-}1$ bằng SymPy. Nếu kết quả ≡ bước $j$ thì có **bằng chứng tất định** cho misconception đó. Chỉ khi không khớp mal-rule nào mới hỏi LLM chọn từ catalog.
Việc này cần thêm trường `mal_rule` cho các mục trong `MISCONCEPTION_SEED`. Benchmark 55 misconception của Otero và cộng sự [C3] là nguồn để mở rộng catalog.
Lưu ý từ tài liệu: phản hồi kiểu "buggy message" không tự động giúp học sinh học tốt hơn [D7]; nên dùng nó làm **bằng chứng cho giáo viên**, còn câu chữ phản hồi vẫn qua L8.

### 6.4 Đánh giá
VtG (Daheim et al.): 1.002 lời giải từng bước có nhãn lỗi đầu tiên do giáo viên gán [D3]. Dữ liệu ở mức tiểu học/THCS nên gần phạm vi đề tài hơn ProcessBench (thi Olympic). Cộng thêm benchmark tự sinh ở §4.4. Metric: độ chính xác vị trí lỗi đầu tiên (khớp tuyệt đối), F1 lỗi kéo theo/độc lập.

---

## 7. Confidence & needs_review (liên quan quyết định khóa #2: chỉ cung cấp thông tin, không bàn lại)
- Một nghiên cứu trên 7 LLM cho thấy confidence tự khai báo hiệu chỉnh tốt hơn self-consistency (ECE 0.166 vs 0.229) [E1]. Một nghiên cứu khác thấy phiếu đồng thuận rời rạc là tín hiệu yếu (AUROC ≤ 0.5 ở 5/6 ô) [E2]. Hệ handwritten HITL dùng 5 lần chấm nhưng **không tìm được ngưỡng ổn định** để tự động gắn cờ [E3].
- Hệ quả thực tế, không đổi quyết định:
  1. Áp self-consistency ở **mức từng thành phần** (dòng OCR, nhãn milestone judgement) thay vì một con số chung.
  2. Báo cáo ECE + AUROC/risk-coverage để chọn ngưỡng review trên tập held-out.
  3. Các tín hiệu tất định (UNDECIDED, nghĩa vụ treo, bằng chứng bị bác) luôn bật `needs_review` bất kể confidence.

---

## 8. Refactor đã thực hiện (không đổi hành vi, không đổi API/DB)

- `services/pipeline.py` (253 dòng, `run` và `reanalyze` lặp toàn bộ luồng) được thay bằng package `services/pipeline/`:
  - `context.py`: `PipelineContext` chứa trường của 8 layer;
  - `stages/`: `ImageQualityStage` (L1), `RecognitionStage` (L2–4, cắm P1), `VerificationStage` (L5, cắm P2), `DiagnosisStage` (L6–8, cắm P3), `ReviewGateStage` (điểm + needs_review + chỗ cắm self-consistency);
  - `orchestrator.py`: chạy danh sách stage, đo thời gian từng stage;
  - `persistence.py`: DB/storage/serialize.
  Mỗi stage nhận implementation qua constructor nên module P1–P4 có thể thay vào mà không sửa orchestrator. **P4 sẽ là một stage mới chèn giữa Verification và Diagnosis.**
- `_parse_json` bị lặp 4 lần, nay gom vào `ai/json_utils.py`. Tên model Gemini chuyển vào `config.py` (`GEMINI_OCR_MODEL`, `GEMINI_DIAGNOSTIC_MODEL`), giá trị mặc định giữ nguyên.
- `generate_milestones` (soạn rubric offline) tách khỏi `ai/diagnostic.py` sang `ai/milestone_generator.py`.
- **Đã xóa code chết:**
  - `services/grading.py` + `ai/step_grader.py`: luồng chấm cũ một lần gọi LLM, ra điểm trực tiếp, không ai import. Luồng này cũng trái quyết định khóa #1.
  - `ai/confidence_scorer.py`: file rỗng.
  Cả hai vẫn còn trong lịch sử git.
- Test: `backend/tests/`. Chạy `cd backend && uv run --group dev pytest`. Kết quả: 14 pass, 3 **xfail strict** ghi lại các ca mất nghiệm P2 phải sửa. Khi P2 sửa xong, các test này sẽ báo XPASS để bạn gỡ nhãn xfail.

---

## 9. Danh sách quyết định cần bạn duyệt

| Mã | Nội dung | Đề xuất |
|---|---|---|
| D1 | Định nghĩa milestone | Mốc lớn kiểm chứng được, 3–6/bài, 2 loại symbolic/judgement |
| D2 | Hợp đồng IR | LLM chỉ OCR → LaTeX theo dòng; IR tất định + provenance |
| D3 | Ngữ nghĩa P2 | Tập nghiệm trên miền thực; 5 nhãn + sổ nghĩa vụ |
| D4 | Tín chỉ lỗi kéo theo | Cấu hình theo rubric, mặc định có tín chỉ |
| D5 | Hướng P1 | A ngay, B thí nghiệm, C hoãn (Phase 2) |
| D6 | Thứ tự module | P2 → P4 → P3 → P1 |
| D7 | Tách lần gọi diagnosis | Tách milestone-judgement khỏi misconception/feedback |
| D8 | Tên đề tài (gợi ý, không chốt) | "Kiểm chứng ký hiệu và chấm theo mốc suy luận cho lời giải đại số THCS viết tay" / "Symbolic Verification and Milestone-based Diagnosis of Handwritten Lower-Secondary Algebra Solutions" |

---

## Tài liệu tham khảo

**P1 / OCR**
- [A1] Automated Grading of Handwritten Mathematics Using Vision-Capable LLMs, 2026 — https://arxiv.org/html/2605.19043v1
- [A2] Uni-MuMER: Unified Multi-Task Fine-Tuning of VLM for HMER, NeurIPS 2025 — https://arxiv.org/html/2505.23566v4
- [A3] FERMAT: Can Vision-Language Models Evaluate Handwritten Math?, ACL 2025 — https://arxiv.org/abs/2501.07244
- [A4] VEHME: A VLM for Evaluating Handwritten Mathematics Expressions, EMNLP 2025 — https://arxiv.org/html/2510.22798v1
- [A5] MathWriting dataset — https://arxiv.org/html/2404.10690v2
- [A6] UIT-HWDB (Vietnamese offline handwriting) — https://arxiv.org/pdf/2211.05407
- [A7] Full Page Handwriting Recognition via Image to Sequence Extraction (ghép trang tổng hợp) — https://arxiv.org/pdf/2103.06450
- [A8] Gemini logprobs: thảo luận về hỗ trợ — https://discuss.ai.google.dev/t/logprobs-is-not-enabled-for-gemini-models/107989 ; https://developers.googleblog.com/unlock-gemini-reasoning-with-logprobs-on-vertex-ai/
- [A9] HuggingFace Math-Verify / latex2sympy2_extended — https://github.com/huggingface/Math-Verify

**P2 / Equivalence**
- [B1] STACK — Equivalence reasoning — https://docs.stack-assessment.org/en/Specialist_tools/Equivalence_reasoning/Equivalence_reasoning/
- [B2] STACK — Equivalence assessment — https://docs.stack-assessment.org/en/Specialist_tools/Equivalence_reasoning/Equivalence_assessment/
- [B3] Sangwin, C.J. *An Audited Elementary Algebra*, Mathematical Gazette 99(545), 2015 — https://repository.lboro.ac.uk/articles/journal_contribution/An_audited_elementary_algebra/9368204
- [B4] Mazdarani & Toxtli, *Beyond the Answer Key: Robustness Evaluation of LLMs for Step-Level Mathematical Verification*, ICMLA 2026 — https://arxiv.org/abs/2608.28725
- [B5] Extraneous and missing solutions — https://en.wikipedia.org/wiki/Extraneous_and_missing_solutions

**P3 / Milestone**
- [C1] MathCog: Investigating/Benchmarking LLMs in Diagnosing Students' Cognitive Skills — https://arxiv.org/html/2504.00843v2
- [C2] ProofBench / ProofGrader: Reliable Fine-Grained Evaluation of Natural Language Math Proofs — https://arxiv.org/html/2510.13888v1 ; RefGrader — https://arxiv.org/pdf/2510.09021
- [C3] Otero et al., A Benchmark for Math Misconceptions (55 misconceptions) — https://arxiv.org/html/2412.03765v1
- [C4] The Lessons of Developing PRMs in Mathematical Reasoning (Qwen2.5-Math-PRM) — https://arxiv.org/pdf/2501.07301
- [C5] Out of Distribution, Out of Luck: Process Rewards Misguide Reasoning Models, EACL 2026 — https://preview.aclanthology.org/credits/2026.eacl-short.31
- [C6] PedCoT: LLMs can Find Mathematical Reasoning Mistakes by Pedagogical CoT, IJCAI 2024 — https://arxiv.org/html/2405.06705v3
- [C7] MathMistake Checker — https://arxiv.org/html/2503.04291

**P4 / First error**
- [D1] ProcessBench: Identifying Process Errors in Mathematical Reasoning, ACL 2025 — https://arxiv.org/pdf/2412.06559
- [D2] MathTutorBench — https://arxiv.org/pdf/2502.18940
- [D3] Srivatsa et al., LLMs cannot spot math errors, even when allowed to peek into the solution, EMNLP 2025 (dùng VtG của Daheim et al. 2024) — https://arxiv.org/html/2509.01395v1
- [D4] STACK — The philosophy of STACK (follow-through marking) — https://docs.stack-assessment.org/en/About/The_philosophy_of_STACK/
- [D5] Using LLMs in Physics Education (ví dụ ECF) — https://arxiv.org/pdf/2605.23660
- [D6] PAT2Math rule-based step analysis — https://www.sciencedirect.com/science/article/abs/pii/S0957417413002418
- [D7] When More Intelligent Tutoring in the Form of Buggy Messages Does not Help — https://link.springer.com/chapter/10.1007/978-3-319-19773-9_112
- ErrorRadar (ICLR 2025) — https://arxiv.org/abs/2410.04509 ; MathCCS — https://export.arxiv.org/pdf/2502.13789

**Confidence**
- [E1] When Can We Trust LLM Graders? Calibrating Confidence for Automated Assessment — https://www.researchgate.net/publication/403380093
- [E2] SCOPE: Selective Conformal Optimized Pairwise LLM Judging — https://arxiv.org/pdf/2602.13110
- [E3] Human-in-the-Loop LLM Grading for Handwritten Mathematics Assessments — https://arxiv.org/html/2603.13083
- Towards Reliable LLM Grading Through Self-Consistency and Selective Human Review (SURE) — https://www.mdpi.com/2504-4990/8/3/74
- Rubric-Conditioned LLM Grading: Alignment, Uncertainty, and Robustness — https://arxiv.org/abs/2601.08843

> Ghi chú độ tin cậy nguồn: các số liệu của [A1], [A2], [A4], [B4], [C1], [C6], [D3], [E3] được đọc từ bản toàn văn. [A3], [C4], [E1], [E2] chỉ được đọc qua abstract hoặc trang tóm tắt thứ cấp, cần đối chiếu bản gốc trước khi trích dẫn trong luận văn. Không đọc được toàn văn [B3] (bị chặn 403).
