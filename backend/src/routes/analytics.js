import { Router } from "express";
import { query } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";

const router = Router();

// GET /api/analytics?days=30
// Returns time-series data for charts: daily calories/protein, daily workout volume,
// weight points, and a weekly consistency count.
router.get("/analytics", getCurrentUser, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 30));
    // cutoff date string YYYY-MM-DD
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    // Daily nutrition totals
    const nutrition = await query(
      `SELECT date,
              ROUND(SUM(calories)) AS calories,
              ROUND(SUM(protein))  AS protein,
              ROUND(SUM(carbs))    AS carbs,
              ROUND(SUM(fats))     AS fats
       FROM meals
       WHERE user_id = ? AND date >= ?
       GROUP BY date ORDER BY date ASC`,
      [uid, cutoff]
    );

    // Daily workout volume + count
    const workouts = await query(
      `SELECT date,
              ROUND(SUM(total_volume)) AS volume,
              COUNT(*) AS sessions
       FROM workout_logs
       WHERE user_id = ? AND date >= ?
       GROUP BY date ORDER BY date ASC`,
      [uid, cutoff]
    );

    // Weight points
    const weight = await query(
      `SELECT date, weight_kg
       FROM progress
       WHERE user_id = ? AND date >= ?
       ORDER BY date ASC`,
      [uid, cutoff]
    );

    // Consistency: number of distinct days with any workout in the range
    const activeDaysRow = await query(
      `SELECT COUNT(DISTINCT date) AS active_days FROM workout_logs WHERE user_id = ? AND date >= ?`,
      [uid, cutoff]
    );
    const activeDays = activeDaysRow[0]?.active_days || 0;

    // Totals for summary cards
    const totalVolume = workouts.reduce((s, w) => s + (w.volume || 0), 0);
    const totalSessions = workouts.reduce((s, w) => s + (w.sessions || 0), 0);
    const avgCalories = nutrition.length
      ? Math.round(nutrition.reduce((s, n) => s + (n.calories || 0), 0) / nutrition.length)
      : 0;
    const avgProtein = nutrition.length
      ? Math.round(nutrition.reduce((s, n) => s + (n.protein || 0), 0) / nutrition.length)
      : 0;

    return res.json({
      range_days: days,
      nutrition,
      workouts,
      weight,
      summary: {
        active_days: activeDays,
        consistency_pct: Math.round((activeDays / days) * 100),
        total_volume: totalVolume,
        total_sessions: totalSessions,
        avg_calories: avgCalories,
        avg_protein: avgProtein,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
