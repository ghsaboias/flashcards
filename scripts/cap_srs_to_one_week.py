import csv
import os
from datetime import datetime, timedelta
from typing import List

import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from lib.set_manager import SetManager


def parse_datetime_flexible(value: str) -> datetime:
    """Parse next_review_date in either '%Y-%m-%d %H:%M:%S' or '%Y-%m-%d'.
    Falls back to epoch if unparsable so it will not be capped accidentally."""
    value = (value or "").strip()
    try:
        if " " in value:
            return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
        return datetime.strptime(value, "%Y-%m-%d")
    except Exception:
        # Treat invalid as epoch so we do not cap it inadvertently
        return datetime(1970, 1, 1)


def cap_srs_for_file(csv_path: str) -> int:
    """Cap next_review_date to at most 7 days from now and interval_hours to 168.
    Returns number of rows changed.
    """
    if not os.path.exists(csv_path):
        return 0

    changed = 0
    rows: List[List[str]] = []
    with open(csv_path, "r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)

    cap_dt = datetime.now() + timedelta(days=7)
    cap_dt_str = cap_dt.strftime("%Y-%m-%d %H:%M:%S")

    for i, row in enumerate(rows):
        # Require extended format: [q, a, correct, incorrect, reviewed, ef, interval_hours, repetitions, next_review_date]
        if len(row) < 9:
            continue
        try:
            next_dt = parse_datetime_flexible(row[8])
            # If it's already beyond our cap, reduce it
            if next_dt > cap_dt:
                # Cap next_review_date and interval_hours
                row[8] = cap_dt_str
                row[6] = "168"
                changed += 1
        except Exception:
            # Ignore individual row errors
            continue

    if changed > 0:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows)

    return changed


def main() -> None:
    set_manager = SetManager()
    sets = set_manager.list_available_sets()
    total_changed = 0
    for s in sets:
        csv_path = set_manager.get_csv_filename(s)
        changed = cap_srs_for_file(csv_path)
        if changed:
            print(f"Updated {changed} rows in {csv_path}")
            total_changed += changed
    print(f"Done. Total rows updated: {total_changed}")


if __name__ == "__main__":
    main()


