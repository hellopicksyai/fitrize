import { Router } from "express";
import { pool, queryOne } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { nowIso, hashPw, verifyPw, safeUser, parseJsonField } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";

const router = Router();

// PUT /api/profile — update display name
router.put("/profile", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, { name: { type: "string", required: true } });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    await pool.execute("UPDATE users SET name = ?, updated_at = ? WHERE id = ?", [
      v.value.name.trim(), nowIso(), req.user.id,
    ]);
    const user = await queryOne(
      "SELECT id, email, name, xp, streak, level, tier, onboarded, profile, tier_since, created_at, updated_at FROM users WHERE id = ?",
      [req.user.id]
    );
    user.profile = parseJsonField(user.profile);
    user.onboarded = !!user.onboarded;
    return res.json(safeUser(user));
  } catch (err) { next(err); }
});

// PUT /api/profile/password — change password
router.put("/profile/password", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      current_password: { type: "string", required: true },
      new_password: { type: "string", required: true },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    if (v.value.new_password.length < 6) {
      return res.status(422).json({ detail: "New password must be at least 6 characters" });
    }
    const row = await queryOne("SELECT password FROM users WHERE id = ?", [req.user.id]);
    if (!row || !verifyPw(v.value.current_password, row.password)) {
      return res.status(400).json({ detail: "Current password is incorrect" });
    }
    await pool.execute("UPDATE users SET password = ?, updated_at = ? WHERE id = ?", [
      hashPw(v.value.new_password), nowIso(), req.user.id,
    ]);
    return res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
