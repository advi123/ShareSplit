from sqlalchemy import Column, String, ForeignKey, Numeric, Table
from sqlalchemy.orm import relationship
from app.core.database import Base

expense_item_participants = Table(
    "expense_item_participants",
    Base.metadata,
    Column("expense_item_id", String, ForeignKey("expense_items.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", String, ForeignKey("members.id", ondelete="CASCADE"), primary_key=True)
)

class ExpenseItem(Base):
    __tablename__ = "expense_items"

    id = Column(String, primary_key=True, index=True)
    expense_id = Column(String, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    amount = Column(Numeric(precision=10, scale=2), nullable=False)

    expense = relationship("Expense", back_populates="items")
    participants = relationship("Member", secondary=expense_item_participants)
