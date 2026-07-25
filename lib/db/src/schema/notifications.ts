import { pgTable, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  senderId: text("sender_id").references(() => usersTable.id, { onDelete: "set null" }),
  type: text("type").notNull().default("SYSTEM"), // e.g., "TASK", "PROJECT", "MEETING", "LEAVE", "ANNOUNCEMENT", "SYSTEM"
  priority: text("priority").notNull().default("LOW"), // e.g., "URGENT", "HIGH", "MEDIUM", "LOW"
  title: text("title").notNull(),
  message: text("message").notNull(),
  action: text("action"),
  actionUrl: text("action_url"),
  referenceId: text("reference_id"),
  referenceType: text("reference_type"), // e.g., "TASK", "PROJECT", "MEETING", "LEAVE", "ANNOUNCEMENT"
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_is_read_idx").on(table.isRead),
  index("notifications_sender_idx").on(table.senderId),
  index("notifications_created_at_idx").on(table.createdAt),
  index("notifications_reference_idx").on(table.referenceId, table.referenceType),
]);

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
