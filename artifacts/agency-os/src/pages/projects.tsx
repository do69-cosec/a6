import { useState } from "react";
import {
  useListProjects, useCreateProject, useUpdateProject, useDeleteProject,
  useListClients, useListUsers, getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import {
  Plus, FolderKanban, Trash2, Pencil, Calendar, PlayCircle, CheckCircle2, PauseCircle,
  UserCheck, UserX, Clock, User, AlertCircle, FileText, Check, X
} from "lucide-react";
import { SearchBar } from "@/components/common/SearchBar";
import { cn, formatDateOnly } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/App";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not Started", className: "bg-slate-100 text-slate-700 border-slate-200" },
  PLANNING: { label: "Planning", className: "bg-purple-100 text-purple-700 border-purple-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-100 text-blue-700 border-blue-200" },
  UNDER_REVIEW: { label: "Under Review", className: "bg-amber-100 text-amber-700 border-amber-200" },
  COMPLETED: { label: "Completed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ON_HOLD: { label: "On Hold", className: "bg-orange-100 text-orange-700 border-orange-200" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-100 text-rose-700 border-rose-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-slate-100 text-slate-600" },
  MEDIUM: { label: "Medium", className: "bg-blue-100 text-blue-700" },
  HIGH: { label: "High", className: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Urgent", className: "bg-rose-100 text-rose-700" },
};

const ASSIGNMENT_STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  PENDING: {
    label: "Pending Acceptance",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    icon: UserCheck,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    icon: UserX,
  },
};

interface ProjectFormData {
  name: string;
  description?: string;
  clientId?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  dueDate?: string;
  assignedTo?: string;
  assignmentDescription?: string;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.systemRole === "SUPER_ADMIN";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectProjectId, setRejectProjectId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  const { data: projects, isLoading } = useListProjects();
  const { data: clients } = useListClients();
  const { data: users } = useListUsers();

  const createMutation = useCreateProject({
    mutation: {
      onSuccess: () => {
        toast.success("Project created");
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setDialogOpen(false);
      },
      onError: (err: any) => toast.error(err?.message || "Failed to create project"),
    },
  });

  const updateMutation = useUpdateProject({
    mutation: {
      onSuccess: () => {
        toast.success("Project updated");
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setDialogOpen(false);
        setEditId(null);
      },
      onError: (err: any) => toast.error(err?.message || "Failed to update project"),
    },
  });

  const deleteMutation = useDeleteProject({
    mutation: {
      onSuccess: () => {
        toast.success("Project deleted");
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Failed to delete project"),
    },
  });

  const { register, handleSubmit, control, reset } = useForm<ProjectFormData>({
    defaultValues: { name: "", description: "", status: "NOT_STARTED", priority: "MEDIUM" },
  });

  const openAdd = () => {
    reset({
      name: "",
      description: "",
      status: "NOT_STARTED",
      priority: "MEDIUM",
      clientId: "",
      startDate: "",
      dueDate: "",
      assignedTo: "",
      assignmentDescription: "",
    });
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (p: NonNullable<typeof projects>[number]) => {
    const freshP = (projects ?? []).find((proj) => proj.id === p.id) || p;
    setEditId(freshP.id);
    reset({
      name: freshP.name,
      description: freshP.description ?? "",
      status: freshP.status ?? "NOT_STARTED",
      priority: freshP.priority ?? "MEDIUM",
      clientId: freshP.clientId ?? undefined,
      startDate: freshP.startDate ? freshP.startDate.split("T")[0] : undefined,
      dueDate: freshP.dueDate ? freshP.dueDate.split("T")[0] : undefined,
      assignedTo: freshP.assignedTo ?? undefined,
      assignmentDescription: freshP.assignmentDescription ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ProjectFormData) => {
    const payload: any = {
      name: data.name,
      description: data.description || null,
      status: data.status || "NOT_STARTED",
      priority: data.priority || "MEDIUM",
      clientId: data.clientId && data.clientId !== "none" && data.clientId !== "" ? data.clientId : null,
      startDate: data.startDate || null,
      dueDate: data.dueDate || null,
      assignedTo: data.assignedTo && data.assignedTo !== "none" && data.assignedTo !== "" ? data.assignedTo : null,
      assignmentDescription: data.assignmentDescription || null,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const handleAcceptAssignment = (p: NonNullable<typeof projects>[number]) => {
    updateMutation.mutate({
      id: p.id,
      data: { assignmentStatus: "ACCEPTED" } as any,
    });
  };

  const openRejectDialog = (p: NonNullable<typeof projects>[number]) => {
    setRejectProjectId(p.id);
    setRejectionReasonText("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectionReasonText.trim()) {
      toast.error("Rejection reason is mandatory");
      return;
    }
    if (!rejectProjectId) return;

    updateMutation.mutate(
      {
        id: rejectProjectId,
        data: {
          assignmentStatus: "REJECTED",
          rejectionReason: rejectionReasonText.trim(),
        } as any,
      },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setRejectProjectId(null);
          setRejectionReasonText("");
        },
      }
    );
  };

  const filtered = (projects ?? []).filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchClient = p.clientName?.toLowerCase().includes(q);
      const matchAssigned = p.assignedEmployeeName?.toLowerCase().includes(q);
      if (!matchName && !matchClient && !matchAssigned) return false;
    }
    return true;
  });

  const totalInProgress = (projects ?? []).filter((p) => p.status === "IN_PROGRESS").length;
  const totalCompleted = (projects ?? []).filter((p) => p.status === "COMPLETED").length;
  const totalOnHold = (projects ?? []).filter((p) => p.status === "ON_HOLD").length;

  const projectStatChips = [
    { label: "Total Projects", value: projects?.length ?? 0, accent: "border-l-primary", icon: <FolderKanban className="h-4 w-4" /> },
    { label: "In Progress", value: totalInProgress, accent: "border-l-blue-500", icon: <PlayCircle className="h-4 w-4" /> },
    { label: "Completed", value: totalCompleted, accent: "border-l-emerald-500", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "On Hold", value: totalOnHold, accent: "border-l-amber-400", icon: <PauseCircle className="h-4 w-4" /> },
  ];

  const STATUS_BORDER: Record<string, string> = {
    NOT_STARTED: "border-l-slate-400",
    PLANNING: "border-l-purple-500",
    IN_PROGRESS: "border-l-blue-500",
    UNDER_REVIEW: "border-l-amber-400",
    COMPLETED: "border-l-emerald-500",
    ON_HOLD: "border-l-orange-400",
    CANCELLED: "border-l-rose-400",
  };

  return (
    <div className="p-6 space-y-6 animated-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} of {projects?.length ?? 0} projects shown
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 btn-micro-anim" data-testid="add-project-btn">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {projectStatChips.map(({ label, value, accent, icon }) => (
          <div key={label} className={cn("bg-card border border-l-[3px] rounded-xl p-4 scale-hover shadow-xs", accent)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold font-heading mt-1">{value}</p>
              </div>
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">{icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar
          placeholder="Search projects or assignees…"
          value={search}
          onChange={setSearch}
          className="flex-1 min-w-48 max-w-72"
        />
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "ALL")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-32" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex p-4 rounded-2xl bg-muted/60 mb-4">
            <FolderKanban className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground">No projects found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter !== "ALL"
              ? "Try adjusting your search or status filter"
              : "Create your first project to get started"}
          </p>
          {!search && statusFilter === "ALL" && (
            <Button onClick={openAdd} className="mt-4 gap-2 btn-micro-anim" size="sm">
              <Plus className="h-4 w-4" /> New Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const sc = STATUS_CONFIG[p.status ?? "NOT_STARTED"] ?? STATUS_CONFIG.NOT_STARTED;
            const pc = PRIORITY_CONFIG[p.priority ?? "MEDIUM"] ?? PRIORITY_CONFIG.MEDIUM;
            const borderAccent = STATUS_BORDER[p.status ?? "NOT_STARTED"] ?? "border-l-slate-400";
            const isOverdue = p.dueDate && p.status !== "COMPLETED" && p.status !== "CANCELLED" &&
              new Date(p.dueDate) < new Date();

            const isAssignedToMe = p.assignedTo === user?.id;
            const isPendingForMe = isAssignedToMe && p.assignmentStatus === "PENDING";
            const assignStatusInfo = p.assignmentStatus ? ASSIGNMENT_STATUS_CONFIG[p.assignmentStatus.toUpperCase()] : null;
            const AssignIcon = assignStatusInfo?.icon;

            return (
              <Card key={p.id} className={cn("scale-hover border-l-[3px] group flex flex-col justify-between", borderAccent)}>
                <CardContent className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold line-clamp-2 text-sm">{p.name}</p>
                        {p.clientName && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.clientName}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="z-50 bg-slate-900 border border-slate-800 text-slate-100 dark:bg-slate-950 dark:border-slate-850 p-3 max-w-sm whitespace-pre-wrap rounded-lg shadow-xl leading-relaxed text-xs font-normal">
                              {p.description && p.description.trim() ? p.description : "No description available."}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: p.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant="outline" className={sc.className + " text-[11px] border"}>{sc.label}</Badge>
                      <Badge variant="outline" className={pc.className + " text-[11px]"}>{pc.label}</Badge>
                      {assignStatusInfo && (
                        <Badge variant="outline" className={cn("text-[11px] border gap-1 items-center font-medium", assignStatusInfo.className)}>
                          {AssignIcon && <AssignIcon className="h-3 w-3" />}
                          {assignStatusInfo.label}
                        </Badge>
                      )}
                    </div>

                    {/* Assignment details section */}
                    {(p.assignedEmployeeName || p.assignedTo) && (
                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground flex items-center gap-1 font-medium">
                            <User className="h-3.5 w-3.5 text-primary shrink-0" />
                            Assigned To:
                          </span>
                          <span className="font-semibold text-foreground truncate">{p.assignedEmployeeName || "Employee"}</span>
                        </div>

                        {p.assignmentDescription && (
                          <div className="pt-1 border-t border-border/40 text-muted-foreground leading-relaxed">
                            <span className="font-medium text-foreground">Note: </span>
                            {p.assignmentDescription}
                          </div>
                        )}

                        {p.assignmentStatus === "REJECTED" && p.rejectionReason && (
                          <div className="pt-1.5 border-t border-rose-200/60 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-start gap-1.5 font-medium">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <div>
                              <span>Rejection Reason: </span>
                              <span className="font-normal italic text-rose-700 dark:text-rose-300">{p.rejectionReason}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(p.startDate || p.dueDate) && (
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs pt-2 border-t border-border/50",
                        isOverdue ? "text-rose-500 font-medium" : "text-muted-foreground"
                      )}>
                        <Calendar className="h-3 w-3 shrink-0" />
                        {p.startDate && <span>{formatDateOnly(p.startDate, "dd MMM")}</span>}
                        {p.startDate && p.dueDate && <span>—</span>}
                        {p.dueDate && <span>{formatDateOnly(p.dueDate, "dd MMM yyyy")}</span>}
                        {isOverdue && <span className="ml-auto bg-rose-100 text-rose-600 dark:bg-rose-950/40 px-1.5 py-0.5 rounded text-[10px] font-semibold">Overdue</span>}
                      </div>
                    )}
                  </div>

                  {/* Accept / Reject actions for assigned employee */}
                  {isPendingForMe && (
                    <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Assignment Pending Action
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/50 gap-1 font-semibold"
                          onClick={() => handleAcceptAssignment(p)}
                          disabled={updateMutation.isPending}
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/50 gap-1 font-semibold"
                          onClick={() => openRejectDialog(p)}
                          disabled={updateMutation.isPending}
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Project Name</Label>
              <Input {...register("name", { required: "Required" })} placeholder="Website Redesign" data-testid="project-name" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Controller
                  control={control}
                  name="clientId"
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? "" : val)}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No client</SelectItem>
                        {(clients ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Assigned Employee</Label>
                <Controller
                  control={control}
                  name="assignedTo"
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? "" : val)}>
                      <SelectTrigger><SelectValue placeholder="Assign employee" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {(users ?? []).map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.systemRole})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller control={control} name="status" render={({ field }) => (
                  <Select value={field.value ?? "NOT_STARTED"} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Controller control={control} name="priority" render={({ field }) => (
                  <Select value={field.value ?? "MEDIUM"} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input {...register("startDate")} type="date" />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input {...register("dueDate")} type="date" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Assignment Description / Notes for Employee</Label>
              <Textarea {...register("assignmentDescription")} rows={2} placeholder="Scope, requirements, or special instructions for the assigned employee..." />
            </div>

            <div className="space-y-1.5">
              <Label>General Description</Label>
              <Textarea {...register("description")} rows={2} placeholder="General project overview..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="save-project-btn">
                {editId ? "Save Changes" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mandatory Rejection Reason Modal */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" /> Reject Project Assignment
            </DialogTitle>
            <DialogDescription>
              Please provide a clear reason for rejecting this project assignment. The project creator and administrators will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            <Label className="font-semibold">Rejection Reason <span className="text-rose-500">*</span></Label>
            <Textarea
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              placeholder="Explain why you are unable to take on this project assignment..."
              rows={4}
              className="border-rose-200 focus:border-rose-400 focus:ring-rose-400"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={updateMutation.isPending || !rejectionReasonText.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
