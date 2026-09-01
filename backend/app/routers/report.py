"""Weekly report — aggregations + LLM narrative recommendation."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends

from ..analytics.weekly import weekly_aggregate
from ..clients.llm import get_llm_client
from ..clients.sheets import SheetsClient, get_sheets_client
from ..config import get_settings

router = APIRouter()


REPORT_SYSTEM = """You are a warm, evidence-based body-recomp coach.
Given a JSON summary of a user's week, write 4-6 short bullet points:
1) What the numbers actually say (weight trend interpreted correctly — water weight vs fat loss).
2) One clear thing that went well.
3) One thing to watch (calorie/protein/step gap, workout consistency).
4) A concrete recommendation for next week (max one change — don't overload).
5) End with an encouraging one-liner. No hype, no emojis.
Never suggest calorie changes unless weight trend has ≥14 days of data.
Never label a single day as "bad" or "off track".
"""


@router.get("/weekly")
def weekly_report(
    week_start: date | None = None,
    sc: SheetsClient = Depends(get_sheets_client),
) -> dict:
    today = datetime.now().date()
    ws = week_start or (today - timedelta(days=today.weekday()))

    agg = weekly_aggregate(
        body_metrics=sc.all_records("Body_Metrics"),
        food_log=sc.all_records("Food_Log"),
        activity_log=sc.all_records("Activity_Log"),
        workout_log=sc.all_records("Workout_Log"),
        treat_log=sc.all_records("Treat_Meal_Log"),
        pr_log=sc.all_records("PR_Log"),
        week_start=ws,
    )

    recommendation = _llm_recommendation(agg)
    agg["recommendation"] = recommendation

    try:
        sc.append_row("Weekly_Report", [
            agg["week_start"], agg["avg_weight_kg"], agg["weight_change_kg"],
            agg["avg_protein_g"], agg["avg_calories"], agg["workouts_completed"],
            agg["avg_steps"], agg["prs_hit"], agg["treat_meals"], recommendation,
        ])
    except Exception:
        pass
    return agg


def _llm_recommendation(agg: dict) -> str:
    client = get_llm_client()
    s = get_settings()
    import json as _json
    try:
        resp = client.chat.completions.create(
            model=s.llm_report_model,
            messages=[
                {"role": "system", "content": REPORT_SYSTEM},
                {"role": "user", "content": _json.dumps(agg, default=str)},
            ],
            temperature=0.4,
            max_tokens=500,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        return f"(Could not generate recommendation: {e})"
