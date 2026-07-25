import { Router } from "express";
import { db } from "@workspace/db";
import {
  clientsTable, projectsTable, leadsTable, tasksTable, invoicesTable,
  quotationsTable, purchaseOrdersTable, leaveRequestsTable, usersTable,
} from "@workspace/db/schema";
import { eq, gte, sql, and, lte } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { requirePermission, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/stats", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db
    .select({
      name: usersTable.name,
      systemRole: usersTable.systemRole,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const now = new Date();

  if (user?.systemRole !== "SUPER_ADMIN") {
    // 1. Employee Work Summary
    const employeeTasks = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        projectId: tasksTable.projectId,
        approvalStatus: tasksTable.approvalStatus,
        requestedBy: tasksTable.requestedBy,
        rejectionReason: tasksTable.rejectionReason,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
        approvedAt: tasksTable.approvedAt,
      })
      .from(tasksTable)
      .where(eq(tasksTable.assigneeId, userId));

    const employeeTaskRequests = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        projectId: tasksTable.projectId,
        approvalStatus: tasksTable.approvalStatus,
        requestedBy: tasksTable.requestedBy,
        rejectionReason: tasksTable.rejectionReason,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
        requestedAt: tasksTable.requestedAt,
        approvedAt: tasksTable.approvedAt,
      })
      .from(tasksTable)
      .where(eq(tasksTable.requestedBy, userId));

    const allProjects = await db
      .select({
        id: projectsTable.id,
        name: projectsTable.name,
        status: projectsTable.status,
        priority: projectsTable.priority,
        dueDate: projectsTable.dueDate,
        createdBy: projectsTable.createdBy,
        assignedTo: projectsTable.assignedTo,
        assignmentStatus: projectsTable.assignmentStatus,
        assignmentDescription: projectsTable.assignmentDescription,
        rejectionReason: projectsTable.rejectionReason,
        assignmentActionAt: projectsTable.assignmentActionAt,
        createdAt: projectsTable.createdAt,
      })
      .from(projectsTable);

    const assignedProjectIds = Array.from(new Set(employeeTasks.map((t) => t.projectId).filter(Boolean))) as string[];
    const myProjects = allProjects.filter((p) => p.createdBy === userId || p.assignedTo === userId || assignedProjectIds.includes(p.id));

    const allProjectTasks = await db
      .select({
        id: tasksTable.id,
        status: tasksTable.status,
        projectId: tasksTable.projectId,
      })
      .from(tasksTable)
      .where(sql`${tasksTable.projectId} is not null`);

    const myProjectsWithCompletion = myProjects.map((p) => {
      const projectTasks = allProjectTasks.filter((t) => t.projectId === p.id);
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter((t) => t.status === "COMPLETED").length;
      const completion = p.status === "COMPLETED" ? 100 : totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        dueDate: p.dueDate ? p.dueDate.toISOString() : null,
        assignedTo: p.assignedTo,
        assignmentStatus: p.assignmentStatus,
        assignmentDescription: p.assignmentDescription,
        rejectionReason: p.rejectionReason,
        assignmentActionAt: p.assignmentActionAt ? p.assignmentActionAt.toISOString() : null,
        completion,
      };
    });

    const totalAssignedTasks = employeeTasks.length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tasksDueTodayCount = employeeTasks.filter((t) => {
      if (t.status === "COMPLETED" || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= todayStart && d <= todayEnd;
    }).length;

    const overdueTasksCount = employeeTasks.filter((t) => {
      if (t.status === "COMPLETED" || !t.dueDate) return false;
      return new Date(t.dueDate) < now;
    }).length;

    const projectsAssignedToMeCount = myProjects.length;

    const pendingTaskRequestsCount = employeeTaskRequests.filter(
      (t) => t.approvalStatus === "PENDING"
    ).length;

    const approvedRequestsCount = employeeTaskRequests.filter(
      (t) => t.approvalStatus === "APPROVED"
    ).length;

    const rejectedRequestsCount = employeeTaskRequests.filter(
      (t) => t.approvalStatus === "REJECTED"
    ).length;

    // Upcoming Deadlines
    const upcomingDeadlines: any[] = [];
    for (const t of employeeTasks) {
      if (t.dueDate && t.status !== "COMPLETED") {
        upcomingDeadlines.push({
          id: `task-${t.id}`,
          type: "task",
          title: t.title,
          date: t.dueDate.toISOString(),
          status: t.status,
          overdue: new Date(t.dueDate) < now,
          extraInfo: `Priority: ${t.priority}`,
        });
      }
    }

    for (const p of myProjectsWithCompletion) {
      if (p.dueDate && p.status !== "COMPLETED") {
        upcomingDeadlines.push({
          id: `project-${p.id}`,
          type: "project",
          title: p.name,
          date: p.dueDate,
          status: p.status,
          overdue: new Date(p.dueDate) < now,
          extraInfo: `Status: ${p.status}`,
        });
      }
    }

    const myLeaves = await db
      .select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.userId, userId));

    for (const lv of myLeaves) {
      if (lv.startDate) {
        const start = new Date(lv.startDate);
        upcomingDeadlines.push({
          id: `leave-${lv.id}`,
          type: "leave",
          title: `Personal Leave Request`,
          date: start.toISOString(),
          status: lv.status,
          overdue: start < now && lv.status === "PENDING",
          extraInfo: `${lv.type} (${lv.status})`,
        });
      }
    }

    upcomingDeadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // My Tasks
    const myTasksList = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        projectId: tasksTable.projectId,
        projectName: projectsTable.name,
      })
      .from(tasksTable)
      .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .where(and(eq(tasksTable.assigneeId, userId), eq(tasksTable.approvalStatus, "APPROVED")));

    // My Task Requests (Section 6)
    const myTaskRequestsList = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        approvalStatus: tasksTable.approvalStatus,
        rejectionReason: tasksTable.rejectionReason,
        createdAt: tasksTable.createdAt,
        projectName: projectsTable.name,
      })
      .from(tasksTable)
      .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .where(and(eq(tasksTable.requestedBy, userId), sql`${tasksTable.approvalStatus} is not null`));

    // Recent Activity (Section 7)
    const activities: any[] = [];
    for (const t of employeeTasks) {
      const tCreatedAt = t.createdAt ? new Date(t.createdAt) : new Date();
      const tUpdatedAt = t.updatedAt ? new Date(t.updatedAt) : new Date();

      if (t.approvalStatus === "APPROVED") {
        const approvedDate = t.approvedAt ? new Date(t.approvedAt) : tCreatedAt;
        activities.push({
          id: `task-assigned-${t.id}`,
          type: "task",
          message: `Task assigned: "${t.title}"`,
          createdAt: approvedDate.toISOString(),
        });

        if (t.status === "IN_PROGRESS" || t.status === "COMPLETED") {
          activities.push({
            id: `task-status-${t.id}`,
            type: "task",
            message: `Task status updated to ${t.status.replace("_", " ")}: "${t.title}"`,
            createdAt: tUpdatedAt.toISOString(),
          });
        }
      }
    }

    for (const tr of employeeTaskRequests) {
      const trCreatedAt = tr.requestedAt ? new Date(tr.requestedAt) : (tr.createdAt ? new Date(tr.createdAt) : new Date());
      const trUpdatedAt = tr.updatedAt ? new Date(tr.updatedAt) : new Date();

      activities.push({
        id: `task-req-submitted-${tr.id}`,
        type: "task",
        message: `Submitted task request: "${tr.title}"`,
        createdAt: trCreatedAt.toISOString(),
      });

      if (tr.approvalStatus === "APPROVED") {
        const approvedDate = tr.approvedAt ? new Date(tr.approvedAt) : trUpdatedAt;
        activities.push({
          id: `task-req-approved-${tr.id}`,
          type: "task",
          message: `Task request approved: "${tr.title}"`,
          createdAt: approvedDate.toISOString(),
        });
      } else if (tr.approvalStatus === "REJECTED") {
        activities.push({
          id: `task-req-rejected-${tr.id}`,
          type: "task",
          message: `Task request rejected: "${tr.title}"`,
          createdAt: trUpdatedAt.toISOString(),
        });
      }
    }

    for (const lv of myLeaves) {
      const lvCreatedAt = lv.createdAt ? new Date(lv.createdAt) : new Date();
      activities.push({
        id: `leave-submitted-${lv.id}`,
        type: "leave",
        message: `Leave request submitted: ${lv.type} (${lv.startDate} to ${lv.endDate})`,
        createdAt: lvCreatedAt.toISOString(),
      });
    }

    for (const p of myProjects) {
      const pCreatedAt = p.createdAt ? new Date(p.createdAt) : new Date();
      activities.push({
        id: `project-assigned-${p.id}`,
        type: "project",
        message: `Project assigned: "${p.name}"`,
        createdAt: pCreatedAt.toISOString(),
      });
    }

    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const assignedClients = await db
      .select({
        id: clientsTable.id,
        companyName: clientsTable.companyName,
      })
      .from(clientsTable);

    const myClientIds = Array.from(new Set(myProjects.map((p) => p.clientId).filter(Boolean)));
    const myClients = assignedClients.filter((c) => myClientIds.includes(c.id));

    return res.json({
      isEmployee: true,
      employeeName: user.name,
      myWorkSummary: {
        assignedTasks: totalAssignedTasks,
        tasksDueToday: tasksDueTodayCount,
        overdueTasks: overdueTasksCount,
        projectsAssignedToMe: projectsAssignedToMeCount,
        pendingTaskRequests: pendingTaskRequestsCount,
        approvedRequests: approvedRequestsCount,
        rejectedRequests: rejectedRequestsCount,
      },
      myProjects: myProjectsWithCompletion,
      myTasks: myTasksList.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        priority: t.priority,
        projectName: t.projectName,
      })),
      upcomingDeadlines: upcomingDeadlines.slice(0, 10),
      myTaskRequests: myTaskRequestsList.map((t) => ({
        id: t.id,
        title: t.title,
        approvalStatus: t.approvalStatus,
        rejectionReason: t.rejectionReason,
        createdAt: t.createdAt ? t.createdAt.toISOString() : null,
        projectName: t.projectName,
      })),
      recentActivity: activities.slice(0, 10),
      clientInfo: {
        count: myClients.length,
        names: myClients.map((c) => c.companyName),
      },
    });
  }

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthStart = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

  const monthStartTimestamp = new Date(year, now.getMonth(), 1, 0, 0, 0, 0);
  const monthEndTimestamp = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

  const prevMonthStart = new Date(year, now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const prevMonthEnd = new Date(year, now.getMonth(), 0).toISOString().slice(0, 10);

  const [
    [{ monthlyRevenue }],
    [{ totalCollected }],
    [{ outstanding }],
    [{ quotationValue }],
    poStatusCounts,
    [{ totalClients }],
    [{ activeClients }],
    [{ newClientsThisMonth }],
    [{ totalProjects }],
    [{ runningProjects }],
    [{ completedProjects }],
    [{ startedProjectsThisMonth }],
    [{ overdueProjects }],
    [{ totalTasks }],
    [{ pendingTasks }],
    [{ inProgressTasks }],
    [{ completedTasks }],
    [{ overdueTasks }],
    [{ tasksDueToday }],
    invoiceStatusCounts,
    quotationStatusCounts,
    leadPipelineStages,
    [{ projectsCompletedThisMonth }],
    [{ invoicesGeneratedThisMonth }],
    [{ quotationsGeneratedThisMonth }],
    [{ purchaseOrdersCreatedThisMonth }],
    [{ tasksCompletedThisMonth }],
    upcomingProjects,
    upcomingInvoices,
    upcomingTasks,
    upcomingLeaves,
    [{ prevMonthRevenue }],
    projectHealthProjects,
    projectHealthTasks
  ] = await Promise.all([
    // 1. Revenue Collected MTD
    db.select({ monthlyRevenue: sql<number>`coalesce(sum(${invoicesTable.total}),0)::float` }).from(invoicesTable).where(and(eq(invoicesTable.status, "PAID"), gte(invoicesTable.invoiceDate, monthStart), lte(invoicesTable.invoiceDate, monthEnd))),
    // 2. Revenue Collected Total
    db.select({ totalCollected: sql<number>`coalesce(sum(${invoicesTable.total}),0)::float` }).from(invoicesTable).where(eq(invoicesTable.status, "PAID")),
    // 3. Outstanding Revenue
    db.select({ outstanding: sql<number>`coalesce(sum(${invoicesTable.total}),0)::float` }).from(invoicesTable).where(sql`${invoicesTable.status} in ('SENT','UNPAID','OVERDUE')`),
    // 4. Quotation Value
    db.select({ quotationValue: sql<number>`coalesce(sum(${quotationsTable.total}),0)::float` }).from(quotationsTable),
    // 5. Purchase Order status counts
    db.select({ status: purchaseOrdersTable.status, count: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${purchaseOrdersTable.total}),0)::float` }).from(purchaseOrdersTable).groupBy(purchaseOrdersTable.status),
    
    // 6. Clients: Total
    db.select({ totalClients: sql<number>`count(*)::int` }).from(clientsTable),
    // Clients: Active (distinct clients with projects not completed or cancelled)
    db.select({ activeClients: sql<number>`count(distinct ${projectsTable.clientId})::int` }).from(projectsTable).where(sql`${projectsTable.status} not in ('COMPLETED', 'CANCELLED')`),
    // Clients: New this month
    db.select({ newClientsThisMonth: sql<number>`count(*)::int` }).from(clientsTable).where(gte(clientsTable.createdAt, monthStartTimestamp)),
    
    // 7. Projects: Total
    db.select({ totalProjects: sql<number>`count(*)::int` }).from(projectsTable),
    // Projects: Running
    db.select({ runningProjects: sql<number>`count(*)::int` }).from(projectsTable).where(sql`${projectsTable.status} not in ('COMPLETED', 'CANCELLED')`),
    // Projects: Completed
    db.select({ completedProjects: sql<number>`count(*)::int` }).from(projectsTable).where(eq(projectsTable.status, "COMPLETED")),
    // Projects: Started this month
    db.select({ startedProjectsThisMonth: sql<number>`count(*)::int` }).from(projectsTable).where(gte(projectsTable.createdAt, monthStartTimestamp)),
    // Projects: Overdue (not completed, has past due date)
    db.select({ overdueProjects: sql<number>`count(*)::int` }).from(projectsTable).where(and(sql`${projectsTable.status} not in ('COMPLETED', 'CANCELLED')`, lte(projectsTable.dueDate, now))),

    // 8. Tasks: Total
    db.select({ totalTasks: sql<number>`count(*)::int` }).from(tasksTable),
    // Tasks: Pending (TODO)
    db.select({ pendingTasks: sql<number>`count(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "TODO")),
    // Tasks: In Progress
    db.select({ inProgressTasks: sql<number>`count(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "IN_PROGRESS")),
    // Tasks: Completed
    db.select({ completedTasks: sql<number>`count(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "COMPLETED")),
    // Tasks: Overdue
    db.select({ overdueTasks: sql<number>`count(*)::int` }).from(tasksTable).where(and(sql`${tasksTable.status} != 'COMPLETED'`, lte(tasksTable.dueDate, now))),
    // Tasks: Due Today
    db.select({ tasksDueToday: sql<number>`count(*)::int` }).from(tasksTable).where(and(
      sql`${tasksTable.status} != 'COMPLETED'`,
      gte(tasksTable.dueDate, new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)),
      lte(tasksTable.dueDate, new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999))
    )),

    // 9. Invoice status counts
    db.select({ status: invoicesTable.status, count: sql<number>`count(*)::int` }).from(invoicesTable).groupBy(invoicesTable.status),
    // 10. Quotation status counts
    db.select({ status: quotationsTable.status, count: sql<number>`count(*)::int` }).from(quotationsTable).groupBy(quotationsTable.status),
    // 11. Lead Pipeline stages
    db.select({ stage: leadsTable.stage, count: sql<number>`count(*)::int`, value: sql<number>`coalesce(sum(${leadsTable.value}),0)::float` }).from(leadsTable).groupBy(leadsTable.stage),

    // 12. This Month Completed Projects
    db.select({ projectsCompletedThisMonth: sql<number>`count(*)::int` }).from(projectsTable).where(and(eq(projectsTable.status, "COMPLETED"), gte(projectsTable.updatedAt, monthStartTimestamp))),
    // This Month Invoices Generated
    db.select({ invoicesGeneratedThisMonth: sql<number>`count(*)::int` }).from(invoicesTable).where(and(gte(invoicesTable.invoiceDate, monthStart), lte(invoicesTable.invoiceDate, monthEnd))),
    // This Month Quotations Generated
    db.select({ quotationsGeneratedThisMonth: sql<number>`count(*)::int` }).from(quotationsTable).where(and(gte(quotationsTable.quotationDate, monthStart), lte(quotationsTable.quotationDate, monthEnd))),
    // This Month Purchase Orders Created
    db.select({ purchaseOrdersCreatedThisMonth: sql<number>`count(*)::int` }).from(purchaseOrdersTable).where(and(gte(purchaseOrdersTable.orderDate, monthStart), lte(purchaseOrdersTable.orderDate, monthEnd))),
    // This Month Tasks Completed
    db.select({ tasksCompletedThisMonth: sql<number>`count(*)::int` }).from(tasksTable).where(and(eq(tasksTable.status, "COMPLETED"), gte(tasksTable.updatedAt, monthStartTimestamp))),

    // Upcoming limits
    db.select({ id: projectsTable.id, name: projectsTable.name, status: projectsTable.status, dueDate: projectsTable.dueDate }).from(projectsTable).where(and(sql`${projectsTable.status} not in ('COMPLETED', 'CANCELLED')`, sql`${projectsTable.dueDate} is not null`)).orderBy(projectsTable.dueDate).limit(5),
    db.select({ id: invoicesTable.id, number: invoicesTable.number, status: invoicesTable.status, dueDate: invoicesTable.dueDate, total: invoicesTable.total }).from(invoicesTable).where(and(sql`${invoicesTable.status} in ('SENT', 'UNPAID', 'OVERDUE')`, sql`${invoicesTable.dueDate} is not null`)).orderBy(invoicesTable.dueDate).limit(5),
    db.select({ id: tasksTable.id, title: tasksTable.title, status: tasksTable.status, dueDate: tasksTable.dueDate }).from(tasksTable).where(and(sql`${tasksTable.status} != 'COMPLETED'`, sql`${tasksTable.dueDate} is not null`)).orderBy(tasksTable.dueDate).limit(5),
    db.select({ id: leaveRequestsTable.id, type: leaveRequestsTable.type, startDate: leaveRequestsTable.startDate, endDate: leaveRequestsTable.endDate, status: leaveRequestsTable.status, userName: usersTable.name })
      .from(leaveRequestsTable).leftJoin(usersTable, eq(leaveRequestsTable.userId, usersTable.id)).where(and(sql`${leaveRequestsTable.status} in ('PENDING', 'APPROVED')`, sql`${leaveRequestsTable.startDate} is not null`)).orderBy(leaveRequestsTable.startDate).limit(5),
    
    // Last month revenue for comparison
    db.select({ prevMonthRevenue: sql<number>`coalesce(sum(${invoicesTable.total}),0)::float` }).from(invoicesTable).where(and(eq(invoicesTable.status, "PAID"), gte(invoicesTable.invoiceDate, prevMonthStart), lte(invoicesTable.invoiceDate, prevMonthEnd))),
    // Project Health: Projects
    db.select({ id: projectsTable.id, status: projectsTable.status, dueDate: projectsTable.dueDate }).from(projectsTable),
    // Project Health: Tasks
    db.select({ projectId: tasksTable.projectId, status: tasksTable.status }).from(tasksTable),
  ]);

  // Map PO status counts to the requested metrics (Pending, Approved, Completed)
  let poTotal = 0;
  let poPending = 0; // DRAFT, SENT, PENDING
  let poApproved = 0; // APPROVED, ORDERED
  let poCompleted = 0; // RECEIVED, COMPLETED, DELIVERED

  for (const item of poStatusCounts) {
    const status = item.status ?? "";
    const count = item.count;
    poTotal += count;
    if (["DRAFT", "SENT", "PENDING"].includes(status)) {
      poPending += count;
    } else if (["APPROVED", "ORDERED"].includes(status)) {
      poApproved += count;
    } else if (["RECEIVED", "COMPLETED", "DELIVERED"].includes(status)) {
      poCompleted += count;
    }
  }

  const invoicesAnalytics = {
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
  };
  for (const item of invoiceStatusCounts) {
    const status = (item.status ?? "").toLowerCase();
    if (status === "draft") invoicesAnalytics.draft += item.count;
    else if (status === "sent") invoicesAnalytics.sent += item.count;
    else if (status === "paid") invoicesAnalytics.paid += item.count;
    else if (status === "overdue") invoicesAnalytics.overdue += item.count;
    else if (status === "cancelled") invoicesAnalytics.cancelled += item.count;
  }

  const quotationsAnalytics = {
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
  };
  for (const item of quotationStatusCounts) {
    const status = (item.status ?? "").toLowerCase();
    if (status === "draft") quotationsAnalytics.draft += item.count;
    else if (status === "sent") quotationsAnalytics.sent += item.count;
    else if (status === "accepted" || status === "won") quotationsAnalytics.accepted += item.count;
    else if (status === "rejected" || status === "lost") quotationsAnalytics.rejected += item.count;
    else if (status === "expired") quotationsAnalytics.expired += item.count;
  }

  const purchaseOrderAnalytics = {
    pending: 0,
    approved: 0,
    ordered: 0,
    completed: 0,
  };
  for (const item of poStatusCounts) {
    const status = (item.status ?? "").toLowerCase();
    if (status === "draft" || status === "pending") purchaseOrderAnalytics.pending += item.count;
    else if (status === "approved") purchaseOrderAnalytics.approved += item.count;
    else if (status === "sent" || status === "ordered") purchaseOrderAnalytics.ordered += item.count;
    else if (status === "delivered" || status === "completed" || status === "received") purchaseOrderAnalytics.completed += item.count;
  }

  const pipelineStages = [
    { stage: "LEAD", label: "New", count: 0, value: 0 },
    { stage: "CONTACTED", label: "Contacted", count: 0, value: 0 },
    { stage: "DEMO_GIVEN", label: "Qualified", count: 0, value: 0 },
    { stage: "PROPOSAL_SENT", label: "Proposal", count: 0, value: 0 },
    { stage: "NEGOTIATION", label: "Negotiation", count: 0, value: 0 },
    { stage: "WON", label: "Won", count: 0, value: 0 },
    { stage: "LOST", label: "Lost", count: 0, value: 0 },
  ];
  let totalPipelineValue = 0;
  for (const item of leadPipelineStages) {
    const st = item.stage ?? "LEAD";
    const mapped = pipelineStages.find((p) => p.stage === st);
    if (mapped) {
      mapped.count = item.count;
      mapped.value = item.value;
    }
    if (!["WON", "LOST"].includes(st)) {
      totalPipelineValue += item.value;
    }
  }

  const upcomingDeadlines: any[] = [];

  // 1. Projects
  for (const p of upcomingProjects) {
    if (p.dueDate) {
      upcomingDeadlines.push({
        id: `project-${p.id}`,
        type: "project",
        title: p.name,
        date: p.dueDate.toISOString(),
        status: p.status,
        overdue: new Date(p.dueDate) < now,
        extraInfo: p.status,
      });
    }
  }

  // 2. Invoices
  for (const inv of upcomingInvoices) {
    if (inv.dueDate) {
      const due = new Date(inv.dueDate);
      upcomingDeadlines.push({
        id: `invoice-${inv.id}`,
        type: "invoice",
        title: `Invoice #${inv.number ?? "Unknown"}`,
        date: inv.dueDate,
        status: inv.status,
        overdue: due < now,
        extraInfo: `₹${(inv.total ?? 0).toLocaleString("en-IN")}`,
      });
    }
  }

  // 3. Tasks
  for (const t of upcomingTasks) {
    if (t.dueDate) {
      upcomingDeadlines.push({
        id: `task-${t.id}`,
        type: "task",
        title: t.title,
        date: t.dueDate.toISOString(),
        status: t.status,
        overdue: new Date(t.dueDate) < now,
        extraInfo: t.status,
      });
    }
  }

  // 4. Leaves
  for (const lv of upcomingLeaves) {
    if (lv.startDate) {
      const start = new Date(lv.startDate);
      upcomingDeadlines.push({
        id: `leave-${lv.id}`,
        type: "leave",
        title: `${lv.userName ?? "Employee"} Leave`,
        date: lv.startDate,
        status: lv.status,
        overdue: start < now && lv.status === "PENDING",
        extraInfo: `${lv.type} (${lv.status})`,
      });
    }
  }

  upcomingDeadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate project health
  const projectTasksMap: Record<string, { total: number; incomplete: number }> = {};
  for (const t of projectHealthTasks) {
    if (t.projectId) {
      if (!projectTasksMap[t.projectId]) {
        projectTasksMap[t.projectId] = { total: 0, incomplete: 0 };
      }
      projectTasksMap[t.projectId].total++;
      if (t.status !== "COMPLETED") {
        projectTasksMap[t.projectId].incomplete++;
      }
    }
  }

  let projectHealthOnTrack = 0;
  let projectHealthAtRisk = 0;
  let projectHealthDelayed = 0;
  let projectHealthCompleted = 0;

  for (const p of projectHealthProjects) {
    const status = p.status ?? "";
    if (status === "COMPLETED") {
      projectHealthCompleted++;
      continue;
    }
    if (status === "CANCELLED" || status === "ON_HOLD") {
      projectHealthDelayed++;
      continue;
    }

    const dueDate = p.dueDate ? new Date(p.dueDate) : null;
    const taskInfo = projectTasksMap[p.id] || { total: 0, incomplete: 0 };
    const hasIncompleteTasks = taskInfo.incomplete > 0;

    if (dueDate) {
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        projectHealthAtRisk++;
      } else if (diffDays <= 7 && hasIncompleteTasks) {
        projectHealthAtRisk++;
      } else {
        projectHealthOnTrack++;
      }
    } else {
      projectHealthOnTrack++;
    }
  }

  const unpaidCount = invoicesAnalytics.sent + invoicesAnalytics.overdue;
  const pendingQuotationsCount = quotationsAnalytics.draft + quotationsAnalytics.sent;

  const quickInsights: string[] = [];

  if (unpaidCount > 0) {
    quickInsights.push(`You have ${unpaidCount} unpaid invoice${unpaidCount > 1 ? "s" : ""}.`);
  }

  if (pendingQuotationsCount > 0) {
    quickInsights.push(`${pendingQuotationsCount} quotation${pendingQuotationsCount > 1 ? "s are" : " is"} waiting for approval or draft.`);
  }

  if (overdueProjects > 0) {
    quickInsights.push(`${overdueProjects} project${overdueProjects > 1 ? "s are" : " is"} overdue.`);
  }

  if (overdueTasks > 0) {
    quickInsights.push(`${overdueTasks} task${overdueTasks > 1 ? "s are" : " is"} overdue.`);
  } else {
    quickInsights.push("No tasks are overdue.");
  }

  if (monthlyRevenue > prevMonthRevenue) {
    if (prevMonthRevenue > 0) {
      const pct = Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);
      quickInsights.push(`Revenue increased by ${pct}% compared to last month!`);
    } else if (monthlyRevenue > 0) {
      quickInsights.push("Revenue increased compared to last month!");
    }
  } else if (monthlyRevenue < prevMonthRevenue && monthlyRevenue > 0) {
    quickInsights.push("Revenue is currently tracking lower than last month's performance.");
  }

  return res.json({
    revenueCollected: {
      currentMonth: monthlyRevenue,
      totalCollected: totalCollected,
    },
    outstandingRevenue: outstanding,
    quotationValue: quotationValue,
    purchaseOrders: {
      total: poTotal,
      pending: poPending,
      approved: poApproved,
      completed: poCompleted,
    },
    projectHealth: {
      onTrack: projectHealthOnTrack,
      atRisk: projectHealthAtRisk,
      delayed: projectHealthDelayed,
      completed: projectHealthCompleted,
      total: projectHealthProjects.length,
    },
    businessSummary: {
      clients: {
        total: totalClients,
        active: activeClients,
        newThisMonth: newClientsThisMonth,
      },
      projects: {
        total: totalProjects,
        running: runningProjects,
        completed: completedProjects,
        startedThisMonth: startedProjectsThisMonth,
        overdue: overdueProjects,
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        dueToday: tasksDueToday,
      }
    },
    invoiceAnalytics: invoicesAnalytics,
    quotationAnalytics: quotationsAnalytics,
    purchaseOrderAnalytics: purchaseOrderAnalytics,
    leadPipeline: {
      stages: pipelineStages,
      totalValue: totalPipelineValue,
    },
    thisMonthOverview: {
      projectsCreated: startedProjectsThisMonth,
      projectsCompleted: projectsCompletedThisMonth,
      clientsAdded: newClientsThisMonth,
      invoicesGenerated: invoicesGeneratedThisMonth,
      quotationsGenerated: quotationsGeneratedThisMonth,
      purchaseOrdersCreated: purchaseOrdersCreatedThisMonth,
      tasksCompleted: tasksCompletedThisMonth,
      revenueCollected: monthlyRevenue,
    },
    upcomingDeadlines: upcomingDeadlines.slice(0, 10),
    quickInsights,
  });
}));

router.get("/revenue-chart", requirePermission("reports.view"), asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db
    .select({ systemRole: usersTable.systemRole })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (user?.systemRole !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Forbidden: Employees cannot access financial charts." });
  }

  const now = new Date();
  const range = (req.query.range as string) ?? "6m";

  let monthCount = 6;
  let startDate: Date;

  if (range === "3m") {
    monthCount = 3;
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  } else if (range === "12m") {
    monthCount = 12;
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  } else if (range === "ytd") {
    startDate = new Date(now.getFullYear(), 0, 1);
    monthCount = now.getMonth() + 1;
  } else {
    monthCount = 6;
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  }

  const months: Record<string, number> = {};
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[d.toLocaleString("default", { month: "short", year: "2-digit" })] = 0;
  }

  const startStr = startDate.toISOString().slice(0, 10);

  const invoices = await db
    .select({ invoiceDate: invoicesTable.invoiceDate, total: invoicesTable.total })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.status, "PAID"), gte(invoicesTable.invoiceDate, startStr)));

  for (const inv of invoices) {
    if (inv.invoiceDate) {
      const key = new Date(inv.invoiceDate).toLocaleString("default", { month: "short", year: "2-digit" });
      if (key in months) months[key] += inv.total ?? 0;
    }
  }
  return res.json(Object.entries(months).map(([month, amount]) => ({ month, amount })));
}));

router.get("/project-health", asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db
    .select({ systemRole: usersTable.systemRole })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (user?.systemRole !== "SUPER_ADMIN") {
    const employeeTasks = await db
      .select({ projectId: tasksTable.projectId })
      .from(tasksTable)
      .where(eq(tasksTable.assigneeId, userId));

    const assignedProjectIds = Array.from(new Set(employeeTasks.map((t) => t.projectId).filter(Boolean))) as string[];

    const projects = await db
      .select({
        id: projectsTable.id,
        status: projectsTable.status,
        dueDate: projectsTable.dueDate,
        createdBy: projectsTable.createdBy,
      })
      .from(projectsTable);

    const myProjects = projects.filter((p) => p.createdBy === userId || assignedProjectIds.includes(p.id));
    const myProjectIds = myProjects.map((p) => p.id);

    const tasks = await db
      .select({
        projectId: tasksTable.projectId,
        status: tasksTable.status,
      })
      .from(tasksTable)
      .where(sql`${tasksTable.projectId} is not null`);

    const myTasks = tasks.filter((t) => t.projectId && myProjectIds.includes(t.projectId));

    const projectTasksMap: Record<string, { total: number; incomplete: number }> = {};
    for (const t of myTasks) {
      if (t.projectId) {
        if (!projectTasksMap[t.projectId]) {
          projectTasksMap[t.projectId] = { total: 0, incomplete: 0 };
        }
        projectTasksMap[t.projectId].total++;
        if (t.status !== "COMPLETED") {
          projectTasksMap[t.projectId].incomplete++;
        }
      }
    }

    let onTrack = 0;
    let atRisk = 0;
    let delayed = 0;
    let completed = 0;

    const now = new Date();

    for (const p of myProjects) {
      const status = p.status ?? "";
      if (status === "COMPLETED") {
        completed++;
        continue;
      }
      if (status === "CANCELLED" || status === "ON_HOLD") {
        delayed++;
        continue;
      }

      const dueDate = p.dueDate ? new Date(p.dueDate) : null;
      const taskInfo = projectTasksMap[p.id] || { total: 0, incomplete: 0 };
      const hasIncompleteTasks = taskInfo.incomplete > 0;

      if (dueDate) {
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          atRisk++;
        } else if (diffDays <= 7 && hasIncompleteTasks) {
          atRisk++;
        } else {
          onTrack++;
        }
      } else {
        onTrack++;
      }
    }

    return res.json({ onTrack, atRisk, delayed, completed, total: myProjects.length });
  }

  const [projects, tasks] = await Promise.all([
    db
      .select({
        id: projectsTable.id,
        status: projectsTable.status,
        dueDate: projectsTable.dueDate,
      })
      .from(projectsTable),
    db
      .select({
        projectId: tasksTable.projectId,
        status: tasksTable.status,
      })
      .from(tasksTable),
  ]);

  // Group tasks by project
  const projectTasksMap: Record<string, { total: number; incomplete: number }> = {};
  for (const t of tasks) {
    if (t.projectId) {
      if (!projectTasksMap[t.projectId]) {
        projectTasksMap[t.projectId] = { total: 0, incomplete: 0 };
      }
      projectTasksMap[t.projectId].total++;
      if (t.status !== "COMPLETED") {
        projectTasksMap[t.projectId].incomplete++;
      }
    }
  }

  let onTrack = 0;
  let atRisk = 0;
  let delayed = 0;
  let completed = 0;

  const now = new Date();

  for (const p of projects) {
    const status = p.status ?? "";
    if (status === "COMPLETED") {
      completed++;
      continue;
    }
    if (status === "CANCELLED" || status === "ON_HOLD") {
      delayed++;
      continue;
    }

    // Check if overdue or nearing deadline (e.g. next 7 days) with incomplete tasks
    const dueDate = p.dueDate ? new Date(p.dueDate) : null;
    const taskInfo = projectTasksMap[p.id] || { total: 0, incomplete: 0 };
    const hasIncompleteTasks = taskInfo.incomplete > 0;

    if (dueDate) {
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        // Overdue
        atRisk++;
      } else if (diffDays <= 7 && hasIncompleteTasks) {
        // Nearing deadline with incomplete tasks
        atRisk++;
      } else {
        onTrack++;
      }
    } else {
      onTrack++;
    }
  }

  return res.json({ onTrack, atRisk, delayed, completed, total: projects.length });
}));

router.get("/recent-activity", asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db
    .select({ systemRole: usersTable.systemRole })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (user?.systemRole !== "SUPER_ADMIN") {
    // Return employee's own activities!
    const employeeTasks = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        projectId: tasksTable.projectId,
        approvalStatus: tasksTable.approvalStatus,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
        approvedAt: tasksTable.approvedAt,
      })
      .from(tasksTable)
      .where(eq(tasksTable.assigneeId, userId));

    const employeeTaskRequests = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        approvalStatus: tasksTable.approvalStatus,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
        requestedAt: tasksTable.requestedAt,
        approvedAt: tasksTable.approvedAt,
      })
      .from(tasksTable)
      .where(eq(tasksTable.requestedBy, userId));

    const myLeaves = await db
      .select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.userId, userId));

    const allProjects = await db
      .select({
        id: projectsTable.id,
        name: projectsTable.name,
        createdBy: projectsTable.createdBy,
        createdAt: projectsTable.createdAt,
      })
      .from(projectsTable);

    const assignedProjectIds = Array.from(new Set(employeeTasks.map((t) => t.projectId).filter(Boolean))) as string[];
    const myProjects = allProjects.filter((p) => p.createdBy === userId || assignedProjectIds.includes(p.id));

    const activities: any[] = [];
    for (const t of employeeTasks) {
      const tCreatedAt = t.createdAt ? new Date(t.createdAt) : new Date();
      const tUpdatedAt = t.updatedAt ? new Date(t.updatedAt) : new Date();

      if (t.approvalStatus === "APPROVED") {
        const approvedDate = t.approvedAt ? new Date(t.approvedAt) : tCreatedAt;
        activities.push({
          id: `task-assigned-${t.id}`,
          type: "task",
          message: `Task assigned: "${t.title}"`,
          createdAt: approvedDate.toISOString(),
        });

        if (t.status === "IN_PROGRESS" || t.status === "COMPLETED") {
          activities.push({
            id: `task-status-${t.id}`,
            type: "task",
            message: `Task status updated to ${t.status.replace("_", " ")}: "${t.title}"`,
            createdAt: tUpdatedAt.toISOString(),
          });
        }
      }
    }

    for (const tr of employeeTaskRequests) {
      const trCreatedAt = tr.requestedAt ? new Date(tr.requestedAt) : (tr.createdAt ? new Date(tr.createdAt) : new Date());
      const trUpdatedAt = tr.updatedAt ? new Date(tr.updatedAt) : new Date();

      activities.push({
        id: `task-req-submitted-${tr.id}`,
        type: "task",
        message: `Submitted task request: "${tr.title}"`,
        createdAt: trCreatedAt.toISOString(),
      });

      if (tr.approvalStatus === "APPROVED") {
        const approvedDate = tr.approvedAt ? new Date(tr.approvedAt) : trUpdatedAt;
        activities.push({
          id: `task-req-approved-${tr.id}`,
          type: "task",
          message: `Task request approved: "${tr.title}"`,
          createdAt: approvedDate.toISOString(),
        });
      } else if (tr.approvalStatus === "REJECTED") {
        activities.push({
          id: `task-req-rejected-${tr.id}`,
          type: "task",
          message: `Task request rejected: "${tr.title}"`,
          createdAt: trUpdatedAt.toISOString(),
        });
      }
    }

    for (const lv of myLeaves) {
      const lvCreatedAt = lv.createdAt ? new Date(lv.createdAt) : new Date();
      activities.push({
        id: `leave-submitted-${lv.id}`,
        type: "leave",
        message: `Leave request submitted: ${lv.type} (${lv.startDate} to ${lv.endDate})`,
        createdAt: lvCreatedAt.toISOString(),
      });
    }

    for (const p of myProjects) {
      const pCreatedAt = p.createdAt ? new Date(p.createdAt) : new Date();
      activities.push({
        id: `project-assigned-${p.id}`,
        type: "project",
        message: `Project assigned: "${p.name}"`,
        createdAt: pCreatedAt.toISOString(),
      });
    }

    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(activities.slice(0, 10));
  }

  const [clients, projects, invoices] = await Promise.all([
    db.select({ id: clientsTable.id, companyName: clientsTable.companyName, createdAt: clientsTable.createdAt }).from(clientsTable).orderBy(sql`created_at desc`).limit(3),
    db.select({ id: projectsTable.id, name: projectsTable.name, createdAt: projectsTable.createdAt }).from(projectsTable).orderBy(sql`created_at desc`).limit(3),
    db.select({ id: invoicesTable.id, number: invoicesTable.number, status: invoicesTable.status, createdAt: invoicesTable.createdAt }).from(invoicesTable).orderBy(sql`created_at desc`).limit(3),
  ]);

  const activity = [
    ...clients.map((c) => ({ id: `client-${c.id}`, type: "client", message: `Client ${c.companyName} added`, createdAt: c.createdAt?.toISOString() ?? new Date().toISOString() })),
    ...projects.map((p) => ({ id: `project-${p.id}`, type: "project", message: `Project "${p.name}" created`, createdAt: p.createdAt?.toISOString() ?? new Date().toISOString() })),
    ...invoices.map((i) => ({ id: `invoice-${i.id}`, type: "invoice", message: `Invoice ${i.number ?? ""} ${i.status?.toLowerCase()}`, createdAt: i.createdAt?.toISOString() ?? new Date().toISOString() })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  return res.json(activity);
}));

export default router;
