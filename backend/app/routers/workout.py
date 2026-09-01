"""Workout-specific reads: exercise list, history, PRs."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends

from ..analytics.pr import detect_prs, estimated_1rm
from ..clients.sheets import SheetsClient, get_sheets_client

router = APIRouter()


def _parse_date(v: Any) -> date | None:
    try:
        return date.fromisoformat(str(v))
    except (ValueError, TypeError):
        return None


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


def _bool(v: Any) -> bool:
    return str(v).strip().lower() in ("true", "1", "yes")


@router.get("/exercises")
def exercises(sc: SheetsClient = Depends(get_sheets_client)) -> list[dict]:
    rows = sc.all_records("Workout_Log")
    counts: dict[str, int] = defaultdict(int)
    last_seen: dict[str, str] = {}
    for r in rows:
        ex = str(r.get("Exercise") or "").strip()
        if not ex:
            continue
        counts[ex] += 1
        d = str(r.get("Date") or "")
        if d > last_seen.get(ex, ""):
            last_seen[ex] = d
    return [
        {"exercise": ex, "sets_logged": counts[ex], "last_done": last_seen[ex]}
        for ex in sorted(counts, key=lambda x: (-counts[x], x))
    ]


@router.get("/history")
def history(
    exercise: str,
    sc: SheetsClient = Depends(get_sheets_client),
) -> list[dict]:
    rows = [r for r in sc.all_records("Workout_Log") if str(r.get("Exercise")) == exercise]
    by_date: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_date[str(r.get("Date"))].append({
            "set": _int(r.get("Set_Number")),
            "weight_kg": _num(r.get("Weight_kg")) or None,
            "reps": _int(r.get("Reps")),
            "rir": _int(r.get("RIR")) or None,
            "is_bodyweight": _bool(r.get("Is_Bodyweight")),
            "notes": r.get("Notes") or None,
        })
    sessions = []
    for d, sets in sorted(by_date.items()):
        sets.sort(key=lambda s: s["set"])
        best = 0.0
        for s in sets:
            if s["is_bodyweight"]:
                best = max(best, float(s["reps"]))
            else:
                best = max(best, estimated_1rm(s["weight_kg"] or 0, s["reps"]))
        sessions.append({"date": d, "sets": sets, "best_score": round(best, 2)})
    return sessions


@router.get("/prs")
def prs(
    days: int = 90,
    sc: SheetsClient = Depends(get_sheets_client),
) -> list[dict]:
    """Return every day in the range with any new PRs detected."""
    end = datetime.now().date()
    start = end - timedelta(days=days)
    rows = sc.all_records("Workout_Log")
    logged_dates = sorted({_parse_date(r.get("Date")) for r in rows} - {None})
    all_prs: list[dict] = []
    for d in logged_dates:
        if d < start:
            continue
        for pr in detect_prs(rows, d):
            pr["date"] = d.isoformat()
            all_prs.append(pr)
    all_prs.sort(key=lambda x: x["date"], reverse=True)
    return all_prs


@router.get("/recent-sessions")
def recent_sessions(
    days: int = 14,
    sc: SheetsClient = Depends(get_sheets_client),
) -> list[dict]:
    end = datetime.now().date()
    start = end - timedelta(days=days - 1)
    rows = sc.all_records("Workout_Log")
    by_date: dict[str, dict] = defaultdict(lambda: {"exercises": defaultdict(list), "split": None, "notes": None})
    for r in rows:
        d = _parse_date(r.get("Date"))
        if not d or not (start <= d <= end):
            continue
        session = by_date[d.isoformat()]
        session["split"] = session["split"] or r.get("Split") or None
        session["notes"] = session["notes"] or r.get("Notes") or None
        ex = str(r.get("Exercise") or "").strip()
        if ex:
            session["exercises"][ex].append({
                "set": _int(r.get("Set_Number")),
                "weight_kg": _num(r.get("Weight_kg")) or None,
                "reps": _int(r.get("Reps")),
                "rir": _int(r.get("RIR")) or None,
                "is_bodyweight": _bool(r.get("Is_Bodyweight")),
            })
    out = []
    for d, s in sorted(by_date.items(), reverse=True):
        exs = []
        for ex, sets in s["exercises"].items():
            sets.sort(key=lambda x: x["set"])
            exs.append({"exercise": ex, "sets": sets})
        out.append({"date": d, "split": s["split"], "notes": s["notes"], "exercises": exs})
    return out
