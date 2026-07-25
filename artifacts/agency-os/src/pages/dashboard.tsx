import { useState } from "react";
import {
  useGetDashboardStats,
  useListTasks,
  useListLeads,
  useListContentPosts,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderOpen, TrendingUp, IndianRupee, CheckSquare, BarChart3, CheckCircle2,
  ArrowRight, Flame, Plus, Briefcase, FileText, FileCheck, ShoppingBag, Users,
  AlertCircle, Sparkles, Calendar, Clock, Landmark, PlayCircle, RefreshCw, Layers
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  isToday, isBefore, parseISO, startOfWeek, endOfWeek, addDays, format
} from "date-fns";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "12m", label: "12M" },
  { key: "ytd", label: "YTD" },
];

const PLATFORM_DOT: Record<string, string> = {
  INSTAGRAM: "bg-pink-500",
  LINKEDIN:  "bg-blue-600",
  FACEBOOK:  "bg-blue-500",
  YOUTUBE:   "bg-red-500",
  TWITTER:   "bg-slate-800 dark:bg-slate-200",
  TIKTOK:    "bg-slate-700",
  PINTEREST: "bg-red-600",
};

const PIPELINE_STAGE_COLORS: Record<string, string> = {
  LEAD: "bg-slate-400",
  CONTACTED: "bg-blue-400",
  DEMO_GIVEN: "bg-indigo-400",
  PROPOSAL_SENT: "bg-violet-400",
  NEGOTIATION: "bg-amber-400",
  WON: "bg-emerald-500",
  LOST: "bg-rose-400",
};

function StatCard({
  label, value, subtext, icon, accentColor
}: {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  accentColor: string;
}) {
  return (
    <Card className={cn("border-l-[3px] scale-hover transition-all duration-200 bg-card", accentColor)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="mt-1.5 text-2xl font-bold font-heading text-foreground tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground truncate">{subtext}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 ml-3">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [, navigate] = useLocation();
  const [chartRange, setChartRange] = useState<string>("6m");

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStats();
  const isEmployee = user?.systemRole !== "SUPER_ADMIN";

  const { data: revenueChart, isLoading: chartLoading } = useQuery<{ month: string; amount: number }[]>({
    queryKey: ["revenue-chart", chartRange],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/revenue-chart?range=${chartRange}`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token && !isEmployee,
  });

  // Content posts for current week (fetch both bounding months to handle month boundaries)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const currentMonthStr = format(new Date(), "yyyy-MM");
  const weekEndMonthStr = format(weekEnd, "yyyy-MM");
  const needsBothMonths = currentMonthStr !== weekEndMonthStr;
  const { data: weekPosts } = useListContentPosts({
    month: currentMonthStr,
  } as any);
  const { data: weekPostsNext } = useListContentPosts({
    month: weekEndMonthStr,
  } as any);
  const allWeekPosts = needsBothMonths ? [...(weekPosts ?? []), ...(weekPostsNext ?? [])] : (weekPosts ?? []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const todayStr = format(new Date(), "EEEE, dd MMM yyyy");

  // Content calendar week strip
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const postsByDay: Record<string, { platform: string }[]> = {};
  allWeekPosts.forEach((p: any) => {
    if (p.scheduledAt) {
      const dayKey = format(new Date(p.scheduledAt), "yyyy-MM-dd");
      if (!postsByDay[dayKey]) postsByDay[dayKey] = [];
      postsByDay[dayKey]!.push({ platform: p.platform ?? "INSTAGRAM" });
    }
  });

  if (statsLoading || !stats) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Skeleton className="h-72 xl:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (isEmployee || stats.isEmployee) {
    return (
      <EmployeeDashboard
        stats={stats}
        refetchStats={refetchStats}
        greeting={greeting()}
        todayStr={todayStr}
        navigate={navigate}
        weekDays={weekDays}
        postsByDay={postsByDay}
        allWeekPosts={allWeekPosts}
        PLATFORM_DOT={PLATFORM_DOT}
      />
    );
  }

  const hasRevenueData = revenueChart && revenueChart.some((d) => d.amount > 0);

  // Project Health Chart data mapping
  const healthData = [
    { name: "On Track", value: stats.projectHealth?.onTrack ?? 0, color: "#10b981" },
    { name: "At Risk", value: stats.projectHealth?.atRisk ?? 0, color: "#f59e0b" },
    { name: "Delayed", value: stats.projectHealth?.delayed ?? 0, color: "#ef4444" },
    { name: "Completed", value: stats.projectHealth?.completed ?? 0, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6 animated-fade-in text-foreground">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">
            {greeting()}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{todayStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchStats()} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Badge variant="outline" className="text-[11px] font-semibold py-1 px-2.5 gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live BI Console
          </Badge>
        </div>
      </div>

      {/* ── First Row: Redesigned Top KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue Collected"
          value={`₹${(stats.revenueCollected?.currentMonth ?? 0).toLocaleString("en-IN")}`}
          subtext={`₹${(stats.revenueCollected?.totalCollected ?? 0).toLocaleString("en-IN")} total all-time`}
          accentColor="border-l-emerald-500"
          icon={<IndianRupee className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          label="Outstanding Revenue"
          value={`₹${(stats.outstandingRevenue ?? 0).toLocaleString("en-IN")}`}
          subtext="From Sent, Unpaid & Overdue Invoices"
          accentColor="border-l-amber-500"
          icon={<Landmark className="h-5 w-5 text-amber-500" />}
        />
        <StatCard
          label="Quotation Value"
          value={`₹${(stats.quotationValue ?? 0).toLocaleString("en-IN")}`}
          subtext="Total potential values waiting for client approval"
          accentColor="border-l-indigo-500"
          icon={<FileCheck className="h-5 w-5 text-indigo-500" />}
        />
        <StatCard
          label="Purchase Orders"
          value={stats.purchaseOrders?.total ?? 0}
          subtext={`${stats.purchaseOrders?.pending ?? 0} Pending • ${stats.purchaseOrders?.approved ?? 0} Approved • ${stats.purchaseOrders?.completed ?? 0} Completed`}
          accentColor="border-l-violet-500"
          icon={<ShoppingBag className="h-5 w-5 text-violet-500" />}
        />
      </div>

      {/* ── Second Row: Business Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Clients */}
        <Card className="bg-card">
          <CardHeader className="pb-2.5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" /> Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-heading text-foreground">
                {stats.businessSummary?.clients?.active ?? 0}
              </span>
              <span className="text-sm text-muted-foreground">active client partners</span>
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Total Registered</p>
                <p className="text-base font-bold mt-0.5">{stats.businessSummary?.clients?.total ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Added This Month</p>
                <p className="text-base font-bold text-emerald-500 mt-0.5">+{stats.businessSummary?.clients?.newThisMonth ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Summary */}
        <Card className="bg-card">
          <CardHeader className="pb-2.5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-500" /> Projects Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-heading text-foreground">
                {stats.businessSummary?.projects?.running ?? 0}
              </span>
              <span className="text-sm text-muted-foreground">running projects</span>
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-border/60 grid grid-cols-4 gap-1 text-[10px] text-center">
              <div>
                <p className="text-muted-foreground truncate">Total</p>
                <p className="text-sm font-bold mt-0.5">{stats.businessSummary?.projects?.total ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground truncate">Completed</p>
                <p className="text-sm font-bold text-slate-400 mt-0.5">{stats.businessSummary?.projects?.completed ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground truncate">New MTD</p>
                <p className="text-sm font-bold text-indigo-400 mt-0.5">{stats.businessSummary?.projects?.startedThisMonth ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground truncate">Overdue</p>
                <p className={cn("text-sm font-bold mt-0.5", (stats.businessSummary?.projects?.overdue ?? 0) > 0 ? "text-rose-500 font-extrabold" : "text-muted-foreground")}>
                  {stats.businessSummary?.projects?.overdue ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Summary */}
        <Card className="bg-card">
          <CardHeader className="pb-2.5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-violet-500" /> Tasks Backlog
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-heading text-foreground">
                {stats.businessSummary?.tasks?.dueToday ?? 0}
              </span>
              <span className="text-sm text-muted-foreground">due today</span>
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-border/60 grid grid-cols-5 gap-1 text-[10px] text-center">
              <div>
                <p className="text-muted-foreground truncate">Pending</p>
                <p className="text-sm font-bold mt-0.5">{stats.businessSummary?.tasks?.pending ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground truncate">In Progress</p>
                <p className="text-sm font-bold text-amber-500 mt-0.5">{stats.businessSummary?.tasks?.inProgress ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground truncate">Completed</p>
                <p className="text-sm font-bold text-emerald-500 mt-0.5">{stats.businessSummary?.tasks?.completed ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground truncate">Overdue</p>
                <p className={cn("text-sm font-bold mt-0.5", (stats.businessSummary?.tasks?.overdue ?? 0) > 0 ? "text-rose-500 font-extrabold animate-pulse" : "text-muted-foreground")}>
                  {stats.businessSummary?.tasks?.overdue ?? 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground truncate">Total</p>
                <p className="text-sm font-bold mt-0.5">{stats.businessSummary?.tasks?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Third Row: Revenue Trend & Segmented Operational Analytics ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="xl:col-span-2 bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Revenue Trend
              </CardTitle>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                {RANGE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.key}
                    size="sm"
                    variant={chartRange === opt.key ? "default" : "ghost"}
                    className="h-6 px-2.5 text-[10px] font-bold"
                    onClick={() => setChartRange(opt.key)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-48" />
            ) : !hasRevenueData ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground bg-card/20 rounded-xl border border-dashed border-border">
                <BarChart3 className="h-10 w-10 mb-2 opacity-30 text-primary" />
                <p className="text-sm font-medium">No revenue data available</p>
                <p className="text-xs opacity-75 mt-0.5">Paid invoices will appear here once processed</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueChart ?? []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="oklch(0.55 0.22 260)"
                    strokeWidth={2.5} fill="url(#revenueGrad)"
                    dot={{ fill: "oklch(0.55 0.22 260)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Segmented Operational Analytics */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Operations Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invoice Breakdown */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Invoices</span>
                <span className="text-foreground font-extrabold">{Object.values(stats.invoiceAnalytics ?? {}).reduce((a, b) => a + b, 0)} total</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                <div style={{ width: `${((stats.invoiceAnalytics?.paid ?? 0) / (Object.values(stats.invoiceAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-emerald-500" title="Paid" />
                <div style={{ width: `${((stats.invoiceAnalytics?.sent ?? 0) / (Object.values(stats.invoiceAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-blue-500" title="Sent" />
                <div style={{ width: `${((stats.invoiceAnalytics?.overdue ?? 0) / (Object.values(stats.invoiceAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-rose-500" title="Overdue" />
                <div style={{ width: `${((stats.invoiceAnalytics?.draft ?? 0) / (Object.values(stats.invoiceAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-slate-400" title="Draft" />
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Paid: {stats.invoiceAnalytics?.paid ?? 0}</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Sent: {stats.invoiceAnalytics?.sent ?? 0}</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Overdue: {stats.invoiceAnalytics?.overdue ?? 0}</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Draft: {stats.invoiceAnalytics?.draft ?? 0}</span>
              </div>
            </div>

            {/* Quotations Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Quotations</span>
                <span className="text-foreground font-extrabold">{Object.values(stats.quotationAnalytics ?? {}).reduce((a, b) => a + b, 0)} total</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                <div style={{ width: `${((stats.quotationAnalytics?.accepted ?? 0) / (Object.values(stats.quotationAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-emerald-500" title="Accepted" />
                <div style={{ width: `${((stats.quotationAnalytics?.sent ?? 0) / (Object.values(stats.quotationAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-indigo-500" title="Sent" />
                <div style={{ width: `${((stats.quotationAnalytics?.draft ?? 0) / (Object.values(stats.quotationAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-slate-400" title="Draft" />
                <div style={{ width: `${((stats.quotationAnalytics?.rejected ?? 0) / (Object.values(stats.quotationAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-rose-500" title="Rejected" />
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Accepted: {stats.quotationAnalytics?.accepted ?? 0}</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Sent: {stats.quotationAnalytics?.sent ?? 0}</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Draft: {stats.quotationAnalytics?.draft ?? 0}</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Rejected: {stats.quotationAnalytics?.rejected ?? 0}</span>
              </div>
            </div>

            {/* Purchase Orders Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Purchase Orders</span>
                <span className="text-foreground font-extrabold">{Object.values(stats.purchaseOrderAnalytics ?? {}).reduce((a, b) => a + b, 0)} total</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                <div style={{ width: `${((stats.purchaseOrderAnalytics?.completed ?? 0) / (Object.values(stats.purchaseOrderAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-emerald-500" title="Completed" />
                <div style={{ width: `${((stats.purchaseOrderAnalytics?.approved ?? 0) / (Object.values(stats.purchaseOrderAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-amber-500" title="Approved" />
                <div style={{ width: `${((stats.purchaseOrderAnalytics?.ordered ?? 0) / (Object.values(stats.purchaseOrderAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-violet-500" title="Ordered" />
                <div style={{ width: `${((stats.purchaseOrderAnalytics?.pending ?? 0) / (Object.values(stats.purchaseOrderAnalytics ?? {}).reduce((a, b) => a + b, 0) || 1)) * 100}%` }} className="bg-slate-400" title="Pending" />
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Completed: {stats.purchaseOrderAnalytics?.completed ?? 0}</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Approved: {stats.purchaseOrderAnalytics?.approved ?? 0}</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Ordered: {stats.purchaseOrderAnalytics?.ordered ?? 0}</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Pending: {stats.purchaseOrderAnalytics?.pending ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Fourth Row: Sales Pipeline & Project Health ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Pipeline */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" /> Sales Pipeline Value
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/sales")}>
                Pipeline Desk <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.leadPipeline?.stages?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active leads in pipeline</p>
            ) : (
              <div className="space-y-3.5">
                {stats.leadPipeline?.stages?.map((stage: any) => {
                  const maxCount = Math.max(...(stats.leadPipeline?.stages?.map((s: any) => s.count) ?? [1]));
                  const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                  return (
                    <div key={stage.stage} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                          <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{stage.count} lead{stage.count !== 1 ? "s" : ""}</Badge>
                        </div>
                        {stage.value > 0 && (
                          <span className="text-xs font-bold text-emerald-500">
                            ₹{(stage.value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", PIPELINE_STAGE_COLORS[stage.stage] ?? "bg-slate-400")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground pt-1.5 border-t border-border/40">
                  Total pipeline potential: <span className="font-bold text-foreground">₹{(stats.leadPipeline?.totalValue ?? 0).toLocaleString("en-IN")}</span> across active leads
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Health Donut */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" /> Active Project Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-muted-foreground">
                <FolderOpen className="h-10 w-10 mb-2 opacity-30 text-primary" />
                <p className="text-sm font-medium">No active projects</p>
                <p className="text-xs opacity-75 mt-0.5">Create a project to monitor delivery health</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={healthData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {healthData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, "Projects"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="md:col-span-2 space-y-2 text-xs">
                  {healthData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-bold text-foreground">{item.value} project{item.value !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Fifth Row: This Month Overview & Quick Insights ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* This Month Overview */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> This Month Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projects Started</p>
              <p className="text-lg font-bold text-indigo-400 mt-1">{stats.thisMonthOverview?.projectsCreated ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projects Closed</p>
              <p className="text-lg font-bold text-emerald-500 mt-1">{stats.thisMonthOverview?.projectsCompleted ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Clients Added</p>
              <p className="text-lg font-bold text-primary mt-1">{stats.thisMonthOverview?.clientsAdded ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tasks Completed</p>
              <p className="text-lg font-bold text-violet-500 mt-1">{stats.thisMonthOverview?.tasksCompleted ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invoices Raised</p>
              <p className="text-lg font-bold text-blue-400 mt-1">{stats.thisMonthOverview?.invoicesGenerated ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quotes Created</p>
              <p className="text-lg font-bold text-pink-500 mt-1">{stats.thisMonthOverview?.quotationsGenerated ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">POs Issued</p>
              <p className="text-lg font-bold text-amber-500 mt-1">{stats.thisMonthOverview?.purchaseOrdersCreated ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Collected MTD</p>
              <p className="text-xs font-bold text-emerald-500 mt-2 truncate">₹{(stats.thisMonthOverview?.revenueCollected ?? 0).toLocaleString("en-IN")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Insights & Actions */}
        <div className="space-y-6">
          {/* Insights Card */}
          <Card className="bg-gradient-to-br from-indigo-950/20 to-card border border-primary/10">
            <CardHeader className="pb-2.5">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" /> Agency Health Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.quickInsights?.length === 0 ? (
                <p className="text-xs text-muted-foreground">All systems stable. No pending highlights.</p>
              ) : (
                stats.quickInsights?.map((insight: string, idx: number) => (
                  <div key={idx} className="flex gap-2.5 items-start bg-muted/20 p-2.5 rounded-lg border border-border/40 text-xs">
                    <span className="text-emerald-500 font-bold shrink-0">✦</span>
                    <p className="text-foreground/90 font-medium leading-relaxed">{insight}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Panel */}
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Executive Launchpad
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <Button onClick={() => navigate("/clients")} variant="outline" className="h-20 flex flex-col gap-1.5 items-center justify-center p-2 text-center rounded-xl bg-muted/20 border border-border/50 hover:border-primary/40 scale-hover">
                <Plus className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-bold">Add Client</span>
              </Button>
              <Button onClick={() => navigate("/projects")} variant="outline" className="h-20 flex flex-col gap-1.5 items-center justify-center p-2 text-center rounded-xl bg-muted/20 border border-border/50 hover:border-primary/40 scale-hover">
                <Plus className="h-4 w-4 text-indigo-500" />
                <span className="text-[10px] font-bold">New Project</span>
              </Button>
              <Button onClick={() => navigate("/invoices")} variant="outline" className="h-20 flex flex-col gap-1.5 items-center justify-center p-2 text-center rounded-xl bg-muted/20 border border-border/50 hover:border-primary/40 scale-hover">
                <Plus className="h-4 w-4 text-blue-500" />
                <span className="text-[10px] font-bold">Bill Invoice</span>
              </Button>
              <Button onClick={() => navigate("/quotations")} variant="outline" className="h-20 flex flex-col gap-1.5 items-center justify-center p-2 text-center rounded-xl bg-muted/20 border border-border/50 hover:border-primary/40 scale-hover">
                <Plus className="h-4 w-4 text-violet-500" />
                <span className="text-[10px] font-bold">New Quote</span>
              </Button>
              <Button onClick={() => navigate("/tasks")} variant="outline" className="h-20 flex flex-col gap-1.5 items-center justify-center p-2 text-center rounded-xl bg-muted/20 border border-border/50 hover:border-primary/40 scale-hover col-span-2 sm:col-span-1">
                <Plus className="h-4 w-4 text-amber-500" />
                <span className="text-[10px] font-bold">Assign Task</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Sixth Row: Upcoming Deadlines & Content Calendar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <Card className="xl:col-span-2 bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Upcoming Deadlines & Leave Schedules
            </CardTitle>
            <span className="text-xs text-muted-foreground">Chronological priorities</span>
          </CardHeader>
          <CardContent>
            {stats.upcomingDeadlines?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border border-dashed border-border rounded-xl bg-card/10">
                <Clock className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">All quiet this month</p>
                <p className="text-xs opacity-75 mt-0.5">No upcoming deadlines or employee leaves scheduled</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {stats.upcomingDeadlines?.map((item: any) => {
                  const badgeVariant = item.overdue ? "destructive" : "secondary";
                  const dateLabel = format(new Date(item.date), "dd MMM yyyy");

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3.5 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/30 transition-all duration-150 justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base">
                          {item.type === "project" ? "💼" : item.type === "invoice" ? "🧾" : item.type === "task" ? "📋" : "🌴"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                              {item.type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {item.extraInfo}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-xs font-bold", item.overdue ? "text-rose-500 font-black animate-pulse" : "text-foreground")}>
                          {dateLabel}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {item.overdue ? "Immediate Action Required" : "Upcoming deadline"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Calendar Week Strip */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-orange-500 animate-pulse" /> Week's Social Content
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/content")}>
                Calendar <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {allWeekPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-card/20 rounded-xl border border-dashed border-border">
                <Flame className="h-8 w-8 mb-2 opacity-30 text-orange-500" />
                <p className="text-sm font-medium">No scheduled content.</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const dayPosts = postsByDay[dayKey] ?? [];
                  const isCurrentDay = isToday(day);
                  return (
                    <div
                      key={dayKey}
                      onClick={() => navigate("/content")}
                      className={cn(
                        "flex flex-col items-center gap-1 p-1.5 rounded-lg border cursor-pointer transition-colors hover:border-primary/40",
                        isCurrentDay ? "bg-primary/5 border-primary/30" : "border-border bg-card/50"
                      )}
                    >
                      <p className={cn("text-[9px] font-semibold uppercase", isCurrentDay ? "text-primary font-black" : "text-muted-foreground")}>
                        {format(day, "EEE")}
                      </p>
                      <p className={cn("text-sm font-bold font-heading leading-none", isCurrentDay ? "text-primary" : "text-foreground")}>
                        {format(day, "d")}
                      </p>
                      {dayPosts.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                          {dayPosts.slice(0, 3).map((p, i) => (
                            <div key={i} className={cn("h-1.5 w-1.5 rounded-full", PLATFORM_DOT[p.platform] ?? "bg-slate-400")} />
                          ))}
                        </div>
                      ) : (
                        <div className="h-1.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmployeeDashboard({
  stats,
  refetchStats,
  greeting,
  todayStr,
  navigate,
  weekDays,
  postsByDay,
  PLATFORM_DOT,
}: {
  stats: any;
  refetchStats: () => void;
  greeting: string;
  todayStr: string;
  navigate: (path: string) => void;
  weekDays: Date[];
  postsByDay: Record<string, { platform: string }[]>;
  allWeekPosts: any[];
  PLATFORM_DOT: Record<string, string>;
}) {
  return (
    <div className="p-6 space-y-6 animated-fade-in text-foreground">
      {/* ── Section 1: Welcome Banner ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">
            {greeting}, {stats.employeeName?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{todayStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchStats()} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Badge variant="outline" className="text-[11px] font-semibold py-1 px-2.5 gap-1.5 bg-primary/5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            My Productive Hub
          </Badge>
        </div>
      </div>

      {/* ── Section 2: My Work Summary ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border/50 flex flex-col justify-between h-[100px] scale-hover transition-all duration-200">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned Tasks</span>
          <div>
            <span className="text-2xl font-bold text-primary font-heading">{stats.myWorkSummary?.assignedTasks ?? 0}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active scope</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 flex flex-col justify-between h-[100px] scale-hover transition-all duration-200">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-amber-500">Due Today</span>
          <div>
            <span className="text-2xl font-bold text-amber-500 font-heading">{stats.myWorkSummary?.tasksDueToday ?? 0}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Priorities today</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 flex flex-col justify-between h-[100px] scale-hover transition-all duration-200">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-rose-500">Overdue</span>
          <div>
            <span className="text-2xl font-bold text-rose-500 font-heading">{stats.myWorkSummary?.overdueTasks ?? 0}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Needs action</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 flex flex-col justify-between h-[100px] scale-hover transition-all duration-200">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projects</span>
          <div>
            <span className="text-2xl font-bold text-indigo-400 font-heading">{stats.myWorkSummary?.projectsAssignedToMe ?? 0}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">My workspace</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 flex flex-col justify-between h-[100px] scale-hover transition-all duration-200">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending Requests</span>
          <div>
            <span className="text-2xl font-bold text-violet-400 font-heading">{stats.myWorkSummary?.pendingTaskRequests ?? 0}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting review</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 flex flex-col justify-between h-[100px] scale-hover transition-all duration-200">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved Req</span>
          <div>
            <span className="text-2xl font-bold text-emerald-500 font-heading">{stats.myWorkSummary?.approvedRequests ?? 0}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Successfully added</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 flex flex-col justify-between h-[100px] scale-hover transition-all duration-200">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rejected Req</span>
          <div>
            <span className="text-2xl font-bold text-rose-400 font-heading">{stats.myWorkSummary?.rejectedRequests ?? 0}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Adjustments needed</p>
          </div>
        </div>
      </div>

      {/* ── Row 3: My Projects & Assigned Clients ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* My Projects */}
        <Card className="xl:col-span-2 bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" /> My Active Projects
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/projects")}>
              Go to Projects <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.myProjects?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No projects currently assigned to you</p>
            ) : (
              <div className="space-y-4">
                {stats.myProjects?.map((project: any) => (
                  <div key={project.id} className="p-3.5 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate block">{project.name}</span>
                        <div className="flex gap-2 items-center mt-1">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase">{project.priority} Priority</Badge>
                          <span className="text-[10px] text-muted-foreground">Due: {project.dueDate ? format(new Date(project.dueDate), "dd MMM yyyy") : "N/A"}</span>
                        </div>
                      </div>
                      <Badge className={cn("text-[10px] uppercase", project.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary")}>
                        {project.status?.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden">
                        <div style={{ width: `${project.completion}%` }} className="bg-indigo-500 h-full rounded-full transition-all duration-300" />
                      </div>
                      <span className="text-[10px] font-bold shrink-0">{project.completion}% Done</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Clients */}
        <Card className="bg-card flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> My Assigned Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-4">
            {stats.clientInfo?.count === 0 ? (
              <div className="text-center py-8 text-muted-foreground my-auto">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-20 text-primary" />
                <p className="text-xs font-semibold">No assigned clients</p>
                <p className="text-[10px] opacity-75 mt-0.5">Assigned via project memberships</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {stats.clientInfo?.names?.map((name: string, index: number) => (
                  <div key={index} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-foreground/90">{name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-3 border-t border-border/50 text-center">
              <p className="text-[10px] text-muted-foreground">
                Currently managing <span className="text-foreground font-bold">{stats.clientInfo?.count ?? 0}</span> active client{stats.clientInfo?.count !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: My Active Tasks ── */}
      <Card className="bg-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" /> My Tasks
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/tasks")}>
            Manage Tasks <ArrowRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {stats.myTasks?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active tasks assigned to you</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.myTasks?.map((task: any) => (
                <div key={task.id} className="p-3.5 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-all flex flex-col justify-between gap-3 cursor-pointer" onClick={() => navigate("/tasks")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground truncate block">{task.title}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Project: {task.projectName || "None"}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase shrink-0">
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground font-semibold">Due: {task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy") : "N/A"}</span>
                    <Badge className={cn("text-[9px] capitalize px-1.5 py-0.5", task.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary")}>
                      {task.status?.replace("_", " ").toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Row 5: Upcoming Deadlines & My Task Requests ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card className="bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Upcoming Deadlines
            </CardTitle>
            <span className="text-xs text-muted-foreground">Chronological priorities</span>
          </CardHeader>
          <CardContent>
            {stats.upcomingDeadlines?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border border-dashed border-border rounded-xl bg-card/10">
                <Clock className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">All quiet this month</p>
                <p className="text-xs opacity-75 mt-0.5">No upcoming deadlines or schedules</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {stats.upcomingDeadlines?.map((item: any) => {
                  const dateLabel = format(new Date(item.date), "dd MMM yyyy");
                  return (
                    <div key={item.id} className="flex items-center gap-3.5 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/30 transition-all justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base">
                          {item.type === "project" ? "💼" : item.type === "task" ? "📋" : "🌴"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                              {item.type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {item.extraInfo}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-xs font-bold", item.overdue ? "text-rose-500 font-black animate-pulse" : "text-foreground")}>
                          {dateLabel}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {item.overdue ? "Immediate Action Required" : "Upcoming deadline"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Task Requests */}
        <Card className="bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" /> My Task Requests
            </CardTitle>
            <Button onClick={() => navigate("/tasks")} variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Request Task
            </Button>
          </CardHeader>
          <CardContent>
            {stats.myTaskRequests?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border border-dashed border-border rounded-xl bg-card/10">
                <FileCheck className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">No task requests</p>
                <p className="text-xs opacity-75 mt-0.5">You can submit custom task requests to admins</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {stats.myTaskRequests?.map((item: any) => {
                  const statusColors: Record<string, string> = {
                    PENDING: "bg-amber-500/10 text-amber-500",
                    APPROVED: "bg-emerald-500/10 text-emerald-500",
                    REJECTED: "bg-rose-500/10 text-rose-500",
                  };
                  return (
                    <div key={item.id} className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-foreground truncate block">{item.title}</span>
                        <Badge className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5", statusColors[item.approvalStatus] ?? "bg-slate-500/10 text-slate-500")}>
                          {item.approvalStatus}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Project: {item.projectName || "None"}</span>
                        <span>{item.createdAt ? format(new Date(item.createdAt), "dd MMM yyyy") : ""}</span>
                      </div>
                      {item.rejectionReason && item.approvalStatus === "REJECTED" && (
                        <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/20 text-[10px] text-rose-400 font-medium">
                          <span className="font-bold">Rejection reason:</span> {item.rejectionReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 6: Recent Activity & Content Calendar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> My Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activities found</p>
            ) : (
              <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
                {stats.recentActivity?.map((activity: any) => (
                  <div key={activity.id} className="flex gap-3 items-start text-xs border-b border-border/30 pb-3 last:border-0 last:pb-0">
                    <span className="text-base shrink-0">
                      {activity.type === "project" ? "💼" : activity.type === "leave" ? "🌴" : "📋"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground/90 font-medium leading-relaxed">{activity.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(activity.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Calendar Week Strip */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-orange-500 animate-pulse" /> Week's Social Content
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/content")}>
                Calendar <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.myProjects?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-card/20 rounded-xl border border-dashed border-border">
                <Flame className="h-8 w-8 mb-2 opacity-30 text-orange-500" />
                <p className="text-sm font-medium">No projects found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const dayPosts = postsByDay[dayKey] ?? [];
                  const isCurrentDay = isToday(day);
                  return (
                    <div
                      key={dayKey}
                      onClick={() => navigate("/content")}
                      className={cn(
                        "flex flex-col items-center gap-1 p-1.5 rounded-lg border cursor-pointer transition-colors hover:border-primary/40",
                        isCurrentDay ? "bg-primary/5 border-primary/30" : "border-border bg-card/50"
                      )}
                    >
                      <p className={cn("text-[9px] font-semibold uppercase", isCurrentDay ? "text-primary font-black" : "text-muted-foreground")}>
                        {format(day, "EEE")}
                      </p>
                      <p className="text-sm font-bold font-heading leading-none text-foreground">
                        {format(day, "d")}
                      </p>
                      {dayPosts.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                          {dayPosts.slice(0, 3).map((p, i) => (
                            <div key={i} className={cn("h-1.5 w-1.5 rounded-full", PLATFORM_DOT[p.platform] ?? "bg-slate-400")} />
                          ))}
                        </div>
                      ) : (
                        <div className="h-1.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
