import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { StatCard } from "@/components/layout/stat-card";
import {
  FolderKanban,
  Building2,
  TrendingUp,
  CheckSquare,
  Users,
  Wallet,
  CalendarDays,
  Clock,
  ArrowUpRight,
  FileText,
  CheckCircle2,
  Plus,
  Compass,
  ArrowRight,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay } from "date-fns";
import { DashboardCharts } from "@/components/reports/dashboard-charts";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) return null;

  const role = user.systemRole;
  const today = startOfDay(new Date());

  // Fetch standard stats
  const stats = await getDashboardStats();

  // Fetch monthly revenue trend data (last 6 months)
  const payments = await prisma.payment.findMany({
    select: { amount: true, paidAt: true },
    orderBy: { paidAt: "asc" },
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenueByMonthMap: Record<string, number> = {};
  const now = new Date();
  
  // Seed last 6 months with 0
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    revenueByMonthMap[label] = 0;
  }

  payments.forEach((p) => {
    const d = new Date(p.paidAt);
    const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    if (label in revenueByMonthMap) {
      revenueByMonthMap[label] += p.amount;
    }
  });

  const revenueData = Object.entries(revenueByMonthMap).map(([month, amount]) => ({
    month,
    amount,
  }));

  // Fetch task stats for chart
  const [todoCount, inProgressCount, inReviewCount, completedCount] = await Promise.all([
    prisma.task.count({ where: { status: "TODO" } }),
    prisma.task.count({ where: { status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { status: "IN_REVIEW" } }),
    prisma.task.count({ where: { status: "DONE" } }),
  ]);
  const taskStats = {
    todo: todoCount,
    inProgress: inProgressCount,
    inReview: inReviewCount,
    completed: completedCount,
  };

  // Fetch contextual role-specific listings
  let roleListing: React.ReactNode = null;

  if (role === "DESIGNER" || role === "DEVELOPER") {
    // Task Focus View
    const myTasks = await prisma.task.findMany({
      where: { assigneeId: user.id, status: { not: "DONE" } },
      take: 5,
      orderBy: { dueDate: "asc" },
      include: { project: { select: { name: true } } },
    });

    roleListing = (
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Your Active Tasks</CardTitle>
            <CardDescription className="text-xs">Directly assigned to you</CardDescription>
          </div>
          <Link href="/tasks">
            <Button size="sm" variant="ghost" className="text-xs gap-1">
              Go to Kanban <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {myTasks.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              🎉 No pending tasks assigned to you!
            </div>
          ) : (
            myTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold text-sm text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.project.name}</p>
                </div>
                <div className="text-right">
                  <Badge variant={t.priority === "HIGH" || t.priority === "URGENT" ? "destructive" : "secondary"}>
                    {t.priority}
                  </Badge>
                  {t.dueDate && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Due {format(new Date(t.dueDate), "MMM dd")}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  } else if (role === "SALES_EXECUTIVE" || role === "ACCOUNT_MANAGER") {
    // Sales Funnel View
    const openLeads = await prisma.lead.findMany({
      where: { stage: { notIn: ["WON", "LOST"] } },
      take: 5,
      orderBy: { value: "desc" },
    });

    roleListing = (
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Top Active Leads</CardTitle>
            <CardDescription className="text-xs">Highest value pipeline deals</CardDescription>
          </div>
          <Link href="/sales">
            <Button size="sm" variant="ghost" className="text-xs gap-1">
              Pipeline Board <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {openLeads.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No active leads in pipeline.
            </div>
          ) : (
            openLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold text-sm text-foreground">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.companyName || "—"}</p>
                </div>
                <div className="text-right">
                  <Badge>{l.stage.replace("_", " ")}</Badge>
                  {l.value && (
                    <p className="text-xs font-bold text-foreground mt-1">
                      ₹{Math.round(l.value).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  } else if (role === "FINANCE_EXECUTIVE") {
    // Invoices and P&L Focus
    const recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { companyName: true } } },
    });

    roleListing = (
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Recent Invoices</CardTitle>
            <CardDescription className="text-xs">Invoices sent & pending actions</CardDescription>
          </div>
          <Link href="/finance">
            <Button size="sm" variant="ghost" className="text-xs gap-1">
              Finance Panel <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentInvoices.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No invoices created yet.
            </div>
          ) : (
            recentInvoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold text-sm text-foreground">Invoice #{i.number}</p>
                  <p className="text-xs text-muted-foreground">{i.client.companyName}</p>
                </div>
                <div className="text-right">
                  <Badge variant={i.status === "PAID" ? "default" : "secondary"}>
                    {i.status}
                  </Badge>
                  <p className="text-xs font-bold text-foreground mt-1">
                    ₹{i.total.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  } else if (role === "HR") {
    // Attendance/HR focus
    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true } } },
      take: 5,
    });

    roleListing = (
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Leave Requests</CardTitle>
            <CardDescription className="text-xs">Awaiting HR approvals</CardDescription>
          </div>
          <Link href="/hr">
            <Button size="sm" variant="ghost" className="text-xs gap-1">
              Manage HR <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingLeaves.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              👍 No pending leave approvals!
            </div>
          ) : (
            pendingLeaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold text-sm text-foreground">{l.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.type} · {format(new Date(l.startDate), "MMM dd")} - {format(new Date(l.endDate), "MMM dd")}
                  </p>
                </div>
                <Link href="/hr">
                  <Button size="xs" className="text-[10px]">
                    Review
                  </Button>
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  } else {
    // Super Admin / Manager: Recent Projects Portfolio
    const recentProjects = await prisma.project.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: { client: { select: { companyName: true } } },
    });

    roleListing = (
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Recent Projects</CardTitle>
            <CardDescription className="text-xs">Latest portfolio updates</CardDescription>
          </div>
          <Link href="/projects">
            <Button size="sm" variant="ghost" className="text-xs gap-1">
              All Projects <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No projects yet.</p>
          ) : (
            recentProjects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold text-sm text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.client.companyName}</p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{p.status.replace("_", " ")}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {p.progress}% complete
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  // Let's get the active sales pipeline leads for Won/Lost breakdown
  const salesWonCount = await prisma.lead.count({ where: { stage: "WON" } });
  const salesLostCount = await prisma.lead.count({ where: { stage: "LOST" } });
  const salesTotalCount = salesWonCount + salesLostCount;
  const winRate = salesTotalCount > 0 ? Math.round((salesWonCount / salesTotalCount) * 100) : 0;

  return (
    <div className="space-y-8 animated-fade-in">
      {/* Top Welcome Panel */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-16 h-36 w-36 rounded-full bg-violet-500/10 blur-2xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full mb-3">
              <ShieldCheck className="h-3 w-3" /> Verified {role.replace("_", " ")} Account
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1.5 max-w-xl text-sm">
              Your Blink Beyond Unified Workspace is primed. Real-time metrics, project stages, content logs, and sales deal values are fully synced.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/tasks">
              <Button className="font-semibold text-xs gap-1.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4" /> My Tasks
              </Button>
            </Link>
            <Link href="/attendance">
              <Button variant="outline" className="font-semibold text-xs gap-1.5">
                <Clock className="h-4 w-4" /> Log Attendance
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
          <Compass className="h-4 w-4 text-primary" /> Core Workflows
        </h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <Link href="/clients" className="group p-4 rounded-xl border bg-card/50 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground mt-3">CRM & Clients</p>
          </Link>
          <Link href="/sales" className="group p-4 rounded-xl border bg-card/50 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground mt-3">Sales Pipeline</p>
          </Link>
          <Link href="/projects" className="group p-4 rounded-xl border bg-card/50 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
              <FolderKanban className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground mt-3">Projects</p>
          </Link>
          <Link href="/tasks" className="group p-4 rounded-xl border bg-card/50 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform">
              <CheckSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground mt-3">Task Board</p>
          </Link>
          <Link href="/finance" className="group p-4 rounded-xl border bg-card/50 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform">
              <Wallet className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground mt-3">Finance Ops</p>
          </Link>
          <Link href="/content" className="group p-4 rounded-xl border bg-card/50 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 group-hover:scale-110 transition-transform">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground mt-3">Social Calendar</p>
          </Link>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          icon={FolderKanban}
        />
        <StatCard
          title="Active Clients"
          value={stats.totalClients}
          icon={Building2}
        />
        <StatCard
          title="Pipeline Value"
          value={`₹${Math.round(stats.pipelineValue).toLocaleString("en-IN")}`}
          subtitle={`${stats.openLeads} open deals`}
          icon={TrendingUp}
        />
        <StatCard
          title="Revenue Collected"
          value={`₹${stats.revenuePaid.toLocaleString("en-IN")}`}
          subtitle={`₹${stats.outstanding.toLocaleString("en-IN")} outstanding`}
          icon={Wallet}
        />
      </div>

      {/* Rich Interactive Charts Section */}
      <DashboardCharts
        revenueData={revenueData}
        funnelData={[]}
        taskStats={taskStats}
      />

      {/* Role-Specific Focus Grid and Mini sales funnel */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Side: Role Specific Focus */}
        {roleListing}

        {/* Right Side: Sales Funnel or Win/Loss Breakdown */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Sales Win Rate</CardTitle>
              <CardDescription className="text-xs">Lead closure ratios</CardDescription>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full">
              <Percent className="h-3.5 w-3.5" /> Win Rate
            </span>
          </CardHeader>
          <CardContent className="flex flex-col justify-between h-[210px] pb-6">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-extrabold text-foreground">{winRate}%</span>
                <span className="text-xs text-muted-foreground">
                  {salesWonCount} Won · {salesLostCount} Lost
                </span>
              </div>
              
              {/* Stacked Stage Bar */}
              <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${winRate}%` }}
                  title={`${salesWonCount} Won`}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${100 - winRate}%` }}
                  title={`${salesLostCount} Lost`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mt-4">
              <div className="border rounded-lg p-3 bg-muted/10 text-center">
                <p className="text-muted-foreground font-semibold">Total Leads Closed</p>
                <p className="text-xl font-bold text-foreground mt-1">{salesTotalCount}</p>
              </div>
              <div className="border rounded-lg p-3 bg-muted/10 text-center">
                <p className="text-muted-foreground font-semibold">Active Value</p>
                <p className="text-xl font-bold text-foreground mt-1">₹{Math.round(stats.pipelineValue / 1000).toLocaleString("en-IN")}k</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-4 border-t border-border/40">
        <span>Blink Beyond Agency Management System v1.1</span>
        <span>Last refreshed {format(new Date(), "PPpp")}</span>
      </div>
    </div>
  );
}
