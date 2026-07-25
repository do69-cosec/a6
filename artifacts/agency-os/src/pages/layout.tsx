import { useAuth, useTheme } from "@/App";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Users, TrendingUp, FolderKanban, CheckSquare,
  Calendar, Receipt, FileText, ShoppingCart, ClipboardList, Clock, Umbrella,
  UserCog, Settings, Sun, Moon, LogOut, ChevronRight, Briefcase, Flame, Sheet, CalendarDays,
} from "lucide-react";
import { NotificationsPopover } from "@/components/common/NotificationsPopover";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    label: "Operations & CRM",
    items: [
      { label: "Clients", href: "/clients", icon: <Users className="h-4 w-4" /> },
      { label: "Sales Funnel", href: "/sales", icon: <TrendingUp className="h-4 w-4" /> },
      { label: "Projects", href: "/projects", icon: <FolderKanban className="h-4 w-4" /> },
      { label: "Tasks", href: "/tasks", icon: <CheckSquare className="h-4 w-4" /> },
      { label: "Meetings", href: "/meetings", icon: <CalendarDays className="h-4 w-4 text-blue-500" /> },
      { label: "Content Calendar", href: "/content", icon: <Calendar className="h-4 w-4" /> },
      { label: "Hawan Hub", href: "/hawan", icon: <Flame className="h-4 w-4 text-orange-500" /> },
    ],
  },
  {
    label: "Finance & Docs",
    items: [
      { label: "Invoices",        href: "/invoices",        icon: <Receipt className="h-4 w-4" /> },
      { label: "Quotations",      href: "/quotations",      icon: <FileText className="h-4 w-4" /> },
      { label: "Purchase Orders", href: "/purchase-orders", icon: <ShoppingCart className="h-4 w-4" /> },
      { label: "Proposals",       href: "/proposals",       icon: <ClipboardList className="h-4 w-4" /> },
      { label: "Excel Reports",   href: "/excel-reports",   icon: <Sheet className="h-4 w-4 text-green-600" /> },
    ],
  },
  {
    label: "People & HR",
    items: [
      { label: "Attendance", href: "/attendance", icon: <Clock className="h-4 w-4" /> },
      { label: "Leave Management", href: "/leaves", icon: <Umbrella className="h-4 w-4" /> },
      { label: "Team & Roles", href: "/users", icon: <UserCog className="h-4 w-4" /> },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const isAdmin = user?.systemRole === "SUPER_ADMIN";
  const userAllowedModules = user?.allowedModules ?? [];

  const filteredNavGroups = navGroups.map(group => {
    const filteredItems = group.items.filter(item => {
      if (item.href === "/dashboard") return true;

      // Strictly Admin-only paths
      const adminOnlyPaths = [
        "/settings",
        "/users",
        "/purchase-orders",
      ];

      if (adminOnlyPaths.includes(item.href)) {
        return isAdmin;
      }

      if (isAdmin) return true;

      if (item.href === "/hawan" || item.href === "/meetings") return true;

      if (item.href === "/excel-reports") {
        return userAllowedModules.includes("invoices") ||
               userAllowedModules.includes("quotations") ||
               userAllowedModules.includes("proposals");
      }

      const pathMap: Record<string, string> = {
        "/clients": "clients",
        "/sales": "sales",
        "/projects": "projects",
        "/tasks": "tasks",
        "/content": "content",
        "/invoices": "invoices",
        "/quotations": "quotations",
        "/proposals": "proposals",
        "/attendance": "attendance",
        "/leaves": "leaves",
      };

      const moduleKey = pathMap[item.href];
      if (!moduleKey) return false;
      return userAllowedModules.includes(moduleKey);
    });

    return {
      ...group,
      items: filteredItems,
    };
  }).filter(group => group.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar overflow-y-auto">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border shrink-0">
          <div className="h-8 w-8 rounded-lg bg-transparent flex items-center justify-center overflow-hidden">
            <img src="/logo.png" className="h-full w-full object-cover" alt="Blink Beyond" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight font-heading">Blink Beyond</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Agency OS</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-5">
          {filteredNavGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location === item.href || location.startsWith(item.href + "/") || location.startsWith(item.href + "?");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={`nav-${item.href.replace("/", "")}`}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <span className={cn(isActive ? "text-current" : "text-muted-foreground group-hover:text-current")}>
                        {item.icon}
                      </span>
                      {item.label}
                      {isActive && <ChevronRight className="h-3 w-3 ml-auto opacity-60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-48">
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === "light" ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                {theme === "light" ? "Dark mode" : "Light mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background flex flex-col">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-border px-6 flex items-center justify-between shrink-0 bg-card/40 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="capitalize">{location.replace("/", "") || "dashboard"}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsPopover />
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-lg">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
