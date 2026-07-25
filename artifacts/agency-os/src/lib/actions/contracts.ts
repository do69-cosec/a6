"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import { contractSchema, deliverableSchema, type ActionResult } from "@/lib/validations";
import { scheduleMonth, type DeliverableType } from "@/lib/content-scheduler";

/**
 * Create a new content contract, auto-generate project + all deliverables.
 */
export async function createContract(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects", "create");

    const parsed = contractSchema.safeParse({
      clientId: formData.get("clientId"),
      durationMonths: formData.get("durationMonths"),
      startMonth: formData.get("startMonth"),
      reelsPerMonth: formData.get("reelsPerMonth") || 0,
      postsPerMonth: formData.get("postsPerMonth") || 0,
      carouselsPerMonth: formData.get("carouselsPerMonth") || 0,
      blogsPerMonth: formData.get("blogsPerMonth") || 0,
      budget: formData.get("budget") || undefined,
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const d = parsed.data;
    const [startYearStr, startMonthStr] = d.startMonth.split("-");
    const startYear = parseInt(startYearStr!, 10);
    const startMonthNum = parseInt(startMonthStr!, 10) - 1;
    
    const startDate = new Date(startYear, startMonthNum, 1);
    const endDate = new Date(startYear, startMonthNum + d.durationMonths, 1);

    // Get client name for project title
    const client = await prisma.client.findUnique({
      where: { id: d.clientId },
      select: { companyName: true },
    });

    // Create contract
    const contract = await prisma.contentContract.create({
      data: {
        clientId: d.clientId,
        durationMonths: d.durationMonths,
        startMonth: d.startMonth,
        reelsPerMonth: d.reelsPerMonth,
        postsPerMonth: d.postsPerMonth,
        carouselsPerMonth: d.carouselsPerMonth,
        blogsPerMonth: d.blogsPerMonth,
        notes: d.notes,
      },
    });

    // Create the project
    const project = await prisma.project.create({
      data: {
        name: `${client?.companyName ?? "Client"} — Content Contract`,
        clientId: d.clientId,
        serviceType: "Social Media",
        status: "IN_PROGRESS",
        budget: d.budget ?? null,
        startDate,
        endDate,
        progress: 0,
        managerId: user.id,
        contractId: contract.id,
      },
    });

    // Generate deliverables month by month
    const allCounts = [
      { type: "REEL" as const, count: d.reelsPerMonth },
      { type: "POST" as const, count: d.postsPerMonth },
      { type: "CAROUSEL" as const, count: d.carouselsPerMonth },
      { type: "BLOG" as const, count: d.blogsPerMonth },
    ];
    const counts = allCounts.filter((c) => c.count > 0);

    const deliverableData = [];

    for (let m = 0; m < d.durationMonths; m++) {
      const monthDate = new Date(startYear, startMonthNum + m, 1);
      const mStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      
      const schedule = scheduleMonth(mStr, counts);
      
      for (const item of schedule) {
        deliverableData.push({
          contractId: contract.id,
          projectId: project.id,
          type: item.type as DeliverableType,
          month: mStr,
          scheduledDate: item.scheduledDate,
          editStartDate: item.editStartDate,
          editEndDate: item.editEndDate,
          sortOrder: item.sortOrder,
        });
      }
    }

    // Bulk create all deliverables
    if (deliverableData.length > 0) {
      await prisma.contentDeliverable.createMany({
        data: deliverableData,
      });
    }

    // Update project activity
    await prisma.projectActivity.create({
      data: {
        projectId: project.id,
        userId: user.id,
        action: `Created content contract: ${d.reelsPerMonth} reels + ${d.postsPerMonth} posts/month × ${d.durationMonths} months`,
      },
    });

    await logAudit(user.id, "CREATE", "ContentContract", contract.id);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create contract" };
  }
}

/**
 * Update a single deliverable.
 */
export async function updateDeliverable(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects", "edit");

    const parsed = deliverableSchema.safeParse({
      id: formData.get("id"),
      title: formData.get("title") || undefined,
      scriptOrDraft: formData.get("scriptOrDraft") || undefined,
      referenceLinks: formData.get("referenceLinks") || undefined,
      conceptIdeation: formData.get("conceptIdeation") || undefined,
      visualReferences: formData.get("visualReferences") || undefined,
      imageReferenceUrl: formData.get("imageReferenceUrl") || undefined,
      captionDraft: formData.get("captionDraft") || undefined,
      hashtags: formData.get("hashtags") || undefined,
      internalNotes: formData.get("internalNotes") || undefined,
      scheduledDate: formData.get("scheduledDate") || undefined,
      status: formData.get("status") || "PENDING",
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const d = parsed.data;
    
    // Convert string/array from form into stringified JSON if it's an array, or keep as string
    const stringifyIfNeeded = (val: string | string[] | undefined) => {
      if (Array.isArray(val)) return JSON.stringify(val);
      return val;
    }

    const deliverable = await prisma.contentDeliverable.update({
      where: { id: d.id },
      data: {
        title: d.title,
        scriptOrDraft: d.scriptOrDraft,
        referenceLinks: stringifyIfNeeded(d.referenceLinks),
        conceptIdeation: d.conceptIdeation,
        visualReferences: stringifyIfNeeded(d.visualReferences),
        imageReferenceUrl: d.imageReferenceUrl,
        captionDraft: d.captionDraft,
        hashtags: d.hashtags,
        internalNotes: d.internalNotes,
        scheduledDate: d.scheduledDate ? new Date(d.scheduledDate) : undefined,
        status: d.status,
      },
      include: { project: { select: { id: true } } },
    });

    // Recalculate project progress
    await recalcProjectProgress(deliverable.project.id);

    await logAudit(user.id, "UPDATE", "ContentDeliverable", d.id);
    revalidatePath("/projects");
    revalidatePath(`/projects/${deliverable.project.id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update deliverable" };
  }
}

/**
 * Reschedule a specific month's deliverables using the algorithm.
 */
export async function rescheduleMonth(
  projectId: string,
  monthStr: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects", "edit");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { contract: true },
    });

    if (!project?.contract) {
      return { ok: false, error: "Project has no contract" };
    }

    const contract = project.contract;
    const allCounts = [
      { type: "REEL" as const, count: contract.reelsPerMonth },
      { type: "POST" as const, count: contract.postsPerMonth },
      { type: "CAROUSEL" as const, count: contract.carouselsPerMonth },
      { type: "BLOG" as const, count: contract.blogsPerMonth },
    ];
    const counts = allCounts.filter((c) => c.count > 0);

    const newSchedule = scheduleMonth(monthStr, counts);

    // Get existing deliverables for this month
    const existing = await prisma.contentDeliverable.findMany({
      where: { projectId, month: monthStr },
      orderBy: { sortOrder: "asc" },
    });

    // Update dates on existing deliverables
    for (let i = 0; i < existing.length && i < newSchedule.length; i++) {
      await prisma.contentDeliverable.update({
        where: { id: existing[i]!.id },
        data: {
          scheduledDate: newSchedule[i]!.scheduledDate,
          editStartDate: newSchedule[i]!.editStartDate,
          editEndDate: newSchedule[i]!.editEndDate,
          sortOrder: newSchedule[i]!.sortOrder,
        },
      });
    }

    await logAudit(user.id, "UPDATE", "RescheduleMonth", projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reschedule" };
  }
}

/**
 * Assign a festive day to a deliverable
 */
export async function assignFestiveDay(
  festiveDayId: string,
  deliverableId: string | null
): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects", "edit");

    await prisma.festiveDay.update({
      where: { id: festiveDayId },
      data: { assignedDeliverableId: deliverableId }
    });

    revalidatePath("/projects");
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to assign festive day" };
  }
}

/**
 * Delete a contract and all linked deliverables + project.
 */
export async function deleteContract(contractId: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects", "delete");

    // Delete contract (cascades to deliverables)
    await prisma.contentContract.delete({ where: { id: contractId } });

    await logAudit(user.id, "DELETE", "ContentContract", contractId);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete contract" };
  }
}

/**
 * Helper: recalculate project progress based on deliverable statuses.
 */
async function recalcProjectProgress(projectId: string) {
  const deliverables = await prisma.contentDeliverable.findMany({
    where: { projectId },
    select: { status: true },
  });

  if (deliverables.length === 0) return;

  const weights: Record<string, number> = {
    PENDING: 0,
    IDEA_ADDED: 15,
    IN_PRODUCTION: 40,
    IN_REVIEW: 65,
    APPROVED: 85,
    PUBLISHED: 100,
  };

  const total = deliverables.reduce(
    (sum, d) => sum + (weights[d.status] ?? 0),
    0
  );
  // Using the formula from prompt: `(done + in_edit * 0.5) / total * 100` where done = APPROVED/PUBLISHED, in_edit = IN_PRODUCTION/IN_REVIEW. 
  // Let's implement exact formula for overall project progress since we touch it here.
  let done = 0;
  let in_edit = 0;
  
  for(const d of deliverables) {
    if(d.status === "APPROVED" || d.status === "PUBLISHED") done++;
    if(d.status === "IN_PRODUCTION" || d.status === "IN_REVIEW") in_edit++;
  }
  
  const progress = Math.round(((done + in_edit * 0.5) / deliverables.length) * 100);

  await prisma.project.update({
    where: { id: projectId },
    data: { progress },
  });
}
