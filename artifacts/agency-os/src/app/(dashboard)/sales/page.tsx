import { redirect } from "next/navigation";
import { getCurrentUser, canPerform } from "@/lib/access";
import { prisma } from "@/lib/db";
import { SalesFunnel } from "@/components/sales/sales-funnel";

export const metadata = {
  title: "Sales Funnel | Blink Beyond",
  description: "Manage leads and track deals through the sales pipeline",
};

export default async function SalesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [leads, owners] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { updatedAt: "desc" },
      include: { owner: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Sales Funnel
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track leads, move stages, and auto-create clients when a deal is Won
        </p>
      </div>
      <SalesFunnel
        leads={leads}
        owners={owners}
        canManage={canPerform(user.systemRole, "sales", "create")}
      />
    </div>
  );
}
