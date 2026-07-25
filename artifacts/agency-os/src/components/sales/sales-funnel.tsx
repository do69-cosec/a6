"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Phone, Mail, Calendar, TrendingUp,
  DollarSign, Target, Users, AlertCircle, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { createLead, updateLead, deleteLead, updateLeadStage } from "@/lib/actions/leads";
import { FUNNEL_STAGES } from "@/lib/constants";
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
import { Textarea } from "@/components/ui/textarea";

type Lead = {
  id: string;
  title: string;
  companyName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  value: number | null;
  stage: string;
  lostReason: string | null;
  followUpAt: Date | null;
  owner: { name: string } | null;
  createdAt: Date;
};

type Owner = { id: string; name: string };

const initial: ActionResult = { ok: false, error: "" };

const STAGE_COLORS: Record<string, string> = {
  LEAD: "bg-slate-100 border-slate-300 dark:bg-slate-800/50",
  CONTACTED: "bg-blue-50 border-blue-200 dark:bg-blue-900/20",
  DEMO_GIVEN: "bg-purple-50 border-purple-200 dark:bg-purple-900/20",
  PROPOSAL_SENT: "bg-amber-50 border-amber-200 dark:bg-amber-900/20",
  NEGOTIATION: "bg-orange-50 border-orange-200 dark:bg-orange-900/20",
  WON: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20",
  LOST: "bg-red-50 border-red-200 dark:bg-red-900/20",
};

const STAGE_HEADER_COLORS: Record<string, string> = {
  LEAD: "bg-slate-500",
  CONTACTED: "bg-blue-500",
  DEMO_GIVEN: "bg-purple-500",
  PROPOSAL_SENT: "bg-amber-500",
  NEGOTIATION: "bg-orange-500",
  WON: "bg-emerald-500",
  LOST: "bg-red-500",
};

function LeadForm({ lead, owners, onSuccess }: { lead?: Lead; owners: Owner[]; onSuccess: () => void }) {
  const [state, formAction] = useActionState(lead ? updateLead : createLead, initial);

  useEffect(() => {
    if (state.ok) { onSuccess(); toast.success(lead ? "Lead updated" : "Lead created"); }
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state, lead, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Lead Title *</Label>
          <Input name="title" required defaultValue={lead?.title} placeholder="e.g. Social Media Package" />
        </div>
        <div className="space-y-2">
          <Label>Company Name</Label>
          <Input name="companyName" defaultValue={lead?.companyName ?? ""} placeholder="ABC Corp" />
        </div>
        <div className="space-y-2">
          <Label>Deal Value (₹)</Label>
          <Input name="value" type="number" defaultValue={lead?.value ?? ""} placeholder="50000" />
        </div>
        <div className="space-y-2">
          <Label>Contact Email</Label>
          <Input name="contactEmail" type="email" defaultValue={lead?.contactEmail ?? ""} placeholder="contact@company.com" />
        </div>
        <div className="space-y-2">
          <Label>Contact Phone</Label>
          <Input name="contactPhone" defaultValue={lead?.contactPhone ?? ""} placeholder="+91 9876543210" />
        </div>
        <div className="space-y-2">
          <Label>Stage</Label>
          <select name="stage" defaultValue={lead?.stage ?? "LEAD"} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {FUNNEL_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Assigned To</Label>
          <select name="ownerId" defaultValue={lead?.owner ? owners.find(o => o.name === lead.owner?.name)?.id : ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Unassigned</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Follow-up Date</Label>
          <Input name="followUpAt" type="datetime-local" defaultValue={lead?.followUpAt ? new Date(lead.followUpAt).toISOString().slice(0, 16) : ""} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Lost Reason (if lost)</Label>
          <Textarea name="lostReason" rows={2} defaultValue={lead?.lostReason ?? ""} placeholder="Reason for losing this deal..." />
        </div>
      </div>
      <SubmitButton label={lead ? "Save Changes" : "Add Lead"} />
    </form>
  );
}

function LeadCard({ lead, canManage, onEdit, onDelete }: { lead: Lead; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const isOverdue = lead.followUpAt && new Date(lead.followUpAt) < new Date();
  return (
    <div className="rounded-xl border bg-card p-3 text-sm shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start gap-2">
        <p className="font-semibold text-foreground line-clamp-2">{lead.title}</p>
        {canManage && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-muted text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {lead.companyName && <p className="text-xs text-muted-foreground mt-0.5">{lead.companyName}</p>}
      {lead.value != null && (
        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
          ₹{Math.round(lead.value).toLocaleString("en-IN")}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {lead.contactEmail && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Mail className="h-2.5 w-2.5" />{lead.contactEmail}
          </span>
        )}
        {lead.contactPhone && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Phone className="h-2.5 w-2.5" />{lead.contactPhone}
          </span>
        )}
      </div>
      {lead.followUpAt && (
        <div className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${isOverdue ? "text-red-500" : "text-amber-600 dark:text-amber-400"}`}>
          {isOverdue && <AlertCircle className="h-3 w-3" />}
          <Calendar className="h-3 w-3" />
          Follow-up: {new Date(lead.followUpAt).toLocaleDateString("en-IN")}
        </div>
      )}
      {lead.owner && (
        <div className="mt-2 flex items-center gap-1">
          <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
            {lead.owner.name[0]}
          </div>
          <span className="text-[10px] text-muted-foreground">{lead.owner.name}</span>
        </div>
      )}
      {canManage && (
        <div className="mt-2 pt-2 border-t">
          <select
            className="text-[10px] border rounded px-1.5 h-6 bg-background w-full text-muted-foreground cursor-pointer"
            value={lead.stage}
            onChange={async (e) => {
              const r = await updateLeadStage(lead.id, e.target.value);
              if (r.ok) toast.success(e.target.value === "WON" ? "🎉 Lead won! Client auto-created." : "Stage updated");
              else toast.error(r.error);
            }}
          >
            {FUNNEL_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

export function SalesFunnel({ leads, owners, canManage }: { leads: Lead[]; owners: Owner[]; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const byStage = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.stage === stage.key),
    value: leads.filter((l) => l.stage === stage.key).reduce((s, l) => s + (l.value ?? 0), 0),
  }));

  // Analytics
  const totalDeals = leads.length;
  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0);
  const wonDeals = leads.filter((l) => l.stage === "WON");
  const wonValue = wonDeals.reduce((s, l) => s + (l.value ?? 0), 0);
  const convRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;
  const activeDeals = leads.filter((l) => !["WON", "LOST"].includes(l.stage));
  const pipeline = activeDeals.reduce((s, l) => s + (l.value ?? 0), 0);

  async function handleDelete(id: string) {
    if (!confirm("Delete this lead?")) return;
    const r = await deleteLead(id);
    if (r.ok) toast.success("Lead deleted");
    else toast.error(r.error);
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-200 dark:border-violet-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Total Leads</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalDeals}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Pipeline Value</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{(pipeline / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Won Revenue</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{(wonValue / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Win Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{convRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel progress bar */}
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
        {FUNNEL_STAGES.map((stage) => {
          const count = byStage.find(b => b.key === stage.key)?.leads.length ?? 0;
          const width = totalDeals > 0 ? (count / totalDeals) * 100 : 100 / FUNNEL_STAGES.length;
          const color = {
            LEAD: "bg-slate-400", CONTACTED: "bg-blue-400", DEMO_GIVEN: "bg-purple-400",
            PROPOSAL_SENT: "bg-amber-400", NEGOTIATION: "bg-orange-400", WON: "bg-emerald-500", LOST: "bg-red-400"
          }[stage.key] ?? "bg-slate-400";
          return <div key={stage.key} className={`${color} transition-all`} style={{ width: `${width}%` }} title={`${stage.label}: ${count}`} />;
        })}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {activeDeals.length} active deal{activeDeals.length !== 1 ? "s" : ""} · ₹{totalValue.toLocaleString("en-IN")} total
        </p>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" /> Add Lead
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
              <LeadForm owners={owners} onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {byStage.map((col) => (
          <div key={col.key} className={`min-w-[240px] max-w-[260px] shrink-0 rounded-xl border-2 ${STAGE_COLORS[col.key]} p-3`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${STAGE_HEADER_COLORS[col.key]}`} />
                <span className="font-semibold text-sm">{col.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {col.value > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded-full">
                    ₹{(col.value / 1000).toFixed(0)}K
                  </span>
                )}
                <span className="text-[10px] font-bold bg-background/80 px-1.5 py-0.5 rounded-full">
                  {col.leads.length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {col.leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  canManage={canManage}
                  onEdit={() => setEditLead(lead)}
                  onDelete={() => handleDelete(lead.id)}
                />
              ))}
              {col.leads.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground/60 border border-dashed rounded-lg bg-background/30">
                  No leads
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editLead} onOpenChange={(v) => !v && setEditLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          {editLead && <LeadForm lead={editLead} owners={owners} onSuccess={() => setEditLead(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
