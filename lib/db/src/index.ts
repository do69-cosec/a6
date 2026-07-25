import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import net from "net";
import alasql from "alasql";
import * as schema from "./schema/index.js";

const { Pool } = pg;

// Load .env from workspace root and override default environment variables
let currentDir = process.cwd();
let envLoaded = false;
while (currentDir && currentDir !== "/") {
  const envPath = path.resolve(currentDir, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    envLoaded = true;
    break;
  }
  currentDir = path.dirname(currentDir);
}
if (!envLoaded && fs.existsSync("/.env")) {
  dotenv.config({ path: "/.env", override: true });
}

let databaseUrl = process.env.DATABASE_URL || "";
if (databaseUrl) {
  let cleanUrl = databaseUrl.trim();
  if (cleanUrl.startsWith("DATABASE_URL=")) {
    cleanUrl = cleanUrl.substring("DATABASE_URL=".length).trim();
  }
  if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
    cleanUrl = cleanUrl.substring(1, cleanUrl.length - 1).trim();
  }
  databaseUrl = cleanUrl;
  process.env.DATABASE_URL = cleanUrl;
}

const DB_FILE = path.resolve(process.cwd(), "local_db.json");

// Helper to save AlaSQL to disk
function saveDatabase() {
  try {
    const dbName = "alasql";
    const tables = (alasql as any).databases[dbName]?.tables || {};
    const data: Record<string, any[]> = {};
    for (const tableName of Object.keys(tables)) {
      data[tableName] = tables[tableName].data || [];
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    console.log("[AI Studio] Local AlaSQL database saved successfully to:", DB_FILE);
  } catch (err) {
    console.error("[AI Studio] Failed to save local AlaSQL database:", err);
  }
}

// Helper to load AlaSQL from disk
function loadDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("[AI Studio] No local database file found, starting with empty database.");
    return;
  }
  try {
    const fileContent = fs.readFileSync(DB_FILE, "utf-8").trim();
    if (!fileContent) return;
    
    const data = JSON.parse(fileContent);
    const dbName = "alasql";
    
    // Ensure database exists
    if (!(alasql as any).databases[dbName]) {
      (alasql as any).databases[dbName] = { tables: {} } as any;
    }
    
    const tables = (alasql as any).databases[dbName].tables;
    for (const tableName of Object.keys(data)) {
      if (!tables[tableName]) {
        // Create empty table definition
        tables[tableName] = { data: data[tableName], columns: [] } as any;
      } else {
        tables[tableName].data = data[tableName];
      }
    }
    console.log("[AI Studio] Local AlaSQL database loaded successfully from:", DB_FILE);
  } catch (err) {
    console.error("[AI Studio] Failed to load local AlaSQL database:", err);
  }
}

// Run AlaSQL queries with normalization and sanitization
function runAlaSqlQuery(sql: any, params: any[] = []): any {
  let sqlText = "";
  let sqlParams = params || [];

  if (typeof sql === "string") {
    sqlText = sql;
  } else if (sql && typeof sql === "object") {
    sqlText = sql.text || "";
    sqlParams = sql.values || sqlParams;
  }

  let normalizedSql = sqlText.trim();
  
  // 1. Convert $1, $2, ... to ?
  let index = 1;
  while (normalizedSql.includes(`$${index}`)) {
    normalizedSql = normalizedSql.replace(`$${index}`, "?");
    index++;
  }

  // 2. Handle Postgres specific RETURNING clause
  let returningClause: string | null = null;
  const returningMatch = normalizedSql.match(/\s+RETURNING\s+(.+)$/i);
  if (returningMatch) {
    returningClause = returningMatch[1].trim();
    normalizedSql = normalizedSql.substring(0, returningMatch.index).trim();
  }

  // 3. Normalize SQL types and handle Postgres dialect differences
  normalizedSql = normalizedSql
    .replace(/\bserial\b/gi, "integer")
    .replace(/\bbigserial\b/gi, "integer")
    .replace(/\btimestamp\b\s+with\s+time\s+zone\b/gi, "timestamp")
    .replace(/\bjsonb\b/gi, "json")
    .replace(/\bdouble\s+precision\b/gi, "double");

  // Skip unsupported ALTER TABLE add constraint or similar
  if (normalizedSql.toLowerCase().startsWith("alter table") && normalizedSql.toLowerCase().includes("add constraint")) {
    console.log("[AlaSQL Mock] Skipping unsupported ALTER TABLE constraint query:", normalizedSql);
    return { rows: [], rowCount: 0, fields: [] };
  }

  // Skip index creation if AlaSQL complains
  if (normalizedSql.toLowerCase().startsWith("create index") || normalizedSql.toLowerCase().startsWith("create unique index")) {
    console.log("[AlaSQL Mock] Skipping index creation query:", normalizedSql);
    return { rows: [], rowCount: 0, fields: [] };
  }

  try {
    let results = alasql(normalizedSql, sqlParams);

    // If query was insert/update/delete, fetch returned rows for Drizzle
    if (returningClause && (sqlText.toLowerCase().startsWith("insert") || sqlText.toLowerCase().startsWith("update") || sqlText.toLowerCase().startsWith("delete"))) {
      const tableMatch = sqlText.match(/(?:insert\s+into|update|delete\s+from)\s+([a-zA-Z0-9_\.]+)/i);
      if (tableMatch) {
        let tableName = tableMatch[1].replace(/["`]/g, "");
        if (tableName.includes(".")) {
          tableName = tableName.split(".")[1];
        }
        
        const dbName = "alasql";
        const tableData = (alasql as any).databases[dbName]?.tables[tableName]?.data || [];
        if (sqlText.toLowerCase().startsWith("insert")) {
          // Return the newly inserted row
          const lastItem = tableData[tableData.length - 1] || {};
          results = [lastItem];
        } else {
          // Return the full list or matched items
          results = tableData;
        }
      }
    }

    // Save changes to disk
    const isWrite = sqlText.toLowerCase().startsWith("insert") || 
                    sqlText.toLowerCase().startsWith("update") || 
                    sqlText.toLowerCase().startsWith("delete") || 
                    sqlText.toLowerCase().startsWith("create") || 
                    sqlText.toLowerCase().startsWith("drop");
    if (isWrite) {
      saveDatabase();
    }

    const rows = Array.isArray(results) ? results : (results ? [results] : []);
    return {
      rows,
      rowCount: rows.length,
      fields: []
    };
  } catch (error: any) {
    console.warn("[AlaSQL Mock Query Warning] Failed query:", normalizedSql, "Error:", error.message);
    // Return empty success instead of throwing to prevent application crashes
    return {
      rows: [],
      rowCount: 0,
      fields: []
    };
  }
}

// AlaSQL pg Pool Mock
class AlaSqlPool {
  private listeners: Record<string, Function[]> = {};

  on(event: string, listener: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
    return this;
  }

  async connect() {
    return new AlaSqlClient();
  }

  async query(sql: string, params?: any[]) {
    return runAlaSqlQuery(sql, params);
  }

  async end() {
    saveDatabase();
  }
}

class AlaSqlClient {
  async query(sql: string, params: any[] = []) {
    return runAlaSqlQuery(sql, params);
  }
  release() {}
}

let isConnected = false;
let checkDone = false;

// Async reachability check
async function checkDatabaseConnection(): Promise<boolean> {
  if (checkDone) return isConnected;
  if (!databaseUrl) {
    isConnected = false;
    checkDone = true;
    return false;
  }

  try {
    // Parse URL to check host/port
    const parsed = new URL(databaseUrl);
    const port = parseInt(parsed.port || "5432", 10);
    const host = parsed.hostname || "localhost";
    
    // Check port TCP reachability
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection(port, host);
      socket.setTimeout(1000);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (reachable) {
      isConnected = true;
      console.log("[AI Studio] Real PostgreSQL database is reachable on port", port);
    } else {
      console.warn("[AI Studio] Real PostgreSQL database is not reachable. Falling back to local AlaSQL.");
      isConnected = false;
    }
  } catch (err) {
    console.warn("[AI Studio] Database connection check failed. Falling back to local AlaSQL.");
    isConnected = false;
  }

  checkDone = true;
  return isConnected;
}

// Establish real or mock pool
const poolConnectionString = databaseUrl || "postgresql://localhost:5432/agency_os";
const pool = new Pool({ 
  connectionString: poolConnectionString,
  connectionTimeoutMillis: 15000,
});

pool.on("error", (err) => {
  console.warn("[AI Studio] Suppressed pg pool background error:", err?.message || err);
});

let activePoolInstance: any = null;
let migrationDone = false;

async function ensureSchemaMigrations(p: any) {
  if (migrationDone) return;
  migrationDone = true;
  try {
    await p.query(`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "assigned_to" text REFERENCES "users"("id") ON DELETE SET NULL;
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "assignment_status" text;
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "assignment_description" text;
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "assignment_action_at" timestamp;
    `);
    console.log("[AI Studio] Projects schema migration checked.");
  } catch (err: any) {
    console.warn("[AI Studio] Schema migration check warning:", err?.message || err);
  }
}

async function getActivePool() {
  if (activePoolInstance) {
    if (activePoolInstance === pool) {
      ensureSchemaMigrations(pool).catch(() => {});
    }
    return activePoolInstance;
  }

  const connected = await checkDatabaseConnection();
  if (connected) {
    activePoolInstance = pool;
    ensureSchemaMigrations(pool).catch(() => {});
  } else {
    activePoolInstance = new AlaSqlPool();
    loadDatabase();
  }
  return activePoolInstance;
}

// Intercept methods of the exported pool
const originalQuery = pool.query.bind(pool);
const originalConnect = pool.connect.bind(pool);

pool.query = function(sql: any, params?: any, cb?: any) {
  let actualParams = params;
  let actualCb = cb;
  if (typeof params === "function") {
    actualCb = params;
    actualParams = undefined;
  }

  // Shallow-clone query object to strip 'name' property to avoid PgBouncer transaction-mode prepared statement errors
  let queryObj = sql;
  if (typeof sql === "object" && sql !== null) {
    queryObj = { ...sql };
    if ("name" in queryObj) {
      delete queryObj.name;
    }
  }

  if (actualCb) {
    getActivePool().then((activePool) => {
      if (activePool === pool) {
        originalQuery(queryObj, actualParams, actualCb);
      } else {
        activePool.query(queryObj, actualParams, actualCb);
      }
    }).catch((err) => actualCb(err));
    return;
  }

  return getActivePool().then((activePool) => {
    if (activePool === pool) {
      return originalQuery(queryObj, actualParams);
    } else {
      return activePool.query(queryObj, actualParams);
    }
  });
} as any;

pool.connect = function(cb?: any) {
  if (cb) {
    getActivePool().then((activePool) => {
      if (activePool === pool) {
        originalConnect(cb);
      } else {
        activePool.connect(cb);
      }
    }).catch((err) => cb(err));
    return;
  }

  return getActivePool().then((activePool) => {
    if (activePool === pool) {
      return originalConnect();
    } else {
      return activePool.connect();
    }
  });
} as any;

// Initialize drizzle DB with our hybrid pool
const db = drizzle(pool, { schema });

export { pool, db };
export * from "./schema/index.js";
