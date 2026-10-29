from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base

class Bill(Base):
    __tablename__ = "bills"

    id = Column(String, primary_key=True, index=True)
    expense_id = Column(String, ForeignKey("expenses.id", ondelete="SET NULL"), nullable=True)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    expense = relationship("Expense", back_populates="bill")

    @property
    def store_name(self) -> str | None:
        return self.expense.description if self.expense else None

    @property
    def category(self) -> str | None:
        return self.expense.category if self.expense else None

    @property
    def total_amount(self) -> float | None:
        if self.expense and self.expense.total_amount is not None:
            return float(self.expense.total_amount)
        return None

    @property
    def paid_by(self) -> str | None:
        return self.expense.paid_by if self.expense else None

    @property
    def paid_by_name(self) -> str | None:
        if self.expense and self.expense.payer:
            return self.expense.payer.name
        return None

    @property
    def date(self) -> str | None:
        return self.expense.date if self.expense else None
