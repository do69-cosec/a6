import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import publicRouter from "./routes/publicCalendar";
import { errorHandler } from "./middleware/errorHandler";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/api/uploads", express.static(uploadsDir));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  validate: { trustProxy: false },
});

app.get(["/healthz", "/health"], (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/public", publicRouter);
app.use("/api/auth", authLimiter);
app.use("/api", router);

const getPublicDir = () => {
  const possiblePaths = [
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "dist/public"),
    path.resolve(__dirname, "../../agency-os/dist/public"),
    path.resolve(process.cwd(), "artifacts/agency-os/dist/public"),
  ];
  return possiblePaths.find((p) => fs.existsSync(p));
};

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const dir = getPublicDir();
  if (dir) {
    return express.static(dir)(req, res, next);
  }
  next();
});

app.use("/public", (req, res, next) => {
  const dir = getPublicDir();
  if (dir) {
    return express.static(dir)(req, res, next);
  }
  next();
});

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api") || req.path.startsWith("/public/calendar")) {
    return next();
  }
  const dir = getPublicDir();
  if (dir) {
    const indexPath = path.resolve(dir, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

app.use(errorHandler);

export default app;
