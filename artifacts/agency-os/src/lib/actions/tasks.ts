"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import { taskSchema, type ActionResult } from "@/lib/validations";

function parseTask(formData: FormData) {
  return taskSchema.safeParse({
    title: formData.get("title"),
    projectId: formData.get("projectId"),
    description: formData.get("description") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
}

export async function createTask(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("tasks", "create");
    const parsed = parseTask(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const maxOrder = await prisma.task.aggregate({
      where: { projectId: parsed.data.projectId },
      _max: { sortOrder: true },
    });

    await prisma.task.create({
      data: {
        title: parsed.data.title,
        projectId: parsed.data.projectId,
        description: parsed.data.description,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assigneeId: parsed.data.assigneeId || null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        creatorId: user.id,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });

    await logAudit(user.id, "CREATE", "Task", parsed.data.projectId);
    revalidatePath("/tasks");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create task" };
  }
}

export async function updateTask(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("tasks", "edit");
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Missing task ID" };

    const parsed = parseTask(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    await prisma.task.update({
      where: { id },
      data: {
        title: parsed.data.title,
        projectId: parsed.data.projectId,
        description: parsed.data.description,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assigneeId: parsed.data.assigneeId || null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      },
    });

    await logAudit(user.id, "UPDATE", "Task", id);
    revalidatePath("/tasks");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update task" };
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("tasks", "delete");
    await prisma.task.delete({ where: { id } });
    await logAudit(user.id, "DELETE", "Task", id);
    revalidatePath("/tasks");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete task" };
  }
}
