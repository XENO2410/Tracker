"""Weekly aggregations. LLM narrative lives in the router."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from statistics import mean
from typing import Any


def _num(v: Any, default: float = 0.0) -> float:
    try:
        return float(v) if v not in ("", None) else default
    except (ValueError, TypeError):
        return default


def _parse_date(v: Any) -> date | None:
    try:
        return date.fromisoformat(str(v))
    except (ValueError, TypeError):
        return None


def _range_filter(rows: list[dict], key: str, start: date, end: date) -> list[dict]:
    out = []
    for r in rows:
        d = _parse_date(r.get(key))
        if d and start <= d <= end:
            out.append(r)
    return out


def weekly_aggregate(
    *,
    body_metrics: list[dict],
    food_log: list[dict],
    activity_log: list[dict],
    workout_log: list[dict],
    treat_log: list[dict],
    pr_log: list[dict],
    week_start: date,
) -> dict:
    week_end = week_start + timedelta(days=6)
    prev_start = week_start - timedelta(days=7)
    prev_end = week_start - timedelta(days=1)

    weights_this = [_num(r.get("Weight_kg")) for r in _range_filter(body_metrics, "Date", week_start, week_end)
                    if _num(r.get("Weight_kg")) > 0]
    weights_prev = [_num(r.get("Weight_kg")) for r in _range_filter(body_metrics, "Date", prev_start, prev_end)
                    if _num(r.get("Weight_kg")) > 0]
    avg_weight = round(mean(weights_this), 2) if weights_this else None
    prev_avg_weight = round(mean(weights_prev), 2) if weights_prev else None
    weight_change = round(avg_weight - prev_avg_weight, 2) if (avg_weight and prev_avg_weight) else None

    food_week = _range_filter(food_log, "Date", week_start, week_end)
    by_day_protein: dict[date, float] = defaultdict(float)
    by_day_cal: dict[date, float] = defaultdict(float)
    for r in food_week:
        d = _parse_date(r.get("Date"))
        if d:
            by_day_protein[d] += _num(r.get("Protein_g"))
            by_day_cal[d] += _num(r.get("Calories"))
    avg_protein = round(mean(by_day_protein.values()), 1) if by_day_protein else None
    avg_calories = round(mean(by_day_cal.values())) if by_day_cal else None

    act_week = _range_filter(activity_log, "Date", week_start, week_end)
    by_day_steps: dict[date, int] = defaultdict(int)
    for r in act_week:
        d = _parse_date(r.get("Date"))
        if d:
            by_day_steps[d] += int(_num(r.get("Steps")))
    avg_steps = round(mean(by_day_steps.values())) if by_day_steps else None

    wo_week = _range_filter(workout_log, "Date", week_start, week_end)
    workout_days = {_parse_date(r.get("Date")) for r in wo_week}
    workout_days.discard(None)
    workouts_completed = len(workout_days)

    treat_week = _range_filter(treat_log, "Date", week_start, week_end)
    prs_week = _range_filter(pr_log, "Date", week_start, week_end)

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "avg_weight_kg": avg_weight,
        "prev_avg_weight_kg": prev_avg_weight,
        "weight_change_kg": weight_change,
        "avg_protein_g": avg_protein,
        "avg_calories": avg_calories,
        "avg_steps": avg_steps,
        "workouts_completed": workouts_completed,
        "treat_meals": len(treat_week),
        "prs_hit": len(prs_week),
        "prs_detail": prs_week,
    }
