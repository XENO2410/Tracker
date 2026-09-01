"""Adherence score — weighted composite of daily habits."""
from __future__ import annotations


def adherence_score(
    *,
    protein_g: float,
    protein_target: float | None,
    calories_in: float,
    calorie_target: float | None,
    workout_done: bool,
    steps: int,
    steps_target: int | None,
    water_ml: int,
    water_target: int | None,
    sleep_score: int | None,
) -> dict:
    """
    Weights:
      protein 25%, calories 20%, workout 20%, steps 15%, water 10%, sleep 10%.
    Calorie score linear from 100 (0% dev) to 0 (≥20% dev).
    """
    protein_pct = min(100, round(100 * protein_g / protein_target)) if protein_target else 0

    if calorie_target:
        dev = abs(calories_in - calorie_target) / calorie_target
        calories_pct = max(0, min(100, round(100 * (1 - dev / 0.20))))
    else:
        calories_pct = 0

    steps_pct = min(100, round(100 * steps / steps_target)) if steps_target else 0
    water_pct = min(100, round(100 * water_ml / water_target)) if water_target else 0
    sleep_ok = bool(sleep_score and sleep_score >= 3)

    score = round(
        0.25 * protein_pct
        + 0.20 * calories_pct
        + 0.20 * (100 if workout_done else 0)
        + 0.15 * steps_pct
        + 0.10 * water_pct
        + 0.10 * (100 if sleep_ok else 0)
    )
    return {
        "score": score,
        "protein_pct": protein_pct,
        "calories_pct": calories_pct,
        "workout_done": workout_done,
        "steps_pct": steps_pct,
        "water_pct": water_pct,
        "sleep_ok": sleep_ok,
    }
