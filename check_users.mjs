import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import pg from "pg";

dotenv.config();

let cleanUrl = process.env.DATABASE_URL || "";
cleanUrl = cleanUrl.trim();
if (cleanUrl.startsWith("DATABASE_URL=")) {
  cleanUrl = cleanUrl.substring("DATABASE_URL=".length).trim();
}
if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
  cleanUrl = cleanUrl.substring(1, cleanUrl.length - 1).trim();
}

console.log("Checking DB connection to:", cleanUrl.split("@")[1]);

const pool = new pg.Pool({ connectionString: cleanUrl });

async function main() {
  try {
    const client = await pool.connect();
    console.log("Successfully connected to Supabase!");
    try {
      const res = await client.query("SELECT id, name, email, role, system_role, is_active FROM users");
      console.log("Users currently in Supabase users table:");
      console.log(res.rows);
    } catch (queryErr) {
      console.error("Error running SELECT on users table:", queryErr.message);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to connect to Supabase:", err.message);
  } finally {
    await pool.end();
  }
}

main();
