import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { TeamManager } from "@/components/team/team-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Key } from "lucide-react";

export const metadata = {
  title: "Team & Roles | Blink Beyond",
  description: "Manage employee accounts, logins and role-based access",
};

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.systemRole)) {
    redirect("/dashboard");
  }

  const members = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Team & Access Control
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create employee accounts with unique credentials and assign role-based permissions
        </p>
      </div>

      {/* Admin Identity Card */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-violet-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{user.name}</p>
                <Badge className="text-[10px] bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400">
                  Super Admin
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{user.email} · Full access to all modules</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
              <Key className="h-3 w-3" />
              You control access for {members.length} accounts
            </div>
          </div>
        </CardContent>
      </Card>

      <TeamManager members={members} canManage={isAdmin(user.systemRole)} />
    </div>
  );
}
