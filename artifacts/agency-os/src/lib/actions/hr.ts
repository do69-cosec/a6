"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";

export async function createPayrollRecord(
  formData: FormData
): Promise<void> {
  try {
    const user = await requirePermission("hr", "create");
    const userId = formData.get("userId") as string;
    const baseSalary = parseFloat(formData.get("baseSalary") as string);
    const deductions = parseFloat(formData.get("deductions") as string) || 0;
    const month = parseInt(formData.get("month") as string);
    const year = parseInt(formData.get("year") as string);

    if (!userId || isNaN(baseSalary) || isNaN(month) || isNaN(year)) {
      return;
    }

    const netPay = baseSalary - deductions;

    const record = await prisma.payrollRecord.create({
      data: {
        userId,
        baseSalary,
        deductions,
        netPay,
        month,
        year,
      },
    });

    await logAudit(user.id, "CREATE_PAYROLL", "PayrollRecord", record.id);
    revalidatePath("/hr");
  } catch (e) {
    console.error("Failed to create payroll:", e);
  }
}

export async function createPerformanceReview(
  formData: FormData
): Promise<void> {
  try {
    const user = await requirePermission("hr", "create");
    const userId = formData.get("userId") as string;
    const rating = parseInt(formData.get("rating") as string);
    const period = formData.get("period") as string;
    const notes = formData.get("notes") as string;

    if (!userId || isNaN(rating) || !period) {
      return;
    }

    const record = await prisma.performanceReview.create({
      data: {
        userId,
        period,
        rating,
        notes,
      },
    });

    await logAudit(user.id, "CREATE_REVIEW", "PerformanceReview", record.id);
    revalidatePath("/hr");
  } catch (e) {
    console.error("Failed to create review:", e);
  }
}
