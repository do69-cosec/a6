"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckSquare, ArrowUpRight, Clock, Award } from "lucide-react";

interface RevenueItem {
  month: string;
  amount: number;
}

interface FunnelItem {
  stage: string;
  count: number;
  value: number;
}

interface TaskStats {
  todo: number;
  inProgress: number;
  inReview: number;
  completed: number;
}

export function DashboardCharts({
  revenueData,
  funnelData,
  taskStats,
}: {
  revenueData: RevenueItem[];
  funnelData: FunnelItem[];
  taskStats: TaskStats;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="col-span-2 h-[350px] animate-pulse bg-muted/20" />
        <Card className="h-[350px] animate-pulse bg-muted/20" />
      </div>
    );
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalTasks = taskStats.todo + taskStats.inProgress + taskStats.inReview + taskStats.completed;
  const completionRate = totalTasks > 0 ? Math.round((taskStats.completed / totalTasks) * 100) : 0;

  // Pie chart data for tasks
  const taskPieData = [
    { name: "To Do", value: taskStats.todo, color: "oklch(0.65 0.19 255 / 40%)" },
    { name: "In Progress", value: taskStats.inProgress, color: "oklch(0.65 0.19 255)" },
    { name: "In Review", value: taskStats.inReview, color: "oklch(0.72 0.15 190)" },
    { name: "Completed", value: taskStats.completed, color: "oklch(0.62 0.14 140)" },
  ].filter(d => d.value > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Revenue Trend Chart */}
      <Card className="lg:col-span-2 glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-bold">Revenue Performance</CardTitle>
            <CardDescription className="text-xs">Monthly earnings & collections trend</CardDescription>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <ArrowUpRight className="h-3.5 w-3.5" /> +12.4%
          </span>
        </CardHeader>
        <CardContent className="h-[280px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                stroke="oklch(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="oklch(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value / 1000}k`}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(var(--card))",
                  border: "1px solid oklch(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                }}
                formatter={(value: any) => [formatCurrency(Number(value || 0)), "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Task Completion Analytics */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-bold">Task Efficiency</CardTitle>
          <CardDescription className="text-xs">Overall completion & workload status</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-between h-[280px] pb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center">
              {/* Custom SVG Circular Progress */}
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-muted"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-primary transition-all duration-500 ease-in-out"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={213.6}
                  strokeDashoffset={213.6 - (213.6 * completionRate) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-extrabold">{completionRate}%</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Completion Rate</p>
              <p className="text-xs text-muted-foreground">
                {taskStats.completed} of {totalTasks} tasks resolved
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Completed
              </span>
              <span className="font-bold text-foreground">{taskStats.completed}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" /> In Progress
              </span>
              <span className="font-bold text-foreground">{taskStats.inProgress}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> In Review
              </span>
              <span className="font-bold text-foreground">{taskStats.inReview}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" /> To Do
              </span>
              <span className="font-bold text-foreground">{taskStats.todo}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
