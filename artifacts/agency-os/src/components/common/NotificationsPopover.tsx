import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, Calendar, CheckCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDateOnly } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore transient fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
      });
      fetchNotifications();
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
      });
      toast.success("All notifications marked as read");
      fetchNotifications();
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
      });
      fetchNotifications();
    } catch {
      toast.error("Failed to delete notification");
    }
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
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3 text-xs transition-colors relative group flex items-start justify-between gap-2 ${
                  !item.readAt ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/40"
                }`}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.type === "MEETING" ? (
                      <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <span className="font-semibold text-foreground truncate">{item.title}</span>
                    {!item.readAt && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 ml-auto" />
                    )}
                  </div>
                  <p className="text-muted-foreground leading-relaxed break-words">{item.message}</p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {formatDateOnly(item.createdAt, "dd MMM yyyy, HH:mm")}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!item.readAt && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => markAsRead(item.id)}
                      title="Mark read"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteNotification(item.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
