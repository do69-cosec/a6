"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createProject, updateProject, deleteProject } from "@/lib/actions/projects";
import type { ActionResult } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/forms/submit-button";

type Project = {
  id: string;
  name: string;
  clientId: string;
  status: string;
  progress: number;
  budget: number | null;
  serviceType: string | null;
  client: { companyName: string };
  manager: { name: string } | null;
};

type Client = { id: string; companyName: string };
type Manager = { id: string; name: string };

const initial: ActionResult = { ok: false, error: "" };

function ProjectForm({
  project,
  clients,
  managers,
  onSuccess,
}: {
  project?: Project;
  clients: Client[];
  managers: Manager[];
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(
    project ? updateProject : createProject,
    initial
  );

  useEffect(() => {
    if (state.ok) {
      onSuccess();
      toast.success(project ? "Project updated" : "Project created");
    } else if (!state.ok && state.error) toast.error(state.error);
  }, [state, project, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {project && <input type="hidden" name="id" value={project.id} />}
      <div className="space-y-2">
        <Label>Project name *</Label>
        <Input name="name" required defaultValue={project?.name} />
      </div>
      <div className="space-y-2">
        <Label>Client *</Label>
        <select
          name="clientId"
          required
          defaultValue={project?.clientId ?? ""}
          className="flex h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Service type</Label>
          <Input name="serviceType" defaultValue={project?.serviceType ?? ""} />
        </div>
        <div className="space-y-2">
          <Label>Budget (₹)</Label>
          <Input name="budget" type="number" defaultValue={project?.budget ?? ""} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select name="status" defaultValue={project?.status ?? "IN_PROGRESS"} className="flex h-9 w-full rounded-md border px-3 text-sm">
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Progress %</Label>
          <Input name="progress" type="number" min={0} max={100} defaultValue={project?.progress ?? 0} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Project manager</Label>
          <select name="managerId" className="flex h-9 w-full rounded-md border px-3 text-sm">
            <option value="">None</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>
      <SubmitButton label={project ? "Save" : "Create project"} />
    </form>
  );
}

export function ProjectsManager({
  projects,
  clients,
  managers,
  canManage,
}: {
  projects: Project[];
  clients: Client[];
  managers: Manager[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Project | null>(null);

  return (
    <div className="space-y-4">
      {canManage && clients.length === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200">
          Add a client first (Clients module) before creating projects.
        </p>
      )}
      {canManage && clients.length > 0 && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" /> New project
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
              <ProjectForm clients={clients} managers={managers} onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between gap-2">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <Badge variant="secondary">{p.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{p.client.companyName}</p>
            </CardHeader>
            <CardContent>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{p.progress}% · {p.serviceType ?? "General"}</p>
              {canManage && (
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => setEdit(p)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={async () => {
                    if (!confirm("Delete this project?")) return;
                    const r = await deleteProject(p.id);
                    if (r.ok) toast.success("Deleted");
                    else toast.error(r.error);
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit project</DialogTitle></DialogHeader>
          {edit && (
            <ProjectForm project={edit} clients={clients} managers={managers} onSuccess={() => setEdit(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
