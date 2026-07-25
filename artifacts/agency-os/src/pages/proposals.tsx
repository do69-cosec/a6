import { useState } from "react";
import {
  useListProposals, useCreateProposal, useUpdateProposal, useDeleteProposal,
  useListClients, getListProposalsQueryKey,
} from "@workspace/api-client-react";
import type { ProposalInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/ui/tiptap";
import { WriteWithAI } from "@/components/common/WriteWithAI";
import { useForm, Controller } from "react-hook-form";
import { Plus, Trash2, ClipboardList, Pencil, Download } from "lucide-react";
import { openPrintWindow, buildProposalHtml, type ProposalPdfData } from "@/lib/pdf-print";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Rejected", className: "bg-rose-100 text-rose-700" },
};

const TEMPLATE_CONFIG: Record<string, string> = {
  website: "Website Design",
  social: "Social Media",
  performance: "Performance Marketing",
  retainer: "Monthly Retainer",
  branding: "Brand Identity",
};

interface ProposalFormData {
  title: string;
  clientId: string;
  notes?: string;
  template?: string;
  status?: string;
}

export default function ProposalsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: proposals, isLoading } = useListProposals();
  const { data: clients } = useListClients();

  const createMutation = useCreateProposal({
    mutation: {
      onSuccess: () => {
        toast.success("Proposal created");
        qc.invalidateQueries({ queryKey: getListProposalsQueryKey() });
        setDialogOpen(false);
      },
      onError: () => toast.error("Failed to create proposal"),
    },
  });

  const updateMutation = useUpdateProposal({
    mutation: {
      onSuccess: () => {
        toast.success("Proposal updated");
        qc.invalidateQueries({ queryKey: getListProposalsQueryKey() });
        setDialogOpen(false);
        setEditId(null);
      },
      onError: () => toast.error("Failed to update proposal"),
    },
  });

  const deleteMutation = useDeleteProposal({
    mutation: {
      onSuccess: () => {
        toast.success("Proposal deleted");
        qc.invalidateQueries({ queryKey: getListProposalsQueryKey() });
      },
    },
  });

  const { register, handleSubmit, control, reset, setValue } = useForm<ProposalFormData>({
    defaultValues: { title: "", clientId: "", status: "DRAFT", template: "social" },
  });

  const openAdd = () => {
    reset({ title: "", clientId: "", status: "DRAFT", template: "social", notes: "" });
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (p: NonNullable<typeof proposals>[number]) => {
    const freshP = (proposals ?? []).find(proj => proj.id === p.id) || p;
    setEditId(freshP.id);
    reset({ title: freshP.title ?? "", clientId: freshP.clientId ?? "", status: freshP.status ?? "DRAFT", template: freshP.template ?? "social", notes: freshP.notes ?? "" });
    setDialogOpen(true);
  };

  const onSubmit = (data: ProposalFormData) => {
    if (editId) {
      updateMutation.mutate({ id: editId, data: data as ProposalInput });
    } else {
      const { status, ...inputData } = data;
      createMutation.mutate({ data: inputData });
    }
  };

  const filtered = (proposals ?? []).filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 animated-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Proposals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{proposals?.length ?? 0} proposals</p>
        </div>
        <Button onClick={openAdd} className="gap-2 btn-micro-anim" data-testid="add-proposal-btn">
          <Plus className="h-4 w-4" /> New Proposal
        </Button>
      </div>

      <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "ALL")}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No proposals found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Template</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Created</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const sc = STATUS_CONFIG[p.status ?? "DRAFT"] ?? STATUS_CONFIG.DRAFT;
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.clientName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{TEMPLATE_CONFIG[p.template ?? "social"] ?? p.template}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.createdAt ? format(new Date(p.createdAt), "dd MMM yy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={p.status ?? "DRAFT"}
                        onValueChange={(v) => { if (v) updateMutation.mutate({ id: p.id, data: { status: v } }); }}
                      >
                        <SelectTrigger className="h-7 text-xs w-32 border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <Badge variant="secondary" className={cn("text-xs cursor-pointer", sc.className)}>
                            {sc.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          title="Download PDF"
                          onClick={() => {
                            const clientName = (clients ?? []).find((c) => c.id === p.clientId)?.companyName ?? p.clientName;
                            openPrintWindow(
                              buildProposalHtml({ ...p, clientName } as ProposalPdfData),
                              `Proposal-${p.title ?? "draft"}`
                            );
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: p.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Proposal" : "New Proposal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <WriteWithAI
              context="proposal"
              onFill={(fields) => {
                if (fields.title) setValue("title", fields.title, { shouldDirty: true });
                if (fields.notes) setValue("notes", fields.notes, { shouldDirty: true });
              }}
            />
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input {...register("title", { required: "Required" })} placeholder="Social Media Management Proposal" data-testid="proposal-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Controller control={control} name="clientId" render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No client</SelectItem>
                      {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Template</Label>
                <Controller control={control} name="template" render={({ field }) => (
                  <Select value={field.value ?? "social"} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEMPLATE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value ?? "DRAFT"} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>Content (Live Document View)</Label>
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <TiptapEditor
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Write the proposal content here... This acts as a live document."
                  />
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="save-proposal-btn">
                {editId ? "Save Changes" : "Create Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
