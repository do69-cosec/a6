import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, invoiceItemsTable, clientsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { syncParentInsert, syncParentUpdate } from "../lib/dbSync";
import { sanitizeAndValidate, validateLineItems, isValidUUID } from "../lib/validation";
import { requirePermission } from "../middleware/auth";

const router = Router();

function sanitizeInvoice(body: any, isUpdate = false) {
  validateLineItems(body, "Invoices");
  return sanitizeAndValidate(body, {
    uuids: ["clientId"],
    textDates: ["invoiceDate", "dueDate"],
    numbers: ["subtotal", "taxAmount", "discount", "total"],
    enums: {
      status: ["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"],
      discountType: ["FIXED", "PERCENT"],
      gstType: ["CGST_SGST", "IGST", "UTGST", "NONE"],
    }
  });
}

const invoiceSyncConfig = {
  parentTable: invoicesTable,
  childTable: invoiceItemsTable,
  foreignKeyField: "invoiceId",
  payloadKeys: ["lineItems", "items"],
  mapItem: (item: any, parentId: string) => ({
    invoiceId: parentId,
    description: item.description || "",
    hsnSac: item.hsnSac || null,
    qty: item.qty !== undefined ? Number(item.qty) : 1,
    unitPrice: item.unitPrice !== undefined ? Number(item.unitPrice) : 0,
    taxPercent: item.taxPercent !== undefined ? Number(item.taxPercent) : 18,
    createdBy: item.createdBy || null,
    updatedBy: item.updatedBy || null,
  }),
};

router.get("/financial-summary", requirePermission("invoices.view"), asyncHandler(async (req, res) => {
  const [
    [{ totalRevenue, paidCount }],
    [{ outstanding }],
    [{ overdue }],
    [{ invoiceCount }],
  ] = await Promise.all([
    db.select({ totalRevenue: sql<number>`coalesce(sum(total),0)::float`, paidCount: sql<number>`count(*)::int` }).from(invoicesTable).where(eq(invoicesTable.status, "PAID")),
    db.select({ outstanding: sql<number>`coalesce(sum(total),0)::float` }).from(invoicesTable).where(sql`status in ('SENT','VIEWED')`),
    db.select({ overdue: sql<number>`coalesce(sum(total),0)::float` }).from(invoicesTable).where(eq(invoicesTable.status, "OVERDUE")),
    db.select({ invoiceCount: sql<number>`count(*)::int` }).from(invoicesTable),
  ]);
  return res.json({ totalRevenue, outstanding, overdue, paidCount, invoiceCount });
}));

router.get("/", requirePermission("invoices.view"), asyncHandler(async (req, res) => {
  const rows = await db
    .select({
      id: invoicesTable.id,
      number: invoicesTable.number,
      clientId: invoicesTable.clientId,
      clientName: clientsTable.companyName,
      status: invoicesTable.status,
      invoiceDate: invoicesTable.invoiceDate,
      dueDate: invoicesTable.dueDate,
      currency: invoicesTable.currency,
      subtotal: invoicesTable.subtotal,
      taxAmount: invoicesTable.taxAmount,
      discount: invoicesTable.discount,
      total: invoicesTable.total,
      lineItems: invoicesTable.lineItems,
      notes: invoicesTable.notes,
      termsAndConditions: invoicesTable.termsAndConditions,
      companyGstin: invoicesTable.companyGstin,
      clientGstin: invoicesTable.clientGstin,
      billingAddress: invoicesTable.billingAddress,
      shippingAddress: invoicesTable.shippingAddress,
      bankDetails: invoicesTable.bankDetails,
      logoUrl: invoicesTable.logoUrl,
      businessName: invoicesTable.businessName,
      businessPhone: invoicesTable.businessPhone,
      businessEmail: invoicesTable.businessEmail,
      businessPan: invoicesTable.businessPan,
      businessAddress: invoicesTable.businessAddress,
      businessCity: invoicesTable.businessCity,
      businessPostalCode: invoicesTable.businessPostalCode,
      businessState: invoicesTable.businessState,
      clientPhone: invoicesTable.clientPhone,
      clientEmail: invoicesTable.clientEmail,
      clientPan: invoicesTable.clientPan,
      clientCity: invoicesTable.clientCity,
      clientPostalCode: invoicesTable.clientPostalCode,
      clientState: invoicesTable.clientState,
      gstType: invoicesTable.gstType,
      signatureUrl: invoicesTable.signatureUrl,
      discountType: invoicesTable.discountType,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .orderBy(desc(invoicesTable.createdAt));
  return res.json(rows);
}));

router.post("/", requirePermission("invoices.create"), asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeInvoice(body, false);
  if (!sanitized.number) {
    const existing = await db.select({ number: invoicesTable.number }).from(invoicesTable);
    const nums = existing
      .map((r) => r.number)
      .filter((n): n is string => !!n && n.startsWith("INV-"))
      .map((n) => parseInt(n.replace("INV-", ""), 10))
      .filter((n) => !isNaN(n));
    sanitized.number = `INV-${nums.length > 0 ? Math.max(...nums) + 1 : 1001}`;
  }
  const row = await syncParentInsert(invoiceSyncConfig, sanitized, req.body);
  return res.status(201).json(row);
}));

router.patch("/:id", requirePermission("invoices.edit"), asyncHandler(async (req, res) => {
  if (!isValidUUID(req.params.id)) {
    throw createError("Invalid invoice ID format", 400);
  }
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const sanitized = sanitizeInvoice(body, true);
  const row = await syncParentUpdate(invoiceSyncConfig, req.params.id as string, sanitized, req.body);
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", requirePermission("invoices.delete"), asyncHandler(async (req, res) => {
  if (!isValidUUID(req.params.id)) {
    throw createError("Invalid invoice ID format", 400);
  }
  await db.delete(invoicesTable).where(eq(invoicesTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

export default router;
