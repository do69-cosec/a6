"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, ExternalLink, Clock, CheckCircle2,
  AlertCircle, PlayCircle, PauseCircle, XCircle, BarChart3,
  Users, Calendar, DollarSign, ArrowUpRight, Search, Filter
} from "lucide-react";
import { toast } from "sonner";
import { createProject, updateProject, deleteProject } from "@/lib/actions/projects";
import type { ActionResult } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/forms/submit-button";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  clientId: string;
  status: string;
  progress: number;
  budget: number | null;
  serviceType: string | null;
  startDate: Date | null;
  endDate: Date | null;
  client: { companyName: string };
  manager: { name: string } | null;
  _count?: { tasks: number };
};

type Client = { id: string; companyName: string };
type Manager = { id: string; name: string };

const initial: ActionResult = { ok: false, error: "" };

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  IN_PROGRESS: { label: "In Progress", icon: <PlayCircle className="h-3 w-3" />, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
  ON_HOLD: { label: "On Hold", icon: <PauseCircle className="h-3 w-3" />, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  UNDER_REVIEW: { label: "Under Review", icon: <AlertCircle className="h-3 w-3" />, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
  COMPLETED: { label: "Completed", icon: <CheckCircle2 className="h-3 w-3" />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  CANCELLED: { label: "Cancelled", icon: <XCircle className="h-3 w-3" />, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
};

function ProjectForm({ project, clients, managers, onSuccess }: { project?: Project; clients: Client[]; managers: Manager[]; onSuccess: () => void }) {
  const [state, formAction] = useActionState(project ? updateProject : createProject, initial);

  useEffect(() => {
    if (state.ok) { onSuccess(); toast.success(project ? "Project updated" : "Project created"); }
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state, project, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {project && <input type="hidden" name="id" value={project.id} />}
      <div className="space-y-2">
        <Label>Project Name *</Label>
        <Input name="name" required defaultValue={project?.name} placeholder="e.g. Summer Campaign 2024" />
      </div>
      <div className="space-y-2">
        <Label>Client *</Label>
        <select name="clientId" required defaultValue={project?.clientId ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Select client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Service Type</Label>
          <Input name="serviceType" defaultValue={project?.serviceType ?? ""} placeholder="Social Media" />
        </div>
        <div className="space-y-2">
          <Label>Budget (₹)</Label>
          <Input name="budget" type="number" defaultValue={project?.budget ?? ""} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select name="status" defaultValue={project?.status ?? "IN_PROGRESS"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Progress %</Label>
          <Input name="progress" type="number" min={0} max={100} defaultValue={project?.progress ?? 0} />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input name="startDate" type="date" defaultValue={project?.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : ""} />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input name="endDate" type="date" defaultValue={project?.endDate ? new Date(project.endDate).toISOString().slice(0, 10) : ""} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Project Manager</Label>
          <select name="managerId" defaultValue={project?.manager ? managers.find(m => m.name === project.manager?.name)?.id : ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">None</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
      <SubmitButton label={project ? "Save Changes" : "Create Project"} />
    </form>
  );
}

export function ProjectsBoard({ projects, clients, managers, canManage }: {
  projects: Project[];
  clients: Client[];
  managers: Manager[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // Stats
  const active = projects.filter(p => p.status === "IN_PROGRESS").length;
  const completed = projects.filter(p => p.status === "COMPLETED").length;
  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client.companyName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This will also delete all associated tasks.")) return;
    const r = await deleteProject(id);
    if (r.ok) toast.success("Project deleted");
    else toast.error(r.error);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <PlayCircle className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold">{active}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold">{completed}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Avg Progress</span>
            </div>
            <p className="text-2xl font-bold">{avgProgress}%</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Total Budget</span>
            </div>
            <p className="text-2xl font-bold">₹{(totalBudget / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]">
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {canManage && clients.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" /> New Project
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
              <ProjectForm clients={clients} managers={managers} onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {canManage && clients.length === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200">
          Add a client first before creating projects.
        </p>
      )}

      {/* Project Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const status = STATUS_CONFIG[p.status] ?? STATUS_CONFIG["IN_PROGRESS"]!;
          const isOverdue = p.endDate && new Date(p.endDate) < new Date() && p.status !== "COMPLETED";
          return (
            <Card key={p.id} className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.client.companyName}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{p.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${p.progress >= 100 ? "bg-emerald-500" : p.progress >= 60 ? "bg-blue-500" : p.progress >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {p.serviceType && (
                    <span className="bg-muted px-2 py-0.5 rounded-full">{p.serviceType}</span>
                  )}
                  {p.budget && (
                    <span className="flex items-center gap-0.5">
                      <DollarSign className="h-3 w-3" />₹{p.budget.toLocaleString("en-IN")}
                    </span>
                  )}
                  {p.endDate && (
                    <span className={`flex items-center gap-0.5 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      {isOverdue ? "Overdue: " : "Due: "}{new Date(p.endDate).toLocaleDateString("en-IN")}
                    </span>
                  )}
                  {p.manager && (
                    <span className="flex items-center gap-0.5">
                      <Users className="h-3 w-3" />{p.manager.name}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Link href={`/projects/${p.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" /> View Details
                    </Button>
                  </Link>
                  {canManage && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEdit(p)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 border border-dashed rounded-2xl">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No projects found</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          {edit && <ProjectForm project={edit} clients={clients} managers={managers} onSuccess={() => setEdit(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
