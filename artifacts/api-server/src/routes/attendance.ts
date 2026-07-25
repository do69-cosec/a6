import { Router } from "express";
import { db } from "@workspace/db";
import { attendance, users, leaveRequests, agencySettings } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requirePermission } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { isValidUUID } from "../lib/validation";

const router = Router();

export async function processAutomaticAbsentMarking(targetDateStr?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const targetDate = targetDateStr || today;

  const settings = await db.query.agencySettings.findFirst({
    where: eq(agencySettings.id, "default"),
  });

  const workingDaysConfig = settings?.workingDays || "1,2,3,4,5";
  const validWorkingDays = workingDaysConfig.split(",").map((d) => Number(d.trim()));
  const absentCutoffTime = settings?.absentCutoffTime || "11:00";

  if (targetDate === today) {
    const now = new Date();
    const [cutoffHour, cutoffMin] = absentCutoffTime.split(":").map(Number);
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffHour, cutoffMin, 0, 0);

    if (now < cutoffDate) {
      return {
        skipped: true,
        reason: `Attendance cutoff time (${absentCutoffTime}) for today has not passed yet. Current time is ${now.toTimeString().slice(0, 5)}.`,
        date: targetDate,
      };
    }
  }

  const [y, m, d] = targetDate.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();

  if (!validWorkingDays.includes(dayOfWeek)) {
    return {
      skipped: true,
      reason: `Date ${targetDate} is not a configured working day.`,
      date: targetDate,
    };
  }

  const activeUsers = await db.select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.isActive, true));

  if (activeUsers.length === 0) {
    return { success: true, processedDate: targetDate, markedAbsentCount: 0, markedLeaveCount: 0 };
  }

  const approvedLeaves = await db.select()
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.status, "APPROVED"),
      sql`start_date <= ${targetDate} AND end_date >= ${targetDate}`
    ));

  const leaveUserIds = new Set(approvedLeaves.map((l) => l.userId));

  const existingAttendance = await db.select()
    .from(attendance)
    .where(eq(attendance.date, targetDate));

  const existingUserIds = new Set(existingAttendance.map((a) => a.userId));

  let markedAbsentCount = 0;
  let markedLeaveCount = 0;

  for (const u of activeUsers) {
    if (existingUserIds.has(u.id)) {
      continue;
    }

    if (leaveUserIds.has(u.id)) {
      const inserted = await db.insert(attendance).values({
        id: crypto.randomUUID(),
        userId: u.id,
        checkInAt: null,
        status: "ON_LEAVE",
        date: targetDate,
      }).onConflictDoNothing().returning();
      if (inserted.length > 0) markedLeaveCount++;
    } else {
      const inserted = await db.insert(attendance).values({
        id: crypto.randomUUID(),
        userId: u.id,
        checkInAt: null,
        status: "ABSENT",
        date: targetDate,
      }).onConflictDoNothing().returning();
      if (inserted.length > 0) markedAbsentCount++;
    }
  }

  return {
    success: true,
    processedDate: targetDate,
    markedAbsentCount,
    markedLeaveCount,
  };
}

router.get("/attendance", requirePermission("attendance.view"), asyncHandler(async (req, res) => {
  const { userId, month } = req.query as Record<string, string>;
  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;

  const conditions = [];
  if (requesterRole === "EMPLOYEE") {
    conditions.push(eq(attendance.userId, requesterId));
  } else if (userId) {
    if (!isValidUUID(userId)) {
      throw createError("Invalid userId format", 400);
    }
    conditions.push(eq(attendance.userId, userId));
  }
  if (month) {
    const parts = month.split("-");
    if (parts.length !== 2) {
      throw createError("month must be in YYYY-MM format", 400);
    }
    const year = Number(parts[0]);
    const mo = Number(parts[1]);
    if (isNaN(year) || isNaN(mo) || mo < 1 || mo > 12 || !Number.isFinite(year) || !Number.isFinite(mo)) {
      throw createError("Invalid month values", 400);
    }
    const start = new Date(year, mo - 1, 1).toISOString().slice(0, 10);
    const end = new Date(year, mo, 0).toISOString().slice(0, 10);
    conditions.push(sql`date >= ${start} AND date <= ${end}`);
  }

  const [records, allUsers] = await Promise.all([
    db.select().from(attendance)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`date desc, check_in_at desc`),
    db.select({ id: users.id, name: users.name }).from(users),
  ]);

  const userMap: Record<string, string> = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));

  return res.json(records.map((r) => ({
    ...r,
    userName: userMap[r.userId] ?? null,
    checkInAt: r.checkInAt?.toISOString() ?? null,
    checkOutAt: r.checkOutAt?.toISOString() ?? null,
    breakStartAt: r.breakStartAt?.toISOString() ?? null,
    breakEndAt: r.breakEndAt?.toISOString() ?? null,
    breakDurationMin: r.breakDurationMin ?? 0,
    breakStatus: r.breakStatus ?? "IDLE",
    overtimeCheckInAt: r.overtimeCheckInAt?.toISOString() ?? null,
    overtimeCheckOutAt: r.overtimeCheckOutAt?.toISOString() ?? null,
    status: r.status ?? "PRESENT",
  })));
}));

router.post("/attendance/check-in", requirePermission("attendance.manage"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });

  const settings = await db.query.agencySettings.findFirst({
    where: eq(agencySettings.id, "default"),
  });
  const workDayStart = settings?.workDayStart || "09:00";
  const gracePeriodMin = settings?.gracePeriodMin ?? 30;
  const halfDayCutoffTime = settings?.halfDayCutoffTime || "12:00";

  const now = new Date();
  const [startHour, startMin] = workDayStart.split(":").map(Number);
  const graceCutoff = new Date();
  graceCutoff.setHours(startHour, startMin + gracePeriodMin, 0, 0);

  const [halfHour, halfMin] = halfDayCutoffTime.split(":").map(Number);
  const halfDayCutoff = new Date();
  halfDayCutoff.setHours(halfHour, halfMin, 0, 0);

  let status = "PRESENT";
  let isLate = false;

  if (now > graceCutoff && now <= halfDayCutoff) {
    status = "PRESENT";
    isLate = true;
  } else if (now > halfDayCutoff) {
    status = "HALF_DAY";
    isLate = true;
  }

  if (existing) {
    if (existing.status === "ABSENT") {
      const [updated] = await db.update(attendance)
        .set({
          checkInAt: now,
          status,
          isLate,
        })
        .where(eq(attendance.id, existing.id))
        .returning();

      return res.json({
        ...updated,
        userName: user.name,
        checkInAt: updated.checkInAt?.toISOString() ?? null,
        checkOutAt: updated.checkOutAt?.toISOString() ?? null,
        status: updated.status,
      });
    }
    throw createError("Already checked in today", 400);
  }

  const [record] = await db.insert(attendance).values({
    id: crypto.randomUUID(),
    userId,
    checkInAt: now,
    status,
    isLate,
    date: today,
  })
  .onConflictDoUpdate({
    target: [attendance.userId, attendance.date],
    set: {
      checkInAt: now,
      status,
      isLate,
    },
  })
  .returning();

  return res.json({
    ...record,
    userName: user.name,
    checkInAt: record.checkInAt?.toISOString() ?? null,
    checkOutAt: null,
    status: record.status,
  });
}));

router.post("/attendance/process-absent", requirePermission("attendance.manage"), asyncHandler(async (req, res) => {
  const { date } = req.body || {};
  const result = await processAutomaticAbsentMarking(date);
  return res.json(result);
}));

router.post("/attendance/check-out", requirePermission("attendance.manage"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });
  if (!existing || !existing.checkInAt || existing.status === "ABSENT") throw createError("No check-in found for today", 400);
  if (existing.checkOutAt) throw createError("Already checked out", 400);

  const now = new Date();
  const workEnd = new Date();
  workEnd.setHours(18, 0, 0, 0);
  const overtimeMin = Math.max(0, Math.floor((now.getTime() - workEnd.getTime()) / 60000));

  const [updated] = await db.update(attendance)
    .set({ checkOutAt: now, overtimeMin })
    .where(eq(attendance.id, existing.id))
    .returning();

  return res.json({
    ...updated,
    userName: user.name,
    checkInAt: updated.checkInAt?.toISOString() ?? null,
    checkOutAt: updated.checkOutAt?.toISOString() ?? null,
    status: updated.status,
  });
}));

router.get("/attendance/today", requirePermission("attendance.manage"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const today = new Date().toISOString().slice(0, 10);
  const record = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });

  const checkedIn = !!record && record.status !== "ABSENT" && record.status !== "ON_LEAVE" && !!record.checkInAt;

  return res.json({
    checkedIn,
    status: record?.status ?? null,
    checkInAt: record?.checkInAt?.toISOString() ?? null,
    checkOutAt: record?.checkOutAt?.toISOString() ?? null,
    breakStartAt: record?.breakStartAt?.toISOString() ?? null,
    breakEndAt: record?.breakEndAt?.toISOString() ?? null,
    breakDurationMin: record?.breakDurationMin ?? 0,
    breakStatus: record?.breakStatus ?? "IDLE",
    overtimeCheckInAt: record?.overtimeCheckInAt?.toISOString() ?? null,
    overtimeCheckOutAt: record?.overtimeCheckOutAt?.toISOString() ?? null,
    attendanceId: record?.id ?? null,
  });
}));

router.post("/attendance/start-break", requirePermission("attendance.manage"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });

  if (!existing || !existing.checkInAt || existing.status === "ABSENT") {
    throw createError("You must check in first before taking a break", 400);
  }
  if (existing.checkOutAt) {
    throw createError("Cannot take break after checking out", 400);
  }
  if (existing.breakStatus === "ON_BREAK") {
    throw createError("Already on break", 400);
  }

  const now = new Date();
  const [updated] = await db.update(attendance)
    .set({ breakStartAt: now, breakStatus: "ON_BREAK" })
    .where(eq(attendance.id, existing.id))
    .returning();

  return res.json({
    ...updated,
    userName: user.name,
    checkInAt: updated.checkInAt?.toISOString() ?? null,
    checkOutAt: updated.checkOutAt?.toISOString() ?? null,
    breakStartAt: updated.breakStartAt?.toISOString() ?? null,
    breakEndAt: updated.breakEndAt?.toISOString() ?? null,
    breakDurationMin: updated.breakDurationMin ?? 0,
    breakStatus: updated.breakStatus,
  });
}));

router.post("/attendance/end-break", requirePermission("attendance.manage"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });

  if (!existing || existing.breakStatus !== "ON_BREAK" || !existing.breakStartAt) {
    throw createError("No active break found to end", 400);
  }

  const now = new Date();
  const breakStart = new Date(existing.breakStartAt);
  const addedMin = Math.max(1, Math.round((now.getTime() - breakStart.getTime()) / 60000));
  const totalBreakMin = (existing.breakDurationMin || 0) + addedMin;

  const [updated] = await db.update(attendance)
    .set({ breakEndAt: now, breakDurationMin: totalBreakMin, breakStatus: "IDLE" })
    .where(eq(attendance.id, existing.id))
    .returning();

  return res.json({
    ...updated,
    userName: user.name,
    checkInAt: updated.checkInAt?.toISOString() ?? null,
    checkOutAt: updated.checkOutAt?.toISOString() ?? null,
    breakStartAt: updated.breakStartAt?.toISOString() ?? null,
    breakEndAt: updated.breakEndAt?.toISOString() ?? null,
    breakDurationMin: updated.breakDurationMin,
    breakStatus: updated.breakStatus,
  });
}));

router.post("/attendance/overtime-check-in", requirePermission("attendance.manage"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });

  if (!existing || !existing.checkInAt || existing.status === "ABSENT") {
    throw createError("You must check in for regular work first", 400);
  }
  if (!existing.checkOutAt) {
    throw createError("You must check out of regular work first before starting overtime", 400);
  }
  if (existing.overtimeCheckInAt) {
    throw createError("Overtime has already been started today", 400);
  }

  const now = new Date();
  const [updated] = await db.update(attendance)
    .set({ overtimeCheckInAt: now })
    .where(eq(attendance.id, existing.id))
    .returning();

  return res.json({
    ...updated,
    userName: user.name,
    checkInAt: updated.checkInAt?.toISOString() ?? null,
    checkOutAt: updated.checkOutAt?.toISOString() ?? null,
    overtimeCheckInAt: updated.overtimeCheckInAt?.toISOString() ?? null,
    overtimeCheckOutAt: updated.overtimeCheckOutAt?.toISOString() ?? null,
  });
}));

router.post("/attendance/overtime-check-out", requirePermission("attendance.manage"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });

  if (!existing) {
    throw createError("No attendance record found for today", 400);
  }
  if (!existing.overtimeCheckInAt) {
    throw createError("Overtime has not been started today", 400);
  }
  if (existing.overtimeCheckOutAt) {
    throw createError("Overtime has already been checked out today", 400);
  }

  const now = new Date();
  const otStart = new Date(existing.overtimeCheckInAt);
  const overtimeMin = Math.max(0, Math.floor((now.getTime() - otStart.getTime()) / 60000));

  const [updated] = await db.update(attendance)
    .set({ overtimeCheckOutAt: now, overtimeMin })
    .where(eq(attendance.id, existing.id))
    .returning();

  return res.json({
    ...updated,
    userName: user.name,
    checkInAt: updated.checkInAt?.toISOString() ?? null,
    checkOutAt: updated.checkOutAt?.toISOString() ?? null,
    overtimeCheckInAt: updated.overtimeCheckInAt?.toISOString() ?? null,
    overtimeCheckOutAt: updated.overtimeCheckOutAt?.toISOString() ?? null,
  });
}));

export default router;
