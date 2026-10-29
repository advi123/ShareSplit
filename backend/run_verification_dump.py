import os
import sys
import json
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Configure database URL to verification SQLite file
VERIFY_DB = "verify_sharesplit.db"
if os.path.exists(VERIFY_DB):
    try:
        os.remove(VERIFY_DB)
    except Exception:
        pass

os.environ["DATABASE_URL"] = f"sqlite:///{VERIFY_DB}"

from app.core.database import SessionLocal, engine, Base
from app.models.group import Group
from app.models.member import Member
from app.models.expense import Expense
from app.models.week import Week
from app.models.bill import Bill
import app.services.group_service as group_service
import app.services.member_service as member_service
import app.services.expense_service as expense_service
import app.services.settlement_service as settlement_service
import app.services.week_service as week_service
from app.schemas.member import MemberCreate
from app.schemas.expense import ExpenseCreate, ExpenseItemCreate

# Initialize database tables
Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("==================================================")
print("RUNNING END-TO-END MULTI-DAY VERIFICATION")
print("==================================================")

try:
    # 1. Create Default Group
    group = group_service.get_or_create_default_group(db)
    print(f"Created Group ID: {group.id}")
    print(f"Group Name: {group.name}")
    print(f"Currency: {group.currency}")
    print(f"Week Starts On: {group.week_start_day}\n")

    # 2. Add Members
    you = member_repo = member_service.member_repo.create_member(
        db, group.id, "mem-you", MemberCreate(name="You", nickname="Me", color="bg-slate-700")
    )
    b = member_service.member_repo.create_member(
        db, group.id, "mem-b", MemberCreate(name="Person B", nickname="Ben", color="bg-slate-600")
    )
    c = member_service.member_repo.create_member(
        db, group.id, "mem-c", MemberCreate(name="Person C", nickname="Caty", color="bg-slate-500")
    )
    
    print("Seeded Members:")
    print(f"- {you.name} (ID: {you.id})")
    print(f"- {b.name} (ID: {b.id})")
    print(f"- {c.name} (ID: {c.id})\n")

    # 3. Add Monday Expense (Aug 10): You pays 900 travel. Shared: You + B + C.
    exp_mon = expense_service.validate_and_create_expense(
        db, group.id, ExpenseCreate(
            description="Monday Travel",
            category="Travel",
            date="2026-08-10",
            type="simple",
            paid_by=you.id,
            total_amount=900.00,
            participants=[you.id, b.id, c.id]
        )
    )
    print(f"Created Expense Monday: ID={exp_mon.id}, Date={exp_mon.date}, Week={exp_mon.week_id}, Amount={exp_mon.total_amount}")

    # 4. Add Tuesday Expense (Aug 11): B pays 600 groceries. Shared: You + B + C.
    exp_tue = expense_service.validate_and_create_expense(
        db, group.id, ExpenseCreate(
            description="Tuesday Groceries",
            category="Groceries",
            date="2026-08-11",
            type="simple",
            paid_by=b.id,
            total_amount=600.00,
            participants=[you.id, b.id, c.id]
        )
    )
    print(f"Created Expense Tuesday: ID={exp_tue.id}, Date={exp_tue.date}, Week={exp_tue.week_id}, Amount={exp_tue.total_amount}")

    # 5. Add Wednesday Expense (Aug 12): C pays 450 itemized.
    exp_wed = expense_service.validate_and_create_expense(
        db, group.id, ExpenseCreate(
            description="Wednesday Itemized",
            category="Groceries",
            date="2026-08-12",
            type="itemized",
            paid_by=c.id,
            total_amount=450.00,
            items=[
                ExpenseItemCreate(name="Item 1", amount=150.00, participants=[you.id, b.id, c.id]),
                ExpenseItemCreate(name="Item 2", amount=100.00, participants=[b.id]),
                ExpenseItemCreate(name="Item 3", amount=200.00, participants=[you.id, c.id])
            ]
        )
    )
    print(f"Created Expense Wednesday: ID={exp_wed.id}, Date={exp_wed.date}, Week={exp_wed.week_id}, Amount={exp_wed.total_amount}")

    # 6. Add Thursday Expense (Aug 13): You pays 750 dinner. Shared: You + B + C.
    exp_thu = expense_service.validate_and_create_expense(
        db, group.id, ExpenseCreate(
            description="Thursday Dinner",
            category="Entertainment",
            date="2026-08-13",
            type="simple",
            paid_by=you.id,
            total_amount=750.00,
            participants=[you.id, b.id, c.id]
        )
    )
    print(f"Created Expense Thursday: ID={exp_thu.id}, Date={exp_thu.date}, Week={exp_thu.week_id}, Amount={exp_thu.total_amount}")

    # 7. Add Friday Expense (Aug 14): B pays 300 travel. Shared: You + B.
    exp_fri = expense_service.validate_and_create_expense(
        db, group.id, ExpenseCreate(
            description="Friday Travel",
            category="Travel",
            date="2026-08-14",
            type="simple",
            paid_by=b.id,
            total_amount=300.00,
            participants=[you.id, b.id]
        )
    )
    print(f"Created Expense Friday: ID={exp_fri.id}, Date={exp_fri.date}, Week={exp_fri.week_id}, Amount={exp_fri.total_amount}")

    # 8. Add Saturday Expense (Aug 15): C pays 900 groceries. Shared: You + B + C.
    exp_sat = expense_service.validate_and_create_expense(
        db, group.id, ExpenseCreate(
            description="Saturday Groceries",
            category="Groceries",
            date="2026-08-15",
            type="simple",
            paid_by=c.id,
            total_amount=900.00,
            participants=[you.id, b.id, c.id]
        )
    )
    print(f"Created Expense Saturday: ID={exp_sat.id}, Date={exp_sat.date}, Week={exp_sat.week_id}, Amount={exp_sat.total_amount}\n")

    # 9. Perform Settlements
    print("--------------------------------------------------")
    print("DAILY SETTLEMENT FOR MONDAY (Aug 10)")
    print("--------------------------------------------------")
    day_set = settlement_service.calculate_settlement_range(db, group.id, "2026-08-10", "2026-08-10")
    print(f"Total spent: {day_set.total_expenses}")
    for tx in day_set.settlement:
        print(f"- {tx.from_member_name} pays {tx.to_member_name} {tx.amount}")
    print()

    print("--------------------------------------------------")
    print("WEEKLY SETTLEMENT FOR WEEK week-2026-08-10")
    print("--------------------------------------------------")
    week_set = settlement_service.calculate_settlement_range(db, group.id, "2026-08-10", "2026-08-16")
    print(f"Total spent: {week_set.total_expenses}")
    print("Member summaries:")
    for m in week_set.members:
        print(f"  * {m.name}: Paid={m.total_paid}, Share={m.total_share}, Balance={m.net_balance}")
    print("Transactions:")
    for tx in week_set.settlement:
        print(f"  * {tx.from_member_name} pays {tx.to_member_name} {tx.amount}")
    print()

    print("--------------------------------------------------")
    print("CUSTOM RANGE SETTLEMENT FOR Aug 10 -> Aug 13")
    print("--------------------------------------------------")
    custom_1 = settlement_service.calculate_settlement_range(db, group.id, "2026-08-10", "2026-08-13")
    print(f"Total spent: {custom_1.total_expenses}")
    for tx in custom_1.settlement:
        print(f"  * {tx.from_member_name} pays {tx.to_member_name} {tx.amount}")
    print()

    print("--------------------------------------------------")
    print("CUSTOM RANGE SETTLEMENT FOR Aug 11 -> Aug 15")
    print("--------------------------------------------------")
    custom_2 = settlement_service.calculate_settlement_range(db, group.id, "2026-08-11", "2026-08-15")
    print(f"Total spent: {custom_2.total_expenses}")
    for tx in custom_2.settlement:
        print(f"  * {tx.from_member_name} pays {tx.to_member_name} {tx.amount}")
    print()

finally:
    db.close()
    engine.dispose()
    if os.path.exists(VERIFY_DB):
        try:
            os.remove(VERIFY_DB)
        except Exception:
            pass
    print("==================================================")
    print("VERIFICATION COMPLETED")
    print("==================================================")
