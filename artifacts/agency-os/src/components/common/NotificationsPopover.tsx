import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, Calendar, CheckCheck, Clock, CheckSquare, FolderKanban, Megaphone, ExternalLink, Palmtree } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface NotificationItem {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  referenceId?: string | null;
  referenceType?: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

function getToken() {
  return localStorage.getItem("agency_token") || localStorage.getItem("token") || localStorage.getItem("auth_token") || "";
}

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const fetchNotifications = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch("/api/notifications?limit=20", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore transient errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const token = getToken();
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchNotifications();
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const markAllAsRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const token = getToken();
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("All notifications marked as read");
      fetchNotifications();
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const token = getToken();
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchNotifications();
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead && !item.readAt) {
      markAsRead(item.id);
    }
    setOpen(false);

    const refType = (item.referenceType || item.type || "").toUpperCase();
    if (refType.includes("TASK")) {
      setLocation("/tasks");
    } else if (refType.includes("PROJECT")) {
      setLocation("/projects");
    } else if (refType.includes("MEETING")) {
      setLocation("/meetings");
    } else if (refType.includes("LEAVE")) {
      setLocation("/leaves");
    } else {
      setLocation("/notifications");
    }
  };

  const getNotificationIcon = (item: NotificationItem) => {
    const t = (item.referenceType || item.type || "").toUpperCase();
    if (t.includes("TASK")) return <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />;
    if (t.includes("PROJECT")) return <FolderKanban className="h-4 w-4 text-purple-500 shrink-0" />;
    if (t.includes("MEETING")) return <Calendar className="h-4 w-4 text-blue-500 shrink-0" />;
    if (t.includes("LEAVE")) return <Palmtree className="h-4 w-4 text-amber-500 shrink-0" />;
    if (t.includes("ANNOUNCEMENT")) return <Megaphone className="h-4 w-4 text-rose-500 shrink-0" />;
    return <Clock className="h-4 w-4 text-primary shrink-0" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
          <Bell className="h-4 w-4 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-1">
              <Bell className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-xs font-medium">No notifications yet</p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.isRead && !item.readAt;
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 text-xs transition-colors cursor-pointer relative group flex items-start justify-between gap-2 ${
                    isUnread ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {getNotificationIcon(item)}
                      <span className="font-semibold text-foreground truncate">{item.title}</span>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 ml-auto" />
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed break-words">{item.message}</p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        onClick={(e) => markAsRead(item.id, e)}
                        title="Mark read"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => deleteNotification(item.id, e)}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-2 border-t border-border bg-muted/20 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary font-medium flex items-center justify-center gap-1 h-8"
            onClick={() => {
              setOpen(false);
              setLocation("/notifications");
            }}
          >
            <span>View All Notifications</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
