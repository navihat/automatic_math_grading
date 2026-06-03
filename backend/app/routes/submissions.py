import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Cookie, HTTPException, Response, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.models.rubric import Rubric
from app.models.submission import Submission
from app.schemas.submission import (
    SubmissionCreate, SubmissionUpdate, SubmissionResponse
)

router = APIRouter(
    prefix="/submissions",
    tags=["submissions"],
)

def get_session_id(session_id: Optional[str] = Cookie(None)):
    if not session_id:
        session_id = str(uuid.uuid4())
    return session_id

@router.post("/rubric", response_model=SubmissionResponse)
def create_rubric(
        request: SubmissionCreate,
        background_tasks: BackgroundTasks,
        respone: Response,
        session_id = Depends(get_session_id),
        db: Session = Depends(get_db),
):
    respone.set_cookie(key="session_id", value=session_id, httponly=True)
