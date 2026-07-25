import { Router } from "express";
import { db } from "@workspace/db";
import { activityLogsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate, isValidUUID } from "../lib/validation";
import { requirePermission, requireRole } from "../middleware/auth";

const router = Router();

router.get("/clients/:clientId/activity", requirePermission("clients.view"), asyncHandler(async (req, res) => {
  const { clientId } = req.params as { clientId: string };
  if (!isValidUUID(clientId)) {
    throw createError("Invalid clientId format", 400);
  }
  const rows = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.clientId, clientId))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(50);
  return res.json(rows);
}));

router.post("/clients/:clientId/activity", requirePermission("clients.edit"), asyncHandler(async (req, res) => {
  const { clientId } = req.params as { clientId: string };
  if (!isValidUUID(clientId)) {
    throw createError("Invalid clientId format", 400);
  }
  const { type, title, description, metadata } = req.body as {
    type: string;
    title: string;
    description?: string;
    metadata?: string;
  };
  if (!type || typeof type !== "string" || type.trim() === "") {
    throw createError("type is required and must be a non-empty string", 400);
  }
  if (!title || typeof title !== "string" || title.trim() === "") {
    throw createError("title is required and must be a non-empty string", 400);
  }

  const sanitized = sanitizeAndValidate({ type, title, description, metadata });

  const [row] = await db
    .insert(activityLogsTable)
    .values({ clientId, type: sanitized.type, title: sanitized.title, description: sanitized.description, metadata: sanitized.metadata })
    .returning();
  return res.status(201).json(row);
}));

router.delete("/clients/:clientId/activity/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { clientId, id } = req.params as { clientId: string; id: string };
  if (!isValidUUID(clientId)) {
    throw createError("Invalid clientId format", 400);
  }
  if (!isValidUUID(id)) {
    throw createError("Invalid activity log ID format", 400);
  }
  await db
    .delete(activityLogsTable)
    .where(eq(activityLogsTable.id, id));
  return res.status(204).send();
}));

export default router;
