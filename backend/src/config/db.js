// MongoDB connection layer (replaces the old MySQL pool).
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGO_DB || process.env.DB_NAME || "bitfits";

const client = new MongoClient(MONGO_URL);
let _db = null;

export async function connectDb() {
  if (_db) return _db;
  await client.connect();
  _db = client.db(DB_NAME);
  console.log(`[db] Connected to MongoDB: ${DB_NAME}`);
  await ensureIndexes(_db);
  return _db;
}

export function db() {
  if (!_db) throw new Error("MongoDB not connected. Call connectDb() first.");
  return _db;
}

export function col(name) {
  return db().collection(name);
}

async function ensureIndexes(database) {
  try {
    await database.collection("users").createIndex({ email: 1 }, { unique: true });
    await database.collection("meals").createIndex({ user_id: 1, date: 1 });
    await database.collection("water").createIndex({ user_id: 1, date: 1 }, { unique: true });
    await database.collection("coach_messages").createIndex({ user_id: 1, created_at: 1 });
    await database.collection("progress").createIndex({ user_id: 1, date: 1 });
    await database.collection("payments").createIndex({ user_id: 1, order_id: 1 });
    await database.collection("feedback").createIndex({ user_id: 1, created_at: 1 });
    await database.collection("workout_logs").createIndex({ user_id: 1, created_at: 1 });
    await database.collection("personal_records").createIndex({ user_id: 1, exercise: 1 }, { unique: true });
    await database.collection("habits").createIndex({ user_id: 1, date: 1 }, { unique: true });
    await database.collection("habit_goals").createIndex({ user_id: 1 }, { unique: true });
    await database.collection("achievements").createIndex({ user_id: 1, badge_key: 1 }, { unique: true });
  } catch (e) {
    console.warn("[db] index setup warning:", e.message);
  }
}

export { client };

// --- TEMPORARY COMPATIBILITY SHIMS ---------------------------------------
// These let route files that haven't been converted to MongoDB yet still be
// imported without crashing the server at startup. They THROW if actually
// called, so you'll know exactly which route still needs converting.
// Remove these once every route uses col()/db() directly.
export const pool = {
  execute: async () => { throw new Error("This route still uses MySQL (pool.execute). Convert it to MongoDB."); },
  query: async () => { throw new Error("This route still uses MySQL (pool.query). Convert it to MongoDB."); },
  end: async () => {},
};
export async function query() {
  throw new Error("This route still uses MySQL (query). Convert it to MongoDB.");
}
export async function queryOne() {
  throw new Error("This route still uses MySQL (queryOne). Convert it to MongoDB.");
}
