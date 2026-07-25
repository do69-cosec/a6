import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const rolesTable = pgTable("roles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const permissionsTable = pgTable("permissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // e.g. "invoice:create", "user:write"
  description: text("description"),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

export const rolePermissionsTable = pgTable("role_permissions", {
  roleId: text("role_id").notNull().references(() => rolesTable.id, { onDelete: "cascade" }),
  permissionId: text("permission_id").notNull().references(() => permissionsTable.id, { onDelete: "cascade" }),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  };
});

export const userRolesTable = pgTable("user_roles", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  roleId: text("role_id").notNull().references(() => rolesTable.id, { onDelete: "cascade" }),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  };
});

export const insertRoleSchema = createInsertSchema(rolesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPermissionSchema = createInsertSchema(permissionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissionsTable);
export const insertUserRoleSchema = createInsertSchema(userRolesTable);

export type Role = typeof rolesTable.$inferSelect;
export type Permission = typeof permissionsTable.$inferSelect;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;
export type UserRole = typeof userRolesTable.$inferSelect;
