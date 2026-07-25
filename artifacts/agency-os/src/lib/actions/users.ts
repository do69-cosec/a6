"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit, requireUser } from "@/lib/access";
import { isAdmin } from "@/lib/permissions";
import { userSchema, type ActionResult } from "@/lib/validations";

function parseUser(formData: FormData) {
  const password = (formData.get("password") as string) || undefined;
  return userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password,
    phone: formData.get("phone") || undefined,
    department: formData.get("department") || undefined,
    systemRole: formData.get("systemRole"),
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === "on",
  });
}

export async function createTeamMember(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    if (!isAdmin(actor.systemRole)) {
      return { ok: false, error: "Only the owner (Super Admin) can add team members" };
    }

    const parsed = parseUser(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }
    if (!parsed.data.password || parsed.data.password.length < 8) {
      return { ok: false, error: "Password is required (min 8 characters) for new users" };
    }

    const exists = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });
    if (exists) return { ok: false, error: "Email already in use" };

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const member = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        phone: parsed.data.phone,
        department: parsed.data.department,
        systemRole: parsed.data.systemRole,
      },
    });

    await prisma.leaveBalance.create({ data: { userId: member.id } });
    await logAudit(actor.id, "CREATE", "User", member.id, { email: member.email });
    revalidatePath("/team");
    revalidatePath("/hr");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create user" };
  }
}

export async function updateTeamMember(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    if (!isAdmin(actor.systemRole)) {
      return { ok: false, error: "Only the owner (Super Admin) can edit team members" };
    }

    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Missing user ID" };

    const parsed = parseUser(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const updateData: {
      name: string;
      email: string;
      phone?: string | null;
      department?: string | null;
      systemRole: typeof parsed.data.systemRole;
      isActive?: boolean;
      passwordHash?: string;
    } = {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone ?? null,
      department: parsed.data.department ?? null,
      systemRole: parsed.data.systemRole,
      isActive: parsed.data.isActive ?? true,
    };

    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    }

    if (id === actor.id && parsed.data.systemRole !== "SUPER_ADMIN") {
      return { ok: false, error: "You cannot remove your own Super Admin role" };
    }

    await prisma.user.update({ where: { id }, data: updateData });
    await logAudit(actor.id, "UPDATE", "User", id);
    revalidatePath("/team");
    revalidatePath("/hr");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update user" };
  }
}

export async function deactivateTeamMember(id: string): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    if (!isAdmin(actor.systemRole)) {
      return { ok: false, error: "Only the owner can deactivate users" };
    }
    if (id === actor.id) {
      return { ok: false, error: "You cannot deactivate your own account" };
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    await logAudit(actor.id, "DEACTIVATE", "User", id);
    revalidatePath("/team");
    revalidatePath("/hr");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to deactivate user" };
  }
}
