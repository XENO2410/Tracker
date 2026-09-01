"""One-shot: create every tab with correct headers in the configured spreadsheet.

Usage from repo root (Windows PowerShell):
    cd backend
    python -m scripts.init_sheet
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.clients.sheets import TABS, get_sheets_client  # noqa: E402


def main() -> None:
    sc = get_sheets_client()
    print(f"Connected to spreadsheet: {sc.ss.title}")
    actions = sc.ensure_tabs()
    for name in list(TABS.keys()) + ["Sheet1"]:
        if name in actions:
            print(f"  {name:<18} -> {actions[name]}")
    created = [n for n, a in actions.items() if a == "created"]
    fixed = [n for n, a in actions.items() if a == "headers_fixed"]
    print()
    print(f"Created: {len(created)} tab(s)")
    print(f"Headers fixed: {len(fixed)} tab(s)")
    print("Sheet ready.")


if __name__ == "__main__":
    main()
