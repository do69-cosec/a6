import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const proposalsTable = pgTable("proposals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title"),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  status: text("status").default("DRAFT"),
  template: text("template"),
  value: real("value"),
  validUntil: text("valid_until"),
  scope: text("scope"),
  deliverables: text("deliverables"),
  timeline: text("timeline"),
  notes: text("notes"),

  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const proposalItemsTable = pgTable("proposal_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  proposalId: text("proposal_id").notNull().references(() => proposalsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  qty: real("qty").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const insertProposalSchema = createInsertSchema(proposalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProposalItemSchema = createInsertSchema(proposalItemsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposalsTable.$inferSelect;
export type InsertProposalItem = z.infer<typeof insertProposalItemSchema>;
export type ProposalItem = typeof proposalItemsTable.$inferSelect;
