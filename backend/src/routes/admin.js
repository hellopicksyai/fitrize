import { Router } from "express";
import { pool, query, queryOne } from "../config/db.js";
import { getCurrentUser, requireAdmin } from "../middleware/auth.js";
import { newId, nowIso, today } from "../utils/helpers.js";

const router = Router();

// Helper to record an admin action.
export async function logAdmin(admin, action, target, details) {
  try {
    await pool.execute(
      "INSERT INTO admin_logs (id, admin_id, admin_name, action, target, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [newId(), admin.id, admin.name, action, target || null, details || null, nowIso()]
    );
  } catch { /* logging must never break the action */ }
}

// GET /api/admin/overview — headline stats for the admin dashboard
router.get("/admin/overview", getCurrentUser, requireAdmin, async (req, res, next) => {
  try {
    const d = today();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const totalUsers = (await queryOne("SELECT COUNT(*) AS c FROM users"))?.c || 0;
    const adminCount = (await queryOne("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1"))?.c || 0;
    const newUsers7d = (await queryOne("SELECT COUNT(*) AS c FROM users WHERE created_at >= ?", [weekAgo]))?.c || 0;
    const premiumUsers = (await queryOne("SELECT COUNT(*) AS c FROM users WHERE tier IN ('pro','elite')"))?.c || 0;
    const suspended = (await queryOne("SELECT COUNT(*) AS c FROM users WHERE suspended = 1"))?.c || 0;

    // Active today = logged a meal, workout, or water today
    const activeToday = (await queryOne(
      `SELECT COUNT(DISTINCT uid) AS c FROM (
         SELECT user_id AS uid FROM meals WHERE date = ?
         UNION SELECT user_id FROM workout_logs WHERE date = ?
         UNION SELECT user_id FROM water WHERE date = ?
       ) t`, [d, d, d]
    ))?.c || 0;

    const totalWorkouts = (await queryOne("SELECT COUNT(*) AS c FROM workout_logs"))?.c || 0;
    const totalMeals = (await queryOne("SELECT COUNT(*) AS c FROM meals"))?.c || 0;
    const totalCalories = (await queryOne("SELECT ROUND(SUM(calories)) AS c FROM meals"))?.c || 0;

    // Revenue from paid payments (amount is in paise → /100 for INR)
    let revenue = 0;
    try {
      revenue = Math.round(((await queryOne("SELECT SUM(amount) AS a FROM payments WHERE status = 'paid'"))?.a || 0) / 100);
    } catch { revenue = 0; }

    // New users per day, last 7 days (for a chart)
    const growth = await query(
      `SELECT LEFT(created_at, 10) AS date, COUNT(*) AS count
       FROM users WHERE created_at >= ?
       GROUP BY LEFT(created_at, 10) ORDER BY date ASC`, [weekAgo]
    );

    // Recent signups
    const recentUsers = await query(
      "SELECT id, name, email, tier, created_at FROM users ORDER BY created_at DESC LIMIT 6"
    );

    return res.json({
      stats: {
        total_users: totalUsers,
        admin_count: adminCount,
        regular_users: totalUsers - adminCount,
        active_today: activeToday,
        new_users_7d: newUsers7d,
        premium_users: premiumUsers,
        suspended,
        total_workouts: totalWorkouts,
        total_meals: totalMeals,
        total_calories: totalCalories,
        revenue,
      },
      growth,
      recent_users: recentUsers,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/check — lightweight check used by the frontend to gate the admin UI
router.get("/admin/check", getCurrentUser, (req, res) => {
  res.json({ is_admin: !!req.user.is_admin });
});

export default router;
