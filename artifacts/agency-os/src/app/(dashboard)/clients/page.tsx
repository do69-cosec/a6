import { getCurrentUser } from "@/lib/access";
import { canPerform } from "@/lib/access";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ClientsManager } from "@/components/clients/clients-manager";

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients & CRM</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add and manage all client accounts. As Super Admin you have full control.
        </p>
      </div>
      <ClientsManager
        clients={clients}
        canCreate={canPerform(user.systemRole, "clients", "create")}
        canEdit={canPerform(user.systemRole, "clients", "edit")}
        canDelete={canPerform(user.systemRole, "clients", "delete")}
      />
    </div>
  );
}
