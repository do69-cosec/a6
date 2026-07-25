import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  CalendarDays, Plus, Clock, Video, MapPin, Users, Trash2, ExternalLink,
  Building2, FolderKanban, MoreVertical, Edit3, Copy, CheckCircle,
  XCircle, Search, Eye, Filter, Sparkles, User
} from "lucide-react";
import { useListClients, useListProjects, useListUsers } from "@workspace/api-client-react";
import { formatDateOnly, formatDateTime, formatTimeOnly, cn } from "@/lib/utils";

interface Attendee {
  id: string;
  userId?: string;
  name: string;
  email: string;
  status: string;
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meetingLink: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | string;
  clientId: string | null;
  projectId: string | null;
  clientName: string | null;
  projectName: string | null;
  organizerName: string;
  organizerId?: string | null;
  attendees: Attendee[];
}

function toDatetimeLocal(isoString?: string | null) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  // View Details Modal
  const [viewMeeting, setViewMeeting] = useState<Meeting | null>(null);

  // Delete Confirmation Dialog
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("SCHEDULED");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { data: clients } = useListClients();
  const { data: projects } = useListProjects();
  const { data: usersList } = useListUsers();

  const isUserAdminOrManager = user?.systemRole === "SUPER_ADMIN" || user?.systemRole === "MANAGER";

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/meetings", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load meetings");
      const data = await res.json();
      setMeetings(data || []);
    } catch (err: any) {
      toast.error(err.message || "Could not fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const resetForm = () => {
    setModalMode("CREATE");
    setEditingMeetingId(null);
    setTitle("");
    setDescription("");
    setMeetingLink("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setStatus("SCHEDULED");
    setClientId("");
    setProjectId("");
    setSelectedUserIds([]);
  };

  const openCreateDialog = () => {
    resetForm();
    // Default start time to next rounded hour
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setStartTime(toDatetimeLocal(now.toISOString()));
    setEndTime(toDatetimeLocal(end.toISOString()));
    setDialogOpen(true);
  };

  const openEditDialog = (m: Meeting) => {
    resetForm();
    setModalMode("EDIT");
    setEditingMeetingId(m.id);
    setTitle(m.title || "");
    setDescription(m.description || "");
    setMeetingLink(m.meetingLink || "");
    setStartTime(toDatetimeLocal(m.startTime));
    setEndTime(toDatetimeLocal(m.endTime));
    setLocation(m.location || "");
    setStatus(m.status || "SCHEDULED");
    setClientId(m.clientId || "");
    setProjectId(m.projectId || "");
    setSelectedUserIds(m.attendees?.map((a) => a.userId).filter(Boolean) as string[] || []);
    setDialogOpen(true);
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) {
      toast.error("Please fill in required fields (Title, Start Time, End Time)");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error("Please enter a valid start and end date/time");
      return;
    }

    if (end.getTime() <= start.getTime()) {
      toast.error("End date & time must be after start date & time");
      return;
    }

    setSubmitting(true);
    try {
      const url = modalMode === "EDIT" && editingMeetingId ? `/api/meetings/${editingMeetingId}` : "/api/meetings";
      const method = modalMode === "EDIT" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          meetingLink: meetingLink.trim() || null,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          location: location.trim() || null,
          status,
          clientId: clientId || null,
          projectId: projectId || null,
          attendeeUserIds: selectedUserIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save meeting");

      toast.success(
        modalMode === "EDIT"
          ? "Meeting updated successfully! 📝"
          : "Meeting scheduled & notifications sent! 📅"
      );

      setDialogOpen(false);
      resetForm();
      fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save meeting");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Meeting status updated to ${newStatus}`);
      fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteMeetingId) return;
    try {
      const res = await fetch(`/api/meetings/${deleteMeetingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete meeting");
      toast.success("Meeting deleted successfully");
      setDeleteMeetingId(null);
      fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete meeting");
    }
  };

  const copyMeetingLink = (link?: string | null) => {
    if (!link) {
      toast.error("No meeting link available to copy");
      return;
    }
    navigator.clipboard.writeText(link);
    toast.success("Meeting link copied to clipboard! 📋");
  };

  const toggleUserSelection = (uId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uId) ? prev.filter((id) => id !== uId) : [...prev, uId]
    );
  };

  // Filtered Meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.clientName && m.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.projectName && m.projectName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [meetings, searchQuery, statusFilter]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold text-[10px]">
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold text-[10px]">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold text-[10px]">
            Scheduled
          </Badge>
        );
    }
  };

  // Find client and project names for select display
  const selectedClient = clients?.find((c) => c.id === clientId);
  const selectedProject = projects?.find((p) => p.id === projectId);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 animated-fade-in max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading tracking-tight flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" /> Meeting Scheduling
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage client & team meetings with persistent schedules, edit controls, and notifications
            </p>
          </div>
          {isUserAdminOrManager && (
            <Button onClick={openCreateDialog} className="gap-2 shadow-xs shrink-0">
              <Plus className="h-4 w-4" /> Schedule Meeting
            </Button>
          )}
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-2xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings by title, client, or project..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg text-xs">
              {["ALL", "SCHEDULED", "COMPLETED", "CANCELLED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                    statusFilter === st
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {st.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Meetings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredMeetings.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border border-dashed">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30 text-primary" />
            <h3 className="text-base font-semibold text-foreground">No meetings found</h3>
            <p className="text-xs mt-1">
              {searchQuery || statusFilter !== "ALL"
                ? "Try adjusting your search query or status filters."
                : isUserAdminOrManager
                ? 'Click "Schedule Meeting" above to set up a new meeting with your team or client.'
                : "No upcoming meetings scheduled for you yet."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeetings.map((m) => (
              <Card
                key={m.id}
                className="shadow-2xs border border-border hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden group bg-card"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {getStatusBadge(m.status)}
                      {m.clientName && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-md truncate max-w-[130px] block border border-border">
                              🏢 {m.clientName}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{m.clientName}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Action Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="focus:outline-none">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setViewMeeting(m)}>
                          <Eye className="h-4 w-4 mr-2 text-blue-500" /> View Details
                        </DropdownMenuItem>

                        {m.meetingLink && (
                          <DropdownMenuItem onClick={() => copyMeetingLink(m.meetingLink)}>
                            <Copy className="h-4 w-4 mr-2 text-indigo-500" /> Copy Video Link
                          </DropdownMenuItem>
                        )}

                        {isUserAdminOrManager && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(m)}>
                              <Edit3 className="h-4 w-4 mr-2 text-amber-500" /> Edit Meeting
                            </DropdownMenuItem>

                            {m.status !== "COMPLETED" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(m.id, "COMPLETED")}>
                                <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> Mark as Completed
                              </DropdownMenuItem>
                            )}

                            {m.status !== "CANCELLED" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(m.id, "CANCELLED")}>
                                <XCircle className="h-4 w-4 mr-2 text-orange-500" /> Cancel Meeting
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteMeetingId(m.id)}
                              className="text-rose-600 dark:text-rose-400 focus:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Meeting
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardTitle
                    className="text-base font-semibold mt-2 leading-snug cursor-pointer hover:text-primary transition-colors line-clamp-2"
                    onClick={() => setViewMeeting(m)}
                  >
                    {m.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 text-xs flex-1 flex flex-col justify-between">
                  <div>
                    {m.description && (
                      <p className="text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}

                    <div className="space-y-1.5 text-foreground/90 font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>
                          {formatDateTime(m.startTime, "dd MMM yyyy, HH:mm")} ({m.durationMinutes} mins)
                        </span>
                      </div>

                      {m.meetingLink && (
                        <div className="flex items-center gap-2 min-w-0">
                          <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <a
                            href={m.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold truncate"
                          >
                            Join Video Call <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {m.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{m.location}</span>
                        </div>
                      )}

                      {m.projectName && (
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderKanban className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                          <Tooltip>
                            <TooltipTrigger className="text-left truncate">
                              <span className="truncate block">{m.projectName}</span>
                            </TooltipTrigger>
                            <TooltipContent>{m.projectName}</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attendees Chips */}
                  {m.attendees && m.attendees.length > 0 && (
                    <div className="pt-2 border-t border-border mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold mb-1.5">
                        <span className="uppercase tracking-wider">Attendees ({m.attendees.length})</span>
                        <span>Organizer: {m.organizerName}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.attendees.slice(0, 3).map((att) => (
                          <Badge key={att.id} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal truncate max-w-[120px]">
                            {att.name}
                          </Badge>
                        ))}
                        {m.attendees.length > 3 && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground font-medium">
                            +{m.attendees.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Meeting Details Dialog */}
        <Dialog open={!!viewMeeting} onOpenChange={(open) => !open && setViewMeeting(null)}>
          <DialogContent className="max-w-md">
            {viewMeeting && (
              <div className="space-y-4">
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(viewMeeting.status)}
                    <span className="text-xs text-muted-foreground font-medium">
                      Organized by {viewMeeting.organizerName}
                    </span>
                  </div>
                  <DialogTitle className="text-lg font-bold">{viewMeeting.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 text-xs">
                  {viewMeeting.description && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border">
                      <p className="font-semibold text-muted-foreground text-[10px] uppercase mb-1">Agenda / Description</p>
                      <p className="whitespace-pre-wrap leading-relaxed">{viewMeeting.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-foreground font-medium p-3 bg-muted/20 rounded-lg border border-border">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider mb-0.5">Start Time</span>
                      <span className="block text-sm font-bold text-foreground">{formatDateTime(viewMeeting.startTime, "dd MMM yyyy")}</span>
                      <span className="block text-xs font-semibold text-primary">{formatTimeOnly(viewMeeting.startTime, "HH:mm")}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider mb-0.5">End Time</span>
                      <span className="block text-sm font-bold text-foreground">{formatDateTime(viewMeeting.endTime, "dd MMM yyyy")}</span>
                      <span className="block text-xs font-semibold text-primary">{formatTimeOnly(viewMeeting.endTime, "HH:mm")}</span>
                    </div>
                  </div>

                  {viewMeeting.meetingLink && (
                    <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Video className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="font-medium truncate text-blue-700 dark:text-blue-300">
                          {viewMeeting.meetingLink}
                        </span>
                      </div>
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0 bg-background"
                        onClick={() => copyMeetingLink(viewMeeting.meetingLink)}
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                  )}

                  {viewMeeting.location && (
                    <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-border">
                      <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>{viewMeeting.location}</span>
                    </div>
                  )}

                  {viewMeeting.clientName && (
                    <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-border min-w-0">
                      <Building2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">Client: <strong>{viewMeeting.clientName}</strong></span>
                    </div>
                  )}

                  {viewMeeting.projectName && (
                    <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-border min-w-0">
                      <FolderKanban className="h-4 w-4 text-violet-500 shrink-0" />
                      <span className="truncate">Project: <strong>{viewMeeting.projectName}</strong></span>
                    </div>
                  )}

                  {/* Attendees */}
                  {viewMeeting.attendees && viewMeeting.attendees.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Invited Attendees ({viewMeeting.attendees.length})
                      </p>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {viewMeeting.attendees.map((a) => (
                          <div key={a.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">{a.name}</span>
                              {a.email && <span className="text-muted-foreground text-[10px] truncate">({a.email})</span>}
                            </div>
                            <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                              {a.status.toLowerCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  {isUserAdminOrManager && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const m = viewMeeting;
                        setViewMeeting(null);
                        openEditDialog(m);
                      }}
                      className="gap-1.5 text-xs"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit Meeting
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setViewMeeting(null)} className="text-xs">
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Schedule / Edit Meeting Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                {modalMode === "EDIT" ? "Edit Meeting Details" : "Schedule New Meeting"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveMeeting} className="space-y-4 mt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Meeting Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Q3 Strategy Review / Client Onboarding Call"
                  required
                />
              </div>

              {modalMode === "EDIT" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Meeting Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Start Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">End Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Meeting Link (Meet / Zoom)</Label>
                  <Input
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/xyz-abc"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Location / Room</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Conference Room A / Online"
                  />
                </div>
              </div>

              {/* Related Client & Project Dropdowns with truncation & tooltips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Related Client</Label>
                  <Select
                    value={clientId || "none"}
                    onValueChange={(val) => setClientId(val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="w-full">
                      <Tooltip>
                        <TooltipTrigger className="w-full text-left truncate">
                          <SelectValue placeholder="Select client">
                            {selectedClient ? selectedClient.companyName : undefined}
                          </SelectValue>
                        </TooltipTrigger>
                        {selectedClient && <TooltipContent>{selectedClient.companyName}</TooltipContent>}
                      </Tooltip>
                    </SelectTrigger>
                    <SelectContent className="max-w-[320px]">
                      <SelectItem value="none">None (Internal)</SelectItem>
                      {(clients ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="truncate max-w-[260px] block" title={c.companyName}>
                            {c.companyName}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Related Project</Label>
                  <Select
                    value={projectId || "none"}
                    onValueChange={(val) => setProjectId(val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="w-full">
                      <Tooltip>
                        <TooltipTrigger className="w-full text-left truncate">
                          <SelectValue placeholder="Select project">
                            {selectedProject ? selectedProject.name : undefined}
                          </SelectValue>
                        </TooltipTrigger>
                        {selectedProject && <TooltipContent>{selectedProject.name}</TooltipContent>}
                      </Tooltip>
                    </SelectTrigger>
                    <SelectContent className="max-w-[320px]">
                      <SelectItem value="none">None</SelectItem>
                      {(projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="truncate max-w-[260px] block" title={p.name}>
                            {p.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description / Agenda</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline discussion items, goals, links..."
                  rows={2}
                />
              </div>

              {/* Attendees Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Invite Team Members</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {selectedUserIds.length} selected
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-muted/20">
                  {(usersList ?? []).map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={cn(
                          "flex items-center justify-between text-xs p-1.5 rounded-md cursor-pointer transition-colors min-w-0",
                          isSelected ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                          <span className="truncate">{u.name}</span>
                          <span className="text-muted-foreground text-[10px] truncate">({u.email})</span>
                        </div>
                        <Badge variant={isSelected ? "default" : "outline"} className="text-[9px] shrink-0">
                          {isSelected ? "Invited" : "Select"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? modalMode === "EDIT" ? "Saving..." : "Scheduling..."
                    : modalMode === "EDIT" ? "Update Meeting" : "Schedule & Notify"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={!!deleteMeetingId} onOpenChange={(open) => !open && setDeleteMeetingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this meeting?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The meeting record will be permanently deleted from the system and attendees notified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMeeting} className="bg-rose-600 hover:bg-rose-700 text-white">
                Delete Meeting
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
