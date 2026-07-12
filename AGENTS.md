<!-- Source: Proposal_AI_phan_tich_loi_giai_toan_HOAN_THIEN_CO_BIEU_DO.docx -->

<!-- Note: Embedded figures/charts are marked at their original positions in the Word document. -->

ĐỀ XUẤT PROBLEM STATEMENT CHO HỆ THỐNG AI  
HỖ TRỢ PHÂN TÍCH LỜI GIẢI TOÁN VIẾT TAY

Bản hoàn thiện: bổ sung giải thích, ví dụ end-to-end và biểu đồ trực quan

# Tóm tắt điều hành

Dự án không nên được định vị là một “hệ thống chấm điểm toán tự động”. Hướng khả thi và an toàn hơn là xây dựng một hệ thống AI hỗ trợ giáo viên và học sinh phân tích lời giải toán viết tay, nhận diện các bước suy luận, phát hiện lỗi hoặc hiểu sai có thể có, và tạo phản hồi chẩn đoán để giáo viên duyệt.

Điểm cốt lõi của dự án là chuyển trọng tâm từ “đáp án cuối cùng đúng hay sai” sang “học sinh đã suy luận như thế nào”. Cách tiếp cận này phù hợp với mục tiêu giáo dục hơn, vì giáo viên cần biết học sinh sai ở bước nào, vì sao sai, và cần được hỗ trợ theo hướng nào.

| Thông điệp chính: Hệ thống không thay giáo viên chấm điểm, mà cung cấp bằng chứng, phát hiện lỗi suy luận, gợi ý misconception và đề xuất phản hồi để giáo viên hoặc học sinh xem xét. |

| --- |

[H?nh/Bi?u ?? 1: ?nh nh?ng trong t?i li?u g?c]

Hình 1. Khoảng trống nghiên cứu: từ AI chấm điểm đáp án sang AI phân tích quá trình suy luận.

# 1. Problem statement khuyến nghị

Dự án nhằm xây dựng và đánh giá một hệ thống AI hỗ trợ chuyển đổi lời giải toán viết tay của học sinh thành biểu diễn có cấu trúc, phân tách các bước suy luận, kiểm tra tính hợp lệ toán học của từng bước bằng bộ kiểm chứng ký hiệu, và sinh phản hồi chẩn đoán theo rubric phân tích dựa trên milestone cùng danh mục misconception. Hệ thống không tự động cho điểm cuối cùng, mà xuất ra bằng chứng, mức độ không chắc chắn, lỗi hoặc hiểu sai có thể có, và đề xuất phản hồi để giáo viên hoặc học sinh xem xét.

Problem statement này tách rõ ba tầng thường bị trộn lẫn: nhận diện chữ viết tay, hiểu và kiểm chứng suy luận toán học, và phản hồi sư phạm. Nhờ vậy, dự án tránh hứa hẹn quá mức về “automatic grading”, đồng thời vẫn giữ được giá trị nghiên cứu và ứng dụng thực tế.

# 2. Vì sao bài toán này khó?

| Thách thức | Ví dụ | Tác động đến hệ thống |

| --- | --- | --- |

| Nhận diện ký hiệu toán viết tay | x², x³, x? có thể bị OCR nhầm | Sai một ký hiệu có thể làm hỏng toàn bộ chẩn đoán |

| Hiểu ý nghĩa từng bước | 2x+3=7 → 2x=4 là phép trừ 3 hai vế | Nếu chỉ đọc chữ, AI không biết đây là thao tác toán học gì |

| Đánh giá quá trình suy luận | Hai học sinh cùng ra x=2 nhưng một bạn có thể suy luận sai | Không thể chỉ dựa vào đáp án cuối |

| Phản hồi sư phạm | Không chỉ nói “sai”, mà cần nói sai ở đâu và sửa thế nào | Feedback phải hữu ích cho học sinh và giáo viên |

# 3. Tiểu mục tiêu đo lường được và câu hỏi nghiên cứu

| Mục | Câu hỏi nghiên cứu / subgoal | Chỉ số gợi ý |

| --- | --- | --- |

| RQ1 | VLM/OCR có chuyển ảnh lời giải toán viết tay thành LaTeX hoặc IR có cấu trúc đủ chính xác không? | Symbol accuracy, expression accuracy, LaTeX edit distance |

| RQ2 | Hệ thống có tách đúng các dòng/bước suy luận và ánh xạ chúng vào IR không? | Step segmentation F1, IR validity rate |

| RQ3 | Kết hợp LLM + symbolic verifier + milestone rubric có phát hiện đúng bước sai và misconception không? | Precision/Recall/F1 cho lỗi và misconception |

| RQ4 | Phản hồi chẩn đoán có hữu ích hơn phản hồi chỉ dựa trên đáp án cuối không? | Teacher usefulness rating, actionability rating |

| RQ5 | Hệ thống có đủ ổn định, công bằng và an toàn để dùng như công cụ hỗ trợ không? | Cohen kappa, stability tests, subgroup analysis |

# 4. Phạm vi đề xuất và MVP

Với MVP, phạm vi nên bắt đầu hẹp ở đại số THCS: phương trình bậc nhất, rút gọn biểu thức, phép biến đổi tương đương, và giải hệ tuyến tính cơ bản. Đây là vùng có nhiều lỗi sai điển hình, có thể đặc tả misconception checklist rõ ràng, và có thể kiểm chứng bằng SymPy hoặc rule engine.

Không nên mở rộng ngay sang chứng minh hình học, bài toán nâng cao hoặc lời giải quá tự do, vì các dạng bài này đòi hỏi nhiều lời giải tham chiếu và khó kiểm chứng bằng symbolic verifier trong giai đoạn đầu.

# 5. Đầu vào, đầu ra và người dùng

| Thành phần | Mô tả đề xuất |

| --- | --- |

| Đầu vào chính | Ảnh lời giải toán viết tay; tùy chọn kèm đề bài hoặc ID bài tập |

| Đầu ra chính | Bản nhận diện, các bước giải đã tách, milestone đạt/chưa đạt, lỗi suy luận, misconception có thể có, phản hồi tự nhiên, cờ cần giáo viên xem lại |

| Giáo viên | Xem bằng chứng, rà soát lỗi, chỉnh/sửa phản hồi, quyết định điểm cuối nếu cần |

| Học sinh | Nhận phản hồi chẩn đoán, xem bước sai và gợi ý sửa; không nhận điểm tự động như kết luận cuối |

# 6. Kiến trúc tổng thể hệ thống

Pipeline không cho phép LLM “nhảy cóc” từ ảnh bài làm sang phán quyết cuối. Thay vào đó, hệ thống đi qua nhiều tầng kiểm soát: OCR/VLM, tách bước, biểu diễn trung gian, kiểm chứng ký hiệu, rubric milestone, misconception checklist và teacher review.

[H?nh/Bi?u ?? 2: ?nh nh?ng trong t?i li?u g?c]

Hình 2. Kiến trúc tổng thể của hệ thống AI hỗ trợ phân tích lời giải toán viết tay.

# 7. Các thành phần bắt buộc của hệ thống

| Thành phần | Vai trò | Ghi chú triển khai |

| --- | --- | --- |

| OCR/VLM | Nhận diện chữ viết tay và ký hiệu toán | Ưu tiên đầu ra có confidence/uncertainty |

| Step segmentation | Tách dòng và bước suy luận | Không đi thẳng từ ảnh sang feedback |

| Intermediate Representation | Lưu biểu thức, thao tác, quan hệ bước | Cầu nối giữa OCR và verifier |

| LLM interpretation | Diễn giải bước, gán nhãn thao tác, sinh feedback | Không là nguồn sự thật duy nhất |

| Symbolic verifier | Kiểm tra tương đương đại số, nghiệm, phép biến đổi | Dùng làm verifier, không làm grader chính |

| Milestone rubric | Đánh giá theo mốc suy luận | Ít khóa vào một lời giải duy nhất |

| Misconception checklist | Gắn lỗi với hiểu sai điển hình | Lõi sư phạm của phản hồi |

| Teacher review | Kiểm duyệt kết quả cuối | Bắt buộc với OCR mơ hồ hoặc low confidence |

# 8. Intermediate Representation (IR) là gì?

Intermediate Representation là biểu diễn trung gian của lời giải sau khi OCR nhận diện. Thay vì lưu lời giải dưới dạng ảnh hoặc văn bản thuần túy, hệ thống chuyển mỗi bước thành cấu trúc gồm biểu thức toán học, phép biến đổi, quan hệ với bước trước, vị trí trong ảnh và mức độ tin cậy. IR giúp LLM, verifier và rubric cùng đọc một dạng dữ liệu thống nhất.

[H?nh/Bi?u ?? 3: ?nh nh?ng trong t?i li?u g?c]

Hình 3. Ví dụ trực quan về cách chuyển lời giải học sinh sang IR.

# 9. Symbolic Verifier hoạt động như thế nào?

Verifier sử dụng công cụ đại số ký hiệu như SymPy hoặc rule engine để kiểm tra một phép biến đổi có hợp lệ không. Ví dụ, từ 2x+3=7 sang 2x=4 là hợp lệ; từ 2x+3=7 sang 2x=5 là không hợp lệ. Đây là lớp kiểm chứng giúp giảm rủi ro LLM gán nhãn nghe hợp lý nhưng sai toán học.

[H?nh/Bi?u ?? 4: ?nh nh?ng trong t?i li?u g?c]

Hình 4. Luồng quyết định của symbolic verifier khi kiểm tra hai bước liên tiếp.

# 10. Milestone-based analytic rubric

Rubric milestone đánh giá lời giải theo các mốc suy luận quan trọng thay vì chỉ so sánh với một lời giải mẫu duy nhất. Cách này phù hợp hơn với toán tự luận vì học sinh có thể có nhiều cách giải khác nhau nhưng vẫn đạt cùng một mục tiêu toán học.

[H?nh/Bi?u ?? 5: ?nh nh?ng trong t?i li?u g?c]

Hình 5. Ví dụ milestone rubric cho một bài giải đại số cơ bản.

# 11. Misconception checklist

Misconception checklist là danh mục các hiểu sai điển hình của học sinh. Khi verifier phát hiện một bước sai, hệ thống không chỉ báo sai mà cố gắng ánh xạ lỗi đó vào hiểu sai có thể có, từ đó sinh phản hồi mang tính chẩn đoán.

[H?nh/Bi?u ?? 6: ?nh nh?ng trong t?i li?u g?c]

Hình 6. Mapping từ bước sai sang misconception và phản hồi sư phạm.

| Bước sai | Misconception có thể có | Phản hồi gợi ý |

| --- | --- | --- |

| 2(x+3)=2x+3 | Chưa hiểu phép phân phối | Cần nhân 2 với cả x và 3 |

| (x+y)^2=x^2+y^2 | Nhầm hằng đẳng thức | Cần có thêm hạng tử 2xy |

| √a+√b=√(a+b) | Hiểu sai phép cộng căn thức | Không thể gộp căn theo phép cộng như vậy |

| 3 chuyển vế nhưng không đổi dấu | Sai quy tắc chuyển vế | Khi chuyển vế, hạng tử phải đổi dấu |

# 12. Workflow MVP khuyến nghị

| Giai đoạn | Nội dung |

| --- | --- |

| Offline | Xây rubric milestone và misconception checklist cho 1–2 chủ đề đại số THCS; giáo viên duyệt và khóa rubric |

| Bước 1 | Nhận ảnh, OCR/VLM, sinh LaTeX/biểu thức và confidence |

| Bước 2 | Tách từng dòng/bước giải |

| Bước 3 | Chuyển sang intermediate representation |

| Bước 4 | Verifier kiểm tra tính đúng của từng phép biến đổi, nghiệm, điều kiện |

| Bước 5 | LLM gán milestone đạt/chưa đạt và misconception khả dĩ |

| Bước 6 | Sinh phản hồi chẩn đoán kèm evidence và cờ teacher-review |

# 13. Ví dụ end-to-end

Ví dụ bài làm học sinh: 2x + 3 = 7 → 2x = 5 → x = 2.5. Hệ thống sẽ không chỉ kết luận “sai”, mà chỉ ra lỗi xảy ra ở bước chuyển vế, gắn với misconception về quy tắc chuyển vế, và tạo phản hồi để học sinh sửa.

| Tầng | Đầu vào | Xử lý | Đầu ra |

| --- | --- | --- | --- |

| OCR | Ảnh bài làm | Nhận diện ký hiệu | 2x+3=7; 2x=5; x=2.5 |

| IR | Text/LaTeX | Tách bước và gán quan hệ | Step1 → Step2 → Step3 |

| Verifier | Step1, Step2 | Kiểm tra tương đương | FALSE tại bước chuyển vế |

| Rubric | Kết quả verifier | So khớp milestone | Lập phương trình đạt; biến đổi chưa đạt |

| Misconception | Bước sai | Ánh xạ lỗi | Chưa hiểu quy tắc chuyển vế |

| Feedback | Evidence + misconception | Sinh phản hồi | “Em cần chuyển 3 sang vế phải thành -3.” |

# 14. Thí nghiệm và benchmark khuyến nghị

| Thí nghiệm | Mục tiêu | Benchmark / dữ liệu |

| --- | --- | --- |

| OCR benchmark | Đo mức đọc đúng ký hiệu và biểu thức | MathWriting, CROHME |

| Structure benchmark | Đo step segmentation và IR đúng | Tập nhỏ gán nhãn tay nội bộ, có thể tổng hợp từ MATH/ảnh giả lập |

| Reasoning benchmark | Đo phát hiện bước sai và misconception | PRM800K, benchmark misconception đại số THCS, Eedi/MAP nếu phù hợp |

| End-to-end pilot | Đo tính hữu ích thực tế với giáo viên/học sinh | Bộ dữ liệu pilot tiếng Việt do giáo viên gán nhãn |

# 15. Kế hoạch đánh giá và quản trị rủi ro

[H?nh/Bi?u ?? 7: ?nh nh?ng trong t?i li?u g?c]

Hình 7. Khung đánh giá hệ thống theo từng tầng, từ OCR đến human study và safety audit.

| Thành phần | Metric chính | Metric phụ / ghi chú |

| --- | --- | --- |

| OCR ký hiệu | Symbol accuracy | CER, token accuracy |

| OCR biểu thức | Expression accuracy / ExpRate | LaTeX edit distance |

| Tách bước | Precision / Recall / F1 | Boundary accuracy |

| Intermediate representation | Parse validity rate | % bước chuyển được sang IR hợp lệ |

| Verifier | Step-validity accuracy | Precision/Recall cho equivalent / not equivalent / illegal step |

| Misconception detection | Precision / Recall / F1 | Macro-F1 nếu taxonomy lệch lớp |

| Đồng thuận với giáo viên | Cohen kappa | Weighted kappa nếu có mức độ |

| Ổn định | Re-run consistency | Tỷ lệ đổi diagnosis qua nhiều lần chạy |

| Hữu ích sư phạm | Teacher usefulness rating | Actionability, clarity, safety |

| Công bằng | Subgroup analysis | Theo độ rõ chữ viết, độ dài bài làm, cách giải mới |

# 16. Rủi ro chính và cách giảm thiểu

| Rủi ro | Vì sao nghiêm trọng | Giảm thiểu khả thi |

| --- | --- | --- |

| OCR đọc sai ký hiệu | Sai một dấu có thể làm hỏng toàn bộ diagnosis | Confidence score, highlight token mơ hồ, teacher review nếu low confidence |

| Rubric drift | Cùng một bài nhưng rubric thay đổi theo prompt | Giáo viên duyệt và khóa rubric trước khi dùng |

| Lời giải mới hoàn toàn | Hệ thống dễ ép vào mẫu cũ | Dùng milestone rubric solution-agnostic; nhãn novel path / needs review |

| Hallucination của LLM | Gán sai thao tác hoặc misconception | Luôn có symbolic verifier và evidence trace |

| Code-verifier mismatch | Verifier kiểm cái hệ thống nghĩ học sinh viết, không phải cái học sinh thực sự viết | IR phải lưu provenance từ từng dòng OCR |

| Bias / bất công | Chữ xấu hoặc cách trình bày lạ có thể bị đánh giá sai | Subgroup audit, teacher override, không tự động cho điểm cuối |

| Overconfidence | LLM có thể tự tin sai khi chẩn đoán kỹ năng | Hiển thị uncertainty, needs review threshold, calibration study |

# 17. Lộ trình triển khai ưu tiên

[H?nh/Bi?u ?? 8: ?nh nh?ng trong t?i li?u g?c]

Hình 8. Roadmap triển khai MVP theo sáu mốc chính.

| Mốc | Deliverable |

| --- | --- |

| M1 | OCR baseline cho biểu thức đại số, đo trên MathWriting/CROHME |

| M2 | Step segmentation + intermediate representation cho 2 loại bài đại số |

| M3 | SymPy/rule engine kiểm tra phép biến đổi tương đương |

| M4 | Milestone rubric + misconception checklist được giáo viên duyệt |

| M5 | End-to-end diagnostic feedback prototype |

| M6 | Thử nghiệm teacher study và stability/fairness audit |

# 18. Dữ liệu ưu tiên và từ khóa tìm kiếm

| Ưu tiên | Dataset / nguồn | Dùng cho | Ghi chú | Từ khóa tìm kiếm |

| --- | --- | --- | --- | --- |

| Rất cao | MathWriting | OCR/HMER | Bộ lớn cho nhận diện biểu thức toán viết tay | MathWriting dataset handwritten mathematical expression recognition |

| Rất cao | CROHME | OCR/HMER benchmark | Benchmark chuẩn lâu năm cho HMER | CROHME handwritten mathematical expression recognition dataset |

| Rất cao | MATH | Lời giải từng bước | Tạo dữ liệu step structure | MATH dataset step by step solutions |

| Rất cao | PRM800K | Nhãn đúng/sai cấp bước | Hữu ích cho validator ở mức step | PRM800K step-level human feedback |

| Cao | Benchmark misconception đại số THCS | Misconception checklist | Phù hợp nhất với MVP đại số THCS | middle school algebra misconception benchmark |

| Cao | Eedi diagnostic-question data | Misconception quy mô lớn | Tốt cho ontology lỗi, ít trực tiếp cho handwriting | Eedi mining misconceptions in mathematics |

| Trung bình | MAP / MAP-Charting | Student explanations | Hữu ích cho chẩn đoán explanation-level | MAP-Charting math misunderstandings student explanations |

# 19. Đóng góp kỳ vọng

| Đóng góp kỹ thuật | Đóng góp giáo dục | Đóng góp nghiên cứu |

| --- | --- | --- |

| Pipeline kết hợp OCR/VLM, IR, symbolic verification, LLM interpretation và teacher review. | Phản hồi theo quá trình suy luận, giúp học sinh biết sai ở đâu và sửa như thế nào. | Nền tảng đánh giá năng lực giải toán, phát hiện misconception và nghiên cứu human-in-the-loop trong giáo dục. |

# 20. Kết luận triển khai

MVP nên là hệ thống AI hỗ trợ chẩn đoán lời giải đại số THCS viết tay, với pipeline: OCR → step segmentation → intermediate representation → symbolic verification → milestone rubric → misconception feedback → teacher review. Chỉ sau khi các lớp này ổn định mới nên mở rộng sang nhiều chủ đề hơn hoặc thêm thư viện lời giải tham chiếu.

Đây là hướng vừa thực thi được, vừa đúng bản chất sư phạm, và phù hợp hơn nhiều so với việc xây dựng một “máy chấm toán tự động”.

# Tài liệu tham khảo / nguồn cần đọc thêm

[1] A Benchmark for Math Misconceptions: Bridging Gaps in Middle School Algebra with AI-Supported Instruction.

[2] Investigating Large Language Models in Diagnosing Students' Cognitive Skills in Math Problem-solving.

[3] MathWriting: A Dataset For Handwritten Mathematical Expression Recognition.

[4] Handwritten Mathematical Expression Recognition via Attention Aggregation based Bi-directional Mutual Learning.

[5] Measuring Mathematical Problem Solving With the MATH Dataset.

[6] Let's Verify Step by Step / PRM800K.

[7] Instructions and Guide for Diagnostic Questions: The NeurIPS 2020 Education Challenge.

[8] Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge.
