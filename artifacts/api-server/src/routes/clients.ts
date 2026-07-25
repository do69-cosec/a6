import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, invoicesTable } from "@workspace/db/schema";
import { eq, ilike, or, and } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate } from "../lib/validation";
import { requirePermission } from "../middleware/auth";

function sanitizeClient(body: any, isUpdate = false) {
  if (!isUpdate && (!body.companyName || typeof body.companyName !== "string" || body.companyName.trim() === "")) {
    throw createError("Company name is required", 400, undefined, "companyName");
  }
  if (isUpdate && body.companyName !== undefined) {
    if (typeof body.companyName !== "string" || body.companyName.trim() === "") {
      throw createError("Company name cannot be empty", 400, undefined, "companyName");
    }
  }
  return sanitizeAndValidate(body, {
    dates: ["onboardingDate"],
    enums: {
      category: ["RETAINER", "ONE_TIME", "PARTNER", "LEAD", "INACTIVE", "CHURNED"],
      health: ["GREEN", "YELLOW", "RED"],
    }
  });
}

function calcHealthScore(invoices: { status: string | null; dueDate: string | null }[]): string {
  const now = new Date();
  const overdueInvs = invoices.filter(inv => inv.status === "OVERDUE");
  const sentWithPastDue = invoices.filter(inv => {
    if (inv.status !== "SENT" || !inv.dueDate) return false;
    return new Date(inv.dueDate) < now;
  });
  const allProblematic = [...overdueInvs, ...sentWithPastDue];

  if (allProblematic.length === 0) return "GREEN";

  const maxDaysOverdue = Math.max(
    ...allProblematic.map(inv => {
      if (!inv.dueDate) return 0;
      return Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    }),
  );

  const overdueRatio = allProblematic.length / Math.max(invoices.length, 1);

  if (maxDaysOverdue > 60 || overdueRatio > 0.5) return "RED";
  if (maxDaysOverdue > 15 || overdueRatio > 0.2) return "YELLOW";
  return "GREEN";
}

const router = Router();

router.get("/", requirePermission("clients.view"), asyncHandler(async (req, res) => {
  const { search, category } = req.query as Record<string, string>;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(clientsTable.companyName, `%${search}%`),
        ilike(clientsTable.contactPerson, `%${search}%`),
      ),
    );
  }
  if (category) conditions.push(eq(clientsTable.category, category));

  const rows = await db
    .select()
    .from(clientsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  return res.json(rows);
}));

router.post("/", requirePermission("clients.create"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeClient(body, false);
  const [row] = await db.insert(clientsTable).values(sanitized).returning();
  return res.status(201).json(row);
}));

router.get("/:id", requirePermission("clients.view"), asyncHandler(async (req, res) => {
  const [row] = await db.select().from(clientsTable).where(eq(clientsTable.id, (req.params.id as string)));
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.patch("/:id", requirePermission("clients.edit"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeClient(body, true);
  const [row] = await db
    .update(clientsTable)
    .set(sanitized)
    .where(eq(clientsTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", requirePermission("clients.delete"), asyncHandler(async (req, res) => {
  await db.delete(clientsTable).where(eq(clientsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

router.post("/:id/recalculate-health", requirePermission("clients.edit"), asyncHandler(async (req, res) => {
  const clientId = req.params.id as string;
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  if (!client) throw createError("Not found", 404);

  const invoices = await db
    .select({ status: invoicesTable.status, dueDate: invoicesTable.dueDate })
    .from(invoicesTable)
    .where(eq(invoicesTable.clientId, clientId));

  const health = calcHealthScore(invoices);
  const [updated] = await db
    .update(clientsTable)
    .set({ health })
    .where(eq(clientsTable.id, clientId))
    .returning();

  return res.json({ health, client: updated });
}));

router.get("/:id/contracts", requirePermission("clients.view"), asyncHandler(async (req, res) => {
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.clientId, (req.params.id as string)));
  const contracts = invoices.map((inv) => ({
    id: inv.id,
    title: `Invoice ${inv.number ?? inv.id.slice(0, 6)}`,
    status: inv.status,
    value: inv.total,
    startDate: inv.invoiceDate,
    endDate: inv.dueDate,
  }));
  return res.json(contracts);
}));

export default router;
