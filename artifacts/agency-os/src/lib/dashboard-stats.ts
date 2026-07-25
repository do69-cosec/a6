// @ts-nocheck
import { prisma } from "@/lib/db";
import { startOfDay, startOfMonth } from "date-fns";

export async function getDashboardStats() {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(new Date());

  const [
    activeProjects,
    totalClients,
    openLeads,
    pipelineValue,
    tasksDue,
    checkedInToday,
    totalEmployees,
    publishedContent,
  ] = await Promise.all([
    prisma.project.count({
      where: { status: { in: ["IN_PROGRESS", "UNDER_REVIEW"] } },
    }),
    prisma.client.count({ where: { category: { not: "CHURNED" } } }),
    prisma.lead.count({
      where: { stage: { notIn: ["WON", "LOST"] } },
    }),
    prisma.lead.aggregate({
      where: { stage: { notIn: ["WON", "LOST"] } },
      _sum: { value: true },
    }),
    prisma.task.count({
      where: {
        status: { not: "DONE" },
        dueDate: { lte: new Date(Date.now() + 7 * 86400000) },
      },
    }),
    prisma.attendance.count({
      where: { checkInAt: { gte: today }, checkOutAt: null },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.contentPost.count({
      where: { status: "PUBLISHED", publishedAt: { gte: monthStart } },
    }),
  ]);

  const invoices = await prisma.invoice.findMany({
    select: { total: true, status: true },
  });
  const revenuePaid = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + i.total, 0);
  const outstanding = invoices
    .filter((i) => ["SENT", "VIEWED", "OVERDUE"].includes(i.status))
    .reduce((s, i) => s + i.total, 0);

  return {
    activeProjects,
    totalClients,
    openLeads,
    pipelineValue: pipelineValue._sum.value ?? 0,
    tasksDue,
    checkedInToday,
    totalEmployees,
    publishedContent,
    revenuePaid,
    outstanding,
  };
}
