import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { clientsTable } from "./clients";
import { projectsTable } from "./projects";

export const meetingsTable = pgTable("meetings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  meetingLink: text("meeting_link"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  durationMinutes: integer("duration_minutes").default(30),
  location: text("location"),
  status: text("status").default("SCHEDULED"), // SCHEDULED, COMPLETED, CANCELLED
  organizerId: text("organizer_id").references(() => usersTable.id, { onDelete: "set null" }),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  projectId: text("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const meetingAttendeesTable = pgTable("meeting_attendees", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  meetingId: text("meeting_id").notNull().references(() => meetingsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  email: text("email"),
  name: text("name"),
  status: text("status").default("ACCEPTED"), // INVITED, ACCEPTED, DECLINED
});

export const insertMeetingSchema = createInsertSchema(meetingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetingsTable.$inferSelect;
