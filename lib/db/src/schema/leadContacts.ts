import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";

export const leadContactsTable = pgTable("lead_contacts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text("lead_id").references(() => leadsTable.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull().default("NOTE"),
  subject: text("subject").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type LeadContact = typeof leadContactsTable.$inferSelect;
