import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAccessibleModules } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/login");

  const [accessibleModules, settings] = await Promise.all([
    getAccessibleModules(user.systemRole),
    prisma.agencySettings.findUnique({ where: { id: "default" } }),
  ]);

  const primaryColor = settings?.primaryColor ?? "#6366f1";

  return (
    <SidebarProvider>
      <style dangerouslySetInnerHTML={{
        __html: `:root { --primary: ${primaryColor} !important; --sidebar-primary: ${primaryColor} !important; }`
      }} />
      <AppSidebar
        accessibleModules={accessibleModules}
        userName={user.name}
        roleLabel={ROLE_LABELS[user.systemRole]}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 bg-card/60 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm font-semibold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Blink Beyond Agency OS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <CommandPalette />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
