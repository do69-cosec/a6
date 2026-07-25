import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AutomationManager } from "@/components/automation/automation-manager";

export const metadata = {
  title: "Automation | Blink Beyond",
  description: "Workflow rules, triggers and automated actions",
};

export default async function AutomationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rules = await prisma.automationRule.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Automation & Integrations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visual workflow rules — proposal → contract, content → publish, invoice reminders
        </p>
      </div>

      <AutomationManager
        rules={rules.map(r => ({
          ...r,
          executionCount: 0,
          lastRunAt: null,
        }))}
        isAdmin={isAdmin(user.systemRole)}
      />
    </div>
  );
}
