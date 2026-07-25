"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import { leadSchema, type ActionResult } from "@/lib/validations";

function parseLead(formData: FormData) {
  return leadSchema.safeParse({
    title: formData.get("title"),
    companyName: formData.get("companyName") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    value: formData.get("value") || undefined,
    stage: formData.get("stage"),
    lostReason: formData.get("lostReason") || undefined,
    ownerId: formData.get("ownerId") || undefined,
    followUpAt: formData.get("followUpAt") || undefined,
  });
}

export async function createLead(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("sales", "create");
    const parsed = parseLead(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const followUpAt = parsed.data.followUpAt
      ? new Date(parsed.data.followUpAt)
      : undefined;

    const lead = await prisma.lead.create({
      data: {
        title: parsed.data.title,
        companyName: parsed.data.companyName,
        contactEmail: parsed.data.contactEmail || null,
        contactPhone: parsed.data.contactPhone,
        value: parsed.data.value,
        stage: parsed.data.stage,
        lostReason: parsed.data.lostReason,
        ownerId: parsed.data.ownerId || user.id,
        followUpAt,
      },
    });

    if (parsed.data.stage === "WON") {
      await convertLeadToClient(lead.id, user.id);
    }

    await logAudit(user.id, "CREATE", "Lead", lead.id);
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create lead" };
  }
}

export async function updateLead(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("sales", "edit");
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Missing lead ID" };

    const parsed = parseLead(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const followUpAt = parsed.data.followUpAt
      ? new Date(parsed.data.followUpAt)
      : null;

    await prisma.lead.update({
      where: { id },
      data: {
        title: parsed.data.title,
        companyName: parsed.data.companyName,
        contactEmail: parsed.data.contactEmail || null,
        contactPhone: parsed.data.contactPhone,
        value: parsed.data.value,
        stage: parsed.data.stage,
        lostReason: parsed.data.lostReason,
        ownerId: parsed.data.ownerId || null,
        followUpAt,
      },
    });

    if (parsed.data.stage === "WON") {
      await convertLeadToClient(id, user.id);
    }

    await logAudit(user.id, "UPDATE", "Lead", id);
    revalidatePath("/sales");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update lead" };
  }
}

export async function updateLeadStage(
  id: string,
  stage: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("sales", "edit");
    await prisma.lead.update({
      where: { id },
      data: { stage: stage as "LEAD" },
    });
    if (stage === "WON") {
      await convertLeadToClient(id, user.id);
    }
    await logAudit(user.id, "UPDATE_STAGE", "Lead", id, { stage });
    revalidatePath("/sales");
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update stage" };
  }
}

async function convertLeadToClient(leadId: string, userId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.clientId) return;

  const client = await prisma.client.create({
    data: {
      companyName: lead.companyName ?? lead.title,
      contactPerson: lead.title,
      email: lead.contactEmail,
      phone: lead.contactPhone,
      category: "RETAINER",
      source: "Sales funnel",
      health: "GREEN",
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { clientId: client.id, stage: "WON" },
  });

  await logAudit(userId, "CONVERT", "Lead", leadId, { clientId: client.id });
}

export async function deleteLead(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("sales", "delete");
    await prisma.lead.delete({ where: { id } });
    await logAudit(user.id, "DELETE", "Lead", id);
    revalidatePath("/sales");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete lead" };
  }
}
