from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    from sqlalchemy import text
    from app.models.classroom import Student
    from app.models.user import User
    from app.utils.security import hash_password

    Base.metadata.create_all(bind=engine)
    
    # Auto-migration for password_hash columns
    db = SessionLocal()
    try:
        # Check users table
        db.execute(text("SELECT password_hash FROM users LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
            db.commit()
        except Exception:
            db.rollback()
            
    try:
        # Check students table
        db.execute(text("SELECT password_hash FROM students LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE students ADD COLUMN password_hash VARCHAR"))
            db.commit()
        except Exception:
            db.rollback()

    try:
        db.execute(text("SELECT user_id FROM students LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE students ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            db.commit()
        except Exception:
            db.rollback()

    try:
        for student in db.query(Student).filter(Student.user_id.is_(None)).all():
            password_hash = student.password_hash or hash_password(student.student_code)
            user = User(
                role="student",
                email=None,
                name=student.name,
                password_hash=password_hash,
            )
            db.add(user)
            db.flush()
            student.user_id = user.id
            student.password_hash = password_hash
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
