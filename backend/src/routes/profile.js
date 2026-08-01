import { Router } from "express";
import { col } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { nowIso, hashPw, verifyPw, safeUser } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";

const router = Router();

router.put("/profile", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, { name: { type: "string", required: true } });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    await col("users").updateOne(
      { id: req.user.id },
      { $set: { name: v.value.name.trim(), updated_at: nowIso() } }
    );
    const user = await col("users").findOne({ id: req.user.id });
    if (user) { delete user._id; user.onboarded = !!user.onboarded; }
    return res.json(safeUser(user));
  } catch (err) { next(err); }
});

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
    const row = await col("users").findOne({ id: req.user.id });
    if (!row || !verifyPw(v.value.current_password, row.password)) {
      return res.status(400).json({ detail: "Current password is incorrect" });
    }
    await col("users").updateOne(
      { id: req.user.id },
      { $set: { password: hashPw(v.value.new_password), updated_at: nowIso() } }
    );
    return res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
