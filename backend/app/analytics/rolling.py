from __future__ import annotations

from datetime import date, timedelta
from statistics import mean


def rolling_average(
    entries: list[tuple[date, float]],
    window_days: int = 7,
    as_of: date | None = None,
) -> float | None:
    if not entries:
        return None
    entries = sorted(entries)
    end = as_of or entries[-1][0]
    start = end - timedelta(days=window_days - 1)
    window = [v for d, v in entries if start <= d <= end]
    return round(mean(window), 3) if window else None


def week_over_week(
    entries: list[tuple[date, float]],
    as_of: date | None = None,
) -> tuple[float | None, float | None, float | None]:
    """(current 7-day avg, previous 7-day avg, change)."""
    if not entries:
        return None, None, None
    entries = sorted(entries)
    end = as_of or entries[-1][0]
    curr = rolling_average(entries, 7, end)
    prev = rolling_average(entries, 7, end - timedelta(days=7))
    change = round(curr - prev, 3) if (curr is not None and prev is not None) else None
    return curr, prev, change


def daily_series(
    entries: list[tuple[date, float]],
    days: int = 30,
    as_of: date | None = None,
) -> list[dict]:
    """Fill missing days with None; useful for charts."""
    if not entries:
        return []
    entries = sorted(entries)
    end = as_of or entries[-1][0]
    start = end - timedelta(days=days - 1)
    by_date = {d: v for d, v in entries}
    out = []
    d = start
    while d <= end:
        out.append({"date": d.isoformat(), "value": by_date.get(d)})
        d += timedelta(days=1)
    return out
