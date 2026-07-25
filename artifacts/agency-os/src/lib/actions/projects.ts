"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import { projectSchema, type ActionResult } from "@/lib/validations";

function parseProject(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name"),
    clientId: formData.get("clientId"),
    serviceType: formData.get("serviceType") || undefined,
    status: formData.get("status"),
    budget: formData.get("budget") || undefined,
    progress: formData.get("progress") || 0,
    managerId: formData.get("managerId") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });
}

export async function createProject(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects", "create");
    const parsed = parseProject(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        clientId: parsed.data.clientId,
        serviceType: parsed.data.serviceType,
        status: parsed.data.status,
        budget: parsed.data.budget,
        progress: parsed.data.progress ?? 0,
        managerId: parsed.data.managerId || user.id,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      },
    });

    await prisma.projectActivity.create({
      data: {
        projectId: project.id,
        userId: user.id,
        action: "Project created",
      },
    });

    await logAudit(user.id, "CREATE", "Project", project.id);
    revalidatePath("/projects");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create project" };
  }
}

export async function updateProject(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects", "edit");
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Missing project ID" };

    const parsed = parseProject(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    await prisma.project.update({
      where: { id },
      data: {
        name: parsed.data.name,
        clientId: parsed.data.clientId,
        serviceType: parsed.data.serviceType,
        status: parsed.data.status,
        budget: parsed.data.budget,
        progress: parsed.data.progress ?? 0,
        managerId: parsed.data.managerId || null,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      },
    });

    await logAudit(user.id, "UPDATE", "Project", id);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update project" };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects", "delete");
    await prisma.project.delete({ where: { id } });
    await logAudit(user.id, "DELETE", "Project", id);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Delete linked tasks first or remove dependencies",
    };
  }
}
