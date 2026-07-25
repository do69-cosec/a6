import dotenv from "dotenv";
import path from "path";
import fs from "fs";

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

import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapDatabase } from "./lib/bootstrap";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

bootstrapDatabase()
  .catch((err) => {
    logger.error({ err }, "Database bootstrap encountered an error, starting server anyway...");
  })
  .finally(() => {
    const server = app.listen(port, "0.0.0.0", () => {
      logger.info({ port }, "Server listening on http://0.0.0.0:" + port);
    });
    server.on("error", (err) => {
      logger.error({ err }, "Error starting server");
      process.exit(1);
    });
  });
