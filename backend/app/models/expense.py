from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Table
from sqlalchemy.orm import relationship
from app.core.database import Base

expense_participants = Table(
    "expense_participants",
    Base.metadata,
    Column("expense_id", String, ForeignKey("expenses.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", String, ForeignKey("members.id", ondelete="CASCADE"), primary_key=True)
)

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    week_id = Column(String, ForeignKey("weeks.id"), nullable=False)
    date = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    type = Column(String, nullable=False)
    source = Column(String, nullable=False)
    paid_by = Column(String, ForeignKey("members.id"), nullable=False)
    total_amount = Column(Numeric(precision=10, scale=2), nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    group = relationship("Group", back_populates="expenses")
    week = relationship("Week", back_populates="expenses")
    payer = relationship("Member", foreign_keys=[paid_by])
    participants = relationship("Member", secondary=expense_participants)
    items = relationship("ExpenseItem", back_populates="expense", cascade="all, delete-orphan")
    bill = relationship("Bill", back_populates="expense", uselist=False)
