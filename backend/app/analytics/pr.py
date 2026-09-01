from __future__ import annotations

from datetime import date
from typing import Any


def estimated_1rm(weight_kg: float, reps: int) -> float:
    """Epley formula, capped at 1 rep."""
    if reps <= 0 or weight_kg <= 0:
        return 0.0
    if reps == 1:
        return round(weight_kg, 2)
    return round(weight_kg * (1 + reps / 30), 2)


def _parse_date(v: Any) -> date | None:
    try:
        return date.fromisoformat(str(v))
    except (ValueError, TypeError):
        return None


def _num(v: Any, default: float = 0.0) -> float:
    try:
        return float(v) if v not in ("", None) else default
    except (ValueError, TypeError):
        return default


def _int(v: Any, default: int = 0) -> int:
    try:
        return int(float(v)) if v not in ("", None) else default
    except (ValueError, TypeError):
        return default


def detect_prs(workout_rows: list[dict], as_of: date) -> list[dict]:
    """Return PRs achieved on `as_of` — best estimated 1RM per exercise that beats history.

    For bodyweight moves (is_bodyweight=true), we score by reps instead of e1RM
    so pull-up/push-up/plank progression is captured too.
    """
    by_exercise: dict[str, list[tuple[date, float, float, int, bool]]] = {}
    for r in workout_rows:
        d = _parse_date(r.get("Date"))
        if not d:
            continue
        ex = str(r.get("Exercise") or "").strip()
        if not ex:
            continue
        w = _num(r.get("Weight_kg"))
        reps = _int(r.get("Reps"))
        if reps == 0:
            continue
        bw = str(r.get("Is_Bodyweight")).lower() in ("true", "1", "yes")
        score = float(reps) if bw else estimated_1rm(w, reps)
        by_exercise.setdefault(ex, []).append((d, score, w, reps, bw))

    prs: list[dict] = []
    for ex, records in by_exercise.items():
        records.sort(key=lambda x: x[0])
        best_before = 0.0
        best_of_day: tuple[float, float, int, bool] | None = None
        for d, score, w, reps, bw in records:
            if d < as_of:
                best_before = max(best_before, score)
            elif d == as_of:
                if best_of_day is None or score > best_of_day[0]:
                    best_of_day = (score, w, reps, bw)
        if best_of_day and best_of_day[0] > best_before:
            score, w, reps, bw = best_of_day
            prs.append({
                "exercise": ex,
                "pr_type": "bodyweight" if bw else "weighted",
                "weight_kg": None if bw else w,
                "reps": reps,
                "estimated_1rm": None if bw else score,
                "previous_best": round(best_before, 2),
            })
    return prs
