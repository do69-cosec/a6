import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, projectsTable, usersTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate } from "../lib/validation";
import { requirePermission } from "../middleware/auth";
import { NotificationService } from "../services/notificationService";

const requesterTable = alias(usersTable, "requester_users");
const approvedByTable = alias(usersTable, "approved_by_users");

const router = Router();

export const TaskApprovalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  MODIFIED: "MODIFIED",
} as const;

function sanitizeTask(body: any, isUpdate = false) {
  if (!isUpdate && (!body.title || typeof body.title !== "string" || body.title.trim() === "")) {
    throw createError("Task title is required", 400, undefined, "title");
  }
  if (isUpdate && body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      throw createError("Task title cannot be empty", 400, undefined, "title");
    }
  }
  return sanitizeAndValidate(body, {
    uuids: ["projectId", "assigneeId", "parentId", "requestedBy", "approvedBy"],
    dates: ["dueDate", "approvedAt", "requestedAt"],
    enums: {
      status: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED", "COMPLETED"],
      priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      approvalStatus: ["PENDING", "APPROVED", "REJECTED", "MODIFIED"],
    },
  });
}

router.get("/", requirePermission("tasks.view"), asyncHandler(async (req, res) => {
  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;

  let query = db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      status: tasksTable.status,
      priority: tasksTable.priority,
      projectId: tasksTable.projectId,
      projectName: projectsTable.name,
      assigneeId: tasksTable.assigneeId,
      assigneeName: usersTable.name,
      dueDate: tasksTable.dueDate,
      description: tasksTable.description,
      approvalStatus: tasksTable.approvalStatus,
      requestedBy: tasksTable.requestedBy,
      requestedByName: requesterTable.name,
      requestedByEmail: requesterTable.email,
      approvedBy: tasksTable.approvedBy,
      approvedByName: approvedByTable.name,
      approvedByEmail: approvedByTable.email,
      approvedAt: tasksTable.approvedAt,
      rejectionReason: tasksTable.rejectionReason,
      requestedAt: tasksTable.requestedAt,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .leftJoin(requesterTable, eq(tasksTable.requestedBy, requesterTable.id))
    .leftJoin(approvedByTable, eq(tasksTable.approvedBy, approvedByTable.id));

  if (requesterRole === "EMPLOYEE") {
    query = query.where(
      or(
        eq(tasksTable.assigneeId, requesterId),
        eq(tasksTable.requestedBy, requesterId)
      )
    );
  }

  const rows = await query;
  return res.json(rows);
}));

router.post("/", requirePermission("tasks.create"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeTask(body, false);
  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;

  if (requesterRole === "EMPLOYEE") {
    // Employees create a task request for themselves
    sanitized.approvalStatus = "PENDING";
    sanitized.requestedBy = requesterId;
    sanitized.requestedAt = new Date();
    sanitized.assigneeId = requesterId; // Employees request tasks for themselves
  } else {
    // Admin created tasks are immediately active and approved
    sanitized.approvalStatus = "APPROVED";
    sanitized.requestedBy = requesterId;
    sanitized.requestedAt = new Date();
    sanitized.approvedBy = requesterId;
    sanitized.approvedAt = new Date();
  }

  const [row] = await db.insert(tasksTable).values({ ...sanitized, createdBy: requesterId }).returning();

  // Send Notification if assigned to an employee
  if (row.assigneeId && row.assigneeId !== requesterId) {
    await NotificationService.createNotification({
      userId: row.assigneeId,
      title: "📋 New Task Assigned",
      message: `You have been assigned task "${row.title}"`,
      type: "TASK",
      priority: (row.priority as any) || "MEDIUM",
      referenceId: row.id,
      referenceType: "TASK",
      createdBy: requesterId,
    });
  }

  return res.status(201).json(row);
}));

router.get("/:id", requirePermission("tasks.view"), asyncHandler(async (req, res) => {
  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;

  const [row] = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      status: tasksTable.status,
      priority: tasksTable.priority,
      projectId: tasksTable.projectId,
      projectName: projectsTable.name,
      assigneeId: tasksTable.assigneeId,
      assigneeName: usersTable.name,
      dueDate: tasksTable.dueDate,
      description: tasksTable.description,
      createdBy: tasksTable.createdBy,
      approvalStatus: tasksTable.approvalStatus,
      requestedBy: tasksTable.requestedBy,
      requestedByName: requesterTable.name,
      requestedByEmail: requesterTable.email,
      approvedBy: tasksTable.approvedBy,
      approvedByName: approvedByTable.name,
      approvedByEmail: approvedByTable.email,
      approvedAt: tasksTable.approvedAt,
      rejectionReason: tasksTable.rejectionReason,
      requestedAt: tasksTable.requestedAt,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .leftJoin(requesterTable, eq(tasksTable.requestedBy, requesterTable.id))
    .leftJoin(approvedByTable, eq(tasksTable.approvedBy, approvedByTable.id))
    .where(eq(tasksTable.id, (req.params.id as string)));

  if (!row) throw createError("Not found", 404);

  if (requesterRole === "EMPLOYEE" && row.assigneeId !== requesterId && row.requestedBy !== requesterId) {
    throw createError("Forbidden: You can only view tasks you are assigned to or requested", 403);
  }

  return res.json(row);
}));

router.patch("/:id", requirePermission("tasks.edit"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeTask(body, true);

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.id as string));
  if (!task) throw createError("Not found", 404);

  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;

  if (requesterRole === "EMPLOYEE") {
    // Check if they have access to this task
    if (task.assigneeId !== requesterId && task.requestedBy !== requesterId) {
      throw createError("Forbidden: You do not have permission to access this task", 403);
    }

    const isPending = task.approvalStatus === "PENDING";
    const isApprovedOrModified = task.approvalStatus === "APPROVED" || task.approvalStatus === "MODIFIED" || !task.approvalStatus;

    if (isPending) {
      if (task.requestedBy !== requesterId) {
        throw createError("Forbidden: You can only edit your own pending requests", 403);
      }
      // Pending request: employee can edit title, description, priority, projectId, dueDate
      const forbiddenKeys = ["approvalStatus", "assigneeId", "approvedBy", "approvedAt", "requestedBy", "requestedAt"];
      const updateKeys = Object.keys(sanitized).filter(k => sanitized[k] !== undefined && sanitized[k] !== null);
      const hasForbiddenChanges = updateKeys.some(k => forbiddenKeys.includes(k) && sanitized[k] !== task[k as keyof typeof task]);
      if (hasForbiddenChanges) {
        throw createError("Forbidden: You cannot modify approval status or assignees", 403);
      }
    } else if (isApprovedOrModified) {
      if (task.assigneeId !== requesterId) {
        throw createError("Forbidden: You can only update the status of tasks assigned to you", 403);
      }
      // Active task: employee can ONLY update task status (TODO -> IN_PROGRESS etc.) or description
      const allowedKeys = ["status", "description"];
      const updateKeys = Object.keys(sanitized).filter(k => sanitized[k] !== undefined && sanitized[k] !== null);
      const hasOtherChanges = updateKeys.some(k => !allowedKeys.includes(k) && sanitized[k] !== task[k as keyof typeof task]);
      if (hasOtherChanges) {
        throw createError("Forbidden: Employees can only update status on active tasks", 403);
      }
    } else {
      throw createError("Forbidden: Cannot modify a rejected task request", 403);
    }
  } else {
    // Admin is modifying/approving
    // Default assignee to requestedBy if it's currently null and Admin didn't specify another assignee
    if (sanitized.approvalStatus && sanitized.approvalStatus !== "PENDING") {
      sanitized.approvedBy = requesterId;
      sanitized.approvedAt = new Date();
      if (!sanitized.assigneeId && !task.assigneeId) {
        sanitized.assigneeId = task.requestedBy || task.createdBy;
      }
    }
  }

  const [row] = await db
    .update(tasksTable)
    .set({ ...sanitized, updatedAt: new Date(), updatedBy: requesterId })
    .where(eq(tasksTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);

  // Process task notifications
  try {
    // 1. Assignee changed
    if (row.assigneeId && row.assigneeId !== task.assigneeId && row.assigneeId !== requesterId) {
      await NotificationService.createNotification({
        userId: row.assigneeId,
        title: "📋 Task Assigned",
        message: `You have been assigned task "${row.title}"`,
        type: "TASK",
        priority: (row.priority as any) || "MEDIUM",
        referenceId: row.id,
        referenceType: "TASK",
        createdBy: requesterId,
      });
    }

    // 2. Approval status changed
    if (sanitized.approvalStatus && sanitized.approvalStatus !== task.approvalStatus && task.requestedBy) {
      if (sanitized.approvalStatus === "APPROVED" && task.requestedBy !== requesterId) {
        await NotificationService.createNotification({
          userId: task.requestedBy,
          title: "✅ Task Approved",
          message: `Your requested task "${row.title}" was approved`,
          type: "TASK",
          priority: "HIGH",
          referenceId: row.id,
          referenceType: "TASK",
          createdBy: requesterId,
        });
      } else if (sanitized.approvalStatus === "REJECTED" && task.requestedBy !== requesterId) {
        await NotificationService.createNotification({
          userId: task.requestedBy,
          title: "❌ Task Request Rejected",
          message: `Your requested task "${row.title}" was rejected`,
          type: "TASK",
          priority: "HIGH",
          referenceId: row.id,
          referenceType: "TASK",
          createdBy: requesterId,
        });
      }
    }

    // 3. Status changed to DONE/COMPLETED
    if ((row.status === "DONE" || row.status === "COMPLETED") && task.status !== row.status) {
      const notifyTarget = task.requestedBy || task.createdBy;
      if (notifyTarget && notifyTarget !== requesterId) {
        await NotificationService.createNotification({
          userId: notifyTarget,
          title: "🎉 Task Completed",
          message: `Task "${row.title}" has been completed`,
          type: "TASK",
          priority: "MEDIUM",
          referenceId: row.id,
          referenceType: "TASK",
          createdBy: requesterId,
        });
      }
    }

    // 4. Due date changed
    if (sanitized.dueDate && sanitized.dueDate !== task.dueDate && row.assigneeId && row.assigneeId !== requesterId) {
      await NotificationService.createNotification({
        userId: row.assigneeId,
        title: "⏰ Task Deadline Changed",
        message: `Deadline for task "${row.title}" changed to ${sanitized.dueDate}`,
        type: "TASK",
        priority: "MEDIUM",
        referenceId: row.id,
        referenceType: "TASK",
        createdBy: requesterId,
      });
    }

    // 5. Priority changed
    if (sanitized.priority && sanitized.priority !== task.priority && row.assigneeId && row.assigneeId !== requesterId) {
      await NotificationService.createNotification({
        userId: row.assigneeId,
        title: "⚡ Task Priority Updated",
        message: `Priority for task "${row.title}" was updated to ${sanitized.priority}`,
        type: "TASK",
        priority: (sanitized.priority as any) || "MEDIUM",
        referenceId: row.id,
        referenceType: "TASK",
        createdBy: requesterId,
      });
    }
  } catch (err) {
    console.error("Error triggering task notification:", err);
  }

  return res.json(row);
}));

router.delete("/:id", requirePermission("tasks.delete"), asyncHandler(async (req, res) => {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.id as string));
  if (!task) throw createError("Not found", 404);

  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;

  if (requesterRole === "EMPLOYEE") {
    if (task.requestedBy !== requesterId) {
      throw createError("Forbidden: Employees can only delete tasks they requested", 403);
    }
    // Only allow deletion when PENDING
    if (task.approvalStatus && task.approvalStatus !== "PENDING") {
      throw createError("Forbidden: Cannot delete task request after admin review", 403);
    }
  }

  await db.delete(tasksTable).where(eq(tasksTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

// ─── Subtasks ─────────────────────────────────────────────────

router.get("/:id/subtasks", requirePermission("tasks.view"), asyncHandler(async (req, res) => {
  const result = await db.execute(
    `SELECT t.*, u.name as assignee_name FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE t.parent_id = $1 ORDER BY t.created_at ASC`,
    [req.params.id]
  );
  return res.json(result.rows ?? result);
}));

export default router;
