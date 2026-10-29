import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
from app.core.database import Base
from app.models.group import Group
from app.models.member import Member
from app.models.week import Week
from app.models.expense import Expense
from app.models.expense_item import ExpenseItem
from app.models.bill import Bill
from sqlalchemy import create_engine, text

SUPABASE_URL = "postgresql://postgres.leykulknjaybsjlxslke:dkKVJnPBJbBDqrRm@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
SQLITE_DB = "sharesplit.db"

def main():
    print("1. Ensuring schema in Supabase PostgreSQL...")
    engine = create_engine(SUPABASE_URL)
    Base.metadata.create_all(bind=engine)
    print(" Schema verified in Supabase!")

    print("\n2. Migrating data from SQLite to Supabase...")
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    s_cur = sqlite_conn.cursor()

    pg_conn = psycopg2.connect(SUPABASE_URL)
    pg_cur = pg_conn.cursor()

    tables = [
        "groups",
        "members",
        "weeks",
        "expenses",
        "bills",
        "expense_items",
        "expense_participants",
        "expense_item_participants"
    ]

    for table in tables:
        try:
            s_cur.execute(f"SELECT * FROM {table}")
            rows = s_cur.fetchall()
            if not rows:
                print(f"  - {table}: 0 rows (skipped)")
                continue

            col_names = [col[0] for col in s_cur.description]
            cols_str = ", ".join(col_names)
            placeholders = ", ".join(["%s"] * len(col_names))

            insert_query = f"""
                INSERT INTO {table} ({cols_str})
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
            """

            converted_data = []
            for row in rows:
                row_dict = dict(row)
                if "is_active" in row_dict:
                    row_dict["is_active"] = bool(row_dict["is_active"])
                converted_data.append(tuple(row_dict[col] for col in col_names))

            execute_batch(pg_cur, insert_query, converted_data)
            pg_conn.commit()
            print(f"  + {table}: {len(rows)} rows migrated successfully!")
        except Exception as e:
            pg_conn.rollback()
            print(f"  ! Error migrating {table}: {e}")

    s_cur.close()
    sqlite_conn.close()
    pg_cur.close()
    pg_conn.close()

    print("\n3. Verifying migration...")
    test_engine = create_engine(SUPABASE_URL)
    with test_engine.connect() as conn:
        for table in tables:
            try:
                res = conn.execute(text(f"SELECT count(*) FROM {table}"))
                count = res.scalar()
                print(f"  -> Supabase {table}: {count} total rows")
            except Exception as e:
                print(f"  -> Error reading {table}: {e}")

    print("\n[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
