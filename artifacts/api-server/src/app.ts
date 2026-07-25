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

app.use("/public", publicRouter);
app.use("/api/auth", authLimiter);
app.use("/api", router);

if (process.env.SERVE_STATIC === "true") {
  const publicDir = path.resolve(__dirname, "../../agency-os/dist/public");
  app.use(express.static(publicDir));
  app.get("*all", (req, res) => {
    res.sendFile(path.resolve(publicDir, "index.html"));
  });
}

app.use(errorHandler);

export default app;
