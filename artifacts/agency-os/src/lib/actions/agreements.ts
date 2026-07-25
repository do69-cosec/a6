"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import type { ActionResult } from "@/lib/validations";

export async function updateAgreementContent(
  id: string,
  content: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "edit");
    await prisma.agreement.update({
      where: { id },
      data: { content },
    });
    await logAudit(user.id, "UPDATE_CONTENT", "Agreement", id);
    revalidatePath("/finance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update agreement" };
  }
}

export async function signAgreement(
  id: string,
  signatureText: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "edit");
    
    // Fetch agreement to log client details in content
    const agreement = await prisma.agreement.findUniqueOrThrow({
      where: { id },
    });

    const updatedContent = `${agreement.content}\n\n--- \nSigned by: ${signatureText}\nSigned IP: (Simulated E-Sign)\nTimestamp: ${new Date().toLocaleString()}`;

    await prisma.agreement.update({
      where: { id },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        content: updatedContent,
      },
    });

    await logAudit(user.id, "SIGN", "Agreement", id, { signatureText });
    revalidatePath("/finance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to sign agreement" };
  }
}

export async function updateAgreementStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "edit");
    await prisma.agreement.update({
      where: { id },
      data: { status: status as "DRAFT" },
    });
    await logAudit(user.id, "UPDATE_STATUS", "Agreement", id, { status });
    revalidatePath("/finance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update status" };
  }
}
