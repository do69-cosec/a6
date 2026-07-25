import { pgTable, text, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agencySettingsTable = pgTable("agency_settings", {
  id: text("id").primaryKey().default("default"),
  agencyName: text("agency_name").notNull().default("Blink Beyond"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  primaryColor: text("primary_color").notNull().default("#6366f1"),
  currency: text("currency").notNull().default("INR"),
  taxLabel: text("tax_label").notNull().default("GST"),
  taxPercent: real("tax_percent").notNull().default(18),
  logoUrl: text("logo_url"),
  workDayStart: text("work_day_start").notNull().default("09:00"),
  workDayEnd: text("work_day_end").notNull().default("18:00"),
  workingDays: text("working_days").notNull().default("1,2,3,4,5"),
  gracePeriodMin: integer("grace_period_min").notNull().default(30),
  halfDayCutoffTime: text("half_day_cutoff_time").notNull().default("12:00"),
  absentCutoffTime: text("absent_cutoff_time").notNull().default("11:00"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgencySettingsSchema = createInsertSchema(agencySettingsTable);
export type InsertAgencySettings = z.infer<typeof insertAgencySettingsSchema>;
export type AgencySettings = typeof agencySettingsTable.$inferSelect;
