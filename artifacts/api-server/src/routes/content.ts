import { Router } from "express";
import { db } from "@workspace/db";
import { contentPostsTable, clientsTable, clientCalendarSharesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate, isValidUUID } from "../lib/validation";
import { requirePermission } from "../middleware/auth";

const router = Router();

function sanitizeContentPost(body: any, isUpdate = false) {
  return sanitizeAndValidate(body, {
    uuids: ["clientId"],
    textDates: ["scheduledAt", "shootDate"],
    enums: {
      platform: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X", "TIKTOK", "YOUTUBE", "PINTEREST", "TWITTER"],
      contentType: ["POST", "REEL", "STORY", "CAROUSEL", "VIDEO", "SHORTS"],
      status: ["IDEA", "SCRIPTING", "DESIGNING", "PRODUCTION", "IN_REVIEW", "ADMIN_APPROVED", "SCHEDULED", "PUBLISHED", "SCHEDULING", "POSTED"],
      approvalStatus: ["PENDING", "APPROVED", "REJECTED"],
    }
  });
}

const CONTENT_COLUMNS = {
  id: contentPostsTable.id,
  platform: contentPostsTable.platform,
  contentType: contentPostsTable.contentType,
  status: contentPostsTable.status,
  caption: contentPostsTable.caption,
  description: contentPostsTable.description,
  referenceUrl: contentPostsTable.referenceUrl,
  assetsLink: contentPostsTable.assetsLink,
  scheduledAt: contentPostsTable.scheduledAt,
  shootDate: contentPostsTable.shootDate,
  clientId: contentPostsTable.clientId,
  clientName: clientsTable.companyName,
  title: contentPostsTable.title,
  script: contentPostsTable.script,
  ideation: contentPostsTable.ideation,
  format: contentPostsTable.format,
  needsRevision: contentPostsTable.needsRevision,
  referenceLinks: contentPostsTable.referenceLinks,
  customProperties: contentPostsTable.customProperties,
  comments: contentPostsTable.comments,
  createdAt: contentPostsTable.createdAt,
};

router.get("/", requirePermission("content.view"), asyncHandler(async (req, res) => {
  const { clientId } = req.query as Record<string, string>;
  const rows = await db
    .select(CONTENT_COLUMNS)
    .from(contentPostsTable)
    .leftJoin(clientsTable, eq(contentPostsTable.clientId, clientsTable.id))
    .where(clientId ? eq(contentPostsTable.clientId, clientId) : undefined);
  return res.json(rows);
}));

router.post("/", requirePermission("content.create"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeContentPost(body, false);
  const [row] = await db.insert(contentPostsTable).values(sanitized).returning();
  return res.status(201).json(row);
}));

router.patch("/:id", requirePermission("content.edit"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeContentPost(body, true);
  const [row] = await db
    .update(contentPostsTable)
    .set(sanitized)
    .where(eq(contentPostsTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", requirePermission("content.delete"), asyncHandler(async (req, res) => {
  await db.delete(contentPostsTable).where(eq(contentPostsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

// ─── Approval Routes ─────────────────────────────────────────

router.post("/:id/approve", requirePermission("content.edit"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId ?? null;
  const [row] = await db
    .update(contentPostsTable)
    .set({ approvalStatus: "APPROVED", approvedBy: userId, approvedAt: new Date() } as any)
    .where(eq(contentPostsTable.id, req.params.id as string))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.post("/:id/reject", requirePermission("content.edit"), asyncHandler(async (req, res) => {
  const { note } = req.body as { note?: string };
  const [row] = await db
    .update(contentPostsTable)
    .set({ approvalStatus: "REJECTED", rejectionNote: note ?? null } as any)
    .where(eq(contentPostsTable.id, req.params.id as string))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

// ─── Share Calendar Routes ────────────────────────────────────

router.post("/shares", requirePermission("content.create"), asyncHandler(async (req, res) => {
  const { clientId, label, expiresAt } = req.body;
  if (!clientId) throw createError("clientId is required", 400);
  if (!isValidUUID(clientId)) {
    throw createError("Invalid clientId format", 400);
  }

  const sanitized = sanitizeAndValidate({ clientId, label, expiresAt }, {
    uuids: ["clientId"],
    dates: ["expiresAt"],
  });

  const { randomUUID } = await import("crypto");
  const shareToken = randomUUID();

  const [share] = await db
    .insert(clientCalendarSharesTable)
    .values({
      clientId: sanitized.clientId,
      shareToken,
      label: sanitized.label ?? null,
      expiresAt: sanitized.expiresAt ?? null,
    })
    .returning();

  return res.status(201).json(share);
}));

router.get("/shares", requirePermission("content.view"), asyncHandler(async (req, res) => {
  const { clientId } = req.query;
  const shares = await db
    .select()
    .from(clientCalendarSharesTable)
    .where(clientId ? eq(clientCalendarSharesTable.clientId, clientId as string) : undefined);
  return res.json(shares);
}));

export default router;
