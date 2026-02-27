# Daily Nutrition Tracker

Personal website to track daily:

- Total calories
- Total protein intake
- Total fiber intake

You log meals by **food name + grams** throughout the day. The app supports both API-based estimation and manual nutrition entry.

## Architecture

- Frontend: `index.html`, `styles.css`, `script.js`
- Nutrition backend: `nutrition-api/`
  - Local food database
  - GPT-4 estimation (with optional GPT-priority mode)
  - Persistent Excel meal database (`nutrition-api/data/meal_log.xlsx`)
  - Cached AI estimates

## Quick start

1. Start backend:

```bash
cd nutrition-api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add OPENAI_API_KEY in .env
python server.py
```

2. Start frontend (separate terminal, project root):

```bash
python3 -m http.server 4173
```

3. Open:

- Frontend: `http://localhost:4173`
- Backend health: `http://localhost:8787/api/health`

## Data storage

- Meal logs are saved in backend Excel database: `nutrition-api/data/meal_log.xlsx`.
- Frontend now reads/writes meals through backend API endpoints.

## Accuracy and cost controls

- `GPT-4 priority` toggle: forces GPT-based estimate for better quality.
- Local food database still available for low-cost estimation.
- Unknown food GPT results are cached for repeat use.

## Existing legacy backend

The pre-existing `backend/` folder remains untouched and can still be used independently.

## Optional Render backend deployment

This repo includes `render.yaml` for one-click backend deployment on Render.
Connect the GitHub repo in Render, create the web service from the blueprint, and set `OPENAI_API_KEY`.
