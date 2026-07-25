import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate } from "../lib/validation";
import { requirePermission } from "../middleware/auth";

const router = Router();

const STAGES = ["LEAD", "CONTACTED", "DEMO_GIVEN", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];

function sanitizeLead(body: any, isUpdate = false) {
  if (!isUpdate && (!body.title || typeof body.title !== "string" || body.title.trim() === "")) {
    throw createError("Lead title is required", 400);
  }
  return sanitizeAndValidate(body, {
    dates: ["expectedCloseDate", "stageChangedAt"],
    numbers: ["value", "probability"],
    enums: {
      stage: STAGES,
    }
  });
}

router.get("/", requirePermission("sales.view"), asyncHandler(async (req, res) => {
  const rows = await db.select().from(leadsTable);
  const now = Date.now();
  const result = rows.map((lead) => ({
    ...lead,
    daysInStage: lead.stageChangedAt
      ? Math.floor((now - new Date(lead.stageChangedAt).getTime()) / 86400000)
      : 0,
  }));
  return res.json(result);
}));

router.get("/pipeline-summary", requirePermission("sales.view"), asyncHandler(async (req, res) => {
  const rows = await db
    .select({
      stage: leadsTable.stage,
      count: sql<number>`count(*)::int`,
      totalValue: sql<number>`coalesce(sum(${leadsTable.value}), 0)::float`,
    })
    .from(leadsTable)
    .groupBy(leadsTable.stage);

  const map = Object.fromEntries(rows.map((r) => [r.stage, r]));
  const summary = STAGES.map((stage) => ({
    stage,
    count: map[stage]?.count ?? 0,
    totalValue: map[stage]?.totalValue ?? 0,
  }));
  return res.json(summary);
}));

router.post("/", requirePermission("sales.create"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeLead(body, false);
  const [row] = await db
    .insert(leadsTable)
    .values({ ...sanitized, stageChangedAt: new Date() })
    .returning();
  return res.status(201).json(row);
}));

router.patch("/:id", requirePermission("sales.edit"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeLead(body, true);
  const updates: Record<string, unknown> = { ...sanitized };
  if (sanitized.stage) updates.stageChangedAt = new Date();
  const [row] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", requirePermission("sales.delete"), asyncHandler(async (req, res) => {
  await db.delete(leadsTable).where(eq(leadsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

export default router;
