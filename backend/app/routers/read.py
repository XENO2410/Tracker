"""Read endpoints — daily summary, weight trend, food history, adherence."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends

from ..analytics.adherence import adherence_score
from ..analytics.rolling import daily_series, rolling_average, week_over_week
from ..clients.sheets import SheetsClient, get_sheets_client

router = APIRouter()


def _num(v: Any, d: float = 0.0) -> float:
    try:
        return float(v) if v not in ("", None) else d
    except (ValueError, TypeError):
        return d


def _int(v: Any, d: int = 0) -> int:
    try:
        return int(float(v)) if v not in ("", None) else d
    except (ValueError, TypeError):
        return d


def _parse_date(v: Any) -> date | None:
    try:
        return date.fromisoformat(str(v))
    except (ValueError, TypeError):
        return None


def _profile_kv(sc: SheetsClient) -> dict[str, str]:
    rows = sc.ws("Profile").get_all_values()
    return {r[0]: (r[1] if len(r) > 1 else "") for r in rows[1:] if r and r[0]}


@router.get("/daily")
def daily(
    on: date | None = None,
    sc: SheetsClient = Depends(get_sheets_client),
) -> dict:
    d = on or datetime.now().date()
    ds = d.isoformat()

    food = [r for r in sc.all_records("Food_Log") if str(r.get("Date")) == ds]
    water = [r for r in sc.all_records("Water_Log") if str(r.get("Date")) == ds]
    act = [r for r in sc.all_records("Activity_Log") if str(r.get("Date")) == ds]
    body_rows = [r for r in sc.all_records("Body_Metrics") if str(r.get("Date")) == ds]
    weight = next((_num(r["Weight_kg"]) for r in body_rows if _num(r.get("Weight_kg")) > 0), None)
    workout_rows = [r for r in sc.all_records("Workout_Log") if str(r.get("Date")) == ds]
    recovery_rows = [r for r in sc.all_records("Recovery_Log") if str(r.get("Date")) == ds]
    sleep_score = _int(recovery_rows[-1].get("Sleep_Score")) if recovery_rows else None

    totals = {
        "date": ds,
        "calories_in": round(sum(_num(r.get("Calories")) for r in food), 1),
        "protein_g": round(sum(_num(r.get("Protein_g")) for r in food), 1),
        "carbs_g": round(sum(_num(r.get("Carbs_g")) for r in food), 1),
        "fat_g": round(sum(_num(r.get("Fat_g")) for r in food), 1),
        "fibre_g": round(sum(_num(r.get("Fibre_g")) for r in food), 1),
        "water_ml": int(sum(_int(r.get("Water_ml")) for r in water)),
        "steps": int(sum(_int(r.get("Steps")) for r in act)),
        "calories_burned": int(sum(_int(r.get("Calories_Burned")) for r in act)),
        "weight_kg": weight,
        "workout_done": bool(workout_rows),
        "food_items": food,
        "activities": act,
        "workout_sets": len(workout_rows),
    }

    prof = _profile_kv(sc)
    adherence = adherence_score(
        protein_g=totals["protein_g"],
        protein_target=_num(prof.get("daily_protein_target_g")) or None,
        calories_in=totals["calories_in"],
        calorie_target=_num(prof.get("daily_calorie_target")) or None,
        workout_done=totals["workout_done"],
        steps=totals["steps"],
        steps_target=_int(prof.get("daily_steps_target"), 10000),
        water_ml=totals["water_ml"],
        water_target=_int(prof.get("daily_water_target_ml"), 3000),
        sleep_score=sleep_score,
    )
    totals["adherence"] = adherence
    totals["targets"] = {
        "protein_g": _num(prof.get("daily_protein_target_g")) or None,
        "calorie_target": _num(prof.get("daily_calorie_target")) or None,
        "steps": _int(prof.get("daily_steps_target"), 10000),
        "water_ml": _int(prof.get("daily_water_target_ml"), 3000),
    }
    return totals


@router.get("/weight/trend")
def weight_trend(
    days: int = 60,
    on: date | None = None,
    sc: SheetsClient = Depends(get_sheets_client),
) -> dict:
    rows = sc.all_records("Body_Metrics")
    entries: list[tuple[date, float]] = []
    for r in rows:
        d = _parse_date(r.get("Date"))
        w = _num(r.get("Weight_kg"))
        if d and w > 0:
            entries.append((d, w))
    curr, prev, change = week_over_week(entries, on)
    series = daily_series(entries, days=days, as_of=on)
    # rolling avg per point (right-aligned 7-day window)
    for i, point in enumerate(series):
        d = date.fromisoformat(point["date"])
        avg = rolling_average(entries, 7, d)
        point["rolling_7"] = avg
    return {
        "current_7day_avg": curr,
        "previous_7day_avg": prev,
        "change_kg": change,
        "series": series,
        "raw_history": [{"date": d.isoformat(), "weight": w} for d, w in sorted(entries)],
    }


@router.get("/measurements/history")
def measurement_history(
    days: int = 180,
    sc: SheetsClient = Depends(get_sheets_client),
) -> list[dict]:
    end = datetime.now().date()
    start = end - timedelta(days=days)
    rows = sc.all_records("Body_Metrics")
    out = []
    for r in rows:
        d = _parse_date(r.get("Date"))
        if not d or d < start:
            continue
        out.append({
            "date": d.isoformat(),
            "weight_kg": _num(r.get("Weight_kg")) or None,
            "waist_cm": _num(r.get("Waist_cm")) or None,
            "abdomen_cm": _num(r.get("Abdomen_cm")) or None,
            "chest_cm": _num(r.get("Chest_cm")) or None,
            "arm_cm": _num(r.get("Arm_cm")) or None,
            "thigh_cm": _num(r.get("Thigh_cm")) or None,
            "hip_cm": _num(r.get("Hip_cm")) or None,
            "body_fat_pct": _num(r.get("Body_Fat_%")) or None,
            "notes": r.get("Notes") or None,
        })
    return sorted(out, key=lambda x: x["date"])


@router.get("/food/recent")
def food_recent(
    days: int = 7,
    sc: SheetsClient = Depends(get_sheets_client),
) -> list[dict]:
    end = datetime.now().date()
    start = end - timedelta(days=days - 1)
    rows = sc.all_records("Food_Log")
    out = []
    for r in rows:
        d = _parse_date(r.get("Date"))
        if d and start <= d <= end:
            out.append(r)
    return list(reversed(out))


@router.get("/cravings/recent")
def cravings_recent(
    days: int = 14,
    sc: SheetsClient = Depends(get_sheets_client),
) -> list[dict]:
    end = datetime.now().date()
    start = end - timedelta(days=days - 1)
    rows = sc.all_records("Craving_Log")
    return list(reversed([r for r in rows if (_parse_date(r.get("Date")) or start) >= start]))


@router.get("/treats/recent")
def treats_recent(
    days: int = 30,
    sc: SheetsClient = Depends(get_sheets_client),
) -> list[dict]:
    end = datetime.now().date()
    start = end - timedelta(days=days - 1)
    rows = sc.all_records("Treat_Meal_Log")
    return list(reversed([r for r in rows if (_parse_date(r.get("Date")) or start) >= start]))
