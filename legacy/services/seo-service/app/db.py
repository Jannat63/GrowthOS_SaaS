import os
import uuid
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Integer, ForeignKey, JSON, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:growthos@localhost:5432/growthos"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class SiteAuditRow(Base):
    __tablename__ = "site_audits"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=False)
    start_url = Column(String, nullable=False)
    pages_audited = Column(Integer, nullable=False)
    total_issues = Column(Integer, nullable=False)
    results = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_connection() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
