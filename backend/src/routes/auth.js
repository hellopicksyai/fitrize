import { Router } from "express";
import { pool, queryOne } from "../config/db.js";
import { makeToken, getCurrentUser } from "../middleware/auth.js";
import {
  newId,
  nowIso,
  hashPw,
  verifyPw,
  safeUser,
  parseJsonField,
} from "../utils/helpers.js";
import { validate } from "../utils/validate.js";

const router = Router();

// POST /api/auth/register
router.post("/auth/register", async (req, res, next) => {
  try {
    const v = validate(req.body, {
      email: { type: "email", required: true },
      password: { type: "string", required: true },
      name: { type: "string", required: true },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const { email, password, name } = v.value;

    const existing = await queryOne("SELECT id FROM users WHERE email = ?", [
      email.toLowerCase(),
    ]);
    if (existing) return res.status(400).json({ detail: "Email already registered" });

    const uid = newId();
    const created_at = nowIso();
    const doc = {
      id: uid,
      email: email.toLowerCase(),
      name,
      xp: 0,
      streak: 0,
      level: 1,
      tier: "pro",
      onboarded: false,
      created_at,
    };
    await pool.execute(
      `INSERT INTO users (id, email, name, password, xp, streak, level, tier, onboarded, created_at)
       VALUES (?, ?, ?, ?, 0, 0, 1, 'pro', 0, ?)`,
      [uid, doc.email, name, hashPw(password), created_at]
    );
    const token = makeToken(uid);
    return res.json({ token, user: doc });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res, next) => {
  try {
    const v = validate(req.body, {
      email: { type: "email", required: true },
      password: { type: "string", required: true },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const { email, password } = v.value;

    const user = await queryOne("SELECT * FROM users WHERE email = ?", [
      email.toLowerCase(),
    ]);
    if (!user || !verifyPw(password, user.password)) {
      return res.status(401).json({ detail: "Invalid credentials" });
    }
    const token = makeToken(user.id);
    user.profile = parseJsonField(user.profile);
    user.onboarded = !!user.onboarded;
    return res.json({ token, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/auth/me", getCurrentUser, async (req, res) => {
  return res.json(req.user);
});

export default router;
