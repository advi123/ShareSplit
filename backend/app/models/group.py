from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Group(Base):
    __tablename__ = "groups"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    currency = Column(String, default="₹")
    week_start_day = Column(String, default="Monday")
    gemini_api_key = Column(String, nullable=True)
    group_type = Column(String(20), default="home")
    invite_code = Column(String, unique=True, index=True, nullable=True)
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    members = relationship("Member", back_populates="group", cascade="all, delete-orphan")
    weeks = relationship("Week", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="group", cascade="all, delete-orphan")
    user_groups = relationship("UserGroup", back_populates="group", cascade="all, delete-orphan")
