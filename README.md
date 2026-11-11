# Automatic Math Grading

Hệ thống AI hỗ trợ giáo viên chẩn đoán lời giải đại số THCS viết tay (tiếng Việt).
Không phải máy chấm điểm tự động: giáo viên quyết định điểm cuối.

Gồm 2 thành phần:
- **Backend**: FastAPI + SQLAlchemy + Alembic
- **Frontend**: React + Vite

---

## Yêu cầu

- Python >= 3.14
- Node.js >= 18
- [uv](https://docs.astral.sh/uv/getting-started/installation/)

---

## Cài đặt

### 1. Clone repo

```bash
git clone <repo-url>
cd automatic_math_grading
```

### 2. Backend

```bash
cd backend
uv sync
```

Tạo file `.env` trong thư mục `backend/`:

```env
DATABASE_URL=sqlite:///./database.db
API_PREFIX=/api
DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173
GEMINI_API_KEY=your-key-here
```

Chạy migration:

```bash
uv run alembic upgrade head
```

Khởi động server:

```bash
uv run python -m src.main
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Truy cập: http://localhost:5173

---

## Cấu trúc dự án

```
automatic_math_grading/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/    # FastAPI endpoints
│   │   │   └── schemas/   # Pydantic schemas
│   │   ├── core/          # config
│   │   ├── db/models/     # SQLAlchemy models
│   │   ├── services/      # pipeline chẩn đoán, Gemini, SymPy verifier
│   │   └── utils/
│   ├── tests/             # pytest
│   └── migrations/        # Alembic migrations
├── frontend/              # React + Vite
└── data/
    ├── storage/
    └── uploads/           # ảnh bài nộp (không commit)
```
