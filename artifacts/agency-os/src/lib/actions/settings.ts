"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, logAudit } from "@/lib/access";
import { isAdmin } from "@/lib/permissions";
import { settingsSchema, type ActionResult } from "@/lib/validations";

export async function updateAgencySettings(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!isAdmin(user.systemRole)) {
      return { ok: false, error: "Only Super Admin can change system settings" };
    }

    const parsed = settingsSchema.safeParse({
      companyName: formData.get("companyName"),
      primaryColor: formData.get("primaryColor") || undefined,
      emailDomain: formData.get("emailDomain") || undefined,
      gstNumber: formData.get("gstNumber") || undefined,
      defaultGstRate: formData.get("defaultGstRate"),
      sessionTimeoutMin: formData.get("sessionTimeoutMin"),
      checkInDeadline: formData.get("checkInDeadline") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    await prisma.agencySettings.update({
      where: { id: "default" },
      data: parsed.data,
    });

    await logAudit(user.id, "UPDATE", "AgencySettings", "default");
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save settings" };
  }
}
