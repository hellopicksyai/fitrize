# BitFits — React + Node (Express) + MySQL

Your original **React frontend, unchanged** (all designs, pages, and components exactly
as you built them), now paired with a **Node + Express + MySQL** backend that replaces the
original FastAPI + MongoDB one. Every `/api/*` endpoint and response shape is identical,
so the UI behaves exactly as before.

```
bitfits/
├── frontend/   ← your original React app (design untouched)
└── backend/    ← new Node + Express + MySQL backend
```

## What changed vs. the Emergent original (and why)

Only two things, both unavoidable off the Emergent platform — **neither touches your design**:

1. **Removed `@emergentbase/visual-edits`** from `frontend/package.json`. It's an
   Emergent-only in-IDE visual editor pulled from `assets.emergent.sh`, which returns
   403 outside their platform and would break `yarn install`. The app's `craco.config.js`
   already ignores it gracefully. Your original file is saved as
   `frontend/package.json.emergent-backup`.
2. **Backend rewritten** FastAPI+MongoDB → Express+MySQL. Same endpoints, same JSON.

---

## Run it — step by step

### 1. Backend (start this first)

```bash
cd backend
npm install
cp .env.example .env       # then edit .env
```

Edit `backend/.env`:
- `DB_USER` / `DB_PASSWORD` — your MySQL login (XAMPP default: user `root`, empty password)
- `GEMINI_API_KEY` — free key from https://aistudio.google.com/app/apikey
  (required for AI features: coach, meal analysis, body scan, plans)
- Razorpay keys are pre-filled with your test keys

Create the database + tables, then start:
```bash
npm run init-db
npm start
```
You should see `✓ BitFits API running on http://localhost:8000`.
Verify: open http://localhost:8000/api/health → `{"status":"ok",...}`.

### 2. Frontend

```bash
cd frontend
yarn install        # (or: npm install)
yarn start          # (or: npm start)
```
Opens http://localhost:3000. The included `frontend/.env` already points at
`http://localhost:8000`, so it talks to the backend automatically.

That's it — register an account and the full app runs.

---

## Notes

- **Database:** starts empty. Mongo data isn't migrated (ask if you need a migration script).
  Flexible documents (profile, meal plans, workouts, body scans) are stored as MySQL
  `JSON` columns.
- **MediaPipe** (form-correction camera pose detection) runs entirely in the browser —
  no backend or key needed. A harmless source-map warning may appear during build; ignore it.
- **Backend endpoint list** is in `backend/README.md`.

## If you'd rather use PHP CodeIgniter 3

This backend is Node + Express. Your React frontend would work with a CodeIgniter 3
backend too, as long as it serves the same `/api/*` routes returning the same JSON.
That's a separate full port — say the word and it can be built.
