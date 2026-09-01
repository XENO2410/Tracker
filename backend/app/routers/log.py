"""Write endpoints — parse and log."""
from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException

from ..clients.sheets import SheetsClient, get_sheets_client
from ..parsers.extract import parse_input
from ..schemas.logs import (
    ActivityLog, CravingLog, ExtractedLog, FoodLog, MeasurementLog,
    ParseIn, RecoveryLog, TreatMealLog, WaterLog, WeightLog, WorkoutLog,
)

router = APIRouter()


def _today() -> date:
    return datetime.now().date()


def _ts() -> str:
    return datetime.now().isoformat(timespec="seconds")


@router.post("/parse", response_model=ExtractedLog)
def parse(body: ParseIn) -> ExtractedLog:
    try:
        return parse_input(body.text, meal_hint=body.meal_hint)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse failed: {e}") from e


@router.post("/food")
def log_food(body: FoodLog, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    d = (body.date or _today()).isoformat()
    ts = _ts()
    for item in body.items:
        sc.append_row("Food_Log", [
            ts, d, body.meal, item.food_item, item.quantity, item.unit,
            item.protein_g, item.carbs_g, item.fat_g, item.fibre_g,
            item.calories, item.confidence,
            body.hunger_before, body.fullness_after, body.craving_level,
            item.notes or body.notes,
        ])
    return {"logged": len(body.items)}


@router.post("/water")
def log_water(body: WaterLog, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    d = (body.date or _today()).isoformat()
    sc.append_row("Water_Log", [_ts(), d, body.water_ml])
    return {"ok": True}


@router.post("/weight")
def log_weight(body: WeightLog, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    d = (body.date or _today()).isoformat()
    sc.append_row("Body_Metrics", [d, body.weight_kg, "", "", "", "", "", "", "", body.notes])
    return {"ok": True}


@router.post("/measurement")
def log_measurement(body: MeasurementLog, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    d = (body.date or _today()).isoformat()
    sc.append_row("Body_Metrics", [
        d, body.weight_kg, body.waist_cm, body.abdomen_cm,
        body.chest_cm, body.arm_cm, body.thigh_cm, body.hip_cm,
        body.body_fat_pct, body.notes,
    ])
    return {"ok": True}


@router.post("/activity")
def log_activity(body: ActivityLog, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    d = (body.date or _today()).isoformat()
    sc.append_row("Activity_Log", [
        _ts(), d, body.activity_type, body.duration_min,
        body.calories_burned, body.steps, body.notes,
    ])
    return {"ok": True}


@router.post("/workout")
def log_workout(body: WorkoutLog, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    d = (body.date or _today()).isoformat()
    ts = _ts()
    count = 0
    for ex in body.exercises:
        for st in ex.sets:
            sc.append_row("Workout_Log", [
                ts, d, body.split, ex.exercise, st.set_number,
                st.weight_kg, st.reps, st.rir, st.is_bodyweight, body.notes,
            ])
            count += 1
    return {"sets_logged": count, "exercises": len(body.exercises)}


@router.post("/craving")
def log_craving(body: CravingLog, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    d = (body.date or _today()).isoformat()
    sc.append_row("Craving_Log", [
        _ts(), d, body.meal, body.craving_level, body.what_craved,
        body.ate_it, body.trigger_context, body.notes,
    ])
    return {"ok": True}


@router.post("/treat")
def log_treat(body: TreatMealLog, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    d = (body.date or _today()).isoformat()
    sc.append_row("Treat_Meal_Log", [
        d, body.meal, body.items, body.est_calories,
        body.satisfaction_1_10, body.worth_it, body.notes,
    ])
    return {"ok": True}


@router.post("/recovery")
def log_recovery(body: RecoveryLog, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    d = (body.date or _today()).isoformat()
    sc.append_row("Recovery_Log", [
        d, body.sleep_score, body.energy, body.stress,
        body.soreness, body.mood, body.notes,
    ])
    return {"ok": True}
