import { pgTable, text, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const contentPostsTable = pgTable("content_posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  platform: text("platform").default("INSTAGRAM"),
  contentType: text("content_type").default("POST"),
  status: text("status").default("IDEA"),
  caption: text("caption"),
  scheduledAt: text("scheduled_at"),
  shootDate: text("shoot_date"),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "cascade" }),
  referenceUrl: text("reference_url"),
  assetsLink: text("assets_link"),
  description: text("description"),
  script: text("script"),
  ideation: text("ideation"),
  format: text("format"),
  needsRevision: text("needs_revision").default("false"),
  referenceLinks: json("reference_links").$type<{ label: string; url: string }[]>(),
  customProperties: json("custom_properties").$type<{ key: string; value: string }[]>(),
  comments: json("comments").$type<{ id: string; userId: string | null; comment: string; createdAt: string }[]>(),
  title: text("title"),
  approvalStatus: text("approval_status").default("PENDING"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionNote: text("rejection_note"),
  mediaUrls: json("media_urls").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContentPostSchema = createInsertSchema(contentPostsTable).omit({ id: true, createdAt: true });
export type InsertContentPost = z.infer<typeof insertContentPostSchema>;
export type ContentPost = typeof contentPostsTable.$inferSelect;

export const clientCalendarSharesTable = pgTable("client_calendar_shares", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  shareToken: text("share_token").notNull().unique(),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const insertClientCalendarShareSchema = createInsertSchema(clientCalendarSharesTable).omit({ id: true, createdAt: true });
export type InsertClientCalendarShare = z.infer<typeof insertClientCalendarShareSchema>;
export type ClientCalendarShare = typeof clientCalendarSharesTable.$inferSelect;

export const clientSocialAccountsTable = pgTable("client_social_accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  handle: text("handle"),
  pageId: text("page_id"),
  profileUrl: text("profile_url"),
  accessToken: text("access_token"),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientSocialAccountSchema = createInsertSchema(clientSocialAccountsTable).omit({ id: true, createdAt: true });
export type InsertClientSocialAccount = z.infer<typeof insertClientSocialAccountSchema>;
export type ClientSocialAccount = typeof clientSocialAccountsTable.$inferSelect;
