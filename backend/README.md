# BitFits Backend — Node + Express + MySQL

Ported from the original FastAPI + MongoDB backend. **Every API route path and JSON
response shape is identical to the original**, so the existing React frontend works
without changes — you only point it at this server's URL.

## Stack

| Original (Python)        | This port (Node)              |
|--------------------------|-------------------------------|
| FastAPI                  | Express                       |
| MongoDB / Motor          | MySQL / mysql2                |
| Pydantic models          | lightweight `validate()`      |
| python-jose (JWT)        | jsonwebtoken                  |
| bcrypt                   | bcryptjs                      |
| razorpay (py)            | razorpay (node)               |
| emergentintegrations LLM | @google/generative-ai (Gemini)|

## Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env` and fill in:
   ```bash
   cp .env.example .env
   ```
   - `DB_*` — your MySQL credentials
   - `GEMINI_API_KEY` — **required for AI features.** Get a free key at
     https://aistudio.google.com/app/apikey. The old `sk-emergent-...` key will NOT work.
   - `RAZORPAY_*` — your existing test keys are pre-filled.
   - `JWT_SECRET` — change in production.

3. **Create the database & tables**
   ```bash
   npm run init-db          # runs schema.sql
   ```
   (Or manually: `mysql -u root -p < schema.sql`)

4. **Run**
   ```bash
   npm run dev              # auto-reload
   # or
   npm start
   ```
   Server starts on `http://localhost:8000`. Health check: `GET /api/health`.

## Connecting the frontend

In `frontend/.env`, set:
```
REACT_APP_BACKEND_URL=http://localhost:8000
```
The frontend already calls `${REACT_APP_BACKEND_URL}/api/...`, so nothing else changes.

## Endpoints (all under `/api`)

```
POST   /auth/register        POST   /auth/login         GET  /auth/me
POST   /assessment
POST   /meals/log            POST   /meals/analyze-image POST /meals/voice
GET    /meals/today          DELETE /meals/:meal_id      POST /water
POST   /nutrition/plan
POST   /workouts/generate
POST   /coach/chat           GET    /coach/history
POST   /body-scan
POST   /progress            GET    /progress
POST   /form/feedback
POST   /sessions            GET    /sessions
GET    /stats/dashboard     GET    /health
POST   /payments/order      POST   /payments/verify
```

## Notes on the MongoDB → MySQL conversion

- Mongo's flexible documents (AI-generated meal plans, workouts, body-scan results,
  and the user `profile`) are stored in **`JSON` columns**. mysql2 returns them
  already parsed into JS objects.
- Mongo's `upsert` (water log) → MySQL `INSERT ... ON DUPLICATE KEY UPDATE`.
- `$inc` (XP increments) → `UPDATE ... SET xp = xp + N`.
- All IDs remain app-generated UUID strings, exactly like the original (no Mongo
  `_id`, no auto-increment), so any IDs already stored elsewhere stay compatible.
- Timestamps remain ISO strings (stored as VARCHAR), matching the original behavior.
