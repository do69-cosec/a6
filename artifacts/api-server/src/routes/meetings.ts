import { Router } from "express";
import { db } from "@workspace/db";
import { meetings, meetingAttendees, notifications, users, clients, projects } from "@workspace/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requirePermission } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { isValidUUID } from "../lib/validation";

const router = Router();

// GET /meetings - List meetings with filters
router.get("/", requirePermission("time.view"), asyncHandler(async (req, res) => {
  const { clientId, projectId, month } = req.query as Record<string, string>;

  const conditions = [];
  if (clientId) {
    if (!isValidUUID(clientId)) throw createError("Invalid clientId format", 400);
    conditions.push(eq(meetings.clientId, clientId));
  }
  if (projectId) {
    if (!isValidUUID(projectId)) throw createError("Invalid projectId format", 400);
    conditions.push(eq(meetings.projectId, projectId));
  }

  const allMeetings = await db.select().from(meetings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`start_time desc`);

  if (allMeetings.length === 0) {
    return res.json([]);
  }

  const meetingIds = allMeetings.map((m) => m.id);
  const [attendeesList, allUsers, allClients, allProjects] = await Promise.all([
    db.select().from(meetingAttendees).where(inArray(meetingAttendees.meetingId, meetingIds)),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users),
    db.select({ id: clients.id, companyName: clients.companyName }).from(clients),
    db.select({ id: projects.id, name: projects.name }).from(projects),
  ]);

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));
  const clientMap = Object.fromEntries(allClients.map((c) => [c.id, c.companyName]));
  const projectMap = Object.fromEntries(allProjects.map((p) => [p.id, p.name]));

  const attendeesByMeeting: Record<string, any[]> = {};
  attendeesList.forEach((a) => {
    if (!attendeesByMeeting[a.meetingId]) attendeesByMeeting[a.meetingId] = [];
    const uInfo = a.userId ? userMap[a.userId] : null;
    attendeesByMeeting[a.meetingId].push({
      ...a,
      name: a.name || uInfo?.name || "Guest",
      email: a.email || uInfo?.email || "",
    });
  });

  const result = allMeetings.map((m) => ({
    ...m,
    clientName: m.clientId ? clientMap[m.clientId] ?? null : null,
    projectName: m.projectId ? projectMap[m.projectId] ?? null : null,
    organizerName: m.organizerId ? userMap[m.organizerId]?.name ?? "Admin" : "Admin",
    startTime: m.startTime.toISOString(),
    endTime: m.endTime.toISOString(),
    attendees: attendeesByMeeting[m.id] ?? [],
  }));

  return res.json(result);
}));

// POST /meetings - Schedule a new meeting
router.post("/", requirePermission("time.log"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const userRole = (req as any).userSystemRole;

  if (userRole !== "SUPER_ADMIN" && userRole !== "MANAGER") {
    // Only Admin or Manager can schedule meetings
    throw createError("Forbidden: Only Admins or Managers can schedule meetings", 403);
  }

  const {
    title,
    description,
    meetingLink,
    startTime,
    endTime,
    location,
    clientId,
    projectId,
    attendeeUserIds = [],
  } = req.body;

  if (!title || !startTime || !endTime) {
    throw createError("Title, start time, and end time are required", 400);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw createError("Invalid start or end time format", 400);
  }

  const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

  const meetingId = crypto.randomUUID();
  const [newMeeting] = await db.insert(meetings).values({
    id: meetingId,
    title,
    description: description ?? null,
    meetingLink: meetingLink ?? null,
    startTime: start,
    endTime: end,
    durationMinutes,
    location: location ?? null,
    organizerId: userId,
    clientId: clientId || null,
    projectId: projectId || null,
    createdBy: userId,
  }).returning();

  // Get active users for attendee selection and notification delivery
  const activeUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.isActive, true));
  
  const targetUserIds: string[] = Array.isArray(attendeeUserIds) && attendeeUserIds.length > 0
    ? attendeeUserIds
    : activeUsers.map((u) => u.id);

  // Insert meeting attendees
  const attendeesToInsert = targetUserIds.map((uId) => {
    const u = activeUsers.find((user) => user.id === uId);
    return {
      id: crypto.randomUUID(),
      meetingId,
      userId: uId,
      name: u?.name ?? null,
      email: u?.email ?? null,
      status: "INVITED",
    };
  });

  if (attendeesToInsert.length > 0) {
    await db.insert(meetingAttendees).values(attendeesToInsert);
  }

  // Create notifications for attendees
  const formattedTime = start.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const notificationRows = targetUserIds.map((uId) => ({
    id: crypto.randomUUID(),
    userId: uId,
    type: "MEETING",
    priority: "HIGH",
    title: `📅 New Meeting: ${title}`,
    message: `You are invited to "${title}" scheduled for ${formattedTime}.${meetingLink ? ` Link: ${meetingLink}` : ""}`,
    createdBy: userId,
  }));

  if (notificationRows.length > 0) {
    await db.insert(notifications).values(notificationRows);
  }

  return res.status(201).json({
    ...newMeeting,
    startTime: newMeeting.startTime.toISOString(),
    endTime: newMeeting.endTime.toISOString(),
    attendees: attendeesToInsert,
  });
}));

// PUT /meetings/:id - Update an existing meeting
router.put("/:id", requirePermission("time.log"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  const userRole = (req as any).userSystemRole;

  if (!isValidUUID(id)) throw createError("Invalid ID format", 400);

  if (userRole !== "SUPER_ADMIN" && userRole !== "MANAGER") {
    throw createError("Forbidden: Only Admins or Managers can edit meetings", 403);
  }

  const [existing] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!existing) throw createError("Meeting not found", 404);

  const {
    title,
    description,
    meetingLink,
    startTime,
    endTime,
    location,
    status,
    clientId,
    projectId,
    attendeeUserIds,
  } = req.body;

  if (!title || !startTime || !endTime) {
    throw createError("Title, start time, and end time are required", 400);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw createError("Invalid start or end time format", 400);
  }

  if (end.getTime() <= start.getTime()) {
    throw createError("End time must be after start time", 400);
  }

  const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

  const [updatedMeeting] = await db.update(meetings)
    .set({
      title,
      description: description ?? null,
      meetingLink: meetingLink ?? null,
      startTime: start,
      endTime: end,
      durationMinutes,
      location: location ?? null,
      status: status || existing.status,
      clientId: clientId || null,
      projectId: projectId || null,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, id))
    .returning();

  // If attendeeUserIds was provided in payload, sync attendees
  if (Array.isArray(attendeeUserIds)) {
    await db.delete(meetingAttendees).where(eq(meetingAttendees.meetingId, id));

    const activeUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users);
    const attendeesToInsert = attendeeUserIds.map((uId) => {
      const u = activeUsers.find((user) => user.id === uId);
      return {
        id: crypto.randomUUID(),
        meetingId: id,
        userId: uId,
        name: u?.name ?? null,
        email: u?.email ?? null,
        status: "INVITED",
      };
    });

    if (attendeesToInsert.length > 0) {
      await db.insert(meetingAttendees).values(attendeesToInsert);
    }

    // Send update notification
    const formattedTime = start.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const notificationRows = attendeeUserIds.map((uId) => ({
      id: crypto.randomUUID(),
      userId: uId,
      type: "MEETING",
      priority: "MEDIUM",
      title: `📝 Updated Meeting: ${title}`,
      message: `Meeting details updated for "${title}" on ${formattedTime}.${meetingLink ? ` Link: ${meetingLink}` : ""}`,
      createdBy: userId,
    }));

    if (notificationRows.length > 0) {
      await db.insert(notifications).values(notificationRows);
    }
  }

  return res.json({
    ...updatedMeeting,
    startTime: updatedMeeting.startTime.toISOString(),
    endTime: updatedMeeting.endTime.toISOString(),
  });
}));

// PATCH /meetings/:id/status - Quick status change (e.g. COMPLETED, CANCELLED)
router.patch("/:id/status", requirePermission("time.log"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = (req as any).userId;

  if (!isValidUUID(id)) throw createError("Invalid ID format", 400);
  if (!status) throw createError("Status is required", 400);

  const [existing] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!existing) throw createError("Meeting not found", 404);

  const [updated] = await db.update(meetings)
    .set({
      status,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, id))
    .returning();

  return res.json({
    ...updated,
    startTime: updated.startTime.toISOString(),
    endTime: updated.endTime.toISOString(),
  });
}));

// DELETE /meetings/:id - Delete / cancel meeting
router.delete("/:id", requirePermission("time.log"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) throw createError("Invalid ID format", 400);

  const [existing] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!existing) throw createError("Meeting not found", 404);

  await db.delete(meetings).where(eq(meetings.id, id));
  return res.json({ success: true, message: "Meeting cancelled" });
}));

export default router;
