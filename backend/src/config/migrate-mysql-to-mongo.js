// One-time migration: copy all data from your MySQL `bitfits` database into MongoDB.
// Run AFTER MongoDB is installed and BEFORE switching the app over.
//
//   node src/config/migrate-mysql-to-mongo.js
//
// It reads MySQL using the OLD credentials (set them below or via env),
// and writes into MongoDB using MONGO_URL / MONGO_DB.

import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const MYSQL = {
  host: process.env.OLD_DB_HOST || "localhost",
  port: Number(process.env.OLD_DB_PORT || 3306),
  user: process.env.OLD_DB_USER || "bitfits_user",
  password: process.env.OLD_DB_PASSWORD || "Fitrize123!secure",
  database: process.env.OLD_DB_NAME || "bitfits",
  dateStrings: true,
};

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const MONGO_DB = process.env.MONGO_DB || "bitfits";

// Tables to copy (same names become Mongo collections).
const TABLES = [
  "users", "meals", "water", "meal_plans", "workouts", "coach_messages",
  "body_scans", "progress", "sessions", "payments", "feedback",
  "workout_logs", "workout_sets", "personal_records", "habits",
  "habit_goals", "achievements",
];

// Boolean-ish columns to convert from 0/1 to true/false.
const BOOL_FIELDS = { users: ["onboarded", "is_admin", "suspended"], workout_sets: ["is_pr"] };

async function run() {
  const sql = await mysql.createConnection(MYSQL);
  const mongo = new MongoClient(MONGO_URL);
  await mongo.connect();
  const db = mongo.db(MONGO_DB);
  console.log("Connected to both databases. Migrating...");

  for (const table of TABLES) {
    let rows;
    try {
      [rows] = await sql.query(`SELECT * FROM \`${table}\``);
    } catch (e) {
      console.log(`  - skip ${table} (${e.message})`);
      continue;
    }
    if (!rows.length) { console.log(`  - ${table}: 0 rows`); continue; }

    const bools = BOOL_FIELDS[table] || [];
    for (const r of rows) {
      for (const b of bools) if (b in r) r[b] = !!r[b];
      // MySQL JSON columns come back as strings sometimes; parse them.
      if (r.profile && typeof r.profile === "string") { try { r.profile = JSON.parse(r.profile); } catch {} }
      if (r.plan && typeof r.plan === "string") { try { r.plan = JSON.parse(r.plan); } catch {} }
      if (r.result && typeof r.result === "string") { try { r.result = JSON.parse(r.result); } catch {} }
    }
    const coll = db.collection(table);
    await coll.deleteMany({});               // clear any existing before import
    await coll.insertMany(rows);
    console.log(`  - ${table}: ${rows.length} rows migrated`);
  }

  await sql.end();
  await mongo.close();
  console.log("Migration complete.");
}

run().catch((e) => { console.error("Migration failed:", e); process.exit(1); });
