import { Router } from "express";
import { pool, query } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";

const router = Router();

// POST /api/feedback  — submit feedback
router.post("/feedback", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      category: {
        type: "string",
        default: "general",
        enum: ["general", "bug", "feature", "praise"],
      },
      rating: { type: "int", default: 0 },
      message: { type: "string", required: true },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;

    const doc = {
      id: newId(),
      user_id: req.user.id,
      user_name: req.user.name,
      user_email: req.user.email,
      category: b.category,
      rating: b.rating,
      message: b.message,
      created_at: nowIso(),
    };
    await pool.execute(
      `INSERT INTO feedback (id, user_id, user_name, user_email, category, rating, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc.id, doc.user_id, doc.user_name, doc.user_email, doc.category, doc.rating, doc.message, doc.created_at]
    );
    // small XP reward, consistent with meals/progress logging
    await pool.execute("UPDATE users SET xp = xp + 5 WHERE id = ?", [req.user.id]);
    return res.json(doc);
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback  — the current user's own submitted feedback
router.get("/feedback", getCurrentUser, async (req, res, next) => {
  try {
    const items = await query(
      "SELECT id, category, rating, message, created_at FROM feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    return res.json(items);
  } catch (err) {
    next(err);
  }
});

export default router;
