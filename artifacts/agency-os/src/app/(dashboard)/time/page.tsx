import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { startOfWeek } from "date-fns";
import { TimeTracker } from "@/components/time/time-tracker";

export const metadata = {
  title: "Time Tracking | Blink Beyond",
  description: "Track billable hours, run live timers, and view utilization reports",
};

export default async function TimePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [entries, weekEntries, projects] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 30,
      include: {
        project: { select: { name: true } },
        task: { select: { title: true } },
      },
    }),
    prisma.timeEntry.findMany({
      where: { userId, startedAt: { gte: weekStart } },
      select: { minutes: true, billable: true },
    }),
    prisma.project.findMany({
      where: { status: "IN_PROGRESS" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalMin = entries.reduce((s, e) => s + e.minutes, 0);
  const billableMin = entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0);
  const weekMin = weekEntries.reduce((s, e) => s + e.minutes, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Time Tracking
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Live timer, billable hours tracker, and weekly utilization reports
        </p>
      </div>

      <TimeTracker
        entries={entries}
        projects={projects}
        totalMin={totalMin}
        billableMin={billableMin}
        weekMin={weekMin}
      />
    </div>
  );
}
