import { redirect } from "next/navigation";
import { getCurrentUser, canPerform } from "@/lib/access";
import { prisma } from "@/lib/db";
import { ContractProjectBoard } from "@/components/projects/contract-project-board";

export const metadata = {
  title: "Projects | Blink Beyond",
  description: "Manage client content contracts and track deliverable progress",
};

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { companyName: true } },
        manager: { select: { name: true } },
        contract: true,
        deliverables: { select: { type: true, status: true } },
        _count: { select: { tasks: true, deliverables: true } },
      },
    }),
    prisma.client.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Projects
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage client content contracts, track deliverables, and view schedules
        </p>
      </div>
      <ContractProjectBoard
        projects={projects}
        clients={clients}
        canManage={canPerform(user.systemRole, "projects", "create")}
      />
    </div>
  );
}
