"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import type { ActionResult } from "@/lib/validations";

// --- Client Contacts ---
export async function createClientContact(
  clientId: string,
  data: { name: string; role?: string; email?: string; phone?: string; isPrimary: boolean }
): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients", "edit");

    if (data.isPrimary) {
      // Set all other contacts for this client to false
      await prisma.clientContact.updateMany({
        where: { clientId },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.clientContact.create({
      data: {
        clientId,
        name: data.name,
        role: data.role || null,
        email: data.email || null,
        phone: data.phone || null,
        isPrimary: data.isPrimary,
      },
    });

    // Update contactPerson on client if primary
    if (data.isPrimary) {
      await prisma.client.update({
        where: { id: clientId },
        data: { contactPerson: data.name, email: data.email || null, phone: data.phone || null },
      });
    }

    await logAudit(user.id, "CREATE", "ClientContact", contact.id);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create contact" };
  }
}

export async function deleteClientContact(
  contactId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients", "edit");
    await prisma.clientContact.delete({ where: { id: contactId } });

    await logAudit(user.id, "DELETE", "ClientContact", contactId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete contact" };
  }
}

// --- Client Documents ---
export async function createClientDocument(
  clientId: string,
  data: { name: string; fileUrl: string; type?: string }
): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients", "edit");

    const doc = await prisma.clientDocument.create({
      data: {
        clientId,
        name: data.name,
        fileUrl: data.fileUrl,
        type: data.type || null,
      },
    });

    await logAudit(user.id, "CREATE", "ClientDocument", doc.id);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save document" };
  }
}

export async function deleteClientDocument(
  documentId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients", "edit");
    await prisma.clientDocument.delete({ where: { id: documentId } });

    await logAudit(user.id, "DELETE", "ClientDocument", documentId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete document" };
  }
}

// --- Update Internal Notes ---
export async function updateClientNotes(
  clientId: string,
  internalNotes: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients", "edit");

    await prisma.client.update({
      where: { id: clientId },
      data: { internalNotes },
    });

    await logAudit(user.id, "UPDATE", "ClientNotes", clientId);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update notes" };
  }
}
