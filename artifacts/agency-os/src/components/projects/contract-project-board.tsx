"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Plus, Trash2, ExternalLink, PlayCircle, PauseCircle,
  CheckCircle2, XCircle, BarChart3, Calendar, DollarSign,
  Search, Film, ImageIcon, BookOpen, Layers, MessageSquare,
  ArrowUpRight, Clock
} from "lucide-react";
import { toast } from "sonner";
import { createContract, deleteContract } from "@/lib/actions/contracts";
import type { ActionResult } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/forms/submit-button";
import Link from "next/link";

type DeliverableSummary = {
  type: string;
  status: string;
};

type ContractProject = {
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
  contract: {
    id: string;
    durationMonths: number;
    startMonth: string;
    reelsPerMonth: number;
    postsPerMonth: number;
    carouselsPerMonth: number;
    blogsPerMonth: number;
  } | null;
  deliverables: DeliverableSummary[];
  _count?: { tasks: number; deliverables: number };
};

type Client = { id: string; companyName: string };

const initial: ActionResult = { ok: false, error: "" };

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  IN_PROGRESS: { label: "Active", icon: <PlayCircle className="h-3 w-3" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  ON_HOLD: { label: "Paused", icon: <PauseCircle className="h-3 w-3" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  UNDER_REVIEW: { label: "Review", icon: <Clock className="h-3 w-3" />, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  COMPLETED: { label: "Completed", icon: <CheckCircle2 className="h-3 w-3" />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  CANCELLED: { label: "Cancelled", icon: <XCircle className="h-3 w-3" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

const TYPE_ICONS: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  REEL: { icon: <Film className="h-3.5 w-3.5" />, label: "Reels", color: "text-violet-400" },
  POST: { icon: <ImageIcon className="h-3.5 w-3.5" />, label: "Posts", color: "text-sky-400" },
  CAROUSEL: { icon: <Layers className="h-3.5 w-3.5" />, label: "Carousels", color: "text-amber-400" },
  BLOG: { icon: <BookOpen className="h-3.5 w-3.5" />, label: "Blogs", color: "text-emerald-400" },
};

function MiniProgressRing({ progress, size = 44, color }: { progress: number; size?: number; color: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="3.5"
        stroke={color}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-700"
      />
    </svg>
  );
}

function ContractForm({ clients, onSuccess }: { clients: Client[]; onSuccess: () => void }) {
  const [state, formAction] = useActionState(createContract, initial);

  useEffect(() => {
    if (state.ok) { onSuccess(); toast.success("Contract created with auto-scheduled deliverables"); }
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-2">
        <Label>Client *</Label>
        <select name="clientId" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Select client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Month *</Label>
          <Input name="startMonth" type="month" required />
        </div>
        <div className="space-y-2">
          <Label>Duration (months) *</Label>
          <Input name="durationMonths" type="number" min={1} max={36} required defaultValue={6} />
        </div>
      </div>

      <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Monthly Deliverables</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5 text-violet-400" /> Reels / month
            </Label>
            <Input name="reelsPerMonth" type="number" min={0} defaultValue={0} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-sky-400" /> Posts / month
            </Label>
            <Input name="postsPerMonth" type="number" min={0} defaultValue={0} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-amber-400" /> Carousels / month
            </Label>
            <Input name="carouselsPerMonth" type="number" min={0} defaultValue={0} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" /> Blogs / month
            </Label>
            <Input name="blogsPerMonth" type="number" min={0} defaultValue={0} className="h-8 text-sm" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Budget (₹)</Label>
        <Input name="budget" type="number" placeholder="Optional" />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea name="notes" rows={2} placeholder="Any special instructions..." />
      </div>

      <SubmitButton label="Create Contract & Generate Schedule" />
    </form>
  );
}

export function ContractProjectBoard({ projects, clients, canManage }: {
  projects: ContractProject[];
  clients: Client[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
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

  async function handleDelete(contractId: string) {
    if (!confirm("Delete this contract? This will also delete all deliverables.")) return;
    const r = await deleteContract(contractId);
    if (r.ok) toast.success("Contract deleted");
    else toast.error(r.error);
  }

  function getTypeProgress(deliverables: DeliverableSummary[], type: string) {
    const ofType = deliverables.filter(d => d.type === type);
    if (ofType.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = ofType.filter(d => d.status === "PUBLISHED" || d.status === "APPROVED").length;
    return { done, total: ofType.length, pct: Math.round((done / ofType.length) * 100) };
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
              <Plus className="h-4 w-4 mr-2" /> New Contract
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Content Contract</DialogTitle></DialogHeader>
              <ContractForm clients={clients} onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {canManage && clients.length === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200">
          Add a client first before creating contracts.
        </p>
      )}

      {/* Project Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const status = STATUS_CONFIG[p.status] ?? STATUS_CONFIG["IN_PROGRESS"]!;
          const isContract = !!p.contract;
          const deliverables = p.deliverables ?? [];

          // Get per-type progress
          const reelProgress = getTypeProgress(deliverables, "REEL");
          const postProgress = getTypeProgress(deliverables, "POST");
          const carouselProgress = getTypeProgress(deliverables, "CAROUSEL");
          const blogProgress = getTypeProgress(deliverables, "BLOG");

          const allTypes = [
            { key: "REEL", ...reelProgress },
            { key: "POST", ...postProgress },
            { key: "CAROUSEL", ...carouselProgress },
            { key: "BLOG", ...blogProgress },
          ].filter(t => t.total > 0);

          // Contract period string
          const period = isContract && p.contract
            ? (() => {
                const [yStr, mStr] = p.contract.startMonth.split("-");
                const startDate = new Date(parseInt(yStr!), parseInt(mStr!) - 1, 1);
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + p.contract.durationMonths);
                return `${startDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })} — ${endDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
              })()
            : null;

          return (
            <Card key={p.id} className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight truncate">{p.client.companyName}</CardTitle>
                    {period && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {period}
                      </p>
                    )}
                    {!period && p.name && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.name}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contract deliverable progress rings */}
                {isContract && allTypes.length > 0 && (
                  <div className="flex items-center gap-3 py-2">
                    {allTypes.map((t) => {
                      const typeInfo = TYPE_ICONS[t.key]!;
                      const ringColor = t.pct >= 100 ? "#10b981" : t.pct >= 50 ? "#6366f1" : t.pct >= 25 ? "#f59e0b" : "#94a3b8";
                      return (
                        <div key={t.key} className="flex flex-col items-center gap-1">
                          <div className="relative">
                            <MiniProgressRing progress={t.pct} color={ringColor} />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={typeInfo.color}>{typeInfo.icon}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {t.done}/{t.total}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Overall progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-semibold">{p.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${p.progress >= 100 ? "bg-emerald-500" : p.progress >= 60 ? "bg-blue-500" : p.progress >= 30 ? "bg-amber-500" : "bg-slate-400"}`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {p.budget && (
                    <span className="flex items-center gap-0.5">
                      <DollarSign className="h-3 w-3" />₹{p.budget.toLocaleString("en-IN")}
                    </span>
                  )}
                  {isContract && p.contract && (
                    <span className="flex items-center gap-0.5 bg-muted px-2 py-0.5 rounded-full">
                      {p.contract.durationMonths} months
                    </span>
                  )}
                  {p.manager && (
                    <span className="flex items-center gap-0.5">
                      {p.manager.name}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Link href={`/projects/${p.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" /> {isContract ? "View Calendar" : "View Details"}
                    </Button>
                  </Link>
                  {canManage && isContract && p.contract && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.contract!.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
          <p className="text-muted-foreground/60 text-xs mt-1">Create a new content contract to get started</p>
        </div>
      )}
    </div>
  );
}
