import { useState } from "react";
import {
  useListTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useListProjects, useListUsers, getListTasksQueryKey,
} from "@workspace/api-client-react";
import type { TaskInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WriteWithAI } from "@/components/common/WriteWithAI";
import { useForm, Controller } from "react-hook-form";
import {
  Plus, Trash2, Calendar, CheckSquare, Clock, AlertCircle, ListTodo, CheckCircle2,
  Edit3, Eye, FileText, ArrowRight, ArrowUpRight, HelpCircle
} from "lucide-react";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { cn, formatDateOnly, toInputDate } from "@/lib/utils";
import { SearchBar } from "@/components/common/SearchBar";
import { useAuth } from "@/App";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";

const COLUMNS = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "IN_REVIEW", label: "In Review" },
  { key: "DONE", label: "Done" },
];

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800" },
  MEDIUM: { label: "Medium", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900" },
  HIGH: { label: "High", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900" },
  URGENT: { label: "Urgent", className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900" },
};

const COL_STYLE: Record<string, string> = {
  TODO: "border-t-slate-300",
  IN_PROGRESS: "border-t-blue-400",
  IN_REVIEW: "border-t-amber-400",
  DONE: "border-t-emerald-400",
};

export const TaskApprovalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  MODIFIED: "MODIFIED",
} as const;

export default function TasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.systemRole === "SUPER_ADMIN";

  if (isAdmin) {
    return <AdminTasksView />;
  }

  return <EmployeeTasksView />;
}

// ──────────────────────────────────────────────────────────────────────
// 1. ADMIN TASKS VIEW (Full Control Dashboard)
// ──────────────────────────────────────────────────────────────────────
function AdminTasksView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("TODO");
  const [dragging, setDragging] = useState<string | null>(null);

  // View tabs: "board" (All Tasks), "pending" (Approval Queue), "requests" (My Requests Tracker)
  const [viewTab, setViewTab] = useState<"board" | "pending" | "requests">("board");

  // Dialog/modal states for administrative actions
  const [selectedTaskForActionState, setSelectedTaskForAction] = useState<any | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [adminEditDialogOpen, setAdminEditDialogOpen] = useState(false);

  const handleOpenAdminEditDialog = (task: any) => {
    setSelectedTaskForAction(task);
    setAdminEditDialogOpen(true);
  };

  const handleConfirmAdminEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTaskForAction) return;
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;
    const status = formData.get("status") as string;
    const projectId = formData.get("projectId") as string || null;
    const assigneeId = formData.get("assigneeId") as string || null;
    const dueDate = formData.get("dueDate") as string || null;

    updateMutation.mutate({
      id: selectedTaskForAction.id,
      data: {
        title,
        description,
        priority,
        status,
        projectId,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      } as any,
    }, {
      onSuccess: () => {
        toast.success("Task updated successfully!");
        setAdminEditDialogOpen(false);
      }
    });
  };

  const { data: tasks, isLoading } = useListTasks();
  const selectedTaskForAction = selectedTaskForActionState ? (tasks ?? []).find((t: any) => t.id === selectedTaskForActionState.id) || selectedTaskForActionState : null;
  const { data: projects } = useListProjects();
  const { data: users } = useListUsers();

  const createMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        toast.success("Task created successfully");
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setDialogOpen(false);
      },
      onError: () => toast.error("Failed to create task"),
    },
  });

  const updateMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: () => toast.error("Failed to update task"),
    },
  });

  const deleteMutation = useDeleteTask({
    mutation: {
      onSuccess: () => {
        toast.success("Task deleted successfully");
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: () => toast.error("Failed to delete task"),
    },
  });

  const { register, handleSubmit, control, reset, setValue } = useForm<TaskInput>({
    defaultValues: { title: "", status: "TODO", priority: "MEDIUM" },
  });

  const openAdd = (status: string) => {
    setDefaultStatus(status);
    reset({ title: "", status, priority: "MEDIUM" });
    setDialogOpen(true);
  };

  const onSubmit = (data: TaskInput) => {
    createMutation.mutate({ data });
  };

  const handleDrop = (taskId: string, newStatus: string) => {
    updateMutation.mutate({ id: taskId, data: { status: newStatus } as any });
  };

  const handleApproveTask = (taskId: string, requesterId?: string | null) => {
    updateMutation.mutate({
      id: taskId,
      data: {
        approvalStatus: "APPROVED",
        assigneeId: requesterId || user?.id,
      } as any,
    }, {
      onSuccess: () => {
        toast.success("Task request approved!");
      }
    });
  };

  const handleOpenRejectDialog = (task: any) => {
    setSelectedTaskForAction(task);
    setRejectionReasonText("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedTaskForAction) return;
    updateMutation.mutate({
      id: selectedTaskForAction.id,
      data: {
        approvalStatus: "REJECTED",
        rejectionReason: rejectionReasonText || null,
      } as any,
    }, {
      onSuccess: () => {
        toast.success("Task request rejected");
        setRejectDialogOpen(false);
      }
    });
  };

  const handleOpenModifyDialog = (task: any) => {
    setSelectedTaskForAction(task);
    setModifyDialogOpen(true);
  };

  const handleConfirmModify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTaskForAction) return;
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;
    const status = formData.get("status") as string;
    const projectId = formData.get("projectId") as string || null;
    const assigneeId = formData.get("assigneeId") as string || null;
    const dueDate = formData.get("dueDate") as string || null;

    updateMutation.mutate({
      id: selectedTaskForAction.id,
      data: {
        title,
        description,
        priority,
        status,
        projectId,
        assigneeId,
        dueDate: dueDate || null,
        approvalStatus: "MODIFIED",
      } as any,
    }, {
      onSuccess: () => {
        toast.success("Task modified and approved!");
        setModifyDialogOpen(false);
      }
    });
  };

  // Filter tasks based on Admin rules (or legacy tasks)
  const activeTasks = (tasks ?? []).filter(
    (t) => t.approvalStatus === "APPROVED" || t.approvalStatus === "MODIFIED" || !t.approvalStatus
  );

  const filteredActive = activeTasks.filter((t) => {
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        (t as any).assigneeName?.toLowerCase().includes(q) ||
        (t as any).projectName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const byStatus = (status: string) => filteredActive.filter((t) => t.status === status);

  const pendingTasks = (tasks ?? []).filter((t) => t.approvalStatus === "PENDING");
  const filteredPending = pendingTasks.filter((t) => {
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        (t as any).assigneeName?.toLowerCase().includes(q) ||
        (t as any).projectName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const myRequests = (tasks ?? []).filter((t) => t.requestedBy === user?.id || (t as any).createdBy === user?.id);
  const filteredRequests = myRequests.filter((t) => {
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        (t as any).assigneeName?.toLowerCase().includes(q) ||
        (t as any).projectName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalDone = activeTasks.filter((t) => t.status === "DONE").length;
  const totalInProg = activeTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const totalOverdue = activeTasks.filter((t) =>
    t.status !== "DONE" && t.dueDate && isBefore(parseISO(t.dueDate), startOfDay(new Date()))
  ).length;

  const taskStatChips = [
    { label: "Active Tasks", value: activeTasks.length, accent: "border-l-primary", icon: <ListTodo className="h-4 w-4" /> },
    { label: "In Progress", value: totalInProg, accent: "border-l-blue-500", icon: <Clock className="h-4 w-4" /> },
    { label: "Completed", value: totalDone, accent: "border-l-emerald-500", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Overdue", value: totalOverdue, accent: totalOverdue > 0 ? "border-l-rose-500" : "border-l-slate-300", icon: <AlertCircle className="h-4 w-4" /> },
  ];

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Rejected</Badge>;
      case "MODIFIED":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Modified</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Approved</Badge>;
    }
  };

  return (
    <div className="p-6 animated-fade-in space-y-6" id="admin-tasks-container">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading">Task Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {viewTab === "board" && `${filteredActive.length} of ${activeTasks.length} active company tasks shown`}
            {viewTab === "pending" && `${filteredPending.length} of ${pendingTasks.length} pending requests shown`}
            {viewTab === "requests" && `${filteredRequests.length} of ${myRequests.length} your requests shown`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border">
            <Button
              variant={viewTab === "board" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewTab("board")}
              className="text-xs font-semibold px-3 py-1.5 h-auto rounded-md"
              id="admin-tab-board"
            >
              All Tasks
            </Button>
            <Button
              variant={viewTab === "pending" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewTab("pending")}
              className="text-xs font-semibold px-3 py-1.5 h-auto rounded-md relative"
              id="admin-tab-pending"
            >
              Approval Queue
              {pendingTasks.length > 0 && (
                <span className="ml-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingTasks.length}
                </span>
              )}
            </Button>
            <Button
              variant={viewTab === "requests" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewTab("requests")}
              className="text-xs font-semibold px-3 py-1.5 h-auto rounded-md"
              id="admin-tab-requests"
            >
              My Requests Tracker
            </Button>
          </div>

          <SearchBar placeholder="Search tasks…" value={searchQuery} onChange={setSearchQuery} className="max-w-xs" />
          <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val ?? "ALL")}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priority</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => openAdd("TODO")} className="gap-2 btn-micro-anim" id="admin-create-task-btn">
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {taskStatChips.map(({ label, value, accent, icon }) => (
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

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <Card key={col.key}><CardContent className="p-4"><Skeleton className="h-48" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* 1. KANBAN BOARD VIEW */}
          {viewTab === "board" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {COLUMNS.map((col) => {
                const colTasks = byStatus(col.key);
                return (
                  <div
                    key={col.key}
                    className={cn("rounded-xl border border-border bg-muted/30 border-t-2 overflow-hidden", COL_STYLE[col.key])}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragging) {
                        handleDrop(dragging, col.key);
                        setDragging(null);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5 bg-card/60 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{col.label}</p>
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                          {colTasks.length}
                        </span>
                      </div>
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => openAdd(col.key)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="p-2 space-y-2 min-h-16">
                      {colTasks.map((task) => {
                        const pc = PRIORITY_CONFIG[task.priority ?? "MEDIUM"] ?? PRIORITY_CONFIG.MEDIUM;
                        const isOverdue = task.dueDate && task.status !== "DONE" && isBefore(parseISO(task.dueDate), startOfDay(new Date()));
                        const cardEl = (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={() => setDragging(task.id)}
                            onDragEnd={() => setDragging(null)}
                            className={cn(
                              "bg-card rounded-lg border p-3 shadow-xs cursor-grab active:cursor-grabbing group space-y-2 transition-shadow hover:shadow-sm relative",
                              isOverdue ? "border-rose-300 bg-rose-50/50 dark:bg-rose-950/10 border-l-[3px] border-l-rose-400" : "border-border"
                            )}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{task.title}</p>
                              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenAdminEditDialog(task)}
                                  data-testid={`edit-task-btn-${task.id}`}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteMutation.mutate({ id: task.id })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {task.projectName && (
                              <p className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded inline-block">{task.projectName}</p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-border/40">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className={cn("text-[10px] border px-1.5 py-0", pc.className)}>
                                  {pc.label}
                                </Badge>
                                {task.approvalStatus === "MODIFIED" && (
                                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300">
                                    Modified
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                {task.dueDate && (
                                  <div className={cn(
                                    "flex items-center gap-1 text-[10px]",
                                    isOverdue ? "text-rose-500 font-semibold" : "text-muted-foreground"
                                  )}>
                                    <Calendar className="h-2.5 w-2.5" />
                                    {formatDateOnly(task.dueDate, "dd MMM")}
                                  </div>
                                )}
                                {task.assigneeName && (
                                  <p className="text-[10px] text-muted-foreground truncate max-w-20">{task.assigneeName}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );

                        return task.description?.trim() ? (
                          <Tooltip key={task.id}>
                            <TooltipTrigger asChild>
                              {cardEl}
                            </TooltipTrigger>
                            <TooltipContent className="z-50 bg-slate-900 border border-slate-800 text-slate-100 dark:bg-slate-950 dark:border-slate-850 p-3 max-w-sm whitespace-pre-wrap rounded-lg shadow-xl leading-relaxed text-xs font-normal">
                              <div className="font-semibold text-slate-400 mb-1 border-b border-slate-800 pb-1">Description</div>
                              {task.description}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          cardEl
                        );
                      })}

                      {colTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                          <CheckSquare className="h-6 w-6 mb-1.5" />
                          <p className="text-xs font-medium">No tasks</p>
                          <p className="text-[10px] mt-0.5">Drag here or click +</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. PENDING REQUESTS / APPROVAL QUEUE */}
          {viewTab === "pending" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="admin-pending-requests-view">
              {filteredPending.map((task) => {
                const pc = PRIORITY_CONFIG[task.priority ?? "MEDIUM"] ?? PRIORITY_CONFIG.MEDIUM;
                return (
                  <Card key={task.id} className="border border-amber-200 dark:border-amber-950/40 bg-amber-50/10 dark:bg-amber-950/5 hover:shadow-xs transition-shadow">
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 uppercase text-[9px] tracking-wider px-1.5 py-0.5 font-bold">
                              Pending Approval
                            </Badge>
                            {task.priority && (
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 font-semibold", pc.className)}>
                                {pc.label}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-base font-semibold leading-snug pt-1">{task.title}</h3>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate({ id: task.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4 pt-0 space-y-3">
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/30 p-2.5 rounded-lg border border-border/30 font-normal">
                          {task.description}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-border/40 pt-3">
                        <div>
                          <span className="text-muted-foreground block font-medium">Requested By</span>
                          <span className="font-semibold text-foreground">{task.requestedByName || "Unknown"}</span>
                          {task.requestedByEmail && <span className="text-[10px] text-muted-foreground block truncate">{task.requestedByEmail}</span>}
                        </div>
                        <div>
                          <span className="text-muted-foreground block font-medium">Requested Date</span>
                          <span className="font-semibold text-foreground">
                            {task.requestedAt ? format(new Date(task.requestedAt), "dd MMM yyyy, hh:mm a") : "N/A"}
                          </span>
                        </div>
                        {task.projectName && (
                          <div className="col-span-2 mt-1">
                            <span className="text-muted-foreground block font-medium">Project</span>
                            <span className="font-semibold text-foreground">{task.projectName}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="col-span-2 mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">Due Date:</span>
                            <span className="font-semibold text-foreground">{format(new Date(task.dueDate), "dd MMM yyyy")}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-border/40 flex-wrap justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenModifyDialog(task)}
                          className="text-xs h-8 px-2.5 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20"
                        >
                          Modify & Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenRejectDialog(task)}
                          className="text-xs h-8 px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200 hover:border-rose-300 dark:text-rose-400 dark:hover:bg-rose-950/20"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveTask(task.id, task.requestedBy)}
                          className="text-xs h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 font-medium"
                        >
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredPending.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                  <CheckSquare className="h-8 w-8 mb-2 opacity-55" />
                  <p className="text-sm font-medium">All caught up! No pending requests to review.</p>
                </div>
              )}
            </div>
          )}

          {/* 3. MY REQUESTS TRACKER */}
          {viewTab === "requests" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="admin-requests-tracker-view">
              {filteredRequests.map((task) => {
                const pc = PRIORITY_CONFIG[task.priority ?? "MEDIUM"] ?? PRIORITY_CONFIG.MEDIUM;
                const cardEl = (
                  <Card key={task.id} className="border border-border bg-card hover:shadow-xs transition-shadow relative">
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getStatusBadge(task.approvalStatus)}
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", pc.className)}>
                              {pc.label}
                            </Badge>
                          </div>
                          <h3 className="text-sm font-semibold leading-snug pt-1">{task.title}</h3>
                        </div>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => handleOpenAdminEditDialog(task)}
                          data-testid={`edit-request-btn-${task.id}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4 pt-0 space-y-2.5 text-xs">
                      {task.description && (
                        <p className="text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded border border-border/20 font-normal">
                          {task.description}
                        </p>
                      )}
                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        {task.projectName && (
                          <p><span className="font-semibold text-foreground">Project:</span> {task.projectName}</p>
                        )}
                        {task.dueDate && (
                          <p><span className="font-semibold text-foreground">Due Date:</span> {format(new Date(task.dueDate), "dd MMM yyyy")}</p>
                        )}
                        <p><span className="font-semibold text-foreground">Requested At:</span> {task.requestedAt ? format(new Date(task.requestedAt), "dd MMM yyyy, hh:mm a") : "N/A"}</p>
                        {task.approvalStatus === "REJECTED" && task.rejectionReason && (
                          <div className="mt-2 p-2 rounded bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 text-rose-700 dark:text-rose-300">
                            <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">Rejection remarks:</span>
                            {task.rejectionReason}
                          </div>
                        )}
                        {(task.approvalStatus === "APPROVED" || task.approvalStatus === "MODIFIED") && task.approvedByName && (
                          <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            Approved by {task.approvedByName} {task.approvedAt ? `on ${format(new Date(task.approvedAt), "dd MMM, hh:mm a")}` : ""}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );

                return task.description?.trim() ? (
                  <Tooltip key={task.id}>
                    <TooltipTrigger asChild>
                      {cardEl}
                    </TooltipTrigger>
                    <TooltipContent className="z-50 bg-slate-900 border border-slate-800 text-slate-100 dark:bg-slate-950 dark:border-slate-850 p-3 max-w-sm whitespace-pre-wrap rounded-lg shadow-xl leading-relaxed text-xs font-normal">
                      <div className="font-semibold text-slate-400 mb-1 border-b border-slate-800 pb-1">Description</div>
                      {task.description}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  cardEl
                );
              })}
              {filteredRequests.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                  <CheckSquare className="h-8 w-8 mb-2 opacity-55" />
                  <p className="text-sm font-medium">No requests tracked.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ADMIN ADD/CREATE DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <WriteWithAI
              context="task"
              onFill={(fields) => {
                if (fields.title) setValue("title", fields.title, { shouldDirty: true });
                if (fields.description) setValue("description", fields.description, { shouldDirty: true });
                if (fields.priority) setValue("priority", fields.priority, { shouldDirty: true });
                if (fields.dueDate) setValue("dueDate", fields.dueDate, { shouldDirty: true });
              }}
            />
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input {...register("title", { required: "Required" })} placeholder="Task title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller control={control} name="status" render={({ field }) => (
                  <Select value={field.value ?? defaultStatus} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
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
                <Label>Project</Label>
                <Controller control={control} name="projectId" render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No project</SelectItem>
                      {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Controller control={control} name="assigneeId" render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Assign to" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {(users ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input {...register("dueDate")} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register("description")} rows={3} placeholder="Task details..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="font-semibold">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADMIN REJECT REMARKS DIALOG */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Provide optional remarks for rejecting the task request <strong>"{selectedTaskForAction?.title}"</strong>.
            </p>
            <div className="space-y-1.5">
              <Label>Rejection Remarks</Label>
              <Textarea
                placeholder="Remarks why this is rejected..."
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmReject} disabled={updateMutation.isPending} className="font-semibold">
                Confirm Rejection
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADMIN MODIFY & APPROVE DIALOG */}
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify & Approve Task Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmModify} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input name="title" defaultValue={selectedTaskForAction?.title || ""} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={selectedTaskForAction?.status || "TODO"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select name="priority" defaultValue={selectedTaskForAction?.priority || "MEDIUM"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select name="projectId" defaultValue={selectedTaskForAction?.projectId || ""}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Select name="assigneeId" defaultValue={selectedTaskForAction?.assigneeId || selectedTaskForAction?.requestedBy || ""}>
                  <SelectTrigger><SelectValue placeholder="Assign to" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {(users ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input name="dueDate" type="date" defaultValue={selectedTaskForAction?.dueDate ? selectedTaskForAction.dueDate.split("T")[0] : ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea name="description" rows={3} defaultValue={selectedTaskForAction?.description || ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModifyDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="font-semibold">Approve with Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADMIN EDIT TASK DIALOG */}
      <Dialog open={adminEditDialogOpen} onOpenChange={setAdminEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form key={selectedTaskForAction?.id} onSubmit={handleConfirmAdminEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input name="title" defaultValue={selectedTaskForAction?.title || ""} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={selectedTaskForAction?.status || "TODO"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select name="priority" defaultValue={selectedTaskForAction?.priority || "MEDIUM"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select name="projectId" defaultValue={selectedTaskForAction?.projectId || ""}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Select name="assigneeId" defaultValue={selectedTaskForAction?.assigneeId || ""}>
                  <SelectTrigger><SelectValue placeholder="Assign to" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {(users ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input name="dueDate" type="date" defaultValue={selectedTaskForAction?.dueDate ? selectedTaskForAction.dueDate.split("T")[0] : ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea name="description" rows={3} defaultValue={selectedTaskForAction?.description || ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdminEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="font-semibold">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 2. EMPLOYEE TASKS VIEW (Secure, Minimalist Workspace)
// ──────────────────────────────────────────────────────────────────────
function EmployeeTasksView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [employeeEditDialogOpen, setEmployeeEditDialogOpen] = useState(false);
  const [selectedTaskForActionState, setSelectedTaskForAction] = useState<any | null>(null);
  const [employeeApprovedEditDialogOpen, setEmployeeApprovedEditDialogOpen] = useState(false);

  const handleOpenEmployeeApprovedEditDialog = (task: any) => {
    setSelectedTaskForAction(task);
    setEmployeeApprovedEditDialogOpen(true);
  };

  const handleConfirmEmployeeApprovedEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTaskForAction) return;
    const formData = new FormData(e.currentTarget);
    const description = formData.get("description") as string;
    const status = formData.get("status") as string;

    updateRequestMutation.mutate({
      id: selectedTaskForAction.id,
      data: {
        description,
        status,
      } as any,
    }, {
      onSuccess: () => {
        toast.success("Task updated successfully!");
        setEmployeeApprovedEditDialogOpen(false);
      }
    });
  };

  const { data: tasks, isLoading } = useListTasks();
  const selectedTaskForAction = selectedTaskForActionState ? (tasks ?? []).find((t: any) => t.id === selectedTaskForActionState.id) || selectedTaskForActionState : null;
  const { data: projects } = useListProjects();

  const createRequestMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        toast.success("Task Request Submitted. Waiting for Admin Approval.");
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setRequestDialogOpen(false);
      },
      onError: () => toast.error("Failed to submit task request"),
    },
  });

  const updateRequestMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: () => toast.error("Failed to update task request"),
    },
  });

  const deleteRequestMutation = useDeleteTask({
    mutation: {
      onSuccess: () => {
        toast.success("Task request deleted successfully");
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: () => toast.error("Failed to delete task request"),
    },
  });

  const { register, handleSubmit, control, reset, setValue } = useForm<TaskInput>({
    defaultValues: { title: "", status: "TODO", priority: "MEDIUM" },
  });

  const openRequestDialog = () => {
    reset({ title: "", status: "TODO", priority: "MEDIUM", description: "" });
    setRequestDialogOpen(true);
  };

  const onSubmitRequest = (data: TaskInput) => {
    createRequestMutation.mutate({ data });
  };

  const handleUpdateStatus = (taskId: string, newStatus: string) => {
    updateRequestMutation.mutate({
      id: taskId,
      data: { status: newStatus } as any,
    }, {
      onSuccess: () => {
        toast.success("Task status updated");
      }
    });
  };

  const handleOpenEmployeeEditDialog = (task: any) => {
    setSelectedTaskForAction(task);
    setEmployeeEditDialogOpen(true);
  };

  const handleConfirmEmployeeEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTaskForAction) return;
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;
    const projectId = formData.get("projectId") as string || null;
    const dueDate = formData.get("dueDate") as string || null;

    updateRequestMutation.mutate({
      id: selectedTaskForAction.id,
      data: {
        title,
        description,
        priority,
        projectId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      } as any,
    }, {
      onSuccess: () => {
        toast.success("Task request updated successfully!");
        setEmployeeEditDialogOpen(false);
      }
    });
  };

  // --- Strict Personal Filtering ---

  // 1. My Assigned Tasks: only tasks assigned to the logged-in employee that are approved/modified (or legacy)
  const assignedTasks = (tasks ?? []).filter(
    (t) => t.assigneeId === user?.id && (t.approvalStatus === "APPROVED" || t.approvalStatus === "MODIFIED" || !t.approvalStatus)
  );

  const filteredAssigned = assignedTasks.filter((t) => {
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        (t as any).projectName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // 2. My Task Requests: only requests submitted by this logged-in employee
  const myRequests = (tasks ?? []).filter((t) => t.requestedBy === user?.id);

  const filteredRequests = myRequests.filter((t) => {
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        (t as any).projectName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">Pending Approval</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900">Rejected</Badge>;
      case "MODIFIED":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900">Modified</Badge>;
      default:
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">Approved</Badge>;
    }
  };

  return (
    <div className="p-6 animated-fade-in space-y-8" id="employee-workspace-container">
      {/* 1. HEADER SECTION */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">My Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Personal task workspace for <span className="font-semibold text-primary">{user?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SearchBar placeholder="Search my tasks…" value={searchQuery} onChange={setSearchQuery} className="max-w-xs" />
          <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val ?? "ALL")}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priority</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openRequestDialog} className="gap-2 btn-micro-anim bg-primary hover:bg-primary/95 font-semibold" id="employee-request-task-btn">
            <Plus className="h-4 w-4" /> Request Task
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 2. MY ASSIGNED TASKS (LEFT / LARGER COL) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                <h2 className="text-lg font-bold font-heading text-foreground">My Assigned Tasks</h2>
              </div>
              <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
                {filteredAssigned.length} Tasks
              </Badge>
            </div>

            <div className="space-y-3" id="employee-assigned-tasks-list">
              {filteredAssigned.map((task) => {
                const pc = PRIORITY_CONFIG[task.priority ?? "MEDIUM"] ?? PRIORITY_CONFIG.MEDIUM;
                const isOverdue = task.dueDate && task.status !== "DONE" && isBefore(parseISO(task.dueDate), startOfDay(new Date()));
                const cardEl = (
                  <Card
                    key={task.id}
                    className={cn(
                      "transition-all duration-200 border bg-card hover:shadow-xs group relative",
                      isOverdue ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/10 dark:bg-rose-950/5 border-l-[3px] border-l-rose-500" : "border-border"
                    )}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", pc.className)}>
                              {pc.label}
                            </Badge>
                            {task.projectName && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                {task.projectName}
                              </Badge>
                            )}
                            {task.approvalStatus === "MODIFIED" && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-1.5 py-0 dark:bg-blue-950/40 dark:text-blue-400">
                                Modified by Admin
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-base font-semibold leading-snug pt-1 text-foreground">{task.title}</h3>
                        </div>

                        {/* Interactive Status Selector & Edit Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEmployeeApprovedEditDialog(task)}
                            data-testid={`employee-edit-btn-${task.id}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Select
                            value={task.status ?? "TODO"}
                            onValueChange={(newVal) => handleUpdateStatus(task.id, newVal)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COLUMNS.map((c) => (
                                <SelectItem key={c.key} value={c.key} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-sm text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/30 font-normal">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border/40 text-muted-foreground flex-wrap gap-2">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-semibold text-foreground">Assigned by:</span>
                          <span>Admin</span>
                        </div>

                        {task.dueDate && (
                          <div className={cn(
                            "flex items-center gap-1.5 text-[11px]",
                            isOverdue ? "text-rose-600 font-semibold" : ""
                          )}>
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Due {format(new Date(task.dueDate), "dd MMM yyyy")}</span>
                            {isOverdue && <span className="bg-rose-100 text-rose-700 text-[9px] px-1 rounded-full uppercase font-bold tracking-wider dark:bg-rose-950 dark:text-rose-400">Overdue</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );

                return task.description?.trim() ? (
                  <Tooltip key={task.id}>
                    <TooltipTrigger asChild>
                      {cardEl}
                    </TooltipTrigger>
                    <TooltipContent className="z-50 bg-slate-900 border border-slate-800 text-slate-100 dark:bg-slate-950 dark:border-slate-850 p-3 max-w-sm whitespace-pre-wrap rounded-lg shadow-xl leading-relaxed text-xs font-normal">
                      <div className="font-semibold text-slate-400 mb-1 border-b border-slate-800 pb-1">Description</div>
                      {task.description}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  cardEl
                );
              })}

              {filteredAssigned.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60 bg-muted/10 border border-dashed rounded-xl">
                  <CheckCircle2 className="h-10 w-10 mb-2 opacity-50 text-emerald-500" />
                  <p className="text-sm font-bold text-foreground">All Caught Up!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No tasks assigned to you right now.</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. MY TASK REQUESTS TRACKER (RIGHT / SMALLER COL) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500 shrink-0" />
                <h2 className="text-lg font-bold font-heading text-foreground">My Requests Tracker</h2>
              </div>
              <Badge variant="outline" className="font-semibold text-xs px-2.5 py-0.5">
                {filteredRequests.length} Requests
              </Badge>
            </div>

            <div className="space-y-3" id="employee-requests-list">
              {filteredRequests.map((task) => {
                const pc = PRIORITY_CONFIG[task.priority ?? "MEDIUM"] ?? PRIORITY_CONFIG.MEDIUM;
                const isPending = task.approvalStatus === "PENDING";
                const cardEl = (
                  <Card key={task.id} className="border border-border bg-card hover:shadow-xs transition-shadow relative">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getStatusBadge(task.approvalStatus)}
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 uppercase font-semibold", pc.className)}>
                              {pc.label}
                            </Badge>
                          </div>
                          <h3 className="text-sm font-semibold leading-snug pt-1 text-foreground">{task.title}</h3>
                        </div>

                        {/* Edit & Delete actions ONLY on Pending Requests */}
                        {isPending && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEmployeeEditDialog(task)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteRequestMutation.mutate({ id: task.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/10 p-2 rounded-lg border border-border/20 font-normal">
                          {task.description}
                        </p>
                      )}

                      <div className="space-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                        {task.projectName && (
                          <p><span className="font-semibold text-foreground">Project:</span> {task.projectName}</p>
                        )}
                        {task.dueDate && (
                          <p><span className="font-semibold text-foreground">Requested Due Date:</span> {format(new Date(task.dueDate), "dd MMM yyyy")}</p>
                        )}
                        <p><span className="font-semibold text-foreground">Submitted At:</span> {task.requestedAt ? format(new Date(task.requestedAt), "dd MMM yyyy, hh:mm a") : "N/A"}</p>

                        {/* Rejection Remarks display */}
                        {task.approvalStatus === "REJECTED" && task.rejectionReason && (
                          <div className="mt-2.5 p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950 text-rose-700 dark:text-rose-300">
                            <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">Rejection remarks:</span>
                            {task.rejectionReason}
                          </div>
                        )}

                        {/* Admin approval info */}
                        {(task.approvalStatus === "APPROVED" || task.approvalStatus === "MODIFIED") && task.approvedByName && (
                          <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            Approved by {task.approvedByName} {task.approvedAt ? `on ${format(new Date(task.approvedAt), "dd MMM, hh:mm a")}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );

                return task.description?.trim() ? (
                  <Tooltip key={task.id}>
                    <TooltipTrigger asChild>
                      {cardEl}
                    </TooltipTrigger>
                    <TooltipContent className="z-50 bg-slate-900 border border-slate-800 text-slate-100 dark:bg-slate-950 dark:border-slate-850 p-3 max-w-sm whitespace-pre-wrap rounded-lg shadow-xl leading-relaxed text-xs font-normal">
                      <div className="font-semibold text-slate-400 mb-1 border-b border-slate-800 pb-1">Description</div>
                      {task.description}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  cardEl
                );
              })}

              {filteredRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50 bg-muted/5 border border-dashed rounded-xl">
                  <FileText className="h-8 w-8 mb-1.5 opacity-40 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">No Requests Found</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Submit a task request via the "+ Request Task" button.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE REQUEST TASK DIALOG */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-4 mt-2">
            <WriteWithAI
              context="task"
              onFill={(fields) => {
                if (fields.title) setValue("title", fields.title, { shouldDirty: true });
                if (fields.description) setValue("description", fields.description, { shouldDirty: true });
                if (fields.priority) setValue("priority", fields.priority, { shouldDirty: true });
                if (fields.dueDate) setValue("dueDate", fields.dueDate, { shouldDirty: true });
              }}
            />
            <div className="space-y-1.5">
              <Label>Task Title</Label>
              <Input {...register("title", { required: "Required" })} placeholder="What task needs to be completed?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Controller control={control} name="projectId" render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No project</SelectItem>
                      {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm flex items-center select-none text-muted-foreground font-medium">
                  {user?.name || "Assign to myself"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input {...register("dueDate")} type="date" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description / Motivation</Label>
              <Textarea {...register("description")} rows={3} placeholder="Provide details or motivation for this task request..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createRequestMutation.isPending} className="font-semibold bg-primary hover:bg-primary/95 text-primary-foreground">
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EMPLOYEE EDIT PENDING REQUEST DIALOG */}
      <Dialog open={employeeEditDialogOpen} onOpenChange={setEmployeeEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Request</DialogTitle>
          </DialogHeader>
          <form key={selectedTaskForAction?.id} onSubmit={handleConfirmEmployeeEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Task Title</Label>
              <Input name="title" defaultValue={selectedTaskForAction?.title || ""} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select name="priority" defaultValue={selectedTaskForAction?.priority || "MEDIUM"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select name="projectId" defaultValue={selectedTaskForAction?.projectId || ""}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input name="dueDate" type="date" defaultValue={selectedTaskForAction?.dueDate ? selectedTaskForAction.dueDate.split("T")[0] : ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Description / Motivation</Label>
              <Textarea name="description" rows={3} defaultValue={selectedTaskForAction?.description || ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmployeeEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateRequestMutation.isPending} className="font-semibold">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EMPLOYEE EDIT APPROVED TASK DIALOG */}
      <Dialog open={employeeApprovedEditDialogOpen} onOpenChange={setEmployeeApprovedEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Approved Task</DialogTitle>
          </DialogHeader>
          <form key={selectedTaskForAction?.id} onSubmit={handleConfirmEmployeeApprovedEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Task Title (Locked)</Label>
              <Input value={selectedTaskForAction?.title || ""} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority (Locked)</Label>
                <Input value={selectedTaskForAction?.priority || "MEDIUM"} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>Project (Locked)</Label>
                <Input value={selectedTaskForAction?.projectName || "No Project"} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={selectedTaskForAction?.status || "TODO"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date (Locked)</Label>
                <Input type="date" value={selectedTaskForAction?.dueDate ? selectedTaskForAction.dueDate.split("T")[0] : ""} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea name="description" rows={4} defaultValue={selectedTaskForAction?.description || ""} placeholder="Add details or progress updates..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmployeeApprovedEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateRequestMutation.isPending} className="font-semibold bg-primary hover:bg-primary/95 text-primary-foreground">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
