import { notFound, redirect } from "next/navigation";
import { getCurrentUser, canPerform } from "@/lib/access";
import { prisma } from "@/lib/db";
import { ProjectDetailView } from "@/components/projects/project-detail-view";
import { ContractDetailView } from "@/components/projects/contract-detail-view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { client: { select: { companyName: true } } } });
  return { title: project ? `${project.name} | Blink Beyond` : "Project Not Found" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      manager: { select: { id: true, name: true, email: true } },
      contract: true,
      deliverables: {
        orderBy: [{ month: "asc" }, { sortOrder: "asc" }],
      },
      tasks: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  if (!project) notFound();

  // If this project has a contract, show the contract detail view
  if (project.contract) {
    const festiveDays = await prisma.festiveDay.findMany({
      orderBy: { date: "asc" },
    });

    return (
      <ContractDetailView
        project={{
          ...project,
          contract: project.contract,
          deliverables: project.deliverables,
        }}
        festiveDays={festiveDays}
      />
    );
  }

  // Otherwise, show the generic project detail view with kanban
  const [activities, teamMembers, clients] = await Promise.all([
    prisma.projectActivity.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.client.findMany({ select: { id: true, companyName: true } }),
  ]);

  // Fetch user names for activities
  const userIds = activities.map(a => a.userId).filter(Boolean) as string[];
  const activityUsers = userIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  }) : [];
  const userMap = new Map(activityUsers.map(u => [u.id, u.name]));

  const enrichedActivities = activities.map(a => ({
    id: a.id,
    action: a.action,
    createdAt: a.createdAt,
    user: { name: a.userId ? (userMap.get(a.userId) ?? "System") : "System" },
  }));

  return (
    <ProjectDetailView
      project={{ ...project, activities: enrichedActivities }}
      teamMembers={teamMembers}
      clients={clients}
      canManage={canPerform(user.systemRole, "projects", "edit")}
    />
  );
}
