"""Profile CRUD stored as key-value rows in the Profile tab."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..clients.sheets import SheetsClient, get_sheets_client
from ..schemas.logs import Profile

router = APIRouter()


def _num(v: str, cast):
    if not v:
        return None
    try:
        return cast(v)
    except (ValueError, TypeError):
        return None


@router.get("", response_model=Profile)
def get_profile(sc: SheetsClient = Depends(get_sheets_client)) -> Profile:
    rows = sc.ws("Profile").get_all_values()
    kv = {r[0]: (r[1] if len(r) > 1 else "") for r in rows[1:] if r and r[0]}
    return Profile(
        height_cm=_num(kv.get("height_cm", ""), float),
        gender=kv.get("gender") or None,
        dob=kv.get("dob") or None,
        goal_weight_kg=_num(kv.get("goal_weight_kg", ""), float),
        daily_protein_target_g=_num(kv.get("daily_protein_target_g", ""), float),
        daily_water_target_ml=_num(kv.get("daily_water_target_ml", ""), int),
        daily_calorie_target=_num(kv.get("daily_calorie_target", ""), int),
        maintenance_calories=_num(kv.get("maintenance_calories", ""), int),
        daily_steps_target=_num(kv.get("daily_steps_target", ""), int) or 10000,
        goal=kv.get("goal") or "recomp",
    )


@router.put("", response_model=Profile)
def put_profile(p: Profile, sc: SheetsClient = Depends(get_sheets_client)) -> Profile:
    ws = sc.ws("Profile")
    ws.clear()
    rows = [["Field", "Value"]]
    for k, v in p.model_dump().items():
        rows.append([k, "" if v is None else str(v)])
    ws.update(values=rows, range_name="A1")
    return p
