import { Router } from "express";
import { pool, query, queryOne } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso, today } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";

const router = Router();

async function goalsFor(uid, profile) {
  const g = await queryOne("SELECT water_goal, protein_goal, sleep_goal, steps_goal FROM habit_goals WHERE user_id = ?", [uid]);
  return {
    water: g?.water_goal ?? 8,
    protein: g?.protein_goal ?? (profile?.protein_goal_g || 150),
    sleep: g?.sleep_goal ?? 8,
    steps: g?.steps_goal ?? 10000,
  };
}

// Build the habit snapshot for a given date.
async function snapshot(uid, date, profile) {
  const goals = await goalsFor(uid, profile);

  // workout: did they log a workout today?
  const wl = await queryOne("SELECT COUNT(*) AS c FROM workout_logs WHERE user_id = ? AND date = ?", [uid, date]);
  const workoutDone = (wl?.c || 0) > 0;

  // water: glasses today
  const w = await queryOne("SELECT glasses FROM water WHERE user_id = ? AND date = ?", [uid, date]);
  const water = w?.glasses || 0;

  // protein: sum from meals today
  const m = await queryOne("SELECT ROUND(SUM(protein)) AS p FROM meals WHERE user_id = ? AND date = ?", [uid, date]);
  const protein = m?.p || 0;

  // sleep + steps: from habits table (manual)
  const h = await queryOne("SELECT sleep_hours, steps FROM habits WHERE user_id = ? AND date = ?", [uid, date]);
  const sleep = h?.sleep_hours || 0;
  const steps = h?.steps || 0;

  const pct = (val, goal) => Math.max(0, Math.min(100, goal ? Math.round((val / goal) * 100) : 0));

  const items = [
    { key: "workout", label: "Workout", value: workoutDone ? 1 : 0, goal: 1, unit: "", pct: workoutDone ? 100 : 0, auto: true },
    { key: "water", label: "Water", value: water, goal: goals.water, unit: "glasses", pct: pct(water, goals.water), auto: true },
    { key: "protein", label: "Protein", value: protein, goal: goals.protein, unit: "g", pct: pct(protein, goals.protein), auto: true },
    { key: "sleep", label: "Sleep", value: sleep, goal: goals.sleep, unit: "h", pct: pct(sleep, goals.sleep), auto: false },
    { key: "steps", label: "Steps", value: steps, goal: goals.steps, unit: "", pct: pct(steps, goals.steps), auto: false },
  ];
  const overall = Math.round(items.reduce((s, i) => s + i.pct, 0) / items.length);
  return { date, items, overall, goals };
}

// GET /api/habits  — today's snapshot
router.get("/habits", getCurrentUser, async (req, res, next) => {
  try {
    const snap = await snapshot(req.user.id, today(), req.user.profile);
    return res.json(snap);
  } catch (err) { next(err); }
});

// GET /api/habits/week  — last 7 days overall % for a mini trend
router.get("/habits/week", getCurrentUser, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const snap = await snapshot(uid, d, req.user.profile);
      out.push({ date: d, overall: snap.overall });
    }
    return res.json(out);
  } catch (err) { next(err); }
});

// POST /api/habits  — update sleep and/or steps for today
router.post("/habits", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      sleep_hours: { type: "number", default: null },
      steps: { type: "int", default: null },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const uid = req.user.id;
    const d = today();

    const existing = await queryOne("SELECT sleep_hours, steps FROM habits WHERE user_id = ? AND date = ?", [uid, d]);
    const sleep = v.value.sleep_hours != null ? v.value.sleep_hours : (existing?.sleep_hours || 0);
    const steps = v.value.steps != null ? v.value.steps : (existing?.steps || 0);

    await pool.execute(
      `INSERT INTO habits (id, user_id, date, sleep_hours, steps, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE sleep_hours = VALUES(sleep_hours), steps = VALUES(steps), updated_at = VALUES(updated_at)`,
      [newId(), uid, d, sleep, steps, nowIso()]
    );
    const snap = await snapshot(uid, d, req.user.profile);
    return res.json(snap);
  } catch (err) { next(err); }
});

// POST /api/habits/goals  — update habit goals
router.post("/habits/goals", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      water_goal: { type: "int", default: 8 },
      protein_goal: { type: "int", default: 150 },
      sleep_goal: { type: "number", default: 8 },
      steps_goal: { type: "int", default: 10000 },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    await pool.execute(
      `INSERT INTO habit_goals (user_id, water_goal, protein_goal, sleep_goal, steps_goal, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE water_goal=VALUES(water_goal), protein_goal=VALUES(protein_goal), sleep_goal=VALUES(sleep_goal), steps_goal=VALUES(steps_goal), updated_at=VALUES(updated_at)`,
      [req.user.id, b.water_goal, b.protein_goal, b.sleep_goal, b.steps_goal, nowIso()]
    );
    const snap = await snapshot(req.user.id, today(), req.user.profile);
    return res.json(snap);
  } catch (err) { next(err); }
});

export default router;
