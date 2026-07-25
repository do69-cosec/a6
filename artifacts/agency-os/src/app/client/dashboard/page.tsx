import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ClientDashboard } from "@/components/client/client-dashboard";

export default async function ClientDashboardPage() {
  const cookieStore = await cookies();
  const clientSession = cookieStore.get("client_session");

  if (!clientSession?.value) {
    redirect("/client/portal");
  }

  const clientId = clientSession.value;

  const [client, projects, proposals, agreements, invoices, contentPosts] = await Promise.all([
    prisma.client.findUniqueOrThrow({
      where: { id: clientId },
    }),
    prisma.project.findMany({
      where: { clientId },
      include: { milestones: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.proposal.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agreement.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contentPost.findMany({
      where: {
        clientId,
        status: { in: ["IN_REVIEW", "ADMIN_APPROVED", "SCHEDULED", "PUBLISHED"] },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <ClientDashboard
      client={client}
      projects={projects}
      proposals={proposals}
      agreements={agreements}
      invoices={invoices}
      contentPosts={contentPosts}
    />
  );
}
