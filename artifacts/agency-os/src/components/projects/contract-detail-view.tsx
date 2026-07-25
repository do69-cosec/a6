"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Film, ImageIcon,
  Layers, BookOpen, Clock, AlertCircle, Pencil, Play, X, Calendar, BarChart3,
  FileText, Sparkles, RefreshCw, Link2, CircleDashed, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { updateDeliverable, rescheduleMonth as rescheduleAction, assignFestiveDay } from "@/lib/actions/contracts";
import type { ActionResult } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitButton } from "@/components/forms/submit-button";

type FestiveDay = {
  id: string;
  name: string;
  date: Date;
  category: "NATIONAL" | "RELIGIOUS" | "CULTURAL";
  assignedDeliverableId: string | null;
};

type Deliverable = {
  id: string;
  type: string;
  month: string;
  scheduledDate: Date | null;
  editStartDate: Date | null;
  editEndDate: Date | null;
  status: string;
  title: string | null;
  scriptOrDraft: string | null;
  referenceLinks: string | null;
  conceptIdeation: string | null;
  visualReferences: string | null;
  imageReferenceUrl: string | null;
  captionDraft: string | null;
  hashtags: string | null;
  internalNotes: string | null;
  sortOrder: number;
};

type Contract = {
  id: string;
  durationMonths: number;
  startMonth: string;
  reelsPerMonth: number;
  postsPerMonth: number;
  carouselsPerMonth: number;
  blogsPerMonth: number;
};

type Project = {
  id: string;
  name: string;
  status: string;
  progress: number;
  client: { id: string; companyName: string };
  contract: Contract;
  deliverables: Deliverable[];
};

const initial: ActionResult = { ok: false, error: "" };

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string; border: string }> = {
  REEL: { icon: <Film className="h-4 w-4" />, label: "Reel", color: "text-violet-500", bg: "bg-violet-50", border: "border-violet-200" },
  POST: { icon: <ImageIcon className="h-4 w-4" />, label: "Post", color: "text-sky-500", bg: "bg-sky-50", border: "border-sky-200" },
  CAROUSEL: { icon: <Layers className="h-4 w-4" />, label: "Carousel", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
  BLOG: { icon: <BookOpen className="h-4 w-4" />, label: "Blog", color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "text-slate-500", bg: "bg-slate-100" },
  IDEA_ADDED: { label: "Idea Added", color: "text-blue-500", bg: "bg-blue-100" },
  IN_PRODUCTION: { label: "In Production", color: "text-amber-500", bg: "bg-amber-100" },
  IN_REVIEW: { label: "In Review", color: "text-purple-500", bg: "bg-purple-100" },
  APPROVED: { label: "Approved", color: "text-emerald-500", bg: "bg-emerald-100" },
  PUBLISHED: { label: "Published", color: "text-green-600", bg: "bg-green-100" },
};

const ALL_STATUSES = Object.keys(STATUS_META);

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch(e) {
    return [val];
  }
}

/* ─── Deliverable Editor Panel (Notion-like) ─── */
function DeliverableEditor({ deliverable, onClose }: { deliverable: Deliverable; onClose: () => void }) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateDeliverable, initial);
  
  // State for tags (arrays)
  const [refLinks, setRefLinks] = useState(parseJsonArray(deliverable.referenceLinks).join("\n"));
  const [visRefs, setVisRefs] = useState(parseJsonArray(deliverable.visualReferences).join("\n"));

  useEffect(() => {
    if (state.ok) {
      toast.success("Deliverable updated");
      onClose();
      router.refresh();
    } else if (!state.ok && state.error) {
      toast.error(state.error);
    }
  }, [state, onClose, router]);



  const typeMeta = TYPE_META[deliverable.type] ?? TYPE_META["POST"]!;
  const statusMeta = STATUS_META[deliverable.status] ?? STATUS_META["PENDING"]!;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl bg-card border-l shadow-2xl overflow-y-auto animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeMeta.bg} ${typeMeta.color}`}>
              {typeMeta.icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {deliverable.title || `${typeMeta.label} #${deliverable.sortOrder + 1}`}
              </h3>
              <p className="text-xs text-muted-foreground">
                {deliverable.scheduledDate
                  ? new Date(deliverable.scheduledDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                  : "Unscheduled"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form action={formAction} className="p-6 space-y-6">
          <input type="hidden" name="id" value={deliverable.id} />

          {/* Status */}
          <div className="flex items-center gap-3">
            <Badge className={`${statusMeta.bg} ${statusMeta.color} border-0 text-xs`}>
              {statusMeta.label}
            </Badge>
            <select
              name="status"
              defaultValue={deliverable.status}
              className="flex h-8 rounded-md border border-input bg-background px-3 text-xs flex-1"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_META[s]!.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input
              name="title"
              defaultValue={deliverable.title ?? ""}
              placeholder={`e.g. "${typeMeta.label} about new product launch"`}
              className="text-sm bg-muted/30 border-muted-foreground/20"
            />
          </div>

          {/* Conditional Input Fields depending on Content Type */}
          {deliverable.type === "REEL" || deliverable.type === "BLOG" ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> {deliverable.type === "REEL" ? "Video Script" : "Blog Draft"}
                </Label>
                <Textarea
                  name="scriptOrDraft"
                  rows={8}
                  defaultValue={deliverable.scriptOrDraft ?? ""}
                  placeholder="Write the script, talking points, hook, body, and CTA here..."
                  className="text-sm font-mono leading-relaxed resize-y min-h-[160px] bg-muted/30 border-muted-foreground/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Reference Links (One per line)
                </Label>
                <Textarea
                  name="referenceLinks"
                  value={refLinks}
                  onChange={(e) => setRefLinks(e.target.value)}
                  placeholder="https://tiktok.com/... \nhttps://instagram.com/..."
                  className="text-sm min-h-[80px] font-mono bg-muted/30 border-muted-foreground/20"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Concept Ideation
                </Label>
                <Textarea
                  name="conceptIdeation"
                  rows={5}
                  defaultValue={deliverable.conceptIdeation ?? ""}
                  placeholder="Describe the graphic slide-by-slide brief, visual messaging, or carousel framework..."
                  className="text-sm leading-relaxed resize-y min-h-[120px] bg-muted/30 border-muted-foreground/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Visual References (One per line)
                </Label>
                <Textarea
                  name="visualReferences"
                  value={visRefs}
                  onChange={(e) => setVisRefs(e.target.value)}
                  placeholder="https://pinterest.com/..."
                  className="text-sm min-h-[80px] font-mono bg-muted/30 border-muted-foreground/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Image Reference URL (Direct Link)</Label>
                <div className="flex gap-2">
                  <Input
                    name="imageReferenceUrl"
                    defaultValue={deliverable.imageReferenceUrl ?? ""}
                    placeholder="https://example.com/moodboard-ref.png"
                    className="text-sm bg-muted/30 border-muted-foreground/20"
                  />
                  {deliverable.imageReferenceUrl && (
                    <img src={deliverable.imageReferenceUrl} alt="ref" className="w-9 h-9 rounded object-cover" />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Shared Footer Fields */}
          <div className="pt-4 border-t space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caption Draft</Label>
              <Textarea
                name="captionDraft"
                rows={3}
                defaultValue={deliverable.captionDraft ?? ""}
                placeholder="Social media caption text..."
                className="text-sm bg-muted/30 border-muted-foreground/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hashtags</Label>
              <Input
                name="hashtags"
                defaultValue={deliverable.hashtags ?? ""}
                placeholder="#marketing #socialmedia"
                className="text-sm bg-muted/30 border-muted-foreground/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Internal Notes
              </Label>
              <Textarea
                name="internalNotes"
                rows={2}
                defaultValue={deliverable.internalNotes ?? ""}
                placeholder="Manager instructions..."
                className="text-sm bg-muted/30 border-muted-foreground/20"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-start gap-3 border-t border-dashed">
            <SubmitButton label="Save Details" />
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

/* ─── Main Component ─── */
export function ContractDetailView({ project, festiveDays }: { project: Project, festiveDays: FestiveDay[] }) {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const contract = project.contract;
  
  // Calculate month strings
  const [startYearStr, startMonthStr] = contract.startMonth.split("-");
  const startYear = parseInt(startYearStr!, 10);
  const startMonthNum = parseInt(startMonthStr!, 10) - 1;
  const contractStart = new Date(startYear, startMonthNum, 1);

  // Get current month string
  const currentMonthDate = new Date(startYear, startMonthNum + selectedMonth, 1);
  const currentMonthStr = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}`;

  function getMonthLabel(monthIndex: number) {
    const d = new Date(startYear, startMonthNum + monthIndex, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }

  // Filter deliverables for current month
  const monthDeliverables = project.deliverables
    .filter(d => d.month === currentMonthStr)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Festive days for this month
  const currentFestivals = festiveDays.filter(f => f.date.getFullYear() === currentMonthDate.getFullYear() && f.date.getMonth() === currentMonthDate.getMonth());

  // Per-type stats for current month
  const monthStats = (["REEL", "POST", "CAROUSEL", "BLOG"] as const).map(type => {
    const items = monthDeliverables.filter(d => d.type === type);
    const done = items.filter(d => d.status === "PUBLISHED" || d.status === "APPROVED").length;
    return { type, total: items.length, done };
  }).filter(s => s.total > 0);

  // Overall contract stats
  const allDeliverables = project.deliverables;
  const totalDone = allDeliverables.filter(d => d.status === "PUBLISHED" || d.status === "APPROVED").length;
  const totalCount = allDeliverables.length;

  // Calendar rendering
  const calYear = currentMonthDate.getFullYear();
  const calMonth = currentMonthDate.getMonth();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const totalDays = new Date(calYear, calMonth + 1, 0).getDate();

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({ date: new Date(calYear, calMonth - 1, prevMonthDays - i), isCurrentMonth: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push({ date: new Date(calYear, calMonth, i), isCurrentMonth: true });
  }
  const remaining = Math.max(0, 35 - calendarDays.length) > 0 ? (42 - calendarDays.length) : (42 - calendarDays.length); 
  // ensure 42 cells total for 6 rows
  for (let i = 1; i <= (42 - calendarDays.length); i++) {
    calendarDays.push({ date: new Date(calYear, calMonth + 1, i), isCurrentMonth: false });
  }

  async function handleReshuffle() {
    setIsRescheduling(true);
    const result = await rescheduleAction(project.id, currentMonthStr);
    if (result.ok) {
      toast.success("Month rescheduled!");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsRescheduling(false);
  }

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
            <h1 className="text-2xl font-bold">{project.client.companyName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Content Contract — {getMonthLabel(0)} to {getMonthLabel(contract.durationMonths - 1)}
            </p>
          </div>
        </div>
      </div>

      {/* Contract summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {monthStats.map(s => {
          const meta = TYPE_META[s.type]!;
          return (
            <Card key={s.type} className="border-muted shadow-sm">
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${meta.bg} ${meta.color}`}>{meta.icon}</div>
                <div>
                  <p className="text-lg font-bold">{s.done}/{s.total}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{meta.label}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-card border rounded-xl px-4 py-3 shadow-sm">
        <Button
          variant="ghost" size="sm"
          disabled={selectedMonth <= 0}
          onClick={() => setSelectedMonth(m => m - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Prev
        </Button>
        <div className="text-center">
          <h2 className="font-semibold text-lg">{getMonthLabel(selectedMonth)}</h2>
          <p className="text-xs text-muted-foreground">
            Month {selectedMonth + 1} of {contract.durationMonths} • {totalDone}/{totalCount} total delivered
          </p>
        </div>
        <Button
          variant="ghost" size="sm"
          disabled={selectedMonth >= contract.durationMonths - 1}
          onClick={() => setSelectedMonth(m => m + 1)}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Tabs: Grid / Calendar / Festive */}
      <Tabs defaultValue="grid">
        <TabsList className="bg-muted/50 border">
          <TabsTrigger value="grid" className="data-[state=active]:bg-background data-[state=active]:shadow">
            <BarChart3 className="h-4 w-4 mr-1.5" />Content Grid
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-background data-[state=active]:shadow">
            <Calendar className="h-4 w-4 mr-1.5" />Calendar
          </TabsTrigger>
          <TabsTrigger value="festive" className="data-[state=active]:bg-background data-[state=active]:shadow">
            <Sparkles className="h-4 w-4 mr-1.5" />Festive Planner
          </TabsTrigger>
        </TabsList>

        {/* Content Grid Tab */}
        <TabsContent value="grid" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {monthDeliverables.length} deliverables this month — Click any card to edit details
            </p>
            <Button variant="outline" size="sm" onClick={handleReshuffle} disabled={isRescheduling} className="shadow-sm">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRescheduling ? "animate-spin" : ""}`} />
              Reshuffle Algorithm
            </Button>
          </div>

          <div className="space-y-4">
            {(() => {
              // Organize in rows of 3 to strictly match Master Prompt grid requirement
              const groups: Deliverable[][] = [];
              for (let i = 0; i < monthDeliverables.length; i += 3) {
                groups.push(monthDeliverables.slice(i, i + 3));
              }
              return groups.map((group, gi) => (
                <div key={gi} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {group.map((d) => {
                    const typeMeta = TYPE_META[d.type] ?? TYPE_META["POST"]!;
                    const statusMeta = STATUS_META[d.status] ?? STATUS_META["PENDING"]!;
                    const hasContent = !!(d.scriptOrDraft || d.title || d.conceptIdeation);
                    return (
                      <button
                        key={d.id}
                        onClick={() => setEditingDeliverable(d)}
                        className={`text-left p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col relative ${
                          hasContent
                            ? `bg-card border-border`
                            : "border-dashed border-muted bg-muted/10 hover:border-muted-foreground/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className={`p-1.5 rounded-lg ${typeMeta.bg} ${typeMeta.color}`}>
                            {typeMeta.icon}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className={`${statusMeta.bg} ${statusMeta.color} border-0 text-[10px]`}>
                              {statusMeta.label}
                            </Badge>
                          </div>
                        </div>
                        
                        <h4 className="text-sm font-semibold mt-3 line-clamp-1">
                          {d.title || `${typeMeta.label} #${d.sortOrder + 1}`}
                        </h4>
                        
                        {d.scheduledDate && (
                          <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded w-fit">
                            <Calendar className="h-3 w-3" />
                            {new Date(d.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </div>
                        )}
                        
                        <div className="mt-3 flex-1">
                          {(d.scriptOrDraft || d.conceptIdeation) ? (
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                              {d.scriptOrDraft || d.conceptIdeation}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 flex items-center gap-1.5 italic">
                              <Pencil className="h-3 w-3" /> Add ideation or draft...
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {/* Ghost cards for empty slots in row */}
                  {Array.from({ length: 3 - group.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="rounded-xl border border-dashed border-muted bg-muted/5 min-h-[160px] flex items-center justify-center">
                      <span className="text-muted-foreground/30 text-xs font-medium">Empty Slot</span>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>

          {monthDeliverables.length === 0 && (
            <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/10">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium">No deliverables scheduled for this month</p>
              <p className="text-xs text-muted-foreground mt-1">Adjust contract duration or reshuffle.</p>
            </div>
          )}
        </TabsContent>

        {/* Calendar View Tab */}
        <TabsContent value="calendar" className="mt-4">
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="py-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold">Publish & Edit Pipeline Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-muted-foreground py-2.5 bg-card">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y min-h-[600px] bg-background">
                {calendarDays.map((cell, idx) => {
                  const dayDeliverables = monthDeliverables.filter(
                    (d) => d.scheduledDate && isSameDay(new Date(d.scheduledDate), cell.date)
                  );

                  const editingTasks = project.deliverables.filter((d) => {
                    if (d.status === "PUBLISHED" || d.status === "APPROVED") return false;
                    if (!d.editStartDate || !d.editEndDate) return false;
                    const sd = new Date(d.editStartDate);
                    const ed = new Date(d.editEndDate);
                    sd.setHours(0,0,0,0);
                    ed.setHours(23,59,59,999);
                    return cell.date >= sd && cell.date <= ed && cell.date.getDay() !== 0; // Don't show edit pills on Sunday
                  });

                  const festivals = festiveDays.filter(f => isSameDay(new Date(f.date), cell.date));

                  const isToday = isSameDay(new Date(), cell.date);
                  const isSunday = cell.date.getDay() === 0;

                  return (
                    <div
                      key={idx}
                      className={`p-1.5 min-h-[120px] flex flex-col relative ${
                        cell.isCurrentMonth ? (isSunday ? "bg-muted/5" : "bg-card") : "bg-muted/10 opacity-50"
                      }`}
                    >
                      <span className={`text-[11px] font-bold absolute top-1.5 right-1.5 ${
                        isToday ? "h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center" : "text-muted-foreground"
                      }`}>
                        {cell.date.getDate()}
                      </span>

                      <div className="flex-1 mt-6 space-y-1.5 overflow-hidden flex flex-col">
                        {festivals.map(f => (
                          <div key={f.id} className="w-full text-left text-[9px] leading-tight px-1.5 py-1 rounded truncate flex items-center gap-1 font-semibold bg-[#FFD700]/20 text-[#B8860B] border border-[#FFD700]/30 shadow-sm">
                            <Sparkles className="h-2.5 w-2.5 shrink-0" />
                            {f.name}
                          </div>
                        ))}

                        {/* Publish Pills */}
                        {dayDeliverables.map((d) => {
                          const typeMeta = TYPE_META[d.type] ?? TYPE_META["POST"]!;
                          return (
                            <button
                              key={d.id}
                              onClick={() => setEditingDeliverable(d)}
                              className={`w-full text-left text-[9px] leading-tight px-1.5 py-1 rounded truncate cursor-pointer transition flex items-center justify-between border shadow-sm ${typeMeta.bg} ${typeMeta.border} ${typeMeta.color} hover:brightness-95`}
                            >
                              <div className="flex items-center gap-1 font-medium truncate">
                                {typeMeta.icon}
                                <span className="truncate">{d.title || `${typeMeta.label}`}</span>
                              </div>
                            </button>
                          );
                        })}

                        {/* Edit Pipeline Pills */}
                        {editingTasks.map((d) => {
                          const typeMeta = TYPE_META[d.type] ?? TYPE_META["POST"]!;
                          return (
                            <button
                              key={`edit-${d.id}`}
                              onClick={() => setEditingDeliverable(d)}
                              className={`w-full text-left text-[9px] leading-tight px-1.5 py-1 rounded border border-dashed truncate cursor-pointer transition flex items-center gap-1 bg-amber-500/5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10`}
                            >
                              <Pencil className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">Edit: {d.title || `${typeMeta.label}`}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Festive Planner Tab */}
        <TabsContent value="festive" className="mt-4">
           <Card className="border shadow-sm">
             <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  🇮🇳 Indian Festivals for {getMonthLabel(selectedMonth)}
                </CardTitle>
                <CardDescription className="text-xs">
                  Attach deliverables or stories directly to upcoming festive days.
                </CardDescription>
             </CardHeader>
             <CardContent className="p-0">
               {currentFestivals.length === 0 ? (
                 <div className="text-center py-12">
                   <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                   <p className="text-sm font-medium">No major festivals this month.</p>
                 </div>
               ) : (
                 <div className="divide-y">
                   {currentFestivals.map(fest => (
                     <div key={fest.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <h4 className="font-bold text-sm text-foreground">{fest.name}</h4>
                           <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-background">
                             {fest.category}
                           </Badge>
                         </div>
                         <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                           <Calendar className="h-3 w-3" />
                           {new Date(fest.date).toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'long' })}
                         </p>
                       </div>
                       
                       <div className="flex items-center gap-3">
                         {fest.assignedDeliverableId ? (
                           <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors font-medium text-xs px-2.5 py-1">
                             <CheckCircle2 className="h-3 w-3 mr-1" /> Post Assigned
                           </Badge>
                         ) : (
                           <select
                              onChange={async (e) => {
                                const deliverableId = e.target.value;
                                if (!deliverableId) return;
                                toast.loading("Assigning deliverable...");
                                const res = await assignFestiveDay(fest.id, deliverableId);
                                toast.dismiss();
                                if (res.ok) {
                                  toast.success("Deliverable assigned!");
                                  router.refresh();
                                } else {
                                  toast.error(res.error);
                                }
                              }}
                              className="h-8 rounded-md border border-input bg-background px-3 text-xs w-[180px] shadow-sm outline-none focus:ring-1 focus:ring-primary"
                              defaultValue=""
                            >
                              <option value="" disabled>Link Deliverable...</option>
                              {project.deliverables
                                .filter((d) => d.status === "PENDING" || d.status === "IDEA_ADDED")
                                .map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {TYPE_META[d.type]?.label} #{d.sortOrder + 1}
                                  </option>
                                ))}
                            </select>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      {/* Notion-like Editor Panel */}
      {editingDeliverable && (
        <DeliverableEditor
          deliverable={editingDeliverable}
          onClose={() => setEditingDeliverable(null)}
        />
      )}
    </div>
  );
}
