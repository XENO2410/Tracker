from __future__ import annotations

import datetime
from typing import Literal

from pydantic import BaseModel, Field

Meal = Literal[
    "breakfast", "post-breakfast", "lunch",
    "pre-workout", "post-workout", "snack", "dinner",
]
CravingLevel = Literal["none", "mild", "moderate", "strong"]
LogType = Literal[
    "food", "water", "weight", "activity", "workout",
    "measurement", "craving", "treat", "recovery", "unknown",
]


class FoodItem(BaseModel):
    food_item: str
    quantity: float = 1
    unit: str = "serving"
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fibre_g: float = 0
    calories: float = 0
    confidence: float = Field(0.5, ge=0, le=1)
    notes: str | None = None


class FoodLog(BaseModel):
    meal: Meal
    items: list[FoodItem]
    hunger_before: int | None = Field(None, ge=1, le=10)
    fullness_after: int | None = Field(None, ge=1, le=10)
    craving_level: CravingLevel | None = None
    notes: str | None = None
    date: datetime.date | None = None


class WaterLog(BaseModel):
    water_ml: int = Field(gt=0)
    date: datetime.date | None = None


class WeightLog(BaseModel):
    weight_kg: float = Field(gt=20, lt=300)
    date: datetime.date | None = None
    notes: str | None = None


class MeasurementLog(BaseModel):
    weight_kg: float | None = None
    waist_cm: float | None = None
    abdomen_cm: float | None = None
    chest_cm: float | None = None
    arm_cm: float | None = None
    thigh_cm: float | None = None
    hip_cm: float | None = None
    body_fat_pct: float | None = None
    notes: str | None = None
    date: datetime.date | None = None


class ActivityLog(BaseModel):
    activity_type: str
    duration_min: int | None = None
    calories_burned: int | None = None
    steps: int | None = None
    notes: str | None = None
    date: datetime.date | None = None


class WorkoutSet(BaseModel):
    set_number: int = Field(ge=1)
    weight_kg: float | None = None
    reps: int = Field(ge=0)
    rir: int | None = Field(None, ge=0, le=10)
    is_bodyweight: bool = False


class WorkoutExercise(BaseModel):
    exercise: str
    sets: list[WorkoutSet]


class WorkoutLog(BaseModel):
    split: str | None = None
    exercises: list[WorkoutExercise]
    date: datetime.date | None = None
    notes: str | None = None


class CravingLog(BaseModel):
    meal: str | None = None
    craving_level: CravingLevel
    what_craved: str
    ate_it: bool = False
    trigger_context: str | None = None
    notes: str | None = None
    date: datetime.date | None = None


class TreatMealLog(BaseModel):
    meal: str
    items: str
    est_calories: int | None = None
    satisfaction_1_10: int = Field(ge=1, le=10)
    worth_it: bool
    notes: str | None = None
    date: datetime.date | None = None


class RecoveryLog(BaseModel):
    sleep_score: int | None = Field(None, ge=1, le=5)
    energy: int | None = Field(None, ge=1, le=5)
    stress: int | None = Field(None, ge=1, le=5)
    soreness: int | None = Field(None, ge=1, le=5)
    mood: int | None = Field(None, ge=1, le=5)
    notes: str | None = None
    date: datetime.date | None = None


class ExtractedLog(BaseModel):
    """LLM-parsed universal input classified into one log type + payload."""
    log_type: LogType
    data: dict = Field(default_factory=dict)
    reasoning: str = ""
    clarification_needed: str | None = None


class ParseIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    meal_hint: Meal | None = None


class Product(BaseModel):
    """A user-owned food product with locked nutrition values per serving.
    When mentioned by name/alias, the parser copies these exactly (confidence=1.0)."""
    name: str
    aliases: list[str] = Field(default_factory=list)
    serving_size: float = 1
    serving_unit: str = "serving"
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fibre_g: float = 0
    calories: float = 0
    notes: str | None = None


class Profile(BaseModel):
    height_cm: float | None = None
    gender: str | None = None
    dob: str | None = None
    goal_weight_kg: float | None = None
    daily_protein_target_g: float | None = None
    daily_water_target_ml: int | None = None
    daily_calorie_target: int | None = None
    maintenance_calories: int | None = None
    daily_steps_target: int = 10000
    goal: str = "recomp"
