import { Router } from "express";
import { db } from "@workspace/db";
import { notifications } from "@workspace/db/schema";
import { eq, and, sql, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { isValidUUID } from "../lib/validation";
import { NotificationService } from "../services/notificationService";

const router = Router();

// GET /notifications - List notifications for logged in user with filters
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const { type, priority, isRead, search, limit = "100" } = req.query as Record<string, string>;

  const conditions = [eq(notifications.userId, userId)];

  if (type && type !== "ALL") {
    conditions.push(
      or(
        eq(notifications.type, type),
        eq(notifications.referenceType, type)
      )!
    );
  }

  if (priority && priority !== "ALL") {
    conditions.push(eq(notifications.priority, priority));
  }

  if (isRead !== undefined && isRead !== "ALL" && isRead !== "") {
    if (isRead === "true") {
      conditions.push(or(eq(notifications.isRead, true), sql`read_at IS NOT NULL`)!);
    } else if (isRead === "false") {
      conditions.push(and(eq(notifications.isRead, false), sql`read_at IS NULL`)!);
    }
  }

  if (search && search.trim() !== "") {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(notifications.title, term),
        ilike(notifications.message, term)
      )!
    );
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  const userNotifications = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(sql`created_at desc`)
    .limit(parsedLimit);

  // Compute unread count for user across all notifications
  const allUserNotifications = await db
    .select({ id: notifications.id, isRead: notifications.isRead, readAt: notifications.readAt })
    .from(notifications)
    .where(eq(notifications.userId, userId));

  const unreadCount = allUserNotifications.filter((n) => !n.isRead && !n.readAt).length;

  return res.json({
    notifications: userNotifications.map((n) => ({
      ...n,
      isRead: Boolean(n.isRead || n.readAt),
      createdAt: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
      readAt: n.readAt ? n.readAt.toISOString() : null,
    })),
    unreadCount,
  });
}));

// PATCH /notifications/read-all - Mark all notifications as read
router.patch("/read-all", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), sql`(read_at IS NULL OR is_read = false)`));

  return res.json({ success: true, message: "All notifications marked as read" });
}));

// DELETE /notifications/clear-all - Delete all notifications for user
router.delete("/clear-all", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;

  await db
    .delete(notifications)
    .where(eq(notifications.userId, userId));

  return res.json({ success: true, message: "All notifications cleared" });
}));

// PATCH /notifications/:id/read - Mark single notification as read
router.patch("/:id/read", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!isValidUUID(id)) throw createError("Invalid notification ID", 400);

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();

  if (!updated) throw createError("Notification not found", 404);

  return res.json({
    ...updated,
    isRead: true,
    createdAt: updated.createdAt ? updated.createdAt.toISOString() : new Date().toISOString(),
    readAt: updated.readAt ? updated.readAt.toISOString() : new Date().toISOString(),
  });
}));

// DELETE /notifications/:id - Delete single notification
router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!isValidUUID(id)) throw createError("Invalid notification ID", 400);

  await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

  return res.json({ success: true, message: "Notification deleted" });
}));

// POST /notifications/announcement - Broadcast announcement (Admin/Manager only)
router.post("/announcement", requireAuth, asyncHandler(async (req, res) => {
  const requesterId = (req as any).userId;
  const userRole = (req as any).userRole;
  const userSystemRole = (req as any).userSystemRole;

  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN" && userSystemRole !== "SUPER_ADMIN" && userSystemRole !== "MANAGER") {
    throw createError("Forbidden: Only Admins or Managers can broadcast announcements", 403);
  }

  const { title, message, priority = "HIGH", targetRole = null } = req.body;

  if (!title || !message) {
    throw createError("Title and message are required", 400);
  }

  const createdNotifications = await NotificationService.sendBroadcast({
    title: `📣 ${title}`,
    message,
    type: "ANNOUNCEMENT",
    priority: priority as any,
    targetRole,
    referenceType: "ANNOUNCEMENT",
    createdBy: requesterId,
  });

  return res.status(201).json({
    success: true,
    message: `Announcement broadcasted to ${createdNotifications.length} employees`,
    notificationsSent: createdNotifications.length,
  });
}));

export default router;
