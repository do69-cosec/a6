import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { usersTable } from "./users";

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  status: text("status").default("NOT_STARTED"),
  priority: text("priority").default("MEDIUM"),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  description: text("description"),
  
  // Assignment fields
  assignedTo: text("assigned_to").references(() => usersTable.id, { onDelete: "set null" }),
  assignmentStatus: text("assignment_status"),
  assignmentDescription: text("assignment_description"),
  rejectionReason: text("rejection_reason"),
  assignmentActionAt: timestamp("assignment_action_at"),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
