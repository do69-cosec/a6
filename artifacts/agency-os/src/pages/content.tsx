import { useState, useRef } from "react";
import { SearchBar } from "@/components/common/SearchBar";
import {
  useListContentPosts, useCreateContentPost, useUpdateContentPost, useDeleteContentPost,
  useListClients, getListContentPostsQueryKey,
  useCreateCalendarShare, useListCalendarShares,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WriteWithAI } from "@/components/common/WriteWithAI";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus, ChevronLeft, ChevronRight, Calendar, Trash2,
  Instagram, Youtube, Facebook, Linkedin, Link2, Image,
  MessageSquare, Settings2, Send, X, RotateCcw, Share2, Copy, Check,
  FileText, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  IDEA: { label: "Idea", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  SCRIPTING: { label: "Scripting", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  DESIGNING: { label: "Designing", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  IN_REVIEW: { label: "In Review", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  ADMIN_APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  SCHEDULED: { label: "Scheduled", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  PUBLISHED: { label: "Published", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

const FORMAT_OPTIONS = ["VIDEO", "PHOTO", "GRAPHIC", "CAROUSEL", "REEL", "STORY", "ANIMATION", "INFOGRAPHIC"];
const PLATFORM_OPTIONS = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "LINKEDIN", "TIKTOK", "TWITTER", "PINTEREST"];

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="h-3.5 w-3.5 text-pink-500" />,
  YOUTUBE: <Youtube className="h-3.5 w-3.5 text-red-500" />,
  FACEBOOK: <Facebook className="h-3.5 w-3.5 text-blue-500" />,
  LINKEDIN: <Linkedin className="h-3.5 w-3.5 text-blue-600" />,
  TIKTOK: <span className="h-3.5 w-3.5 text-[10px] font-bold leading-none">TK</span>,
  TWITTER: <span className="h-3.5 w-3.5 text-[10px] font-bold leading-none">𝕏</span>,
  PINTEREST: <span className="h-3.5 w-3.5 text-[10px] font-bold leading-none">P</span>,
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PostRecord = {
  id: string;
  platform?: string | null;
  contentType?: string | null;
  status?: string | null;
  caption?: string | null;
  scheduledAt?: string | null;
  shootDate?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  referenceUrl?: string | null;
  assetsLink?: string | null;
  format?: string | null;
  needsRevision?: string | null;
  title?: string | null;
  customProperties?: { key: string; value: string }[] | null;
  comments?: { id: string; text: string; createdAt: string }[] | null;
  createdAt?: string | null;
};

type PanelState =
  | { mode: "closed" }
  | { mode: "create"; defaultDate?: string }
  | { mode: "edit"; post: PostRecord };

function emptyDraft(defaultDate?: string) {
  return {
    title: "",
    platform: "INSTAGRAM",
    contentType: "POST",
    status: "IDEA",
    caption: "",
    scheduledAt: defaultDate ?? "",
    shootDate: "",
    clientId: "",
    assetsLink: "",
    format: "",
    needsRevision: false,
    customProperties: [] as { key: string; value: string }[],
    comments: [] as { id: string; text: string; createdAt: string }[],
  };
}

function buildShareUrl(shareToken: string) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${window.location.origin}${base}/share/calendar/${shareToken}`;
}

export default function ContentPage() {
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeClientId, setActiveClientId] = useState<string>("");
  const [view, setView] = useState<"calendar" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [draft, setDraft] = useState(emptyDraft());
  const [newComment, setNewComment] = useState("");
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const month = format(currentMonth, "yyyy-MM");
  const { data: clients } = useListClients();
  const { data: posts, isLoading } = useListContentPosts({
    clientId: activeClientId || undefined,
    month,
  });
  const { data: existingShares } = useListCalendarShares(
    activeClientId ? { clientId: activeClientId } : undefined,
  );

  const activePost = panel.mode === "edit" && panel.post ? (posts ?? []).find(p => p.id === panel.post.id) || panel.post : null;

  const createMutation = useCreateContentPost({
    mutation: {
      onSuccess: () => {
        toast.success("Post created");
        qc.invalidateQueries({ queryKey: getListContentPostsQueryKey() });
        setPanel({ mode: "closed" });
      },
      onError: () => toast.error("Failed to create post"),
    },
  });

  const updateMutation = useUpdateContentPost({
    mutation: {
      onSuccess: () => {
        toast.success("Post saved");
        qc.invalidateQueries({ queryKey: getListContentPostsQueryKey() });
      },
      onError: () => toast.error("Failed to save"),
    },
  });

  const deleteMutation = useDeleteContentPost({
    mutation: {
      onSuccess: () => {
        toast.success("Post deleted");
        qc.invalidateQueries({ queryKey: getListContentPostsQueryKey() });
        setPanel({ mode: "closed" });
      },
    },
  });

  const shareMutation = useCreateCalendarShare({
    mutation: {
      onSuccess: (share) => {
        const url = buildShareUrl(share.shareToken);
        navigator.clipboard.writeText(url).then(() => {
          setCopiedShareId(share.id);
          toast.success("Share link copied to clipboard!");
          setTimeout(() => setCopiedShareId(null), 3000);
        });
        qc.invalidateQueries({ queryKey: ["listCalendarShares"] });
      },
      onError: () => toast.error("Failed to generate share link"),
    },
  });

  function openCreate(defaultDate?: string) {
    setDraft(emptyDraft(defaultDate ?? ""));
    setNewComment("");
    setPanel({ mode: "create", defaultDate });
  }

  function openEdit(post: PostRecord) {
    const freshPost = (posts ?? []).find(p => p.id === post.id) || post;
    setDraft({
      title: freshPost.title ?? "",
      platform: freshPost.platform ?? "INSTAGRAM",
      contentType: freshPost.contentType ?? "POST",
      status: freshPost.status ?? "IDEA",
      caption: freshPost.caption ?? "",
      scheduledAt: freshPost.scheduledAt ?? "",
      shootDate: freshPost.shootDate ?? "",
      clientId: freshPost.clientId ?? "",
      assetsLink: freshPost.assetsLink ?? "",
      format: freshPost.format ?? "",
      needsRevision: freshPost.needsRevision === "true",
      customProperties: freshPost.customProperties ?? [],
      comments: freshPost.comments ?? [],
    });
    setNewComment("");
    setPanel({ mode: "edit", post: freshPost });
  }

  function setField<K extends keyof typeof draft>(key: K, value: typeof draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function savePost() {
    const payload = {
      title: draft.title || undefined,
      platform: draft.platform,
      contentType: draft.contentType,
      status: draft.status,
      caption: draft.caption || undefined,
      scheduledAt: draft.scheduledAt || undefined,
      shootDate: draft.shootDate || undefined,
      clientId: draft.clientId || undefined,
      assetsLink: draft.assetsLink || undefined,
      format: draft.format || undefined,
      needsRevision: String(draft.needsRevision),
      customProperties: draft.customProperties.length ? draft.customProperties : undefined,
      comments: draft.comments.length ? draft.comments : undefined,
    };
    if (panel.mode === "create") {
      createMutation.mutate({ data: payload as any });
    } else if (panel.mode === "edit" && activePost) {
      updateMutation.mutate({ id: activePost.id, data: payload as any });
    }
  }

  function addCustomProp() {
    setField("customProperties", [...draft.customProperties, { key: "", value: "" }]);
  }

  function updateCustomProp(i: number, field: "key" | "value", val: string) {
    const next = draft.customProperties.map((p, idx) => idx === i ? { ...p, [field]: val } : p);
    setField("customProperties", next);
  }

  function removeCustomProp(i: number) {
    setField("customProperties", draft.customProperties.filter((_, idx) => idx !== i));
  }

  function addComment() {
    if (!newComment.trim()) return;
    const comment = { id: crypto.randomUUID(), text: newComment.trim(), createdAt: new Date().toISOString() };
    setField("comments", [...draft.comments, comment]);
    setNewComment("");
  }

  function removeComment(id: string) {
    setField("comments", draft.comments.filter((c) => c.id !== id));
  }

  function handleShare() {
    if (!activeClientId) return;
    const clientName = clients?.find((c) => c.id === activeClientId)?.companyName ?? "Client";
    shareMutation.mutate({
      data: { clientId: activeClientId, label: `${clientName} Content Calendar` },
    });
  }

  function copyExistingShare(shareToken: string, shareId: string) {
    const url = buildShareUrl(shareToken);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShareId(shareId);
      toast.success("Link copied!");
      setTimeout(() => setCopiedShareId(null), 3000);
    });
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));

  const filteredPosts = (posts ?? []).filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.caption?.toLowerCase().includes(q) ||
      p.platform?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q) ||
      p.clientName?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q)
    );
  });

  const postsByDay: Record<number, PostRecord[]> = {};
  filteredPosts.forEach((p) => {
    if (p.scheduledAt) {
      const cleanDate = p.scheduledAt.split("T")[0];
      const dayPart = Number(cleanDate.split("-")[2]);
      const day = !isNaN(dayPart) ? dayPart : new Date(p.scheduledAt).getUTCDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day]!.push(p as PostRecord);
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const activeClient = clients?.find((c) => c.id === activeClientId);

  const totalPublished   = (posts ?? []).filter((p) => p.status === "PUBLISHED").length;
  const totalScheduled   = (posts ?? []).filter((p) => p.status === "SCHEDULED").length;
  const totalNeedsRevision = (posts ?? []).filter((p) => (p as any).needsRevision === "true").length;

  const contentStatChips = [
    { label: "Posts This Month", value: posts?.length ?? 0,  accent: "border-l-primary",     icon: <FileText className="h-4 w-4" /> },
    { label: "Published",        value: totalPublished,       accent: "border-l-emerald-500", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Scheduled",        value: totalScheduled,       accent: "border-l-blue-500",    icon: <Clock className="h-4 w-4" /> },
    { label: "Needs Revision",   value: totalNeedsRevision,   accent: totalNeedsRevision > 0 ? "border-l-amber-400" : "border-l-slate-300", icon: <AlertTriangle className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6 animated-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Content Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeClientId ? `${activeClient?.companyName} — ` : ""}{posts?.length ?? 0} posts this month
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchBar placeholder="Search posts…" value={searchQuery} onChange={setSearchQuery} />
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setView("list")}
              className={cn("px-3 py-1 rounded-md text-sm font-medium transition-colors", view === "list" ? "bg-card shadow text-foreground" : "text-muted-foreground")}
            >List</button>
            <button
              onClick={() => setView("calendar")}
              className={cn("px-3 py-1 rounded-md text-sm font-medium transition-colors", view === "calendar" ? "bg-card shadow text-foreground" : "text-muted-foreground")}
            >Calendar</button>
          </div>
          {/* Share button — only when a client is selected */}
          {activeClientId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleShare}
              disabled={shareMutation.isPending}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          )}
          <Button onClick={() => openCreate()} className="gap-2 btn-micro-anim">
            <Plus className="h-4 w-4" /> Add Post
          </Button>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {contentStatChips.map(({ label, value, accent, icon }) => (
          <div key={label} className={cn("bg-card border border-l-[3px] rounded-xl p-4 scale-hover shadow-xs", accent)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold font-heading mt-1">{value}</p>
              </div>
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">{icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Existing share links for this client */}
      {activeClientId && existingShares && existingShares.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existingShares.map((share) => (
            <div key={share.id} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{share.label}</span>
              <button
                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => copyExistingShare(share.shareToken, share.id)}
              >
                {copiedShareId === share.id
                  ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                  : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Client Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {/* Month nav on the left */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1.5 shrink-0 mr-2">
          <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="p-0.5 hover:text-primary">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold min-w-28 text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="p-0.5 hover:text-primary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none">
          {/* "All" tab */}
          <button
            onClick={() => setActiveClientId("")}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
              activeClientId === ""
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            All Clients
          </button>
          {(clients ?? []).map((client, idx) => (
            <button
              key={client.id}
              onClick={() => setActiveClientId(client.id)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap",
                activeClientId === client.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {client.companyName}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{searchQuery ? "No matching posts" : "No posts this month"}</p>
              <p className="text-sm mt-1">
                {searchQuery
                  ? `No posts match "${searchQuery}"`
                  : activeClientId
                  ? `No content for ${activeClient?.companyName} yet — click "Add Post" to get started`
                  : `Click "Add Post" or a calendar date to get started`}
              </p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const sc = STATUS_CONFIG[post.status ?? "IDEA"] ?? STATUS_CONFIG.IDEA;
              return (
                <div
                  key={post.id}
                  className="flex items-start justify-between gap-3 bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => openEdit(post as PostRecord)}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">{PLATFORM_ICON[post.platform ?? "INSTAGRAM"]}</div>
                    <div className="flex-1 min-w-0">
                      {post.title && <p className="text-sm font-semibold truncate">{post.title}</p>}
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <Badge variant="outline" className="text-[11px]">{post.contentType}</Badge>
                        <Badge variant="secondary" className={cn("text-[11px]", sc.className)}>{sc.label}</Badge>
                        {post.scheduledAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(post.scheduledAt), "dd MMM, EEE")}
                          </span>
                        )}
                        {!activeClientId && (post as any).clientName && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{(post as any).clientName}</span>
                        )}
                        {(post as any).needsRevision === "true" && (
                          <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                            <RotateCcw className="h-2.5 w-2.5 mr-1" />Needs Revision
                          </Badge>
                        )}
                      </div>
                      {post.caption && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{post.caption}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: post.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Calendar Grid */
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-muted/50">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-28 border-b border-r border-border bg-muted/10" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPosts = postsByDay[day] ?? [];
              const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), "yyyy-MM-dd");
              return (
                <div
                  key={day}
                  className="min-h-28 border-b border-r border-border p-1.5 cursor-pointer hover:bg-primary/5 transition-colors group"
                  onClick={() => openCreate(dateStr)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-muted-foreground">{day}</p>
                    <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1 text-[10px] bg-primary/10 hover:bg-primary/20 rounded px-1 py-0.5 truncate cursor-pointer transition-colors"
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                      >
                        {PLATFORM_ICON[p.platform ?? "INSTAGRAM"]}
                        <span className="truncate">{p.title ?? p.caption?.slice(0, 20) ?? p.contentType}</span>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <p className="text-[10px] text-muted-foreground px-1">+{dayPosts.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Slide-over Panel ── */}
      <Sheet open={panel.mode !== "closed"} onOpenChange={(open) => { if (!open) setPanel({ mode: "closed" }); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0" side="right">
          <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
            <SheetHeader className="text-left">
              <SheetTitle className="text-base">
                {panel.mode === "create" ? "New Post" : "Edit Post"}
              </SheetTitle>
            </SheetHeader>
            <div className="flex items-center gap-2">
              {panel.mode === "edit" && (
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => { if (panel.mode === "edit" && activePost) deleteMutation.mutate({ id: activePost.id }); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" onClick={savePost} disabled={isPending} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {isPending ? "Saving…" : panel.mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <WriteWithAI
              context="content-post"
              onFill={(fields) => {
                if (fields.title) setField("title", fields.title);
                if (fields.caption) setField("caption", fields.caption);
                if (fields.platform) setField("platform", fields.platform);
                if (fields.contentType) setField("contentType", fields.contentType);
                if (fields.status) setField("status", fields.status);
              }}
            />
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5" /> Name
              </Label>
              <Input placeholder="Post title or name…" value={draft.title} onChange={(e) => setField("title", e.target.value)} />
            </div>

            <Separator />

            {/* Status + Platform */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</Label>
                <Select value={draft.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Platform</Label>
                <Select value={draft.platform} onValueChange={(v) => setField("platform", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Post Date + Shoot Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Post Date</Label>
                <Input type="date" value={draft.scheduledAt?.slice(0, 10) ?? ""} onChange={(e) => setField("scheduledAt", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shoot Date</Label>
                <Input type="date" value={draft.shootDate?.slice(0, 10) ?? ""} onChange={(e) => setField("shootDate", e.target.value)} />
              </div>
            </div>

            {/* Format + Client */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Format</Label>
                <Select value={draft.format || "__none__"} onValueChange={(v) => setField("format", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {FORMAT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</Label>
                <Select value={draft.clientId || "__none__"} onValueChange={(v) => setField("clientId", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No client</SelectItem>
                    {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assets Link */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Assets Link
              </Label>
              <Input placeholder="https://drive.google.com/…" value={draft.assetsLink} onChange={(e) => setField("assetsLink", e.target.value)} />
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caption / Notes</Label>
              <Textarea placeholder="Write your caption or notes here…" rows={4} value={draft.caption} onChange={(e) => setField("caption", e.target.value)} />
            </div>

            {/* Needs Revision */}
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Needs Revision</p>
                  <p className="text-xs text-muted-foreground">Flag this post for changes</p>
                </div>
              </div>
              <Switch checked={draft.needsRevision as boolean} onCheckedChange={(v) => setField("needsRevision", v)} />
            </div>

            {/* Created (read-only, edit only) */}
            {panel.mode === "edit" && activePost && activePost.createdAt && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</Label>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(activePost.createdAt), "dd MMM yyyy, hh:mm a")}
                </p>
              </div>
            )}

            <Separator />

            {/* Custom Properties */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" /> Properties
                </Label>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={addCustomProp}>
                  <Plus className="h-3 w-3" /> Add a property
                </Button>
              </div>
              {draft.customProperties.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No custom properties yet.</p>
              ) : (
                <div className="space-y-2">
                  {draft.customProperties.map((prop, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input className="h-8 text-sm" placeholder="Property name" value={prop.key} onChange={(e) => updateCustomProp(i, "key", e.target.value)} />
                      <Input className="h-8 text-sm" placeholder="Value" value={prop.value} onChange={(e) => updateCustomProp(i, "value", e.target.value)} />
                      <button className="shrink-0 text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeCustomProp(i)}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Comments
              </Label>
              {draft.comments.length > 0 && (
                <div className="space-y-2">
                  {draft.comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2 group/comment">
                      <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2">
                        <p className="text-sm">{c.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(c.createdAt), "dd MMM, hh:mm a")}</p>
                      </div>
                      <button
                        className="opacity-0 group-hover/comment:opacity-100 transition-opacity mt-2 text-muted-foreground hover:text-destructive"
                        onClick={() => removeComment(c.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  ref={commentInputRef}
                  placeholder="Add a comment…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addComment(); } }}
                  className="text-sm"
                />
                <Button size="sm" variant="outline" onClick={addComment} disabled={!newComment.trim()}>Add</Button>
              </div>
            </div>

            <div className="h-4" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
