"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, CircleAlert, Clock, CreditCard, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "task" | "finance" | "content" | "sales" | "hr";
  read: boolean;
  href: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "Task Overdue",
    description: "Homepage redesign for Acme Corp is 2 days overdue.",
    time: "2 hrs ago",
    type: "task",
    read: false,
    href: "/tasks",
  },
  {
    id: "2",
    title: "Pending Content Approval",
    description: "Instagram video edit uploaded for Blink Brand by designer.",
    time: "4 hrs ago",
    type: "content",
    read: false,
    href: "/content",
  },
  {
    id: "3",
    title: "Invoice Overdue",
    description: "Invoice #INV-2026-004 to Stark Industries is outstanding.",
    time: "1 day ago",
    type: "finance",
    read: false,
    href: "/finance",
  },
  {
    id: "4",
    title: "New High Value Lead",
    description: "Wayne Enterprises requested website proposal.",
    time: "2 days ago",
    type: "sales",
    read: true,
    href: "/sales",
  },
];

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "task":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <ShieldAlert className="h-4 w-4" />
          </div>
        );
      case "finance":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <CreditCard className="h-4 w-4" />
          </div>
        );
      case "content":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
            <Sparkles className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
            <Clock className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors">
        <Bell className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground animate-pulse">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden border bg-card/90 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CircleAlert className="h-8 w-8 mb-2 opacity-55" />
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            notifications.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className={`border-b last:border-b-0 px-4 py-3 cursor-pointer outline-none focus:bg-accent/40 ${
                  !item.read ? "bg-primary/5" : ""
                }`}
                render={<Link href={item.href} onClick={() => markAsRead(item.id)} />}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="flex-shrink-0">{getIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold truncate ${!item.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  {!item.read && (
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary mt-1.5" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <div className="border-t p-2 text-center bg-muted/10">
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-primary transition-colors block py-1 font-medium">
            View all updates
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
