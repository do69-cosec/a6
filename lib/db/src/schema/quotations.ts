import { pgTable, text, real, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const quotationsTable = pgTable("quotations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  number: text("number"),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  status: text("status").default("DRAFT"),
  quotationDate: text("quotation_date"),
  validUntil: text("valid_until"),
  dueDate: text("due_date"),
  currency: text("currency").default("INR"),
  companyName: text("company_name"),
  companyPhone: text("company_phone"),
  companyGstin: text("company_gstin"),
  companyAddress: text("company_address"),
  companyCity: text("company_city"),
  companyPostal: text("company_postal"),
  companyState: text("company_state"),
  companyEmail: text("company_email"),
  companyPan: text("company_pan"),
  logoUrl: text("logo_url"),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  clientGstin: text("client_gstin"),
  clientAddress: text("client_address"),
  clientCity: text("client_city"),
  clientPostal: text("client_postal"),
  clientState: text("client_state"),
  clientEmail: text("client_email"),
  clientPan: text("client_pan"),
  billingAddress: text("billing_address"),
  shippingAddress: text("shipping_address"),
  subtotal: real("subtotal").default(0),
  taxAmount: real("tax_amount").default(0),
  discount: real("discount").default(0),
  discountType: text("discount_type").default("AMOUNT"),
  total: real("total").default(0),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  signatureText: text("signature_text"),
  bankDetails: json("bank_details").$type<{ accountNumber?: string; ifsc?: string; bankName?: string; accountName?: string }>(),
  
  // Legacy line items JSON for compatibility
  lineItems: json("line_items").$type<Array<{
    itemName?: string;
    description?: string;
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

export const quotationItemsTable = pgTable("quotation_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  quotationId: text("quotation_id").notNull().references(() => quotationsTable.id, { onDelete: "cascade" }),
  itemName: text("item_name"),
  description: text("description"),
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

export const insertQuotationSchema = createInsertSchema(quotationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuotationItemSchema = createInsertSchema(quotationItemsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotationsTable.$inferSelect;
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type QuotationItem = typeof quotationItemsTable.$inferSelect;
