import { useState } from "react";
import {
  useListLeads, useCreateLead, useUpdateLead, useDeleteLead,
  useGetPipelineSummary, getListLeadsQueryKey,
} from "@workspace/api-client-react";
import { SearchBar } from "@/components/common/SearchBar";
import type { LeadInput, Lead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { WriteWithAI } from "@/components/common/WriteWithAI";
import { useForm, Controller } from "react-hook-form";
import { Plus, Trash2, IndianRupee, TrendingUp, Calendar } from "lucide-react";
import { cn, formatDateOnly } from "@/lib/utils";
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCorners, defaultDropAnimationSideEffects } from "@dnd-kit/core";

const STAGES = [
  { key: "LEAD", label: "Lead", color: "border-t-slate-400" },
  { key: "CONTACTED", label: "Contacted", color: "border-t-blue-400" },
  { key: "DEMO_GIVEN", label: "Demo Given", color: "border-t-indigo-400" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent", color: "border-t-violet-400" },
  { key: "NEGOTIATION", label: "Negotiation", color: "border-t-amber-400" },
  { key: "WON", label: "Won", color: "border-t-emerald-500" },
  { key: "LOST", label: "Lost", color: "border-t-rose-400" },
];

function DroppableStage({ stage, stageLeads, activeId, deleteMutation }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[220px] max-w-[240px] shrink-0 rounded-xl border border-border border-t-2 bg-muted/30 transition-colors flex flex-col",
        stage.color,
        isOver && "ring-2 ring-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 bg-card/50 rounded-t-xl border-b border-border/50">
        <p className="text-sm font-semibold">{stage.label}</p>
        <Badge variant="secondary" className="text-xs px-1.5 py-0">{stageLeads.length}</Badge>
      </div>

      <div className="p-2 space-y-2 flex-1 min-h-[150px]">
        {stageLeads.map((lead: any) => (
          <DraggableLeadCard key={lead.id} lead={lead} deleteMutation={deleteMutation} isActive={activeId === lead.id} />
        ))}

        {stageLeads.length === 0 && (
          <div className="flex items-center justify-center py-6 h-full">
            <div className="flex flex-col items-center text-muted-foreground/40">
              <TrendingUp className="h-5 w-5 mb-1" />
              <p className="text-xs">Drop here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableLeadCard({ lead, deleteMutation, isActive, isOverlay }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: lead,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      className={cn(
        "bg-card border border-border rounded-lg p-3 shadow-sm group",
        isOverlay ? "cursor-grabbing ring-2 ring-primary rotate-2 scale-105 shadow-xl" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-0" // Hide original while dragging
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-semibold line-clamp-2 flex-1">{lead.title}</p>
        {!isOverlay && (
          <Button
            size="icon" variant="ghost" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive z-10 relative"
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: lead.id }); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      {lead.companyName && <p className="text-[11px] text-muted-foreground mt-0.5">{lead.companyName}</p>}
      {lead.contactName && <p className="text-[11px] text-muted-foreground">{lead.contactName}</p>}
      {(lead.value ?? 0) > 0 && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
          <IndianRupee className="h-3 w-3" />
          {(lead.value ?? 0).toLocaleString("en-IN")}
        </div>
      )}
      {lead.expectedCloseDate && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-medium">
          <Calendar className="h-3 w-3 text-primary" />
          <span>Close: {formatDateOnly(lead.expectedCloseDate)}</span>
        </div>
      )}
      {lead.daysInStage != null && lead.daysInStage > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1">{lead.daysInStage}d in stage</p>
      )}
    </div>
  );
}

export default function SalesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: leads, isLoading } = useListLeads();
  const { data: pipeline } = useGetPipelineSummary();

  const createMutation = useCreateLead({
    mutation: {
      onSuccess: () => {
        toast.success("Lead created");
        qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        setDialogOpen(false);
      },
      onError: () => toast.error("Failed to create lead"),
    },
  });

  const updateMutation = useUpdateLead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      },
      onError: () => toast.error("Failed to move lead"),
    },
  });

  const deleteMutation = useDeleteLead({
    mutation: {
      onSuccess: () => {
        toast.success("Lead deleted");
        qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      },
    },
  });

  const { register, handleSubmit, control, reset, setValue } = useForm<LeadInput>({
    defaultValues: { title: "", stage: "LEAD" },
  });

  const onSubmit = (data: LeadInput) => {
    createMutation.mutate({ data: { ...data, value: data.value ? Number(data.value) : undefined } });
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const lead = leads?.find((l) => l.id === active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as string;
    const lead = leads?.find((l) => l.id === leadId);
    
    if (lead && lead.stage !== newStage) {
      // Optimistic update
      qc.setQueryData(getListLeadsQueryKey(), (old: any) => {
        if (!old) return old;
        return old.map((l: any) => l.id === leadId ? { ...l, stage: newStage } : l);
      });
      updateMutation.mutate({ id: leadId, data: { stage: newStage } as any });
    }
  };

  const pipelineTotal = (pipeline ?? []).reduce((sum, s) => sum + (s.totalValue ?? 0), 0);

  const filteredLeads = (leads ?? []).filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.title?.toLowerCase().includes(q) ||
      l.companyName?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.stage?.toLowerCase().includes(q)
    );
  });

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }),
  };

  return (
    <div className="p-6 animated-fade-in space-y-5">
      <div className="space-y-5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading">Sales Funnel</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filteredLeads.length} leads &nbsp;·&nbsp; Pipeline: ₹{pipelineTotal.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Search leads…" value={searchQuery} onChange={setSearchQuery} />
            <Button onClick={() => { reset({ title: "", stage: "LEAD" }); setDialogOpen(true); }} className="gap-2 btn-micro-anim" data-testid="add-lead-btn">
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
          </div>
        </div>

        {/* Pipeline summary */}
        {pipeline && pipeline.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
            {STAGES.map((stage) => {
              const s = pipeline.find((p) => p.stage === stage.key);
              const stageColor = stage.color.replace("border-t-", "border-l-");
              return (
                <div key={stage.key} className={cn(
                  "flex-1 min-w-[110px] rounded-xl border border-l-[3px] bg-card px-3 py-3 shrink-0 shadow-xs scale-hover",
                  stageColor
                )}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stage.label}</p>
                  <p className="text-xl font-bold font-heading mt-1">{s?.count ?? 0}</p>
                  {(s?.totalValue ?? 0) > 0 && (
                    <p className="text-[10px] text-primary font-medium mt-0.5">₹{((s?.totalValue ?? 0) / 1000).toFixed(0)}k</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2 flex-1">
            {STAGES.map((s) => (
              <div key={s.key} className="min-w-[220px] rounded-xl border border-border bg-muted/30 p-3">
                <Skeleton className="h-5 w-20 mb-3" />
                <Skeleton className="h-24 mb-2" />
                <Skeleton className="h-24" />
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
              {STAGES.map((stage) => {
                const stageLeads = filteredLeads.filter((l) => l.stage === stage.key);
                return (
                  <DroppableStage
                    key={stage.key}
                    stage={stage}
                    stageLeads={stageLeads}
                    activeId={activeLead?.id}
                    deleteMutation={deleteMutation}
                  />
                );
              })}
            </div>
            <DragOverlay dropAnimation={dropAnimation}>
              {activeLead ? (
                <DraggableLeadCard lead={activeLead} isOverlay={true} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <WriteWithAI
              context="lead"
              onFill={(fields) => {
                if (fields.title) setValue("title", fields.title, { shouldDirty: true });
                if (fields.companyName) setValue("companyName", fields.companyName, { shouldDirty: true });
                if (fields.contactName) setValue("contactName", fields.contactName, { shouldDirty: true });
                if (fields.email) setValue("email", fields.email, { shouldDirty: true });
                if (fields.value) setValue("value", Number(fields.value) as any, { shouldDirty: true });
                if (fields.stage) setValue("stage", fields.stage, { shouldDirty: true });
              }}
            />
            <div className="space-y-1.5">
              <Label>Lead Title</Label>
              <Input {...register("title", { required: "Required" })} placeholder="Social Media Management" data-testid="lead-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input {...register("companyName")} placeholder="Acme Inc" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input {...register("contactName")} placeholder="Jane Doe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Value (₹)</Label>
                <Input {...register("value")} type="number" placeholder="50000" />
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Controller control={control} name="stage" render={({ field }) => (
                  <Select value={field.value ?? "LEAD"} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input {...register("email")} type="email" placeholder="lead@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Close Date</Label>
                <Input {...register("expectedCloseDate")} type="date" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="save-lead-btn">
                Add Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
