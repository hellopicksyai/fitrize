// Runs schema.sql against MySQL. Usage: npm run init-db
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "..", "schema.sql");

async function run() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  // multipleStatements lets us run the whole schema file at once.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
  console.log("Running schema.sql ...");
  await conn.query(sql);
  await conn.end();
  console.log("✓ Database initialized.");
}

run().catch((err) => {
  console.error("DB init failed:", err.message);
  process.exit(1);
});
