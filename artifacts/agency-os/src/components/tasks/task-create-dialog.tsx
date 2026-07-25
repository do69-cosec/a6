"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTask } from "@/lib/actions/tasks";
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
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";

const initial: ActionResult = { ok: false, error: "" };

export function TaskCreateDialog({
  projects,
  assignees,
}: {
  projects: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createTask, initial);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Task created");
    } else if (!state.ok && state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4 mr-2" /> New task
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input name="title" required />
          </div>
          <div className="space-y-2">
            <Label>Project *</Label>
            <select name="projectId" required className="flex h-9 w-full rounded-md border px-3 text-sm">
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <select name="assigneeId" className="flex h-9 w-full rounded-md border px-3 text-sm">
              <option value="">Unassigned</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <select name="priority" defaultValue="MEDIUM" className="flex h-9 w-full rounded-md border px-3 text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select name="status" defaultValue="TODO" className="flex h-9 w-full rounded-md border px-3 text-sm">
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Due date</Label>
            <Input name="dueDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea name="description" rows={3} />
          </div>
          <SubmitButton label="Create task" />
        </form>
      </DialogContent>
    </Dialog>
  );
}
