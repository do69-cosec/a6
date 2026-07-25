import { redirect } from "next/navigation";
import { getCurrentUser, canPerform } from "@/lib/access";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { ContentManager } from "@/components/content/content-manager";

export default async function ContentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [posts, clients, assignees] = await Promise.all([
    prisma.contentPost.findMany({
      include: { client: { select: { companyName: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.client.findMany({ select: { id: true, companyName: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Calendar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create posts, move through workflow, and admin-approve for publishing
        </p>
      </div>
      <ContentManager
        posts={posts}
        clients={clients}
        assignees={assignees}
        canManage={canPerform(user.systemRole, "content", "create")}
        isAdmin={isAdmin(user.systemRole)}
      />
    </div>
  );
}
