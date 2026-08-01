import jwt from "jsonwebtoken";
import { col } from "../config/db.js";
import { safeUser } from "../utils/helpers.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_ALG = "HS256";
const JWT_EXP = "720h";

export function makeToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    algorithm: JWT_ALG,
    expiresIn: JWT_EXP,
  });
}

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
  const user = await col("users").findOne({ id: uid });
  if (!user) {
    return res.status(401).json({ detail: "User not found" });
  }
  user.onboarded = !!user.onboarded;
  user.is_admin = !!user.is_admin;
  user.suspended = !!user.suspended;
  delete user._id;               // strip Mongo's internal id
  req.user = safeUser(user);
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ detail: "Admin access required" });
  }
  next();
}
