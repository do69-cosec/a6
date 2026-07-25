import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsForm } from "@/components/settings/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Settings | Blink Beyond",
  description: "Agency configuration, branding, integrations, and audit trail",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [settings, recentAudit] = await Promise.all([
    prisma.agencySettings.findUniqueOrThrow({ where: { id: "default" } }),
    prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          System Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Agency branding, tax configuration, integrations, and audit trail
        </p>
      </div>

      {isAdmin(user.systemRole) ? (
        <SettingsPanel settings={settings} />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Only Super Admin can edit system settings. Contact your agency owner.
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">System Audit Log</CardTitle>
            <Badge variant="outline" className="text-xs">Last 20 actions</Badge>
          </div>
        </CardHeader>
        <CardContent className="max-h-80 overflow-y-auto">
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No audit entries yet</p>
          ) : (
            <div className="space-y-1">
              {recentAudit.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/30 rounded-lg px-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {(log.user?.name ?? "S")[0]}
                    </div>
                    <span>
                      <span className="font-medium">{log.user?.name ?? "System"}</span>
                      {" · "}
                      <span className="text-muted-foreground">{log.action}</span>
                      {" "}
                      <span className="font-medium text-foreground">{log.entity}</span>
                    </span>
                  </div>
                  <span className="text-muted-foreground shrink-0 ml-4">
                    {new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
