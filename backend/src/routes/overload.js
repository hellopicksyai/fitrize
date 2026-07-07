import { Router } from "express";
import { query } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";

const router = Router();

const round2p5 = (n) => Math.round(n / 2.5) * 2.5; // gym plates come in 2.5kg steps
const est1RM = (w, r) => (r > 0 ? w * (1 + r / 30) : 0);

// Decide the next target from the last session's best set for an exercise.
// Rule of thumb used by lifters:
//   - if last set hit the top of the rep range (>=10 reps) → add weight, drop reps
//   - if reps were low-ish (<=5) → keep weight, add a rep
//   - otherwise → nudge weight up slightly OR add a rep
function suggest(lastBest) {
  const { weight_kg: w, reps: r } = lastBest;
  if (r >= 10) {
    return { weight_kg: round2p5(w * 1.05) || w + 2.5, reps: Math.max(6, r - 3),
      reason: "You hit high reps last time — add weight and reset to a lower rep range." };
  }
  if (r <= 5) {
    return { weight_kg: w, reps: r + 1,
      reason: "Low rep range — add one rep before increasing the weight." };
  }
  return { weight_kg: round2p5(w + 2.5), reps: r,
    reason: "Solid range — add a small weight increment and keep the same reps." };
}

// GET /api/overload?exercise=Bench%20press
// GET /api/overload            -> suggestions for all exercises trained recently
router.get("/overload", getCurrentUser, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const single = (req.query.exercise || "").trim();

    // Get the most recent set per exercise (their last performance), plus PR.
    const params = [uid];
    let sql = `
      SELECT ws.exercise, ws.weight_kg, ws.reps, ws.created_at
      FROM workout_sets ws
      INNER JOIN (
        SELECT exercise, MAX(created_at) AS last_time
        FROM workout_sets WHERE user_id = ?
        ${single ? "AND exercise = ?" : ""}
        GROUP BY exercise
      ) latest ON ws.exercise = latest.exercise AND ws.created_at = latest.last_time
      WHERE ws.user_id = ?`;
    if (single) params.push(single);
    params.push(uid);

    const rows = await query(sql, params);

    // For each exercise, pick the best set (highest est 1RM) from its last session
    const byExercise = {};
    for (const row of rows) {
      const key = row.exercise;
      const rm = est1RM(row.weight_kg, row.reps);
      if (!byExercise[key] || rm > byExercise[key]._rm) {
        byExercise[key] = { ...row, _rm: rm };
      }
    }

    const out = Object.values(byExercise).map((last) => {
      const s = suggest(last);
      return {
        exercise: last.exercise,
        last: { weight_kg: last.weight_kg, reps: last.reps, when: last.created_at },
        suggestion: s,
      };
    });

    if (single) return res.json(out[0] || null);
    return res.json(out);
  } catch (err) {
    next(err);
  }
});

export default router;
