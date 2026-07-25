import { getDashboardStats } from "@/lib/dashboard-stats";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { FUNNEL_STAGES } from "@/lib/constants";
import { FunnelChart } from "@/components/reports/funnel-chart";
import { Sparkles, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

async function getAIInsights() {
  const insights: string[] = [];
  const now = new Date();

  // 1. Overdue Projects
  const overdueProjects = await prisma.project.findMany({
    where: {
      status: "IN_PROGRESS",
      endDate: { lt: now },
    },
    select: { name: true, endDate: true },
  });
  overdueProjects.forEach((p) => {
    if (p.endDate) {
      const days = Math.floor((now.getTime() - p.endDate.getTime()) / (1000 * 3600 * 24));
      insights.push(`Project "${p.name}" is ${days} days overdue with no update`);
    }
  });

  // 2. Overdue Invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: "SENT",
      dueDate: { lt: now },
    },
    select: { number: true, dueDate: true },
  });
  overdueInvoices.forEach((i) => {
    if (i.dueDate) {
      const days = Math.floor((now.getTime() - i.dueDate.getTime()) / (1000 * 3600 * 24));
      insights.push(`Invoice #${i.number} is overdue by ${days} days`);
    }
  });

  // 3. Unbilled Clients
  const activeProjects = await prisma.project.findMany({
    where: { status: "IN_PROGRESS" },
    select: { clientId: true },
  });
  const clientIds = Array.from(new Set(activeProjects.map(p => p.clientId)));
  
  for (const cid of clientIds) {
    const lastInvoice = await prisma.invoice.findFirst({
      where: { clientId: cid },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    
    const clientObj = await prisma.client.findUnique({
      where: { id: cid },
      select: { companyName: true },
    });
    
    if (clientObj) {
      if (!lastInvoice) {
        insights.push(`Client "${clientObj.companyName}" has active projects but has never been billed — at-risk flag`);
      } else {
        const days = Math.floor((now.getTime() - lastInvoice.createdAt.getTime()) / (1000 * 3600 * 24));
        if (days > 45) {
          insights.push(`Client "${clientObj.companyName}" has active projects but hasn't been billed in ${days} days — at-risk flag`);
        }
      }
    }
  }

  // 4. Underutilized Staff
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const developers = await prisma.user.findMany({
    where: { systemRole: { in: ["DEVELOPER", "DESIGNER"] }, isActive: true },
    select: { id: true, name: true },
  });
  
  for (const dev of developers) {
    const timeEntries = await prisma.timeEntry.findMany({
      where: { userId: dev.id, startedAt: { gte: sevenDaysAgo } },
      select: { minutes: true },
    });
    const totalHours = timeEntries.reduce((acc, curr) => acc + curr.minutes, 0) / 60;
    if (totalHours < 15) {
      insights.push(`Employee "${dev.name}" has logged under 15 hours (${totalHours.toFixed(1)}h) this week`);
    }
  }

  if (insights.length === 0) {
    insights.push("All operational systems healthy. No business anomalies detected.");
  }

  return insights;
}

export default async function ReportsPage() {
  const stats = await getDashboardStats();
  const leads = await prisma.lead.groupBy({
    by: ["stage"],
    _count: true,
  });

  const funnelData = FUNNEL_STAGES.map((s) => ({
    name: s.label,
    count: leads.find((l) => l.stage === s.key)?._count ?? 0,
  }));

  // Fetch profitability data
  const projectsData = await prisma.project.findMany({
    include: {
      invoices: { where: { status: "PAID" }, select: { total: true } },
      expenses: { select: { amount: true } },
    },
  });

  const profitability = projectsData.map((p) => {
    const income = p.invoices.reduce((acc, curr) => acc + curr.total, 0);
    const expense = p.expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const profit = income - expense;
    const margin = income > 0 ? Math.round((profit / income) * 100) : 0;
    return {
      id: p.id,
      name: p.name,
      income,
      expense,
      profit,
      margin,
    };
  });

  const aiInsights = await getAIInsights();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Executive insights — project profitability, funnel stages & automated AI flags
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pipeline value" value={`₹${Math.round(stats.pipelineValue).toLocaleString("en-IN")}`} />
        <StatCard title="Open leads" value={stats.openLeads} />
        <StatCard title="Active projects" value={stats.activeProjects} />
        <StatCard title="Team checked in" value={stats.checkedInToday} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Funnel Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leads by funnel stage</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>

        {/* AI Business Insights Panel */}
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
            <div>
              <CardTitle className="text-base text-indigo-900">AI Business Insights</CardTitle>
              <CardDescription className="text-xs text-indigo-700">Auto-generated operational flags</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5 max-h-[300px] overflow-y-auto">
            {aiInsights.map((insight, idx) => (
              <div key={idx} className="flex gap-2 text-xs border border-indigo-100 bg-white p-3 rounded-xl shadow-sm text-indigo-950 font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{insight}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Project Profitability Margins */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <div>
            <CardTitle>Project Profitability</CardTitle>
            <CardDescription>Financial performance breakdown: Income vs Expenses</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {profitability.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No projects recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Income (Paid Invoices)</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Profit Margin</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitability.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-slate-800">{p.name}</TableCell>
                    <TableCell className="text-emerald-700 font-medium">₹{p.income.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-red-600">₹{p.expense.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-semibold border-0 ${p.margin > 50 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {p.margin}% margin
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${p.profit >= 0 ? "text-slate-800" : "text-red-600"}`}>
                      ₹{p.profit.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
