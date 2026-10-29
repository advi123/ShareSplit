
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Week(Base):
    __tablename__ = "weeks"

    id = Column(String, primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    status = Column(String, default="active", nullable=False)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="weeks")
    expenses = relationship("Expense", back_populates="week")
