# Nutrition API (Python)

Lightweight backend for nutrition estimation + saved meal database.

## Features

- Local food database lookup (fast and free)
- GPT-4 estimation support via OpenAI API
- Optional GPT priority mode (`preferAI`) for higher-accuracy estimates
- Cache for AI-estimated foods to reduce repeated API cost
- Persistent Excel meal database (`data/meal_log.xlsx`)

## Run

```bash
cd nutrition-api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set OPENAI_API_KEY in .env
python server.py
```

Server starts on `http://localhost:8787` by default.

## Endpoints

### `GET /api/health`
Basic service status + saved meal count.

### `GET /api/local-foods`
Returns list of foods in local database.

### `POST /api/nutrition/estimate`
Estimate nutrition for an input quantity.

Request body:

```json
{
  "foodName": "chicken breast",
  "grams": 150,
  "allowAI": true,
  "preferAI": true
}
```

### `GET /api/entries?date=YYYY-MM-DD`
Returns saved meals from Excel database.

### `POST /api/entries`
Saves one meal row into Excel database.

### `DELETE /api/entries/<id>`
Deletes one meal row by id.

### `DELETE /api/entries?date=YYYY-MM-DD`
Deletes all meals for a date.

## Notes

- Meal data is persisted in `data/meal_log.xlsx`.
- Unknown food estimates are cached in `data/nutrition-cache.json`.
- You can expand known foods in `data/nutrition-db.json`.
