"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import { invoiceSchema, fullInvoiceSchema, type ActionResult } from "@/lib/validations";

export async function createInvoice(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "create");
    const parsed = invoiceSchema.safeParse({
      clientId: formData.get("clientId"),
      projectId: formData.get("projectId") || undefined,
      status: formData.get("status"),
      currency: formData.get("currency"),
      subtotal: formData.get("subtotal"),
      gstRate: formData.get("gstRate"),
      dueDate: formData.get("dueDate") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const gstAmount = (parsed.data.subtotal * parsed.data.gstRate) / 100;
    const total = parsed.data.subtotal + gstAmount;
    const number = `BB-INV-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    await prisma.invoice.create({
      data: {
        number,
        clientId: parsed.data.clientId,
        projectId: parsed.data.projectId || null,
        status: parsed.data.status,
        currency: parsed.data.currency,
        subtotal: parsed.data.subtotal,
        gstRate: parsed.data.gstRate,
        gstAmount,
        total,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        lineItems: {
          create: {
            description: formData.get("lineDescription")?.toString() || "Services",
            quantity: 1,
            rate: parsed.data.subtotal,
            gstRate: parsed.data.gstRate,
            amount: parsed.data.subtotal,
          },
        },
      },
    });

    await logAudit(user.id, "CREATE", "Invoice", number);
    revalidatePath("/finance");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create invoice" };
  }
}

export async function markInvoicePaid(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "edit");
    await prisma.invoice.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
    await logAudit(user.id, "PAID", "Invoice", id);
    revalidatePath("/finance");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update invoice" };
  }
}

export async function createFullInvoice(data: {
  clientId: string;
  projectId?: string;
  currency: "INR" | "USD" | "AED" | "GBP";
  gstRate: number;
  dueDate?: string;
  notes?: string;
  discount?: number;
  lineItems: { description: string; quantity: number; rate: number; gstRate: number }[];
}): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "create");
    const parsed = fullInvoiceSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const d = parsed.data;
    const discount = d.discount ?? 0;

    // Calculate totals from line items
    let subtotal = 0;
    let totalGst = 0;
    const lineItemsData = d.lineItems.map((item) => {
      const amount = item.quantity * item.rate;
      const itemGst = (amount * item.gstRate) / 100;
      subtotal += amount;
      totalGst += itemGst;
      return {
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        gstRate: item.gstRate,
        amount,
      };
    });

    const total = subtotal - discount + totalGst;
    const number = `BB-INV-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    await prisma.invoice.create({
      data: {
        number,
        clientId: d.clientId,
        projectId: d.projectId || null,
        status: "DRAFT",
        currency: d.currency,
        subtotal,
        gstRate: d.gstRate,
        gstAmount: totalGst,
        total: Math.max(0, total),
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        lineItems: {
          create: lineItemsData,
        },
      },
    });

    await logAudit(user.id, "CREATE", "Invoice", number);
    revalidatePath("/build-doc");
    revalidatePath("/build-doc/invoice-maker");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create invoice" };
  }
}

