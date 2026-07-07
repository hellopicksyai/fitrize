import jwt from "jsonwebtoken";
import { queryOne } from "../config/db.js";
import { safeUser, parseJsonField } from "../utils/helpers.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_ALG = "HS256";
const JWT_EXP = "720h"; // 24 * 30 hours, matching JWT_EXP_HOURS

export function makeToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    algorithm: JWT_ALG,
    expiresIn: JWT_EXP,
  });
}

// Express middleware equivalent of Depends(get_current_user).
// On success, attaches req.user (without password) and calls next().
export async function getCurrentUser(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ detail: "Missing token" });
  }
  let uid;
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALG] });
    uid = payload.sub;
  } catch {
    return res.status(401).json({ detail: "Invalid token" });
  }
  const user = await queryOne(
    "SELECT id, email, name, xp, streak, level, tier, onboarded, profile, tier_since, is_admin, suspended, created_at, updated_at FROM users WHERE id = ?",
    [uid]
  );
  if (!user) {
    return res.status(401).json({ detail: "User not found" });
  }
  user.profile = parseJsonField(user.profile);
  user.onboarded = !!user.onboarded;
  user.is_admin = !!user.is_admin;
  user.suspended = !!user.suspended;
  req.user = safeUser(user);
  next();
}

// Guard: only allow admins. Use AFTER getCurrentUser.
export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ detail: "Admin access required" });
  }
  next();
}
