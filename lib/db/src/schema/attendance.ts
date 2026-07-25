import { pgTable, text, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceTable = pgTable("attendance", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  checkInAt: timestamp("check_in_at"),
  checkOutAt: timestamp("check_out_at"),
  breakStartAt: timestamp("break_start_at"),
  breakEndAt: timestamp("break_end_at"),
  breakDurationMin: integer("break_duration_min").notNull().default(0),
  breakStatus: text("break_status").notNull().default("IDLE"),
  isLate: boolean("is_late").notNull().default(false),
  overtimeMin: integer("overtime_min").notNull().default(0),
  overtimeCheckInAt: timestamp("overtime_check_in_at"),
  overtimeCheckOutAt: timestamp("overtime_check_out_at"),
  status: text("status").notNull().default("PRESENT"),
  date: text("date").notNull(),
}, (table) => [
  uniqueIndex("attendance_user_id_date_idx").on(table.userId, table.date),
]);

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
