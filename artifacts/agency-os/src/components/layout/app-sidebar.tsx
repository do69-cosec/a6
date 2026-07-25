"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  TrendingUp,
  Clock,
  Wallet,
  CalendarDays,
  UserCog,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  Building2,
  UserPlus,
  FileText,
  ScrollText,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/lib/constants";
import type { ModuleKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const GROUPS: {
  title: string;
  items: {
    module: ModuleKey;
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}[] = [
  {
    title: "Overview",
    items: [
      { module: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations & CRM",
    items: [
      { module: "clients", href: "/clients", label: "Clients & CRM", icon: Building2 },
      { module: "sales", href: "/sales", label: "Sales Funnel", icon: TrendingUp },
      { module: "projects", href: "/projects", label: "Projects", icon: FolderKanban },
      { module: "tasks", href: "/tasks", label: "Tasks", icon: CheckSquare },
      { module: "time", href: "/time", label: "Time Tracking", icon: Clock },
      { module: "content", href: "/content", label: "Content Calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Build Doc",
    items: [
      { module: "finance", href: "/build-doc/invoice-maker", label: "Invoice Maker", icon: FileText },
      { module: "finance", href: "/build-doc/quotation-maker", label: "Quotation Maker", icon: ScrollText },
    ],
  },
  {
    title: "People & HR",
    items: [
      { module: "attendance", href: "/attendance", label: "Attendance", icon: Users },
      { module: "hr", href: "/hr", label: "HR Module", icon: UserCog },
      { module: "team", href: "/team", label: "Team & Roles", icon: UserPlus },
    ],
  },
  {
    title: "Insights & Configuration",
    items: [
      { module: "reports", href: "/reports", label: "Reports", icon: BarChart3 },
      { module: "automation", href: "/automation", label: "Automation", icon: Zap },
      { module: "settings", href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const BADGES: Record<string, { count: number; color: string }> = {
  "/sales": { count: 3, color: "bg-amber-500/10 text-amber-500 border border-amber-500/25" },
  "/tasks": { count: 5, color: "bg-red-500/10 text-red-500 border border-red-500/25" },
  "/content": { count: 1, color: "bg-indigo-500/10 text-indigo-500 border border-indigo-500/25" },
  "/attendance": { count: 2, color: "bg-sky-500/10 text-sky-500 border border-sky-500/25" },
};

export function AppSidebar({
  accessibleModules,
  userName,
  roleLabel,
}: {
  accessibleModules: ModuleKey[];
  userName: string;
  roleLabel: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-sidebar-border/60 bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/40 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-violet-500 text-primary-foreground font-extrabold text-base shadow-sm ring-1 ring-primary/20">
            BB
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight text-foreground truncate">{APP_NAME}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80 mt-0.5">Agency OS</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {GROUPS.map((group) => {
          // Filter items based on access permissions
          const visibleItems = group.items.filter((item) =>
            accessibleModules.includes(item.module)
          );

          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.title} className="px-3">
              <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    const badge = BADGES[item.href];

                    return (
                      <SidebarMenuItem key={item.href} className="relative group/menu-item">
                        {active && (
                          <span className="absolute left-[-12px] top-1 bottom-1 w-1.5 rounded-r-full bg-gradient-to-b from-primary to-violet-500 animate-in fade-in slide-in-from-left duration-300 z-50" />
                        )}
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={active}
                          className={cn(
                            "relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-primary/10 text-primary hover:bg-primary/15"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <Icon className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200 group-hover/menu-item:scale-110",
                            active ? "text-primary" : "text-muted-foreground/80"
                          )} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {badge && (
                          <SidebarMenuBadge className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums pointer-events-none transition-all duration-200",
                            badge.color
                          )}>
                            {badge.count}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 p-4 bg-muted/5">
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20 shrink-0">
            {userName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background hover:bg-accent/40 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer shadow-sm hover:shadow transition-all duration-200"
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
