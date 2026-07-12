# Automatic Math Grading

Hệ thống chấm điểm bài toán viết tay tự động, gồm 2 thành phần:
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
OPENAI_API_KEY=your-key-here
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

## Model AI

Weights không được commit lên git. Xem hướng dẫn tải về tại [`data/models/README.md`](data/models/README.md).

---

## Cấu trúc dự án

```
automatic_math_grading/
├── backend/
│   ├── app/
│   │   ├── core/          # config, database
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # business logic
│   │   ├── routes/        # API endpoints
│   │   └── utils/         
│   └── migrations/        # Alembic migrations
├── frontend/              # React + Vite
└── data/
    ├── models/            # weights AI (không commit)
    └── uploads/           # ảnh bài nộp (không commit)
```
