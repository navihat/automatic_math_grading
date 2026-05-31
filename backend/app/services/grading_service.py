from sqlalchemy.orm import Session

from app.models.result import Result
from app.models.submission import Submission
from app.models.rubric import Rubric


def extract_text_from_image(image_url: str) -> str:
    """
    Gọi OCR để trích xuất text toán học từ ảnh bài làm.
    Trả về chuỗi text đã extract.
    """
    pass


def grade_submission(db: Session, submission_id: int) -> Result:
    """
    Pipeline chấm điểm chính:
      1. Lấy submission và rubric từ DB
      2. Extract text từ ảnh (OCR) nếu chưa có ocr_text
      3. Ghép rubric + ocr_text vào prompt
      4. Gọi OpenAI để chấm điểm
      5. Parse kết quả → tạo Result và lưu vào DB
    """
    pass


def build_grading_prompt(rubric: Rubric, ocr_text: str) -> str:
    """
    Ghép nội dung rubric và bài làm thành prompt hoàn chỉnh gửi lên AI.
    Dùng template từ core/prompts.py.
    """
    pass


def parse_grading_response(ai_response: str) -> dict:
    """
    Parse JSON response từ AI thành dict gồm:
      - steps_json: dict  (các bước giải chi tiết)
      - total_score: int
      - confidence: float
    """
    pass
