"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Clock, AlertCircle, Plus, Pencil,
  Trash2, PlayCircle, Calendar, Users, DollarSign, Target,
  BarChart3, ChevronRight, MessageSquare, Activity
} from "lucide-react";
import { toast } from "sonner";
import { createTask, updateTask, deleteTask } from "@/lib/actions/tasks";
import { updateProject } from "@/lib/actions/projects";
import type { ActionResult } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitButton } from "@/components/forms/submit-button";
import { Textarea } from "@/components/ui/textarea";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  sortOrder: number;
  assignee: { id: string; name: string } | null;
};

type Project = {
  id: string;
  name: string;
  status: string;
  progress: number;
  budget: number | null;
  serviceType: string | null;
  startDate: Date | null;
  endDate: Date | null;
  client: { id: string; companyName: string; contactPerson: string | null };
  manager: { id: string; name: string; email: string } | null;
  tasks: Task[];
  activities: { id: string; action: string; createdAt: Date; user: { name: string } }[];
};

const TASK_COLS = [
  { id: "TODO", label: "To Do", color: "border-slate-300 bg-slate-50 dark:bg-slate-900/30" },
  { id: "IN_PROGRESS", label: "In Progress", color: "border-blue-300 bg-blue-50 dark:bg-blue-900/20" },
  { id: "IN_REVIEW", label: "In Review", color: "border-purple-300 bg-purple-50 dark:bg-purple-900/20" },
  { id: "DONE", label: "Done", color: "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-slate-500 bg-slate-100",
  MEDIUM: "text-amber-600 bg-amber-100",
  HIGH: "text-orange-600 bg-orange-100",
  URGENT: "text-red-600 bg-red-100 font-bold",
};

const initial: ActionResult = { ok: false, error: "" };

function TaskForm({ task, projectId, teamMembers, onSuccess }: {
  task?: Task; projectId: string; teamMembers: { id: string; name: string }[]; onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(task ? updateTask : createTask, initial);
  useEffect(() => {
    if (state.ok) { onSuccess(); toast.success(task ? "Task updated" : "Task created"); }
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state, task, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {task && <input type="hidden" name="id" value={task.id} />}
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-2">
        <Label>Task Title *</Label>
        <Input name="title" required defaultValue={task?.title} placeholder="e.g. Design Instagram carousel" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea name="description" rows={2} defaultValue={task?.description ?? ""} placeholder="Task details..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <select name="status" defaultValue={task?.status ?? "TODO"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {TASK_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <select name="priority" defaultValue={task?.priority ?? "MEDIUM"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Assignee</Label>
          <select name="assigneeId" defaultValue={task?.assignee?.id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Unassigned</option>
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input name="dueDate" type="date" defaultValue={task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""} />
        </div>
      </div>
      <SubmitButton label={task ? "Save Task" : "Create Task"} />
    </form>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width="100" height="100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
      <circle
        cx="50" cy="50" r={r} fill="none" strokeWidth="8"
        stroke={progress >= 100 ? "#10b981" : progress >= 60 ? "#3b82f6" : progress >= 30 ? "#f59e0b" : "#ef4444"}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-700"
      />
    </svg>
  );
}

export function ProjectDetailView({ project, teamMembers, clients, canManage }: {
  project: Project;
  teamMembers: { id: string; name: string }[];
  clients: { id: string; companyName: string }[];
  canManage: boolean;
}) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [progressEdit, setProgressEdit] = useState(false);
  const [progressVal, setProgressVal] = useState(project.progress);

  const tasksByCol = TASK_COLS.map(col => ({
    ...col,
    tasks: project.tasks.filter(t => t.status === col.id),
  }));

  const done = project.tasks.filter(t => t.status === "DONE").length;
  const total = project.tasks.length;

  async function handleDeleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    const r = await deleteTask(id);
    if (r.ok) toast.success("Task deleted");
    else toast.error(r.error);
  }

  async function saveProgress() {
    const fd = new FormData();
    fd.set("id", project.id);
    fd.set("name", project.name);
    fd.set("clientId", project.client.id);
    fd.set("status", project.status);
    fd.set("progress", progressVal.toString());
    if (project.serviceType) fd.set("serviceType", project.serviceType);
    if (project.budget) fd.set("budget", project.budget.toString());
    const r = await updateProject({ ok: false, error: "" }, fd);
    if (r.ok) { toast.success("Progress updated"); setProgressEdit(false); }
    else toast.error(r.error);
  }

  const isOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== "COMPLETED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Link href={`/clients/${project.client.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {project.client.companyName}
              </Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">{project.serviceType ?? "General"}</span>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canManage && (
            <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
                <TaskForm projectId={project.id} teamMembers={teamMembers} onSuccess={() => setTaskOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Ring */}
        <Card className="col-span-1 flex flex-col items-center justify-center py-4">
          <div className="relative">
            <ProgressRing progress={project.progress} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">{project.progress}%</span>
              <span className="text-[10px] text-muted-foreground">Done</span>
            </div>
          </div>
          {canManage && (
            <button onClick={() => setProgressEdit(true)} className="text-xs text-muted-foreground hover:text-primary mt-1 underline-offset-2 hover:underline">
              Update
            </button>
          )}
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Tasks</span>
            </div>
            <p className="text-2xl font-bold">{done}/{total}</p>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Budget</span>
            </div>
            <p className="text-2xl font-bold">{project.budget ? `₹${(project.budget / 1000).toFixed(0)}K` : "—"}</p>
            <p className="text-xs text-muted-foreground">allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Deadline</span>
            </div>
            <p className={`text-sm font-bold ${isOverdue ? "text-red-500" : ""}`}>
              {project.endDate ? new Date(project.endDate).toLocaleDateString("en-IN") : "—"}
            </p>
            {project.startDate && <p className="text-xs text-muted-foreground">From {new Date(project.startDate).toLocaleDateString("en-IN")}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Progress Update Dialog */}
      {progressEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setProgressEdit(false)}>
          <div className="bg-card border rounded-xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Update Progress</h3>
            <Input type="range" min={0} max={100} value={progressVal} onChange={e => setProgressVal(Number(e.target.value))} className="w-full" />
            <p className="text-center text-2xl font-bold my-2">{progressVal}%</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setProgressEdit(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveProgress}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">
            <BarChart3 className="h-4 w-4 mr-1.5" />Kanban Board
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-1.5" />Activity Log
          </TabsTrigger>
        </TabsList>

        {/* Kanban */}
        <TabsContent value="kanban" className="mt-4">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {tasksByCol.map((col) => (
              <div key={col.id} className={`min-w-[260px] shrink-0 rounded-xl border-2 ${col.color} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm">{col.label}</span>
                  <span className="text-xs bg-background/70 px-2 py-0.5 rounded-full font-bold">{col.tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {col.tasks.map((task) => (
                    <div key={task.id} className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
                        {canManage && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => setEditTask(task)} className="p-1 rounded hover:bg-muted">
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDeleteTask(task.id)} className="p-1 rounded hover:bg-muted">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        )}
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                          {task.priority}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {task.dueDate && (
                            <span className={`text-[10px] flex items-center gap-0.5 ${new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "text-red-500" : "text-muted-foreground"}`}>
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                          {task.assignee && (
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary" title={task.assignee.name}>
                              {task.assignee.name[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {col.tasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground/60 border border-dashed rounded-lg bg-background/30">Empty</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {project.activities.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {project.activities.map((act) => (
                    <div key={act.id} className="flex gap-3 items-start">
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {act.user.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm"><span className="font-medium">{act.user.name}</span> {act.action}</p>
                        <p className="text-xs text-muted-foreground">{new Date(act.createdAt).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={(v) => !v && setEditTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editTask && <TaskForm task={editTask} projectId={project.id} teamMembers={teamMembers} onSuccess={() => setEditTask(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
