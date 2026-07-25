import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";

export type UserRole = "ADMIN" | "EMPLOYEE";

export type Permission =
  | "users.manage"
  | "users.view"
  | "settings.view"
  | "settings.update"
  | "leave.approve"
  | "leave.apply"
  | "leave.view"
  | "attendance.view"
  | "attendance.manage"
  | "time.log"
  | "time.view"
  | "attachments.upload"
  | "attachments.view"
  | "projects.create"
  | "projects.edit"
  | "projects.delete"
  | "projects.view"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  | "tasks.view"
  | "content.create"
  | "content.edit"
  | "content.delete"
  | "content.view"
  | "invoices.create"
  | "invoices.edit"
  | "invoices.delete"
  | "invoices.view"
  | "quotations.create"
  | "quotations.edit"
  | "quotations.delete"
  | "quotations.view"
  | "proposals.create"
  | "proposals.edit"
  | "proposals.delete"
  | "proposals.view"
  | "purchase_orders.create"
  | "purchase_orders.edit"
  | "purchase_orders.delete"
  | "purchase_orders.view"
  | "sales.create"
  | "sales.edit"
  | "sales.delete"
  | "sales.view"
  | "clients.create"
  | "clients.edit"
  | "clients.delete"
  | "clients.view"
  | "reports.view";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "users.manage",
    "users.view",
    "settings.view",
    "settings.update",
    "leave.approve",
    "leave.apply",
    "leave.view",
    "attendance.view",
    "attendance.manage",
    "time.log",
    "time.view",
    "attachments.upload",
    "attachments.view",
    "projects.create",
    "projects.edit",
    "projects.delete",
    "projects.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
    "tasks.view",
    "content.create",
    "content.edit",
    "content.delete",
    "content.view",
    "invoices.create",
    "invoices.edit",
    "invoices.delete",
    "invoices.view",
    "quotations.create",
    "quotations.edit",
    "quotations.delete",
    "quotations.view",
    "proposals.create",
    "proposals.edit",
    "proposals.delete",
    "proposals.view",
    "purchase_orders.create",
    "purchase_orders.edit",
    "purchase_orders.delete",
    "purchase_orders.view",
    "sales.create",
    "sales.edit",
    "sales.delete",
    "sales.view",
    "clients.create",
    "clients.edit",
    "clients.delete",
    "clients.view",
    "reports.view",
  ],
  EMPLOYEE: [
    "leave.apply",
    "leave.view",
    "attendance.view",
    "attendance.manage",
    "time.log",
    "time.view",
    "attachments.upload",
    "attachments.view",
    "projects.create",
    "projects.edit",
    "projects.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
    "tasks.view",
    "content.create",
    "content.edit",
    "content.delete",
    "content.view",
    "invoices.create",
    "invoices.edit",
    "invoices.view",
    "quotations.create",
    "quotations.edit",
    "quotations.view",
    "proposals.create",
    "proposals.edit",
    "proposals.view",
    "sales.create",
    "sales.edit",
    "sales.view",
    "clients.create",
    "clients.edit",
    "clients.view",
    "reports.view",
  ],
};

export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = header.slice(7);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const userId = payload.sub;

  const [user] = await db
    .select({
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!user.isActive) {
    return res.status(401).json({ error: "Your account is inactive or pending approval." });
  }

  (req as Request & { userId: string }).userId = userId;
  return next();
});

export function requirePermission(permission: Permission) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [user] = await db
      .select({
        systemRole: usersTable.systemRole,
        isActive: usersTable.isActive,
        allowedModules: usersTable.allowedModules,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: "Your account is inactive or pending approval." });
    }

    const role: UserRole = user.systemRole === "SUPER_ADMIN" ? "ADMIN" : "EMPLOYEE";
    const permissions = ROLE_PERMISSIONS[role] ?? [];

    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: `Forbidden: Missing required permission ${permission}` });
    }

    // --- ENFORCE allowedModules ON BACKEND FOR EMPLOYEES ---
    if (role === "EMPLOYEE") {
      const PERMISSION_TO_MODULE: Record<string, string> = {
        "clients.create": "clients",
        "clients.edit": "clients",
        "clients.delete": "clients",
        "clients.view": "clients",
        "projects.create": "projects",
        "projects.edit": "projects",
        "projects.delete": "projects",
        "projects.view": "projects",
        "tasks.create": "tasks",
        "tasks.edit": "tasks",
        "tasks.delete": "tasks",
        "tasks.view": "tasks",
        "content.create": "content",
        "content.edit": "content",
        "content.delete": "content",
        "content.view": "content",
        "invoices.create": "invoices",
        "invoices.edit": "invoices",
        "invoices.delete": "invoices",
        "invoices.view": "invoices",
        "quotations.create": "quotations",
        "quotations.edit": "quotations",
        "quotations.delete": "quotations",
        "quotations.view": "quotations",
        "proposals.create": "proposals",
        "proposals.edit": "proposals",
        "proposals.delete": "proposals",
        "proposals.view": "proposals",
        "leave.apply": "leaves",
        "leave.approve": "leaves",
        "leave.view": "leaves",
        "attendance.view": "attendance",
        "attendance.manage": "attendance",
        "sales.create": "sales",
        "sales.edit": "sales",
        "sales.delete": "sales",
        "sales.view": "sales",
        "purchase_orders.create": "purchaseOrders",
        "purchase_orders.edit": "purchaseOrders",
        "purchase_orders.delete": "purchaseOrders",
        "purchase_orders.view": "purchaseOrders",
        "users.manage": "team",
        "users.view": "team",
        "settings.view": "settings",
        "settings.update": "settings",
        "time.log": "time",
        "time.view": "time",
        "attachments.upload": "attachments",
        "attachments.view": "attachments",
      };

      const moduleKey = PERMISSION_TO_MODULE[permission];
      if (moduleKey) {
        let allowedModulesList: string[] = [];
        try {
          allowedModulesList = user.allowedModules ? JSON.parse(user.allowedModules) : [];
        } catch {
          allowedModulesList = [];
        }
        if (!allowedModulesList.includes(moduleKey)) {
          return res.status(403).json({ error: `Forbidden: Module ${moduleKey} is disabled for your account.` });
        }
      }

      if (permission === "reports.view") {
        let allowedModulesList: string[] = [];
        try {
          allowedModulesList = user.allowedModules ? JSON.parse(user.allowedModules) : [];
        } catch {
          allowedModulesList = [];
        }
        const hasFinancialModule = allowedModulesList.includes("invoices") ||
                                   allowedModulesList.includes("quotations") ||
                                   allowedModulesList.includes("proposals");
        if (!hasFinancialModule) {
          return res.status(403).json({ error: `Forbidden: Missing financial module access for reports.` });
        }
      }
    }
    // --------------------------------------------------------

    (req as any).userRole = role;
    (req as any).userSystemRole = user.systemRole;

    next();
  });
}

export function requireRole(allowedRole: UserRole) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [user] = await db
      .select({ systemRole: usersTable.systemRole, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Your account is inactive or pending approval." });
    }

    const role: UserRole = user.systemRole === "SUPER_ADMIN" ? "ADMIN" : "EMPLOYEE";
    if (role !== allowedRole) {
      return res.status(403).json({ error: `Forbidden: ${allowedRole} role required` });
    }

    (req as any).userRole = role;
    (req as any).userSystemRole = user.systemRole;

    next();
  });
}
