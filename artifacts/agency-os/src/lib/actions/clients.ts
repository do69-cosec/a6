"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import { clientSchema, type ActionResult } from "@/lib/validations";

function parseClient(formData: FormData) {
  return clientSchema.safeParse({
    companyName: formData.get("companyName"),
    contactPerson: formData.get("contactPerson") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    billingAddress: formData.get("billingAddress") || undefined,
    gstin: formData.get("gstin") || undefined,
    category: formData.get("category"),
    source: formData.get("source") || undefined,
    health: formData.get("health"),
    internalNotes: formData.get("internalNotes") || undefined,
  });
}

export async function createClient(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients", "create");
    const parsed = parseClient(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const client = await prisma.client.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
      },
    });

    await logAudit(user.id, "CREATE", "Client", client.id, {
      companyName: client.companyName,
    });
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create client" };
  }
}

export async function updateClient(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients", "edit");
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Missing client ID" };

    const parsed = parseClient(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    await prisma.client.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
      },
    });

    await logAudit(user.id, "UPDATE", "Client", id);
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update client" };
  }
}

export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients", "delete");
    await prisma.client.delete({ where: { id } });
    await logAudit(user.id, "DELETE", "Client", id);
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Cannot delete client with linked records",
    };
  }
}
