from datetime import datetime, timedelta

def get_week_range(date_str: str, start_day: str = "Monday") -> tuple[str, str]:
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        # Fallback to today's date if invalid
        dt = datetime.utcnow()
        
    weekday = dt.weekday()
    
    if start_day == "Monday":
        start_dt = dt - timedelta(days=weekday)
    else:  # Sunday
        shift_back = (weekday + 1) % 7
        start_dt = dt - timedelta(days=shift_back)
        
    end_dt = start_dt + timedelta(days=6)
    return start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d")
