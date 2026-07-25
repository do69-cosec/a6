import { Router } from "express";
import { db } from "@workspace/db";
import { clientSocialAccountsTable, contentPostsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate, isValidUUID } from "../lib/validation";
import { requirePermission } from "../middleware/auth";

const router = Router();

const PLATFORMS = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "LINKEDIN", "TWITTER", "TIKTOK", "PINTEREST"];

function sanitizeSocialAccount(body: any, isUpdate = false) {
  if (!isUpdate) {
    if (!body.clientId || !body.platform) {
      throw createError("clientId and platform are required", 400);
    }
  }
  return sanitizeAndValidate(body, {
    uuids: ["clientId"],
    enums: {
      platform: PLATFORMS,
    }
  });
}

router.get("/", requirePermission("clients.view"), asyncHandler(async (req, res) => {
  const { clientId } = req.query as { clientId?: string };
  if (clientId && !isValidUUID(clientId)) {
    throw createError("Invalid clientId format", 400);
  }
  const rows = clientId
    ? await db.select().from(clientSocialAccountsTable).where(eq(clientSocialAccountsTable.clientId, clientId))
    : await db.select().from(clientSocialAccountsTable);
  return res.json(rows);
}));

router.post("/", requirePermission("clients.create"), asyncHandler(async (req, res) => {
  const sanitized = sanitizeSocialAccount(req.body, false);
  const [row] = await db
    .insert(clientSocialAccountsTable)
    .values(sanitized)
    .returning();
  return res.status(201).json(row);
}));

router.patch("/:id", requirePermission("clients.edit"), asyncHandler(async (req, res) => {
  const sanitized = sanitizeSocialAccount(req.body, true);
  const [row] = await db
    .update(clientSocialAccountsTable)
    .set(sanitized)
    .where(eq(clientSocialAccountsTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", requirePermission("clients.delete"), asyncHandler(async (req, res) => {
  await db.delete(clientSocialAccountsTable).where(eq(clientSocialAccountsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

router.post("/ignite", requirePermission("clients.edit"), asyncHandler(async (req, res) => {
  const { clientId, caption, platforms, scheduledAt, title, assetsLink } = req.body as {
    clientId: string;
    caption: string;
    platforms: string[];
    scheduledAt?: string;
    title?: string;
    assetsLink?: string;
  };
  if (!clientId || !caption || !platforms?.length) {
    throw createError("clientId, caption and platforms required", 400);
  }
  if (!isValidUUID(clientId)) {
    throw createError("Invalid clientId format", 400);
  }
  for (const plat of platforms) {
    if (!PLATFORMS.includes(plat)) {
      throw createError(`Invalid platform: ${plat}`, 400);
    }
  }

  // Validate scheduledAt date if provided
  let validatedScheduledAt: string | undefined = undefined;
  if (scheduledAt) {
    const parsed = sanitizeAndValidate({ d: scheduledAt }, { textDates: ["d"] });
    validatedScheduledAt = parsed.d;
  }

  const rows = await db
    .insert(contentPostsTable)
    .values(
      platforms.map((platform) => ({
        clientId,
        platform,
        caption,
        title: title || undefined,
        scheduledAt: validatedScheduledAt || undefined,
        assetsLink: assetsLink || undefined,
        status: "SCHEDULED",
        contentType: "POST",
      })),
    )
    .returning();
  return res.status(201).json({ created: rows.length, posts: rows });
}));

export default router;
