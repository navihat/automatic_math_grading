from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.sql import func
from sqlalchemy import DateTime

from src.core.database import Base


class Misconception(Base):
    __tablename__ = "misconceptions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    example_error = Column(Text, nullable=True)
    correction_hint = Column(Text, nullable=True)
    topic = Column(String(64), nullable=True)  # e.g. "linear_eq", "expression", "inequality"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


MISCONCEPTION_SEED = [
    {
        "code": "SIGN_TRANSPOSITION",
        "name": "Sai quy tắc chuyển vế",
        "description": "Chuyển hạng tử sang vế khác nhưng không đổi dấu.",
        "example_error": "2x + 3 = 7 → 2x = 7 + 3 (đúng phải là 2x = 7 - 3)",
        "correction_hint": "Khi chuyển vế, dấu của hạng tử phải đổi ngược lại: + thành -, - thành +.",
        "topic": "linear_eq",
    },
    {
        "code": "DISTRIBUTIVE_LAW",
        "name": "Nhầm phép phân phối",
        "description": "Chỉ nhân thừa số với một hạng tử trong ngoặc thay vì tất cả.",
        "example_error": "2(x + 3) = 2x + 3 (đúng phải là 2x + 6)",
        "correction_hint": "Nhân thừa số ngoài ngoặc với TẤT CẢ các hạng tử bên trong: a(b+c) = ab + ac.",
        "topic": "expression",
    },
    {
        "code": "BINOMIAL_SQUARE",
        "name": "Nhầm hằng đẳng thức bình phương",
        "description": "Bỏ qua hạng tử 2ab khi bình phương một tổng hoặc hiệu.",
        "example_error": "(x + y)² = x² + y² (đúng phải là x² + 2xy + y²)",
        "correction_hint": "(a ± b)² = a² ± 2ab + b². Luôn có hạng tử giữa 2ab.",
        "topic": "expression",
    },
    {
        "code": "RADICAL_ADDITION",
        "name": "Nhầm phép cộng căn thức",
        "description": "Cộng hai căn thức bằng cách cộng biểu thức dưới dấu căn.",
        "example_error": "√4 + √9 = √13 (đúng phải là 2 + 3 = 5)",
        "correction_hint": "√a + √b ≠ √(a+b). Phải tính từng căn riêng rồi mới cộng.",
        "topic": "expression",
    },
    {
        "code": "EXPONENT_PRODUCT",
        "name": "Nhầm quy tắc nhân lũy thừa",
        "description": "Nhân số mũ thay vì cộng số mũ khi nhân hai lũy thừa cùng cơ số.",
        "example_error": "x² · x³ = x⁶ (đúng phải là x⁵)",
        "correction_hint": "xᵃ · xᵇ = xᵃ⁺ᵇ. Khi nhân cùng cơ số, cộng số mũ.",
        "topic": "expression",
    },
    {
        "code": "FRACTION_ADDITION",
        "name": "Nhầm phép cộng phân số",
        "description": "Cộng tử số với tử số và mẫu số với mẫu số mà không quy đồng.",
        "example_error": "1/2 + 1/3 = 2/5 (đúng phải là 5/6)",
        "correction_hint": "Phải quy đồng mẫu số trước khi cộng phân số.",
        "topic": "expression",
    },
    {
        "code": "INEQUALITY_SIGN_FLIP",
        "name": "Không đổi chiều bất phương trình",
        "description": "Nhân hoặc chia cả hai vế với số âm nhưng không đổi chiều bất phương trình.",
        "example_error": "-2x > 4 → x > -2 (đúng phải là x < -2)",
        "correction_hint": "Khi nhân/chia hai vế với số âm, chiều bất phương trình đổi ngược.",
        "topic": "inequality",
    },
    {
        "code": "EQUATION_BALANCE",
        "name": "Vi phạm cân bằng hai vế",
        "description": "Thực hiện phép tính chỉ trên một vế của phương trình.",
        "example_error": "2x = 6 → x = 6 (quên chia vế phải cho 2)",
        "correction_hint": "Mọi phép tính phải được thực hiện đồng thời trên cả hai vế.",
        "topic": "linear_eq",
    },
    {
        "code": "NEGATIVE_MULTIPLICATION",
        "name": "Nhầm dấu khi nhân với số âm",
        "description": "Sai dấu kết quả khi nhân hai số âm hoặc một số âm với dương.",
        "example_error": "(-2) × (-3) = -6 (đúng phải là +6)",
        "correction_hint": "Âm × Âm = Dương. Âm × Dương = Âm.",
        "topic": "expression",
    },
    {
        "code": "CANCELLATION_ERROR",
        "name": "Rút gọn phân thức sai",
        "description": "Rút gọn số hạng thay vì nhân tử chung trong phân thức.",
        "example_error": "(x+2)/(x+3) = 2/3 (sai, không thể rút gọn x)",
        "correction_hint": "Chỉ rút gọn được nhân tử chung, không rút gọn số hạng cộng/trừ.",
        "topic": "expression",
    },
    {
        "code": "ORDER_OF_OPERATIONS",
        "name": "Nhầm thứ tự phép tính",
        "description": "Thực hiện phép tính không theo thứ tự ưu tiên (nhân/chia trước, cộng/trừ sau).",
        "example_error": "2 + 3 × 4 = 20 (đúng phải là 14)",
        "correction_hint": "Thứ tự: ngoặc → lũy thừa → nhân/chia → cộng/trừ (từ trái sang phải cùng cấp).",
        "topic": "expression",
    },
    {
        "code": "VARIABLE_ISOLATION",
        "name": "Cô lập biến chưa hoàn toàn",
        "description": "Dừng giải trước khi biến đứng một mình hoàn toàn.",
        "example_error": "2x = 8 (dừng ở đây thay vì tiếp tục ra x = 4)",
        "correction_hint": "Tiếp tục biến đổi cho đến khi x = [giá trị cụ thể].",
        "topic": "linear_eq",
    },
    {
        "code": "CROSS_MULTIPLICATION",
        "name": "Nhân chéo sai điều kiện",
        "description": "Áp dụng nhân chéo khi hai vế không phải là hai phân số bằng nhau.",
        "example_error": "Nhân chéo khi một vế là tổng nhiều phân số",
        "correction_hint": "Chỉ dùng nhân chéo khi phương trình có dạng a/b = c/d.",
        "topic": "linear_eq",
    },
    {
        "code": "ABSOLUTE_VALUE",
        "name": "Nhầm phép tính giá trị tuyệt đối",
        "description": "Bỏ qua trường hợp âm khi giải phương trình có giá trị tuyệt đối.",
        "example_error": "|x - 2| = 3 → x - 2 = 3 → x = 5 (bỏ qua trường hợp x = -1)",
        "correction_hint": "|A| = B (B≥0) có hai trường hợp: A = B hoặc A = -B.",
        "topic": "linear_eq",
    },
    {
        "code": "LIKE_TERMS",
        "name": "Cộng nhầm các hạng tử không đồng dạng",
        "description": "Cộng các hạng tử không cùng bậc hoặc khác biến.",
        "example_error": "3x + 2x² = 5x² (đúng phải giữ nguyên: 3x + 2x²)",
        "correction_hint": "Chỉ cộng/trừ được các hạng tử đồng dạng (cùng biến, cùng bậc).",
        "topic": "expression",
    },
]
