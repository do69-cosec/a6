import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { canPerform } from "@/lib/access";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Calendar, Phone, Mail, FileText, Heart, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/login");

  // Fetch client details with all relations
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: true,
      documents: { orderBy: { createdAt: "desc" } },
      projects: { 
        orderBy: { updatedAt: "desc" },
        include: { manager: { select: { name: true } } } 
      },
      invoices: { orderBy: { createdAt: "desc" } },
      contentPosts: { 
        orderBy: { scheduledAt: "desc" },
        include: { assignee: { select: { name: true } } }
      },
    },
  });

  if (!client) notFound();

  // Fetch audit logs for this client
  const auditLogs = await prisma.auditLog.findMany({
    where: { 
      entity: "Client",
      entityId: id
    },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
    take: 10,
  });

  const canEdit = canPerform(user.systemRole, "clients", "edit");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link href="/clients" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to clients
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{client.companyName}</h1>
                <Badge variant={client.health === "GREEN" ? "default" : client.health === "YELLOW" ? "secondary" : "destructive"}>
                  {client.health}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Client profile page · Category: <span className="font-semibold text-foreground uppercase">{client.category}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <ClientDetailTabs
        client={client}
        auditLogs={auditLogs}
        canEdit={canEdit}
      />
    </div>
  );
}
