import { pgTable, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("LEAD"),
  companyName: text("company_name"),
  contactName: text("contact_name"),
  email: text("email"),
  value: real("value"),
  probability: integer("probability").default(0),
  expectedCloseDate: timestamp("expected_close_date"),
  source: text("source"),
  notes: text("notes"),
  stageChangedAt: timestamp("stage_changed_at").defaultNow(),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true, stageChangedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
