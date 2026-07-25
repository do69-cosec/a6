import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ModuleKey, PermissionAction } from "@/lib/permissions";
import { isAdmin } from "@/lib/permissions";
import type { SystemRole } from "@/generated/prisma/client";

const ROLE_PERMISSIONS: Record<
  SystemRole,
  Partial<Record<ModuleKey, PermissionAction[]>>
> = {
  SUPER_ADMIN: {},
  MANAGER: {
    clients: ["view", "create", "edit"],
    projects: ["view", "create", "edit"],
    tasks: ["view", "create", "edit", "delete"],
    sales: ["view"],
    content: ["view", "create", "edit"],
    hr: ["view"],
    attendance: ["view"],
  },
  ACCOUNT_MANAGER: {
    clients: ["view", "create", "edit"],
    projects: ["view", "create", "edit"],
  },
  DESIGNER: {
    tasks: ["view", "edit"],
    content: ["view", "create", "edit"],
    time: ["view", "create", "edit"],
  },
  SALES_EXECUTIVE: {
    clients: ["view", "create", "edit"],
    sales: ["view", "create", "edit", "delete"],
  },
  DEVELOPER: {
    projects: ["view"],
    tasks: ["view", "create", "edit"],
    time: ["view", "create", "edit"],
  },
  FINANCE_EXECUTIVE: {
    finance: ["view", "create", "edit", "delete"],
    clients: ["view"],
  },
  HR: {
    hr: ["view", "create", "edit"],
    attendance: ["view", "edit"],
  },
  CUSTOM: {},
};

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id, isActive: true },
  });
}

export function canPerform(
  role: SystemRole,
  module: ModuleKey,
  action: PermissionAction
): boolean {
  if (isAdmin(role)) return true;
  const allowed = ROLE_PERMISSIONS[role]?.[module];
  return allowed?.includes(action) ?? action === "view";
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requirePermission(
  module: ModuleKey,
  action: PermissionAction
) {
  const user = await requireUser();
  if (!canPerform(user.systemRole, module, action)) {
    throw new Error("You do not have permission for this action");
  }
  return user;
}

export async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });
}
