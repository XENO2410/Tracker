"""LLM-based universal input parser. Classifies free text into one log type + payload.

Products stored in the Products tab are injected into the system prompt so the LLM
uses the user's exact values instead of guessing.
"""
from __future__ import annotations

import json

from ..clients.llm import get_llm_client
from ..clients.sheets import get_sheets_client
from ..config import get_settings
from ..schemas.logs import ExtractedLog

BASE_SYSTEM_PROMPT = """You are the parser for a personal body-recomposition tracker.
The user sends short natural-language notes about food, water, weight, activity, workouts,
body measurements, cravings, treat meals, or recovery. Classify each note and extract
structured JSON.

Return ONLY a JSON object (no markdown fences, no prose) with this shape:
{
  "log_type": "food"|"water"|"weight"|"activity"|"workout"|"measurement"|"craving"|"treat"|"recovery"|"unknown",
  "data": { ...type-specific fields... },
  "reasoning": "one short sentence explaining classification",
  "clarification_needed": null | "question to ask user if ambiguous"
}

Type-specific data shapes:

food -> {
  "meal": "breakfast"|"post-breakfast"|"lunch"|"pre-workout"|"post-workout"|"snack"|"dinner",
  "items": [ {"food_item": str, "quantity": num, "unit": str,
              "protein_g": num, "carbs_g": num, "fat_g": num,
              "fibre_g": num, "calories": num, "confidence": 0..1} ],
  "hunger_before": null | 1..10,
  "fullness_after": null | 1..10,
  "craving_level": null | "none"|"mild"|"moderate"|"strong",
  "notes": null | str
}

water -> {"water_ml": int}

weight -> {"weight_kg": float, "notes": null | str}

activity -> {"activity_type": str, "duration_min": int|null,
             "steps": int|null, "calories_burned": int|null,
             "notes": null | str}

workout -> {
  "split": null | str (e.g. "Push","Pull","Legs","Upper","Lower","Full"),
  "exercises": [ {"exercise": str, "sets": [
    {"set_number": int, "weight_kg": float|null, "reps": int,
     "rir": int|null, "is_bodyweight": bool}
  ]}],
  "notes": null | str
}

measurement -> {"weight_kg": num|null, "waist_cm": num|null, "abdomen_cm": num|null,
                "chest_cm": num|null, "arm_cm": num|null, "thigh_cm": num|null,
                "hip_cm": num|null, "body_fat_pct": num|null, "notes": null | str}

craving -> {"craving_level": "none"|"mild"|"moderate"|"strong",
            "what_craved": str, "ate_it": bool,
            "trigger_context": null | str, "notes": null | str}

treat -> {"meal": str, "items": str, "est_calories": int|null,
          "satisfaction_1_10": 1..10, "worth_it": bool, "notes": null | str}

recovery -> {"sleep_score": 1..5|null, "energy": 1..5|null, "stress": 1..5|null,
             "soreness": 1..5|null, "mood": 1..5|null, "notes": null | str}

Rules:
- Use Indian food knowledge for items like idli, dosa, misal pav, roti, paneer, dal, sambar.
- Estimate nutrition conservatively. Set confidence: 0.9 common packaged/simple food,
  0.7 home cooked, 0.5 restaurant estimates, 0.3 very vague.
- Multiple foods in one message = multiple items under a single food log.
- If input is a bare number ("220"), set log_type "unknown" and ask via clarification_needed.
- If user says lbs, convert to kg. Assume kg otherwise for weight.
- If workout mentions "3x10 @ 40kg squat", produce 3 sets with set_number 1..3, reps=10, weight=40.
- Bodyweight moves (pull-ups, push-ups, plank, dips) -> is_bodyweight=true, weight_kg=null.
- Plank/holds: put duration seconds in reps and note "seconds" in notes.
- Ignore filler like "log", "record", "add", "please".
- Never invent numbers the user did not imply.
- Meal defaults if unspecified by user or hint:
    <11:00 breakfast, 11:00-13:00 post-breakfast, 13:00-16:00 lunch,
    16:00-18:00 snack, 18:00-19:30 pre-workout or dinner depending on context,
    >=19:30 dinner. If a [meal=...] hint is prepended to the user message, prefer it.
"""

PRODUCT_LOCK_INSTRUCTIONS = """
KNOWN PRODUCTS (highest priority):
The user has locked exact nutrition values for these items. When any name or alias
below appears in the input, use those values EXACTLY, scaled by quantity, and set
confidence=1.0. Do NOT re-estimate. Values shown are per serving.
"""


def _products_block() -> str:
    try:
        rows = get_sheets_client().get_products()
    except Exception:
        return ""
    if not rows:
        return ""
    lines = []
    for r in rows:
        name = str(r.get("Name") or "").strip()
        if not name:
            continue
        aliases = str(r.get("Aliases") or "").replace("|", ", ")
        lines.append(
            f"- {name}"
            + (f" (aliases: {aliases})" if aliases else "")
            + f" | per {r.get('Serving_Size')} {r.get('Serving_Unit')}: "
            f"{r.get('Calories')} kcal, P {r.get('Protein_g')}g, "
            f"C {r.get('Carbs_g')}g, F {r.get('Fat_g')}g, Fibre {r.get('Fibre_g')}g"
        )
    return PRODUCT_LOCK_INSTRUCTIONS + "\n".join(lines) + "\n"


def parse_input(text: str, meal_hint: str | None = None) -> ExtractedLog:
    client = get_llm_client()
    settings = get_settings()

    system_prompt = BASE_SYSTEM_PROMPT + "\n" + _products_block()
    user_content = text.strip()
    if meal_hint:
        user_content = f"[meal={meal_hint}]\n{user_content}"

    resp = client.chat.completions.create(
        model=settings.llm_parse_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    content = resp.choices[0].message.content or "{}"
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return ExtractedLog(
            log_type="unknown",
            data={},
            reasoning="LLM returned invalid JSON",
            clarification_needed="Could you rephrase? I couldn't parse that.",
        )
    return ExtractedLog(**payload)
