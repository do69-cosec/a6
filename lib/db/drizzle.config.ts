import { defineConfig } from "drizzle-kit";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

if (process.env.DATABASE_URL) {
  let cleanUrl = process.env.DATABASE_URL.trim();
  if (cleanUrl.startsWith("DATABASE_URL=")) {
    cleanUrl = cleanUrl.substring("DATABASE_URL=".length).trim();
  }
  if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
    cleanUrl = cleanUrl.substring(1, cleanUrl.length - 1).trim();
  }
  process.env.DATABASE_URL = cleanUrl;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./lib/db/src/schema/*.ts",
  out: "./lib/db/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
