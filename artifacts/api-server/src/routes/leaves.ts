import { Router } from "express";
import { db } from "@workspace/db";
import { leaveRequests, users } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requirePermission } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate, isValidUUID } from "../lib/validation";
import { NotificationService } from "../services/notificationService";

const router = Router();

router.get("/leaves", requirePermission("leave.view"), asyncHandler(async (req, res) => {
  const { userId, status } = req.query as Record<string, string>;
  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;

  const conditions = [];
  if (requesterRole === "EMPLOYEE") {
    conditions.push(eq(leaveRequests.userId, requesterId));
  } else if (userId) {
    if (!isValidUUID(userId)) {
      throw createError("Invalid userId format", 400);
    }
    conditions.push(eq(leaveRequests.userId, userId));
  }
  if (status) conditions.push(eq(leaveRequests.status, status as any));

  const [allLeaves, allUsers] = await Promise.all([
    db.select().from(leaveRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`created_at desc`),
    db.select({ id: users.id, name: users.name }).from(users),
  ]);

  const userMap: Record<string, string> = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));

  return res.json(allLeaves.map((l) => ({
    ...l,
    userName: userMap[l.userId] ?? null,
    createdAt: l.createdAt?.toISOString() ?? null,
  })));
}));

router.post("/leaves", requirePermission("leave.apply"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const { type, startDate, endDate, reason } = req.body;
  if (!type || !startDate || !endDate) throw createError("type, startDate, and endDate are required", 400);

  const sanitized = sanitizeAndValidate({ type, startDate, endDate, reason }, {
    textDates: ["startDate", "endDate"],
    enums: {
      type: ["CASUAL", "SICK", "EARNED", "UNPAID"],
    }
  });

  const [leave] = await db.insert(leaveRequests).values({
    id: crypto.randomUUID(),
    userId,
    type: sanitized.type,
    startDate: sanitized.startDate,
    endDate: sanitized.endDate,
    reason: sanitized.reason ?? null,
    status: "PENDING",
  }).returning();

  // Notify Admins about new leave request
  try {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.systemRole, "SUPER_ADMIN"));
    for (const admin of admins) {
      if (admin.id !== userId) {
        await NotificationService.createNotification({
          userId: admin.id,
          title: "🏖️ New Leave Request",
          message: `${user.name} applied for ${sanitized.type} leave (${sanitized.startDate} to ${sanitized.endDate})`,
          type: "LEAVE",
          priority: "HIGH",
          referenceId: leave.id,
          referenceType: "LEAVE",
          createdBy: userId,
        });
      }
    }
  } catch (e) {
    console.warn("Failed to notify admins on leave application:", e);
  }

  return res.status(201).json({ ...leave, userName: user.name, createdAt: leave.createdAt?.toISOString() ?? null });
}));

router.post("/leaves/:id/approve", requirePermission("leave.approve"), asyncHandler(async (req, res) => {
  if (!isValidUUID(req.params.id)) {
    throw createError("Invalid leave request ID format", 400);
  }
  const userId = (req as any).userId;
  const [updated] = await db.update(leaveRequests)
    .set({ status: "APPROVED", reviewedBy: userId })
    .where(eq(leaveRequests.id, (req.params.id as string)))
    .returning();
  if (!updated) throw createError("Not found", 404);

  // Notify employee
  try {
    if (updated.userId !== userId) {
      await NotificationService.createNotification({
        userId: updated.userId,
        title: "✅ Leave Request Approved",
        message: `Your ${updated.type} leave request (${updated.startDate} to ${updated.endDate}) was APPROVED.`,
        type: "LEAVE",
        priority: "HIGH",
        referenceId: updated.id,
        referenceType: "LEAVE",
        createdBy: userId,
      });
    }
  } catch (e) {
    console.warn("Failed to notify user on leave approval:", e);
  }

  return res.json({ ...updated, createdAt: updated.createdAt?.toISOString() ?? null });
}));

router.post("/leaves/:id/reject", requirePermission("leave.approve"), asyncHandler(async (req, res) => {
  if (!isValidUUID(req.params.id)) {
    throw createError("Invalid leave request ID format", 400);
  }
  const userId = (req as any).userId;
  const [updated] = await db.update(leaveRequests)
    .set({ status: "REJECTED", reviewedBy: userId })
    .where(eq(leaveRequests.id, (req.params.id as string)))
    .returning();
  if (!updated) throw createError("Not found", 404);

  // Notify employee
  try {
    if (updated.userId !== userId) {
      await NotificationService.createNotification({
        userId: updated.userId,
        title: "❌ Leave Request Rejected",
        message: `Your ${updated.type} leave request (${updated.startDate} to ${updated.endDate}) was REJECTED.`,
        type: "LEAVE",
        priority: "HIGH",
        referenceId: updated.id,
        referenceType: "LEAVE",
        createdBy: userId,
      });
    }
  } catch (e) {
    console.warn("Failed to notify user on leave rejection:", e);
  }

  return res.json({ ...updated, createdAt: updated.createdAt?.toISOString() ?? null });
}));

// GET /api/leaves/balance?userId=&year=
router.get("/leaves/balance", requirePermission("leave.view"), asyncHandler(async (req, res) => {
  const { userId, year } = req.query as Record<string, string>;
  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;
  
  if (year) {
    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear) || !Number.isFinite(parsedYear)) {
      throw createError("Invalid year format", 400);
    }
  }
  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
  const targetUserId = requesterRole === "EMPLOYEE" ? requesterId : (userId || requesterId);
  if (!targetUserId) throw createError("userId is required", 400);
  if (!isValidUUID(targetUserId)) {
    throw createError("Invalid userId format", 400);
  }

  const result = await db.execute(
    `SELECT * FROM leave_balances WHERE user_id = $1 AND year = $2`,
    [targetUserId, targetYear]
  );
  const rows = result.rows ?? result;
  if (rows.length === 0) {
    // Return default balance if no row exists yet
    return res.json({
      userId: targetUserId, year: targetYear,
      casualTotal: 12, casualUsed: 0,
      sickTotal: 6, sickUsed: 0,
      earnedTotal: 15, earnedUsed: 0,
    });
  }
  return res.json(rows[0]);
}));

export default router;
