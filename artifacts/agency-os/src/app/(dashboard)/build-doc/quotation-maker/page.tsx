import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/db";
import { QuotationMaker } from "@/components/finance/quotation-maker";

export default async function QuotationMakerPage() {
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
    <QuotationMaker
      clients={clients}
      agency={{
        companyName: settings?.companyName ?? "Blink Beyond",
        gstNumber: settings?.gstNumber,
      }}
    />
  );
}
