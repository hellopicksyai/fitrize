import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Connection pool. mysql2/promise gives us async/await like Motor did for Mongo.
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bitfits",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return JSON columns already parsed into JS objects.
  // mysql2 parses JSON automatically by default, but we keep dates as strings
  // because the original code stored ISO strings, not native Dates.
  dateStrings: true,
});

// Helper: run a query and return rows.
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Helper: fetch a single row (or null).
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? rows[0] : null;
}
