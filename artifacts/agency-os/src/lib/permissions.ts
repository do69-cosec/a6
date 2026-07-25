// @ts-nocheck
import type { SystemRole } from "@/generated/prisma/client";

export type ModuleKey =
  | "dashboard"
  | "clients"
  | "sales"
  | "projects"
  | "tasks"
  | "time"
  | "finance"
  | "content"
  | "hr"
  | "team"
  | "reports"
  | "attendance"
  | "settings"
  | "automation";

export type PermissionAction = "view" | "create" | "edit" | "delete";

type ModulePermissions = Partial<Record<PermissionAction, boolean>>;

const ROLE_MODULES: Record<SystemRole, ModuleKey[]> = {
  SUPER_ADMIN: [
    "dashboard",
    "clients",
    "sales",
    "projects",
    "tasks",
    "time",
    "finance",
    "content",
    "hr",
    "team",
    "reports",
    "attendance",
    "settings",
    "automation",
  ],
  MANAGER: [
    "dashboard",
    "clients",
    "projects",
    "tasks",
    "time",
    "content",
    "reports",
    "attendance",
  ],
  ACCOUNT_MANAGER: ["dashboard", "clients", "projects", "reports"],
  DESIGNER: ["dashboard", "tasks", "content", "time"],
  SALES_EXECUTIVE: ["dashboard", "sales", "clients"],
  DEVELOPER: ["dashboard", "projects", "tasks", "time"],
  FINANCE_EXECUTIVE: ["dashboard", "finance", "reports"],
  HR: ["dashboard", "hr", "attendance", "reports"],
  CUSTOM: ["dashboard"],
};

export function canAccessModule(role: SystemRole, module: ModuleKey): boolean {
  return ROLE_MODULES[role]?.includes(module) ?? false;
}

export function getAccessibleModules(role: SystemRole): ModuleKey[] {
  return ROLE_MODULES[role] ?? ["dashboard"];
}

export function isAdmin(role: SystemRole): boolean {
  return role === "SUPER_ADMIN";
}

export function parseCustomPermissions(
  permissions: unknown
): Record<string, ModulePermissions> {
  if (!permissions || typeof permissions !== "object") return {};
  return permissions as Record<string, ModulePermissions>;
}
