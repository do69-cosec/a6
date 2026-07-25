import { Router } from "express";
import { db } from "@workspace/db";
import { agencySettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { sanitizeAndValidate } from "../lib/validation";

const router = Router();

const DEFAULT_SETTINGS = {
  id: "default",
  agencyName: "Blink Beyond",
  primaryColor: "#6366f1",
  currency: "INR",
  taxLabel: "GST",
  taxPercent: 18,
  workDayStart: "09:00",
  workDayEnd: "18:00",
  workingDays: "1,2,3,4,5",
  gracePeriodMin: 30,
  halfDayCutoffTime: "12:00",
  absentCutoffTime: "11:00",
};

async function ensureSettings() {
  let settings = await db.query.agencySettings.findFirst({ where: eq(agencySettings.id, "default") });
  if (!settings) {
    const [created] = await db.insert(agencySettings).values(DEFAULT_SETTINGS).returning();
    settings = created;
  }
  return settings;
}

router.get("/settings", requirePermission("settings.view"), asyncHandler(async (_req, res) => {
  const settings = await ensureSettings();
  return res.json({ ...settings, updatedAt: settings.updatedAt?.toISOString() ?? null });
}));

router.patch("/settings", requirePermission("settings.update"), asyncHandler(async (req, res) => {
  await ensureSettings();
  const { id: _id, ...body } = req.body;
  const sanitized = sanitizeAndValidate(body, {
    numbers: ["taxPercent", "gracePeriodMin"],
  });
  const [updated] = await db.update(agencySettings)
    .set({ ...sanitized, updatedAt: new Date() })
    .where(eq(agencySettings.id, "default"))
    .returning();
  return res.json({ ...updated, updatedAt: updated.updatedAt?.toISOString() ?? null });
}));

export default router;
