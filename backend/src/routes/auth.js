import { Router } from "express";
import { col } from "../config/db.js";
import { makeToken, getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso, hashPw, verifyPw, safeUser } from "../utils/helpers.js";
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

    const existing = await col("users").findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ detail: "Email already registered" });

    const uid = newId();
    const created_at = nowIso();
    const doc = {
      id: uid,
      email: email.toLowerCase(),
      name,
      password: hashPw(password),
      xp: 0,
      streak: 0,
      level: 1,
      tier: "pro",
      onboarded: false,
      is_admin: false,
      suspended: false,
      profile: null,
      created_at,
    };
    await col("users").insertOne(doc);
    const token = makeToken(uid);
    return res.json({ token, user: safeUser({ ...doc }) });
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

    const user = await col("users").findOne({ email: email.toLowerCase() });
    if (!user || !verifyPw(password, user.password)) {
      return res.status(401).json({ detail: "Invalid credentials" });
    }
    const token = makeToken(user.id);
    user.onboarded = !!user.onboarded;
    user.is_admin = !!user.is_admin;
    delete user._id;
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
