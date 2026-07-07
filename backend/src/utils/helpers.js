import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// Mirrors the Python helpers in server.py
export const nowIso = () => new Date().toISOString();
export const newId = () => uuidv4();

export const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

export const hashPw = (pw) => bcrypt.hashSync(pw, 10);
export const verifyPw = (pw, hashed) => {
  try {
    return bcrypt.compareSync(pw, hashed);
  } catch {
    return false;
  }
};

// Pull a JSON object/array out of a model response (port of extract_json).
export function extractJson(text) {
  if (!text) return {};
  const fence = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch {}
  }
  const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) {
    try {
      return JSON.parse(m[1]);
    } catch {}
  }
  return {};
}

// Strip password from a user object before returning it.
export function safeUser(user) {
  if (!user) return user;
  const { password, ...rest } = user;
  return rest;
}

// MySQL stores JSON columns; mysql2 returns them parsed already, but guard anyway.
export function parseJsonField(val) {
  if (val == null) return val;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}
