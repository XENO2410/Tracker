"""Google Sheets client via gspread. Owns the full tab schema."""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import gspread
from google.oauth2.service_account import Credentials
from gspread import Spreadsheet, Worksheet

from ..config import get_settings

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]

# Ordered dict of tab_name -> header row. Column order matters for append_row.
TABS: dict[str, list[str]] = {
    "Profile": ["Field", "Value"],
    "Food_Log": [
        "Timestamp", "Date", "Meal", "Food_Item", "Quantity", "Unit",
        "Protein_g", "Carbs_g", "Fat_g", "Fibre_g", "Calories", "Confidence",
        "Hunger_Before", "Fullness_After", "Craving_Level", "Notes",
    ],
    "Water_Log": ["Timestamp", "Date", "Water_ml"],
    "Activity_Log": [
        "Timestamp", "Date", "Activity_Type", "Duration_Min",
        "Calories_Burned", "Steps", "Notes",
    ],
    "Body_Metrics": [
        "Date", "Weight_kg", "Waist_cm", "Abdomen_cm", "Chest_cm",
        "Arm_cm", "Thigh_cm", "Hip_cm", "Body_Fat_%", "Notes",
    ],
    "Workout_Log": [
        "Timestamp", "Date", "Split", "Exercise", "Set_Number",
        "Weight_kg", "Reps", "RIR", "Is_Bodyweight", "Notes",
    ],
    "PR_Log": [
        "Date", "Exercise", "PR_Type", "Weight_kg", "Reps",
        "Estimated_1RM", "Previous_Best", "Notes",
    ],
    "Craving_Log": [
        "Timestamp", "Date", "Meal", "Craving_Level", "What_Craved",
        "Ate_It", "Trigger_Context", "Notes",
    ],
    "Treat_Meal_Log": [
        "Date", "Meal", "Items", "Est_Calories",
        "Satisfaction_1_10", "Worth_It", "Notes",
    ],
    "Recovery_Log": [
        "Date", "Sleep_Score", "Energy", "Stress", "Soreness", "Mood", "Notes",
    ],
    "Photo_Log": ["Date", "Front_URL", "Side_URL", "Back_URL", "Notes"],
    "Daily_Summary": [
        "Date", "Calories_In", "Protein_g", "Carbs_g", "Fat_g", "Fibre_g",
        "Water_ml", "Steps", "Calories_Burned", "Net_Calories",
        "Adherence_Score", "Weight_7day_avg", "Notes",
    ],
    "Weekly_Report": [
        "Week_Start", "Avg_Weight_kg", "Weight_Change_kg", "Avg_Protein_g",
        "Avg_Calories", "Workouts_Completed", "Avg_Steps", "PRs_Hit",
        "Treat_Meals", "Recommendation",
    ],
    "Adherence_Log": [
        "Date", "Score", "Protein_pct", "Calories_pct",
        "Workout_done", "Steps_pct", "Water_pct", "Sleep_ok",
    ],
    "Products": [
        "Name", "Aliases", "Serving_Size", "Serving_Unit",
        "Protein_g", "Carbs_g", "Fat_g", "Fibre_g", "Calories", "Notes",
    ],
    "Debug_Log": ["Timestamp", "Endpoint", "Payload", "Result"],
}


class SheetsClient:
    def __init__(self, spreadsheet_id: str, credentials_source: dict[str, Any] | str) -> None:
        if isinstance(credentials_source, dict):
            creds = Credentials.from_service_account_info(credentials_source, scopes=SCOPES)
        else:
            creds = Credentials.from_service_account_file(credentials_source, scopes=SCOPES)
        self.gc = gspread.authorize(creds)
        self.ss: Spreadsheet = self.gc.open_by_key(spreadsheet_id)
        self._products_cache: list[dict[str, Any]] | None = None

    def ws(self, name: str) -> Worksheet:
        return self.ss.worksheet(name)

    def ensure_tabs(self) -> dict[str, str]:
        """Idempotently create/fix every tab in TABS. Returns per-tab action."""
        existing = {w.title: w for w in self.ss.worksheets()}
        actions: dict[str, str] = {}
        for name, headers in TABS.items():
            if name not in existing:
                ws = self.ss.add_worksheet(title=name, rows=1000, cols=max(len(headers), 10))
                ws.update(values=[headers], range_name="A1")
                actions[name] = "created"
            else:
                ws = existing[name]
                first_row = ws.row_values(1)
                if first_row != headers:
                    ws.update(values=[headers], range_name="A1")
                    actions[name] = "headers_fixed"
                else:
                    actions[name] = "ok"
        # Remove Google's default "Sheet1" if present and not one of ours
        if "Sheet1" in existing and "Sheet1" not in TABS and len(existing) > 1:
            try:
                self.ss.del_worksheet(existing["Sheet1"])
                actions["Sheet1"] = "removed_default"
            except Exception:
                pass
        return actions

    def append_row(self, tab: str, row: list[Any]) -> None:
        # Coerce None -> "" so gspread doesn't blow up.
        clean = ["" if v is None else v for v in row]
        self.ws(tab).append_row(clean, value_input_option="USER_ENTERED")

    def all_records(self, tab: str) -> list[dict[str, Any]]:
        return self.ws(tab).get_all_records()

    def get_products(self) -> list[dict[str, Any]]:
        """Cached read of the Products tab. Call invalidate_products() on writes."""
        if self._products_cache is None:
            try:
                self._products_cache = self.all_records("Products")
            except Exception:
                self._products_cache = []
        return self._products_cache

    def invalidate_products(self) -> None:
        self._products_cache = None

    def log_debug(self, endpoint: str, payload: Any, result: str) -> None:
        from datetime import datetime
        try:
            self.append_row("Debug_Log", [
                datetime.now().isoformat(timespec="seconds"),
                endpoint,
                json.dumps(payload, default=str)[:5000],
                result[:500],
            ])
        except Exception:
            pass


@lru_cache
def get_sheets_client() -> SheetsClient:
    s = get_settings()
    if s.google_service_account_file:
        creds_src: dict[str, Any] | str = s.google_service_account_file
    elif s.google_service_account_json:
        creds_src = json.loads(s.google_service_account_json)
    else:
        raise RuntimeError(
            "Set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_SERVICE_ACCOUNT_JSON in .env"
        )
    return SheetsClient(s.google_spreadsheet_id, creds_src)
