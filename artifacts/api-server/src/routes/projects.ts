import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, clientsTable, usersTable, notifications } from "@workspace/db/schema";
import { eq, aliasedTable } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate } from "../lib/validation";
import { requirePermission } from "../middleware/auth";

const router = Router();

const assignedUserTable = aliasedTable(usersTable, "assignedUser");

function sanitizeProject(body: any, isUpdate = false) {
  const {
    id,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    deletedAt,
    clientName,
    assignedEmployeeName,
    taskCount,
    completedTaskCount,
    ...rest
  } = body || {};

  if (!isUpdate && (!rest.name || typeof rest.name !== "string" || rest.name.trim() === "")) {
    throw createError("Project name is required", 400, undefined, "name");
  }
  if (isUpdate && rest.name !== undefined) {
    if (typeof rest.name !== "string" || rest.name.trim() === "") {
      throw createError("Project name cannot be empty", 400, undefined, "name");
    }
  }

  if (rest.endDate && !rest.dueDate) {
    rest.dueDate = rest.endDate;
  }

  return sanitizeAndValidate(rest, {
    uuids: ["clientId", "assignedTo"],
    dates: ["startDate", "dueDate", "endDate", "assignmentActionAt"],
    enums: {
      status: ["NOT_STARTED", "PLANNING", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED", "ON_HOLD", "CANCELLED"],
      priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      assignmentStatus: ["PENDING", "ACCEPTED", "REJECTED", "pending", "accepted", "rejected"],
    },
  });
}

router.get("/", requirePermission("projects.view"), asyncHandler(async (req, res) => {
  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      status: projectsTable.status,
      priority: projectsTable.priority,
      clientId: projectsTable.clientId,
      clientName: clientsTable.companyName,
      startDate: projectsTable.startDate,
      dueDate: projectsTable.dueDate,
      description: projectsTable.description,
      createdBy: projectsTable.createdBy,
      assignedTo: projectsTable.assignedTo,
      assignedEmployeeName: assignedUserTable.name,
      assignmentStatus: projectsTable.assignmentStatus,
      assignmentDescription: projectsTable.assignmentDescription,
      rejectionReason: projectsTable.rejectionReason,
      assignmentActionAt: projectsTable.assignmentActionAt,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(assignedUserTable, eq(projectsTable.assignedTo, assignedUserTable.id));
  return res.json(rows);
}));

router.post("/", requirePermission("projects.create"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeProject(body, false);

  if (sanitized.assignedTo && !sanitized.assignmentStatus) {
    sanitized.assignmentStatus = "PENDING";
  }

  const requesterId = (req as any).userId;
  const [row] = await db.insert(projectsTable).values({ ...sanitized, createdBy: requesterId }).returning();

  if (row && row.assignedTo) {
    try {
      await db.insert(notifications).values({
        userId: row.assignedTo,
        title: "New Project Assignment",
        message: `You have been assigned to project '${row.name}'.`,
        type: "PROJECT_ASSIGNMENT",
        link: "/projects",
      });
    } catch (e) {
      console.warn("Failed to create project assignment notification:", e);
    }
  }

  return res.status(201).json(row);
}));

router.get("/:id", requirePermission("projects.view"), asyncHandler(async (req, res) => {
  const [row] = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      status: projectsTable.status,
      priority: projectsTable.priority,
      clientId: projectsTable.clientId,
      clientName: clientsTable.companyName,
      startDate: projectsTable.startDate,
      dueDate: projectsTable.dueDate,
      description: projectsTable.description,
      createdBy: projectsTable.createdBy,
      assignedTo: projectsTable.assignedTo,
      assignedEmployeeName: assignedUserTable.name,
      assignmentStatus: projectsTable.assignmentStatus,
      assignmentDescription: projectsTable.assignmentDescription,
      rejectionReason: projectsTable.rejectionReason,
      assignmentActionAt: projectsTable.assignmentActionAt,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(assignedUserTable, eq(projectsTable.assignedTo, assignedUserTable.id))
    .where(eq(projectsTable.id, (req.params.id as string)));
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.patch("/:id", requirePermission("projects.edit"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeProject(body, true);

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, req.params.id as string));
  if (!project) throw createError("Not found", 404);

  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;

  if (requesterRole === "EMPLOYEE" && project.createdBy !== requesterId && project.assignedTo !== requesterId) {
    // Check if assigned any tasks in this project
    const { tasksTable } = await import("@workspace/db/schema");
    const { and } = await import("drizzle-orm");
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.projectId, req.params.id as string), eq(tasksTable.assigneeId, requesterId)));
    if (tasks.length === 0) {
      throw createError("Forbidden: You can only edit projects you created or are assigned to", 403);
    }
  }

  // Handle assignment status normalization & mandatory rejection reason validation
  if (sanitized.assignmentStatus) {
    const upperStatus = String(sanitized.assignmentStatus).toUpperCase();
    sanitized.assignmentStatus = upperStatus;
    
    if (upperStatus === "REJECTED") {
      const reason = sanitized.rejectionReason || body.rejectionReason;
      if (!reason || typeof reason !== "string" || reason.trim() === "") {
        throw createError("Rejection reason is mandatory", 400, undefined, "rejectionReason");
      }
      sanitized.rejectionReason = reason.trim();
    }
    sanitized.assignmentActionAt = new Date();
  }

  // If assignedTo is newly set or changed by Admin, set status to PENDING
  if (sanitized.assignedTo !== undefined && sanitized.assignedTo !== project.assignedTo) {
    if (sanitized.assignedTo) {
      sanitized.assignmentStatus = "PENDING";
      sanitized.rejectionReason = null;
      sanitized.assignmentActionAt = new Date();
    }
  }

  const [row] = await db
    .update(projectsTable)
    .set({ ...sanitized, updatedBy: requesterId, updatedAt: new Date() })
    .where(eq(projectsTable.id, (req.params.id as string)))
    .returning();

  if (!row) throw createError("Not found", 404);

  // Handle notifications
  try {
    // 1. If assignedTo changed or newly set
    if (sanitized.assignedTo && sanitized.assignedTo !== project.assignedTo) {
      await db.insert(notifications).values({
        userId: sanitized.assignedTo,
        title: "New Project Assignment",
        message: `You have been assigned to project '${row.name}'.`,
        type: "PROJECT_ASSIGNMENT",
        link: "/projects",
      });
    }

    // 2. If employee accepted or rejected
    if (sanitized.assignmentStatus && (sanitized.assignmentStatus === "ACCEPTED" || sanitized.assignmentStatus === "REJECTED")) {
      // Get employee name
      const [emp] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, requesterId));
      const empName = emp?.name || "An employee";

      // Determine who to notify: creator and admins
      const admins = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.systemRole, "SUPER_ADMIN"));
      const recipients = new Set<string>();
      if (project.createdBy) recipients.add(project.createdBy);
      admins.forEach((a) => recipients.add(a.id));

      const isAccepted = sanitized.assignmentStatus === "ACCEPTED";
      const title = isAccepted ? "Project Assignment Accepted" : "Project Assignment Rejected";
      const message = isAccepted
        ? `${empName} accepted the project assignment for '${row.name}'.`
        : `${empName} rejected project '${row.name}'. Reason: ${sanitized.rejectionReason || "No reason specified"}`;

      for (const rId of recipients) {
        if (rId !== requesterId) {
          await db.insert(notifications).values({
            userId: rId,
            title,
            message,
            type: isAccepted ? "PROJECT_ACCEPTED" : "PROJECT_REJECTED",
            link: "/projects",
          });
        }
      }
    }
  } catch (e) {
    console.warn("Error sending project notification:", e);
  }

  return res.json(row);
}));

router.delete("/:id", requirePermission("projects.delete"), asyncHandler(async (req, res) => {
  await db.delete(projectsTable).where(eq(projectsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

export default router;
