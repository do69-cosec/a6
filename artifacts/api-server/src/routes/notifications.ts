import { Router } from "express";
import { db } from "@workspace/db";
import { notifications } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { isValidUUID } from "../lib/validation";

const router = Router();

// GET /notifications - List notifications for logged in user
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;

  const userNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(sql`created_at desc`)
    .limit(50);

  const unreadCount = userNotifications.filter((n) => !n.readAt).length;

  return res.json({
    notifications: userNotifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt ? n.readAt.toISOString() : null,
    })),
    unreadCount,
  });
}));

// PATCH /notifications/:id/read - Mark notification as read
router.patch("/:id/read", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!isValidUUID(id)) throw createError("Invalid notification ID", 400);

  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();

  if (!updated) throw createError("Notification not found", 404);

  return res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    readAt: updated.readAt ? updated.readAt.toISOString() : null,
  });
}));

// PATCH /notifications/read-all - Mark all notifications as read
router.patch("/read-all", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;

  await db
    .update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), sql`read_at IS NULL`));

  return res.json({ success: true, message: "All notifications marked as read" });
}));

// DELETE /notifications/:id - Delete notification
router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!isValidUUID(id)) throw createError("Invalid notification ID", 400);

  await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

  return res.json({ success: true, message: "Notification deleted" });
}));

export default router;
