import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import { getCurrentUser, canPerform } from "@/lib/access";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = session.user.systemRole;
  const showAll = isAdmin(role) || canPerform(role, "tasks", "create");

  const [tasks, projects, assignees] = await Promise.all([
    prisma.task.findMany({
      where: showAll ? undefined : { assigneeId: user.id },
      include: { project: { select: { name: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.project.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Task Board</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {showAll
              ? "All team tasks — drag to update status"
              : "Your assigned tasks"}
          </p>
        </div>
        {canPerform(role, "tasks", "create") && (
          <TaskCreateDialog projects={projects} assignees={assignees} />
        )}
      </div>
      <KanbanBoard
        initialTasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          project: t.project,
        }))}
      />
    </div>
  );
}
