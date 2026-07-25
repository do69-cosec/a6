import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bell, Check, Trash2, Calendar, CheckCheck, Clock, CheckSquare, 
  FolderKanban, Megaphone, Search, Filter, RefreshCw, Palmtree, Send, AlertTriangle, CheckCircle2
} from "lucide-react";
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

function getUser() {
  try {
    const raw = localStorage.getItem("agency_user") || localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  
  // Announcement Dialog state
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState("HIGH");
  const [announcementRole, setAnnouncementRole] = useState("ALL");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  const [, setLocation] = useLocation();
  const currentUser = getUser();
  const isManagerOrAdmin = currentUser?.role === "SUPER_ADMIN" || currentUser?.systemRole === "SUPER_ADMIN" || currentUser?.systemRole === "MANAGER" || currentUser?.role === "ADMIN";

  const fetchNotifications = async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.append("type", activeTab);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);
      if (unreadOnly) params.append("isRead", "false");
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      params.append("limit", "100");

      const res = await fetch(`/api/notifications?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, priorityFilter, unreadOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    const token = getToken();
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch {
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    const token = getToken();
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("All notifications marked as read");
      fetchNotifications();
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    const token = getToken();
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Notification deleted");
      fetchNotifications();
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm("Are you sure you want to clear all your notifications?")) return;
    const token = getToken();
    try {
      await fetch("/api/notifications/clear-all", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("All notifications cleared");
      fetchNotifications();
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      toast.error("Please fill in title and message");
      return;
    }

    const token = getToken();
    setSendingAnnouncement(true);
    try {
      const res = await fetch("/api/notifications/announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          message: announcementMessage.trim(),
          priority: announcementPriority,
          targetRole: announcementRole === "ALL" ? null : announcementRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to broadcast announcement");
      }

      toast.success("Announcement broadcasted successfully");
      setAnnouncementOpen(false);
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      fetchNotifications();
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast announcement");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("TASK")) return <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0" />;
    if (t.includes("PROJECT")) return <FolderKanban className="h-5 w-5 text-purple-500 shrink-0" />;
    if (t.includes("MEETING")) return <Calendar className="h-5 w-5 text-blue-500 shrink-0" />;
    if (t.includes("LEAVE")) return <Palmtree className="h-5 w-5 text-amber-500 shrink-0" />;
    if (t.includes("ANNOUNCEMENT")) return <Megaphone className="h-5 w-5 text-rose-500 shrink-0" />;
    return <Clock className="h-5 w-5 text-primary shrink-0" />;
  };

  const getPriorityBadge = (priority: string) => {
    const p = (priority || "LOW").toUpperCase();
    if (p === "URGENT") return <Badge variant="destructive" className="text-[10px] uppercase">Urgent</Badge>;
    if (p === "HIGH") return <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] uppercase">High</Badge>;
    if (p === "MEDIUM") return <Badge variant="secondary" className="text-[10px] uppercase">Medium</Badge>;
    return <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">Low</Badge>;
  };

  const handleItemNavigate = (item: NotificationItem) => {
    if (!item.isRead) markAsRead(item.id);
    const refType = (item.referenceType || item.type || "").toUpperCase();
    if (refType.includes("TASK")) setLocation("/tasks");
    else if (refType.includes("PROJECT")) setLocation("/projects");
    else if (refType.includes("MEETING")) setLocation("/meetings");
    else if (refType.includes("LEAVE")) setLocation("/leaves");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground font-bold px-2.5 py-0.5 text-xs rounded-full">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated with task assignments, project milestones, meeting schedules, and system announcements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchNotifications} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5 text-xs">
              <CheckCheck className="h-3.5 w-3.5" /> Mark All Read
            </Button>
          )}

          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllNotifications} className="gap-1.5 text-xs text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </Button>
          )}

          {isManagerOrAdmin && (
            <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground">
                  <Megaphone className="h-3.5 w-3.5" /> Broadcast Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-rose-500" /> Broadcast System Announcement
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSendAnnouncement} className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Title *</label>
                    <Input
                      placeholder="e.g. Q3 All-Hands Meeting & Holiday Schedule"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Message *</label>
                    <Textarea
                      placeholder="Write your announcement message for employees..."
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Priority</label>
                      <Select value={announcementPriority} onValueChange={setAnnouncementPriority}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Target Audience</label>
                      <Select value={announcementRole} onValueChange={setAnnouncementRole}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Employees</SelectItem>
                          <SelectItem value="EMPLOYEE">Employees Only</SelectItem>
                          <SelectItem value="MANAGER">Managers Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setAnnouncementOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={sendingAnnouncement} className="gap-1.5">
                      {sendingAnnouncement ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send Announcement
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: "ALL", label: "All" },
                { id: "TASK", label: "Tasks" },
                { id: "PROJECT", label: "Projects" },
                { id: "MEETING", label: "Meetings" },
                { id: "LEAVE", label: "Leaves" },
                { id: "ANNOUNCEMENT", label: "Announcements" },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="text-xs h-8 rounded-full px-3 shrink-0"
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Unread toggle & Priority Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={unreadOnly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`text-xs h-8 gap-1.5 ${unreadOnly ? "border-primary text-primary font-semibold" : ""}`}
              >
                <Filter className="h-3.5 w-3.5" />
                Unread Only
              </Button>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 text-xs w-[120px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications by title or message content..."
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="h-9 px-4 text-xs">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader className="py-3 px-4 border-b bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Notification Feed</span>
            <span className="text-xs font-normal text-muted-foreground">
              Showing {notifications.length} item{notifications.length === 1 ? "" : "s"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin opacity-40" />
              <p className="text-xs font-medium">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Bell className="h-10 w-10 mx-auto opacity-20" />
              <h3 className="font-semibold text-sm">No notifications found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {unreadOnly
                  ? "You have read all your notifications!"
                  : "Notifications will appear here when tasks are assigned, meetings scheduled, or announcements posted."}
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.isRead && !item.readAt;
              return (
                <div
                  key={item.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row items-start justify-between gap-4 ${
                    isUnread ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-background border shadow-xs mt-0.5">
                      {getNotificationIcon(item.type)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{item.title}</span>
                        {getPriorityBadge(item.priority)}
                        {isUnread && (
                          <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0">
                            New
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed break-words">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 pt-1">
                        <span>
                          {new Date(item.createdAt).toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>•</span>
                        <span className="uppercase font-mono text-[10px]">{item.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => handleItemNavigate(item)}
                    >
                      View Details
                    </Button>

                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => markAsRead(item.id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteNotification(item.id)}
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
