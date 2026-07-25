import { useState, useEffect, useRef } from "react";
import { SearchBar } from "@/components/common/SearchBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useListClients } from "@workspace/api-client-react";
import {
  Instagram, Facebook, Youtube, Linkedin, Link as LinkIcon, CheckCircle2,
  BarChart3, UploadCloud, Send, FileOutput, Flame, Plus, Trash2,
  Twitter, Globe, X as XIcon, ImageIcon, VideoIcon, FileVideo,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "INSTAGRAM", label: "Instagram", icon: <Instagram className="h-4 w-4 text-pink-500" />, color: "bg-pink-50 border-pink-200 dark:bg-pink-950/20" },
  { id: "FACEBOOK", label: "Facebook", icon: <Facebook className="h-4 w-4 text-blue-500" />, color: "bg-blue-50 border-blue-200 dark:bg-blue-950/20" },
  { id: "YOUTUBE", label: "YouTube", icon: <Youtube className="h-4 w-4 text-red-500" />, color: "bg-red-50 border-red-200 dark:bg-red-950/20" },
  { id: "LINKEDIN", label: "LinkedIn", icon: <Linkedin className="h-4 w-4 text-blue-600" />, color: "bg-blue-50 border-blue-200 dark:bg-blue-950/20" },
  { id: "TWITTER", label: "X / Twitter", icon: <Twitter className="h-4 w-4 text-slate-800 dark:text-slate-200" />, color: "bg-slate-50 border-slate-200 dark:bg-slate-900/40" },
  { id: "TIKTOK", label: "TikTok", icon: <span className="text-xs font-bold">TK</span>, color: "bg-slate-50 border-slate-200 dark:bg-slate-900/40" },
  { id: "PINTEREST", label: "Pinterest", icon: <Globe className="h-4 w-4 text-red-600" />, color: "bg-red-50 border-red-200 dark:bg-red-950/20" },
];

type SocialAccount = {
  id: string;
  clientId: string;
  platform: string;
  handle: string | null;
  pageId: string | null;
  profileUrl: string | null;
  accessToken: string | null;
  isActive: string | null;
};

type UploadedMedia = {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
};

function getPlatformMeta(id: string) {
  return PLATFORMS.find((p) => p.id === id) ?? { id, label: id, icon: <Globe className="h-4 w-4" />, color: "" };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HawanHubPage() {
  const [activeTab, setActiveTab] = useState("accounts");
  const [activeClientId, setActiveClientId] = useState<string>("");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addPlatform, setAddPlatform] = useState("INSTAGRAM");
  const [addHandle, setAddHandle] = useState("");
  const [addProfileUrl, setAddProfileUrl] = useState("");
  const [addPageId, setAddPageId] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const [postTitle, setPostTitle] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [postDate, setPostDate] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isIgniting, setIsIgniting] = useState(false);

  // Media upload state
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: clients } = useListClients();

  const token = typeof window !== "undefined" ? localStorage.getItem("agency_token") : null;

  function authHeaders() {
    return { Authorization: `Bearer ${token}` };
  }

  async function loadAccounts(clientId: string) {
    if (!clientId) { setAccounts([]); return; }
    setLoadingAccounts(true);
    try {
      const res = await fetch(`/api/social-accounts?clientId=${clientId}`, {
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      setAccounts(await res.json());
    } catch {
      toast.error("Failed to load social accounts");
    } finally {
      setLoadingAccounts(false);
    }
  }

  useEffect(() => {
    if (clients && clients.length > 0 && !activeClientId) {
      setActiveClientId(clients[0]!.id);
    }
  }, [clients]);

  useEffect(() => {
    loadAccounts(activeClientId);
  }, [activeClientId]);

  async function handleAddAccount() {
    if (!activeClientId || !addPlatform) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/social-accounts", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: activeClientId,
          platform: addPlatform,
          handle: addHandle || undefined,
          profileUrl: addProfileUrl || undefined,
          pageId: addPageId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Social account added");
      setAddOpen(false);
      setAddHandle(""); setAddProfileUrl(""); setAddPageId("");
      await loadAccounts(activeClientId);
    } catch {
      toast.error("Failed to add account");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleDeleteAccount(id: string) {
    try {
      await fetch(`/api/social-accounts/${id}`, { method: "DELETE", headers: { ...authHeaders(), "Content-Type": "application/json" } });
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function uploadFile(file: File) {
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) { toast.error("File too large — max 100 MB"); return; }
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { toast.error("Only images and videos are supported"); return; }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data: UploadedMedia = await res.json();
      setUploadedMedia(data);
      toast.success(`${isImage ? "Image" : "Video"} uploaded!`);
    } catch {
      toast.error("Upload failed — please try again");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleIgnite() {
    if (!activeClientId) { toast.error("Select a client first"); return; }
    if (!postCaption.trim()) { toast.error("Write a caption first"); return; }
    if (selectedPlatforms.length === 0) { toast.error("Select at least one platform"); return; }
    setIsIgniting(true);
    try {
      const res = await fetch("/api/social-accounts/ignite", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: activeClientId,
          caption: postCaption,
          platforms: selectedPlatforms,
          scheduledAt: postDate || undefined,
          title: postTitle || undefined,
          assetsLink: uploadedMedia?.url || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`🔥 ${data.created} posts added to Content Calendar!`);
      setPostCaption(""); setPostTitle(""); setPostDate(""); setSelectedPlatforms([]);
      setUploadedMedia(null);
    } catch {
      toast.error("Failed to schedule posts");
    } finally {
      setIsIgniting(false);
    }
  }

  const clientAccounts = accounts.filter((a) => {
    if (a.clientId !== activeClientId) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.platform?.toLowerCase().includes(q) ||
      a.handle?.toLowerCase().includes(q) ||
      a.isActive?.toLowerCase().includes(q)
    );
  });
  const connectedPlatformIds = new Set(clientAccounts.map((a) => a.platform));
  const activeClient = clients?.find((c) => c.id === activeClientId);

  const isImage = uploadedMedia?.mimetype.startsWith("image/");
  const isVideo = uploadedMedia?.mimetype.startsWith("video/");

  return (
    <div className="p-6 space-y-5 animated-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" /> Hawan Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Centralized Social Media Engine — per client</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "accounts" && (
            <>
              <SearchBar placeholder="Search platforms…" value={searchQuery} onChange={setSearchQuery} />
              {activeClientId && (
                <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Handle
                </Button>
              )}
            </>
          )}
          <Button variant="outline" className="gap-2" onClick={() => toast.info("Report generation coming soon")}>
            <FileOutput className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* Client Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {(clients ?? []).map((client) => (
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
        {(clients ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No clients yet — add clients first</p>
        )}
      </div>

      {/* Stat chips — platform coverage summary */}
      {activeClientId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Platforms", value: PLATFORMS.length,               accent: "border-l-primary",     icon: <Globe className="h-4 w-4" /> },
            { label: "Connected",       value: connectedPlatformIds.size,       accent: "border-l-emerald-500", icon: <CheckCircle2 className="h-4 w-4" /> },
            { label: "Not Connected",   value: PLATFORMS.length - connectedPlatformIds.size, accent: "border-l-slate-400",   icon: <LinkIcon className="h-4 w-4" /> },
            { label: "Posts (All Time)", value: "—",                            accent: "border-l-orange-400",  icon: <BarChart3 className="h-4 w-4" /> },
          ].map(({ label, value, accent, icon }) => (
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
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="accounts">Social Handles</TabsTrigger>
          <TabsTrigger value="publish">Ignite Post</TabsTrigger>
        </TabsList>

        {/* ── Accounts tab ── */}
        <TabsContent value="accounts" className="mt-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            {activeClient
              ? `${clientAccounts.length} connected platform${clientAccounts.length !== 1 ? "s" : ""} for ${activeClient.companyName}`
              : "Select a client above"}
          </p>

          {loadingAccounts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : clientAccounts.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-border rounded-xl text-muted-foreground">
              <Flame className="h-10 w-10 mx-auto mb-3 text-orange-300 opacity-50" />
              <p className="font-medium">No social handles yet</p>
              <p className="text-sm mt-1">Click "Add Handle" to connect {activeClient?.companyName}'s social accounts</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clientAccounts.map((acc) => {
                const meta = getPlatformMeta(acc.platform);
                return (
                  <div key={acc.id} className={cn("flex items-center justify-between p-4 rounded-xl border bg-card", meta.color)}>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-background rounded-lg shadow-sm border border-border">{meta.icon}</div>
                      <div>
                        <p className="font-semibold text-sm">{meta.label}</p>
                        {acc.handle ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {acc.handle}
                          </p>
                        ) : acc.profileUrl ? (
                          <a href={acc.profileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-0.5 block truncate max-w-[140px]">
                            {acc.profileUrl}
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">Connected</p>
                        )}
                      </div>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      onClick={() => handleDeleteAccount(acc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Platform coverage */}
          {activeClientId && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Platform Coverage</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
                      connectedPlatformIds.has(p.id)
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                        : "bg-muted/60 border-transparent text-muted-foreground"
                    )}
                  >
                    {p.icon}
                    {p.label}
                    {connectedPlatformIds.has(p.id) && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Ignite Post tab ── */}
        <TabsContent value="publish" className="mt-5">
          <div className="max-w-2xl space-y-5">
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" /> Compose & Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client reminder */}
                {activeClient && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20 text-sm">
                    <span className="font-medium">{activeClient.companyName}</span>
                    <span className="text-muted-foreground">— {clientAccounts.length} platform{clientAccounts.length !== 1 ? "s" : ""} connected</span>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Post Title (optional)</Label>
                  <Input
                    placeholder="e.g. Summer Launch Campaign"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                  />
                </div>

                {/* Caption */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caption / Content</Label>
                  <Textarea
                    placeholder="Write your post caption here… it will be added to the Content Calendar for each selected platform."
                    className="min-h-[120px] resize-none bg-background"
                    value={postCaption}
                    onChange={(e) => setPostCaption(e.target.value)}
                  />
                </div>

                {/* ── Media Upload ── */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Media — Image or Video (optional)
                  </Label>

                  {uploadedMedia ? (
                    <div className="relative rounded-xl border border-border bg-muted/30 overflow-hidden">
                      {isImage ? (
                        <img
                          src={uploadedMedia.url}
                          alt="Uploaded media"
                          className="w-full max-h-60 object-cover"
                        />
                      ) : isVideo ? (
                        <video
                          src={uploadedMedia.url}
                          controls
                          className="w-full max-h-60 bg-black"
                        />
                      ) : null}
                      <div className="flex items-center justify-between px-3 py-2 bg-background/90 border-t border-border">
                        <div className="flex items-center gap-2 text-sm">
                          {isImage
                            ? <ImageIcon className="h-4 w-4 text-blue-500" />
                            : <VideoIcon className="h-4 w-4 text-purple-500" />}
                          <span className="truncate max-w-[200px] text-muted-foreground">{uploadedMedia.filename}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">{formatBytes(uploadedMedia.size)}</Badge>
                        </div>
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          onClick={() => { setUploadedMedia(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                        isDragging
                          ? "border-primary bg-primary/5 scale-[1.01]"
                          : "border-border hover:border-primary/50 hover:bg-muted/30",
                        isUploading && "pointer-events-none opacity-60"
                      )}
                    >
                      {isUploading ? (
                        <>
                          <UploadCloud className="h-8 w-8 text-primary animate-bounce" />
                          <p className="text-sm font-medium text-muted-foreground">Uploading…</p>
                        </>
                      ) : (
                        <>
                          <div className="flex gap-3 text-muted-foreground">
                            <ImageIcon className="h-7 w-7" />
                            <FileVideo className="h-7 w-7" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">Drop image or video here</p>
                            <p className="text-xs text-muted-foreground mt-0.5">or click to browse — JPG, PNG, GIF, MP4, MOV · max 100 MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Schedule date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schedule Date (optional)</Label>
                  <Input type="date" value={postDate} onChange={(e) => setPostDate(e.target.value)} className="max-w-xs" />
                </div>

                {/* Platform selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Post To Platforms</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => {
                      const isConnected = connectedPlatformIds.has(p.id);
                      const isSelected = selectedPlatforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => togglePlatform(p.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : isConnected
                              ? "bg-muted/60 border-border hover:border-primary/40 text-foreground"
                              : "bg-muted/30 border-border/50 text-muted-foreground"
                          )}
                        >
                          {p.icon} {p.label}
                          {isConnected && !isSelected && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>
                  {selectedPlatforms.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? "s" : ""} selected — this will create {selectedPlatforms.length} post{selectedPlatforms.length !== 1 ? "s" : ""} in Content Calendar
                      {uploadedMedia && " with your uploaded media"}
                    </p>
                  )}
                </div>

                {/* Info banner */}
                <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  <span className="shrink-0 mt-0.5">ℹ️</span>
                  <span>
                    Posts are added to your <strong>Content Calendar</strong> as "Scheduled" so your team can track them.
                    For <strong>automatic publishing</strong> to the actual platforms, connect each platform's API key in the handle settings.
                  </span>
                </div>

                <Button
                  onClick={handleIgnite}
                  disabled={isIgniting || isUploading || !postCaption.trim() || selectedPlatforms.length === 0}
                  className="w-full gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
                  size="lg"
                >
                  {isIgniting
                    ? <span className="animate-pulse">Igniting…</span>
                    : <><Flame className="h-5 w-5" /> Ignite — Add to Calendar</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Handle Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Social Handle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={addPlatform} onValueChange={setAddPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">{p.icon} {p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Handle / Username</Label>
              <Input placeholder="@username or page name" value={addHandle} onChange={(e) => setAddHandle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Profile URL (optional)</Label>
              <Input placeholder="https://instagram.com/yourpage" value={addProfileUrl} onChange={(e) => setAddProfileUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Page / Channel ID (optional)</Label>
              <Input placeholder="Page ID for API connections" value={addPageId} onChange={(e) => setAddPageId(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAccount} disabled={addSaving || !addPlatform}>
              {addSaving ? "Adding…" : "Add Handle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
