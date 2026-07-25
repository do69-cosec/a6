import { Router } from "express";
import { db } from "@workspace/db";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate, isValidUUID } from "../lib/validation";
import { requirePermission } from "../middleware/auth";

const router = Router();

// GET /api/attachments?entityType=task&entityId=xxx
router.get("/", requirePermission("attachments.view"), asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query as Record<string, string>;
  if (!entityType || !entityId) throw createError("entityType and entityId are required", 400);

  if (!isValidUUID(entityId)) {
    throw createError("Invalid entityId format", 400);
  }

  const result = await db.execute(
    `SELECT * FROM file_attachments WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return res.json(result.rows ?? result);
}));

// POST /api/attachments
router.post("/", requirePermission("attachments.upload"), asyncHandler(async (req, res) => {
  const { entityType, entityId, filename, url } = req.body as {
    entityType: string;
    entityId: string;
    filename: string;
    url: string;
  };
  if (!entityType || !entityId || !filename || !url) {
    throw createError("entityType, entityId, filename, and url are required", 400);
  }

  if (!isValidUUID(entityId)) {
    throw createError("Invalid entityId format", 400);
  }

  const sanitized = sanitizeAndValidate({ entityType, entityId, filename, url });

  const uploadedBy = (req as any).userId ?? null;

  const result = await db.execute(
    `INSERT INTO file_attachments (id, entity_type, entity_id, filename, url, uploaded_by)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)
     RETURNING *`,
    [sanitized.entityType, sanitized.entityId, sanitized.filename, sanitized.url, uploadedBy]
  );
  const row = (result.rows ?? result)[0];
  return res.status(201).json(row);
}));

// DELETE /api/attachments/:id
router.delete("/:id", requirePermission("attachments.upload"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    throw createError("Invalid attachment ID format", 400);
  }
  const findResult = await db.execute(
    `SELECT * FROM file_attachments WHERE id = $1`,
    [id]
  );
  const attachment = (findResult.rows ?? findResult)[0] as any;
  if (!attachment) {
    throw createError("Attachment not found", 404);
  }

  const userId = (req as any).userId;
  const userRole = (req as any).userRole;

  if (userRole !== "ADMIN" && attachment.uploaded_by && attachment.uploaded_by !== userId) {
    throw createError("Forbidden: You can only delete attachments you uploaded", 403);
  }

  await db.execute(
    `DELETE FROM file_attachments WHERE id = $1`,
    [id]
  );
  return res.status(204).send();
}));

export default router;
