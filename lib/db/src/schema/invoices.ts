import { pgTable, text, real, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const invoicesTable = pgTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  number: text("number"),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  status: text("status").default("DRAFT"),
  invoiceDate: text("invoice_date"),
  dueDate: text("due_date"),

  // Business details
  logoUrl: text("logo_url"),
  businessName: text("business_name"),
  businessPhone: text("business_phone"),
  businessEmail: text("business_email"),
  businessPan: text("business_pan"),
  companyGstin: text("company_gstin"),
  businessAddress: text("business_address"),
  businessCity: text("business_city"),
  businessPostalCode: text("business_postal_code"),
  businessState: text("business_state"),

  // Client details
  clientGstin: text("client_gstin"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  clientPan: text("client_pan"),
  billingAddress: text("billing_address"),
  clientCity: text("client_city"),
  clientPostalCode: text("client_postal_code"),
  clientState: text("client_state"),
  shippingAddress: text("shipping_address"),

  // Tax & currency
  currency: text("currency").default("INR"),
  gstType: text("gst_type").default("CGST_SGST"),

  // Financials
  subtotal: real("subtotal").default(0),
  taxAmount: real("tax_amount").default(0),
  discount: real("discount").default(0),
  discountType: text("discount_type").default("FIXED"),
  total: real("total").default(0),

  // Footer
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  signatureUrl: text("signature_url"),
  bankDetails: json("bank_details").$type<{ accountNumber?: string; ifsc?: string; bankName?: string; accountName?: string }>(),

  // Legacy line items JSON for compatibility
  lineItems: json("line_items").$type<Array<{
    description: string;
    hsnSac?: string;
    qty: number;
    unitPrice: number;
    taxPercent: number;
  }>>(),

  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const invoiceItemsTable = pgTable("invoice_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  hsnSac: text("hsn_sac"),
  qty: real("qty").notNull(),
  unitPrice: real("unit_price").notNull(),
  taxPercent: real("tax_percent").default(18),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItemsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
