import { pgTable, text, real, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { vendorsTable } from "./vendors";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  number: text("number"),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  vendorId: text("vendor_id").references(() => vendorsTable.id, { onDelete: "set null" }),
  status: text("status").default("DRAFT"),
  orderDate: text("order_date"),
  deliveryDate: text("delivery_date"),
  companyGstin: text("company_gstin"),
  vendorGstin: text("vendor_gstin"),
  billingAddress: text("billing_address"),
  shippingAddress: text("shipping_address"),
  subtotal: real("subtotal").default(0),
  taxAmount: real("tax_amount").default(0),
  total: real("total").default(0),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  
  // Legacy line items JSON for compatibility
  lineItems: json("line_items").$type<Array<{ description: string; hsnSac?: string; qty: number; unitPrice: number; taxPercent: number }>>(),

  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
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

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItemsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;
