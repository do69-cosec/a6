import { Router } from "express";
import { db } from "@workspace/db";
import { proposalsTable, proposalItemsTable, clientsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { syncParentInsert, syncParentUpdate } from "../lib/dbSync";
import { sanitizeAndValidate, validateLineItems, isValidUUID } from "../lib/validation";
import { requirePermission } from "../middleware/auth";

const router = Router();

function sanitizeProposal(body: any, isUpdate = false) {
  validateLineItems(body, "Proposals");
  return sanitizeAndValidate(body, {
    uuids: ["clientId"],
    textDates: ["validUntil"],
    numbers: ["value"],
    enums: {
      status: ["DRAFT", "SENT", "APPROVED", "REJECTED", "ACCEPTED", "DECLINED", "REVOKED"],
    }
  });
}

const proposalSyncConfig = {
  parentTable: proposalsTable,
  childTable: proposalItemsTable,
  foreignKeyField: "proposalId",
  payloadKeys: ["lineItems", "items"],
  mapItem: (item: any, parentId: string) => {
    const qty = item.qty !== undefined ? Number(item.qty) : 1;
    const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : 0;
    return {
      proposalId: parentId,
      description: item.description || "",
      qty,
      unitPrice,
      totalPrice: item.totalPrice !== undefined ? Number(item.totalPrice) : qty * unitPrice,
      createdBy: item.createdBy || null,
      updatedBy: item.updatedBy || null,
    };
  },
};

router.get("/", requirePermission("proposals.view"), asyncHandler(async (req, res) => {
  const rows = await db
    .select({
      id: proposalsTable.id,
      title: proposalsTable.title,
      clientId: proposalsTable.clientId,
      clientName: clientsTable.companyName,
      status: proposalsTable.status,
      template: proposalsTable.template,
      value: proposalsTable.value,
      validUntil: proposalsTable.validUntil,
      scope: proposalsTable.scope,
      deliverables: proposalsTable.deliverables,
      timeline: proposalsTable.timeline,
      notes: proposalsTable.notes,
      createdAt: proposalsTable.createdAt,
    })
    .from(proposalsTable)
    .leftJoin(clientsTable, eq(proposalsTable.clientId, clientsTable.id));
  return res.json(rows);
}));

router.post("/", requirePermission("proposals.create"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeProposal(body, false);
  const row = await syncParentInsert(proposalSyncConfig, sanitized, req.body);
  return res.status(201).json(row);
}));

router.patch("/:id", requirePermission("proposals.edit"), asyncHandler(async (req, res) => {
  if (!isValidUUID(req.params.id)) {
    throw createError("Invalid proposal ID format", 400);
  }
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeProposal(body, true);
  const row = await syncParentUpdate(proposalSyncConfig, req.params.id as string, sanitized, req.body);
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", requirePermission("proposals.delete"), asyncHandler(async (req, res) => {
  if (!isValidUUID(req.params.id)) {
    throw createError("Invalid proposal ID format", 400);
  }
  await db.delete(proposalsTable).where(eq(proposalsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

export default router;
