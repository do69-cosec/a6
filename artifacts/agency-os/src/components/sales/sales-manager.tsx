"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createLead, updateLead, deleteLead, updateLeadStage } from "@/lib/actions/leads";
import { FUNNEL_STAGES } from "@/lib/constants";
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

type Lead = {
  id: string;
  title: string;
  companyName: string | null;
  value: number | null;
  stage: string;
  owner: { name: string } | null;
};

type Owner = { id: string; name: string };

const initial: ActionResult = { ok: false, error: "" };

function LeadForm({
  lead,
  owners,
  onSuccess,
}: {
  lead?: Lead;
  owners: Owner[];
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(
    lead ? updateLead : createLead,
    initial
  );

  useEffect(() => {
    if (state.ok) {
      onSuccess();
      toast.success(lead ? "Lead updated" : "Lead created");
    } else if (!state.ok && state.error) toast.error(state.error);
  }, [state, lead, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input name="title" required defaultValue={lead?.title} />
      </div>
      <div className="space-y-2">
        <Label>Company</Label>
        <Input name="companyName" defaultValue={lead?.companyName ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Value (₹)</Label>
          <Input name="value" type="number" defaultValue={lead?.value ?? ""} />
        </div>
        <div className="space-y-2">
          <Label>Stage</Label>
          <select
            name="stage"
            defaultValue={lead?.stage ?? "LEAD"}
            className="flex h-9 w-full rounded-md border border-input px-3 text-sm"
          >
            {FUNNEL_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Assigned to</Label>
        <select name="ownerId" className="flex h-9 w-full rounded-md border border-input px-3 text-sm">
          <option value="">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton label={lead ? "Save" : "Add lead"} />
    </form>
  );
}

export function SalesManager({
  leads,
  owners,
  canManage,
}: {
  leads: Lead[];
  owners: Owner[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const byStage = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.stage === stage.key),
  }));

  async function moveStage(id: string, stage: string) {
    const r = await updateLeadStage(id, stage);
    if (r.ok) toast.success("Stage updated");
    else toast.error(r.error);
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" /> Add lead
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New lead</DialogTitle>
              </DialogHeader>
              <LeadForm owners={owners} onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {byStage.map((col) => (
          <Card key={col.key} className="min-w-[240px] shrink-0">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex justify-between">
                {col.label}
                <span className="font-normal text-muted-foreground">{col.leads.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {col.leads.map((lead) => (
                <div key={lead.id} className="rounded-md border bg-card p-3 text-sm">
                  <p className="font-medium">{lead.title}</p>
                  <p className="text-xs text-muted-foreground">{lead.companyName ?? "—"}</p>
                  {lead.value != null && (
                    <p className="text-xs mt-1 font-medium">
                      ₹{Math.round(lead.value).toLocaleString("en-IN")}
                    </p>
                  )}
                  {canManage && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditLead(lead)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <select
                        className="text-[10px] border rounded px-1 h-7"
                        value={lead.stage}
                        onChange={(e) => void moveStage(lead.id, e.target.value)}
                      >
                        {FUNNEL_STAGES.map((s) => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editLead} onOpenChange={(v) => !v && setEditLead(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit lead</DialogTitle></DialogHeader>
          {editLead && (
            <LeadForm lead={editLead} owners={owners} onSuccess={() => setEditLead(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
