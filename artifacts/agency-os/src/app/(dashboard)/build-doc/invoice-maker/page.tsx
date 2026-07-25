import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/db";
import { InvoiceMaker } from "@/components/finance/invoice-maker";

export default async function InvoiceMakerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [clients, settings] = await Promise.all([
    prisma.client.findMany({
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        email: true,
        phone: true,
        billingAddress: true,
        gstin: true,
      },
      orderBy: { companyName: "asc" },
    }),
    prisma.agencySettings.findFirst(),
  ]);

  return (
    <InvoiceMaker
      clients={clients}
      agency={{
        companyName: settings?.companyName ?? "Blink Beyond",
        gstNumber: settings?.gstNumber,
        defaultGstRate: settings?.defaultGstRate ?? 18,
      }}
    />
  );
}
