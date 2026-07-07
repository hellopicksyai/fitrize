import { Router } from "express";
import { pool, query } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso, today } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";

const router = Router();

// Epley formula for estimated 1-rep max.
const est1RM = (weight, reps) => (reps > 0 ? weight * (1 + reps / 30) : 0);

// POST /api/workout-logs  — save a completed workout with its sets
router.post("/workout-logs", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      name: { type: "string", default: "Workout" },
      notes: { type: "string", default: "" },
      duration_sec: { type: "int", default: 0 },
      sets: { type: "array", required: true }, // [{exercise, weight_kg, reps}]
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    if (!b.sets.length) return res.status(422).json({ detail: "Add at least one set" });

    const logId = newId();
    const created = nowIso();
    const uid = req.user.id;
    let totalVolume = 0;
    const prsHit = [];

    // Pre-load current PRs for the exercises in this workout
    const exercises = [...new Set(b.sets.map((s) => String(s.exercise || "").trim()).filter(Boolean))];
    const prMap = {};
    if (exercises.length) {
      const placeholders = exercises.map(() => "?").join(",");
      const rows = await query(
        `SELECT exercise, best_weight, best_1rm FROM personal_records WHERE user_id = ? AND exercise IN (${placeholders})`,
        [uid, ...exercises]
      );
      for (const r of rows) prMap[r.exercise] = r;
    }

    // Insert each set, flag PRs
    let setNum = {};
    for (const s of b.sets) {
      const exercise = String(s.exercise || "").trim();
      if (!exercise) continue;
      const weight = Number(s.weight_kg) || 0;
      const reps = parseInt(s.reps, 10) || 0;
      totalVolume += weight * reps;
      setNum[exercise] = (setNum[exercise] || 0) + 1;

      const oneRm = est1RM(weight, reps);
      const existing = prMap[exercise];
      const isPr = !existing || oneRm > (existing.best_1rm || 0);

      await pool.execute(
        `INSERT INTO workout_sets (id, log_id, user_id, exercise, set_number, weight_kg, reps, is_pr, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), logId, uid, exercise, setNum[exercise], weight, reps, isPr ? 1 : 0, created]
      );

      if (isPr && weight > 0 && reps > 0) {
        prsHit.push({ exercise, weight, reps, oneRm: Math.round(oneRm * 10) / 10 });
        // upsert PR
        await pool.execute(
          `INSERT INTO personal_records (id, user_id, exercise, best_weight, best_reps, best_1rm, achieved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             best_weight = IF(VALUES(best_1rm) > best_1rm, VALUES(best_weight), best_weight),
             best_reps   = IF(VALUES(best_1rm) > best_1rm, VALUES(best_reps), best_reps),
             best_1rm    = GREATEST(best_1rm, VALUES(best_1rm)),
             achieved_at = IF(VALUES(best_1rm) > best_1rm, VALUES(achieved_at), achieved_at)`,
          [newId(), uid, exercise, weight, reps, oneRm, created]
        );
        prMap[exercise] = { best_1rm: oneRm }; // so later sets compare correctly
      }
    }

    const totalSets = b.sets.length;
    await pool.execute(
      `INSERT INTO workout_logs (id, user_id, name, notes, duration_sec, total_volume, total_sets, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, uid, b.name, b.notes, b.duration_sec, totalVolume, totalSets, today(), created]
    );

    // reward XP: 20 base + 10 per PR
    await pool.execute("UPDATE users SET xp = xp + ? WHERE id = ?", [20 + prsHit.length * 10, uid]);

    return res.json({
      id: logId,
      total_volume: totalVolume,
      total_sets: totalSets,
      prs: prsHit,
      xp_earned: 20 + prsHit.length * 10,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/workout-logs  — history with set details
router.get("/workout-logs", getCurrentUser, async (req, res, next) => {
  try {
    const logs = await query(
      "SELECT id, name, notes, duration_sec, total_volume, total_sets, date, created_at FROM workout_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    // attach sets
    for (const log of logs) {
      log.sets = await query(
        "SELECT exercise, set_number, weight_kg, reps, is_pr FROM workout_sets WHERE log_id = ? ORDER BY id ASC",
        [log.id]
      );
    }
    return res.json(logs);
  } catch (err) {
    next(err);
  }
});

// GET /api/personal-records
router.get("/personal-records", getCurrentUser, async (req, res, next) => {
  try {
    const prs = await query(
      "SELECT exercise, best_weight, best_reps, best_1rm, achieved_at FROM personal_records WHERE user_id = ? ORDER BY best_1rm DESC",
      [req.user.id]
    );
    return res.json(prs);
  } catch (err) {
    next(err);
  }
});

export default router;
