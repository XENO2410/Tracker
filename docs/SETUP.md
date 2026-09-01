# Setup

This is a one-time setup. Should take about 20-30 minutes.

## 1. Google Cloud + service account

The backend talks to Google Sheets using a service account (a robot Google account you own).

1. Go to https://console.cloud.google.com/ and create a new project. Name it anything, e.g. `body-recomp-tracker`.
2. In the search bar, find **APIs & Services → Library**. Enable:
   - **Google Sheets API**
   - **Google Drive API**
3. Go to **APIs & Services → Credentials → Create Credentials → Service Account**.
   - Name it `tracker-writer`. Skip the optional role step. Click Done.
4. Open the newly created service account. Go to the **Keys** tab.
   - **Add Key → Create new key → JSON**. A `.json` file downloads.
5. Copy that file into this repo at `credentials/service-account.json`.
   - The `credentials/` folder is git-ignored — the key never leaves your machine.
6. Note the service account's `client_email` value (looks like `tracker-writer@your-project.iam.gserviceaccount.com`). You'll share the sheet with it in the next step.

## 2. Create the spreadsheet

1. Go to https://sheets.new — a blank sheet opens.
2. Name it `Body Recomp Tracker`.
3. Share the sheet with the service account's `client_email` (from step 1.6), give it **Editor** access, uncheck "Notify people".
4. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_LONG_STRING_HERE/edit
   ```

## 3. OpenRouter API key

1. Go to https://openrouter.ai/keys.
2. **If you already pasted a key into a chat, revoke it here first** — treat any key shared in chat as compromised.
3. Create a fresh key. Copy the value (starts with `sk-or-v1-`).

## 4. Configure `.env`

From the repo root:

```powershell
Copy-Item .env.example .env
notepad .env
```

Fill in:
- `OPENROUTER_API_KEY` from step 3
- `GOOGLE_SPREADSHEET_ID` from step 2.4
- Leave `GOOGLE_SERVICE_ACCOUNT_FILE` as `./credentials/service-account.json` (the default)

## 5. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Initialize the sheet with all 15 tabs:

```powershell
python -m scripts.init_sheet
```

You should see output like:
```
Connected to spreadsheet: Body Recomp Tracker
  Profile            -> created
  Food_Log           -> created
  Water_Log          -> created
  ...
Sheet ready.
```

Run the API:

```powershell
uvicorn app.main:app --reload
```

Test that it's alive: open http://127.0.0.1:8000/health — you should see `{"status":"ok"}`. Also visit http://127.0.0.1:8000/docs for the interactive Swagger UI.

## 6. Frontend

In a **second terminal**:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. You should see the dashboard.

## 7. First-run

1. Go to **Profile** and fill in your targets (protein, calories, water, steps).
2. Log your first weight from the **Body** tab.
3. Try the **Quick Log** page — type "2 idlis and sambar" and hit Parse.

That's it. Log daily for two weeks before drawing any conclusions from trends.

## Troubleshooting

**`RuntimeError: Set GOOGLE_SERVICE_ACCOUNT_FILE...`**
The `.env` file is missing or the backend was started from the wrong directory. Run `uvicorn` from `backend/`.

**`gspread.exceptions.APIError: 403 The caller does not have permission`**
You forgot to share the spreadsheet with the service account's `client_email`, or you shared with view-only access.

**`Parse failed: 401 No auth credentials found`**
`OPENROUTER_API_KEY` in `.env` is wrong or you didn't restart the backend after editing `.env`.

**`Sheet1` still there**
Google adds a default "Sheet1" tab. `init_sheet.py` removes it. If it didn't, delete it manually.

**No errors, but nothing appears in the sheet after logging**
Open the **Debug_Log** tab — the backend writes every failed operation there.
