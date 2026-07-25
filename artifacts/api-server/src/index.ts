import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Preserve initial PORT from process.env before dotenv loads
const initialPort = process.env["PORT"];

// Load .env from workspace root and override default environment variables
let currentDir = process.cwd();
let envLoaded = false;
while (currentDir && currentDir !== "/") {
  const envPath = path.resolve(currentDir, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
    envLoaded = true;
    break;
  }
  currentDir = path.dirname(currentDir);
}
if (!envLoaded && fs.existsSync("/.env")) {
  dotenv.config({ path: "/.env", override: false });
}

import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapDatabase } from "./lib/bootstrap";

const rawPort = initialPort || process.env["PORT"];
const port = rawPort ? Number(rawPort) : 3000;

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, `Server listening on http://0.0.0.0:${port}`);
});

server.on("error", (err) => {
  logger.error({ err }, "Error starting server");
  process.exit(1);
});

bootstrapDatabase().catch((err) => {
  logger.error({ err }, "Database bootstrap encountered an error, running server anyway...");
});
