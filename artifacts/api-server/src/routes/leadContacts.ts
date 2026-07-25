import { Router } from "express";
import { db } from "@workspace/db";
import { leadContactsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate, isValidUUID } from "../lib/validation";
import { requirePermission } from "../middleware/auth";

const router = Router();

router.get("/:id/contacts", requirePermission("sales.view"), asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  if (!isValidUUID(id)) {
    throw createError("Invalid lead ID format", 400);
  }
  const rows = await db
    .select()
    .from(leadContactsTable)
    .where(eq(leadContactsTable.leadId, id))
    .orderBy(desc(leadContactsTable.createdAt));
  return res.json(rows);
}));

router.post("/:id/contacts", requirePermission("sales.create"), asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  if (!isValidUUID(id)) {
    throw createError("Invalid lead ID format", 400);
  }
  
  const { type, subject, body } = req.body as { type?: string; subject: string; body?: string };
  if (!subject || typeof subject !== "string" || subject.trim() === "") {
    throw createError("subject is required and must be a non-empty string", 400);
  }

  const sanitized = sanitizeAndValidate({ type, subject, body }, {
    enums: {
      type: ["NOTE", "CALL", "EMAIL", "MEETING"],
    }
  });

  const [row] = await db
    .insert(leadContactsTable)
    .values({ leadId: id, type: sanitized.type ?? "NOTE", subject: sanitized.subject, body: sanitized.body })
    .returning();
  return res.status(201).json(row);
}));

router.delete("/:id/contacts/:contactId", requirePermission("sales.delete"), asyncHandler(async (req, res) => {
  const { id, contactId } = req.params as { id: string; contactId: string };
  if (!isValidUUID(id)) {
    throw createError("Invalid lead ID format", 400);
  }
  if (!isValidUUID(contactId)) {
    throw createError("Invalid contact ID format", 400);
  }
  await db
    .delete(leadContactsTable)
    .where(eq(leadContactsTable.id, contactId));
  return res.status(204).send();
}));

export default router;
