# Body Recomp Tracker

A personal, LLM-assisted body-recomposition tracker. Log meals, water, workouts, weight,
measurements, cravings, treats, and recovery in natural language. See a real dashboard,
weekly reports, and PR detection. All data stays in your own Google Sheet.

Built for the goal: **get lean, retain muscle, then build an athletic physique** — without
letting one scary weigh-in derail the week.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind + Recharts, PWA-installable
- **Backend**: FastAPI (Python), OpenRouter for LLM parsing, gspread for Sheets
- **Storage**: Google Sheets (15 tabs, schema-owned by the backend)

## Features

Tier 1 — core
- Food logging (calories + macros + fibre) via natural language
- Water, weight, steps, workouts
- Daily dashboard with targets and adherence score

Tier 2 — body recomp
- 7-day rolling weight average (the number that actually matters)
- Waist/measurements with waist-vs-weight chart
- Workout sets/reps/RIR with automatic PR detection (weighted + bodyweight)

Tier 3 — sustainability
- Hunger/fullness and craving log
- Treat meal satisfaction — "was it worth it?"
- Recovery (sleep/energy/stress/soreness/mood) 1–5

Tier 4 — athletic physique
- Bodyweight PR tracking (pull-ups, push-ups, plank hold)
- Weekly report with LLM-generated coach recommendation

## Quick start

See [docs/SETUP.md](docs/SETUP.md) for the full walkthrough (~20 min).

```powershell
# One-time
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m scripts.init_sheet    # creates all 15 tabs in your sheet

# Terminal 1: API
uvicorn app.main:app --reload

# Terminal 2: UI
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Security

- `.env` and `credentials/` are git-ignored.
- **Never paste an OpenRouter or Google key into a chat, git commit, or issue.** If you do, revoke it at https://openrouter.ai/keys and rotate.
- Data lives only in your own Google Sheet — no third-party servers besides OpenRouter (LLM only receives your typed log messages, never your key file).
