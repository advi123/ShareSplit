from pydantic import BaseModel
from typing import List

class MemberSettlementSummary(BaseModel):
    member_id: str
    name: str
    total_paid: float
    total_share: float
    net_balance: float

class SettlementTransaction(BaseModel):
    from_member_id: str
    from_member_name: str
    to_member_id: str
    to_member_name: str
    amount: float

class SettlementResponse(BaseModel):
    from_date: str
    to_date: str
    total_expenses: float
    members: List[MemberSettlementSummary]
    settlement: List[SettlementTransaction]
