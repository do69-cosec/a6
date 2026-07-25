import { Router } from "express";
import { db } from "@workspace/db";
import { asyncHandler } from "../lib/asyncHandler";
import { sanitizeAndValidate, isValidUUID } from "../lib/validation";
import { createError } from "../middleware/errorHandler";
import { requirePermission } from "../middleware/auth";

const router = Router();

// POST /api/time/timer — save a completed time entry from the frontend widget
router.post("/timer", requirePermission("time.log"), asyncHandler(async (req, res) => {
  const { description, projectId, minutes, billable, startedAt, endedAt } =
    req.body as {
      description?: string;
      projectId?: string;
      minutes?: number | string;
      billable?: boolean;
      startedAt?: string;
      endedAt?: string;
    };

  const sanitized = sanitizeAndValidate(
    { description, projectId, minutes, billable, startedAt, endedAt },
    {
      uuids: projectId ? ["projectId"] : [],
      numbers: minutes !== undefined && minutes !== null && minutes !== "" ? ["minutes"] : [],
      dates: startedAt ? ["startedAt"] : [],
    }
  );

  // Validate endedAt separately as a date if provided
  if (endedAt) {
    const d = new Date(endedAt);
    if (isNaN(d.getTime())) {
      throw createError("Invalid date syntax for field: endedAt", 400);
    }
  }

  const userId = (req as any).userId ?? null;

  const [row] = await db.execute(`
    INSERT INTO time_entries (id, project_id, user_id, started_at, ended_at, duration_min, note, is_billable)
    VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    sanitized.projectId ?? null,
    userId,
    sanitized.startedAt ? new Date(sanitized.startedAt) : new Date(),
    endedAt ? new Date(endedAt) : new Date(),
    sanitized.minutes ?? null,
    sanitized.description ?? null,
    sanitized.billable ?? true,
  ]);

  return res.status(201).json(row);
}));

// GET /api/time — list entries, optionally filtered
router.get("/", requirePermission("time.view"), asyncHandler(async (req, res) => {
  const { projectId, userId, from, to } = req.query as Record<string, string>;
  const requesterId = (req as any).userId;
  const requesterRole = (req as any).userRole;

  let query = `SELECT * FROM time_entries WHERE 1=1`;
  const params: unknown[] = [];

  const targetUserId = requesterRole === "EMPLOYEE" ? requesterId : (userId || null);

  if (projectId) { params.push(projectId); query += ` AND project_id = $${params.length}`; }
  if (targetUserId) {
    if (!isValidUUID(targetUserId)) {
      throw createError("Invalid userId format", 400);
    }
    params.push(targetUserId);
    query += ` AND user_id = $${params.length}`;
  }
  if (from)      { params.push(from);      query += ` AND started_at >= $${params.length}`; }
  if (to)        { params.push(to);        query += ` AND started_at <= $${params.length}`; }

  query += ` ORDER BY started_at DESC LIMIT 200`;
  const rows = await db.execute(query, params);
  return res.json(rows.rows ?? rows);
}));

export default router;
