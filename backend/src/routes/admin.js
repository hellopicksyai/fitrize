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

// GET /api/admin/users?search=&page= — list/search users (paginated)
router.get("/admin/users", getCurrentUser, requireAdmin, async (req, res, next) => {
  try {
    const search = (req.query.search || "").trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = 20;
    const offset = (page - 1) * perPage;

    let where = "";
    let params = [];
    if (search) {
      where = "WHERE name LIKE ? OR email LIKE ?";
      params = [`%${search}%`, `%${search}%`];
    }

    const total = (await queryOne(`SELECT COUNT(*) AS c FROM users ${where}`, params))?.c || 0;
    const users = await query(
      `SELECT id, name, email, tier, is_admin, suspended, xp, level, streak, onboarded, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    return res.json({
      users: users.map(u => ({ ...u, is_admin: !!u.is_admin, suspended: !!u.suspended, onboarded: !!u.onboarded })),
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id — update a user's admin/suspended status
router.patch("/admin/users/:id", getCurrentUser, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_admin, suspended } = req.body;

    // Guard: an admin can't suspend or demote themselves (avoid locking yourself out)
    if (id === req.user.id && (suspended === true || is_admin === false)) {
      return res.status(400).json({ detail: "You can't suspend or demote your own account." });
    }

    const target = await queryOne("SELECT id FROM users WHERE id = ?", [id]);
    if (!target) return res.status(404).json({ detail: "User not found" });

    const updates = [];
    const params = [];
    if (typeof is_admin === "boolean") { updates.push("is_admin = ?"); params.push(is_admin ? 1 : 0); }
    if (typeof suspended === "boolean") { updates.push("suspended = ?"); params.push(suspended ? 1 : 0); }
    if (!updates.length) return res.status(400).json({ detail: "Nothing to update" });

    params.push(id);
    await query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

    const updated = await queryOne(
      "SELECT id, name, email, tier, is_admin, suspended FROM users WHERE id = ?", [id]
    );
    return res.json({ ...updated, is_admin: !!updated.is_admin, suspended: !!updated.suspended });
  } catch (err) { next(err); }
});

// GET /api/admin/feedback?page= — user-submitted feedback/support messages
router.get("/admin/feedback", getCurrentUser, requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = 20;
    const offset = (page - 1) * perPage;
    let total = 0, rows = [];
    try {
      total = (await queryOne("SELECT COUNT(*) AS c FROM feedback"))?.c || 0;
      rows = await query(
        `SELECT id, user_id, user_name, user_email, category, rating, message, created_at
         FROM feedback ORDER BY created_at DESC LIMIT ? OFFSET ?`, [perPage, offset]
      );
    } catch { total = 0; rows = []; }
    return res.json({ feedback: rows, total, page, total_pages: Math.ceil(total / perPage) });
  } catch (err) { next(err); }
});

// GET /api/admin/coach-messages?page= — what users are asking the AI coach
router.get("/admin/coach-messages", getCurrentUser, requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = 25;
    const offset = (page - 1) * perPage;
    let total = 0, rows = [];
    try {
      total = (await queryOne("SELECT COUNT(*) AS c FROM coach_messages"))?.c || 0;
      rows = await query(
        `SELECT cm.id, cm.user_id, cm.role_user, cm.role_assistant, cm.created_at,
                u.name AS user_name, u.email AS user_email
         FROM coach_messages cm
         LEFT JOIN users u ON u.id = cm.user_id
         ORDER BY cm.created_at DESC LIMIT ? OFFSET ?`, [perPage, offset]
      );
    } catch { total = 0; rows = []; }
    return res.json({ messages: rows, total, page, total_pages: Math.ceil(total / perPage) });
  } catch (err) { next(err); }
});

export default router;
