"use client";

import { useActionState, useEffect, useState } from "react";
import { 
  Plus, Calendar, List, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, 
  FileText, Download, MessageSquare, ArrowLeft, UploadCloud, Film, ExternalLink, 
  Smartphone, Shield, UserCheck, Check, Loader2, Play, Pause, TrendingUp, Send, 
  Settings, Share2, Layers, Video, Image as ImageIcon, BarChart2, CheckSquare, X as CloseIcon, Info
} from "lucide-react";
import { toast } from "sonner";
import { createContentPost, updateContentStatus, approveContent } from "@/lib/actions/content";
import { CONTENT_STATUSES } from "@/lib/constants";
import type { ActionResult } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const initial: ActionResult = { ok: false, error: "" };

// Platform details
const PLATFORMS = [
  { id: "tiktok", name: "TikTok", color: "text-[#FE2C55]", bg: "bg-[#FE2C55]/10", border: "border-[#FE2C55]/20" },
  { id: "youtube_shorts", name: "YouTube Shorts", color: "text-[#FF0000]", bg: "bg-[#FF0000]/10", border: "border-[#FF0000]/20" },
  { id: "instagram_reels", name: "Instagram Reels", color: "text-[#E1306C]", bg: "bg-[#E1306C]/10", border: "border-[#E1306C]/20" },
  { id: "facebook_reels", name: "Facebook Reels", color: "text-[#1877F2]", bg: "bg-[#1877F2]/10", border: "border-[#1877F2]/20" },
  { id: "snapchat", name: "Snapchat Spotlight", color: "text-[#FFFC00]", bg: "bg-[#FFFC00]/10", border: "border-[#FFFC00]/20" },
  { id: "x", name: "X (Twitter)", color: "text-[#F5F5F5]", bg: "bg-[#F5F5F5]/10", border: "border-[#F5F5F5]/20" },
  { id: "threads", name: "Threads", color: "text-[#FFFFFF]", bg: "bg-[#FFFFFF]/10", border: "border-[#FFFFFF]/20" },
  { id: "bluesky", name: "Bluesky", color: "text-[#0A7AFF]", bg: "bg-[#0A7AFF]/10", border: "border-[#0A7AFF]/20" }
];

const CAPTION_TEMPLATES = [
  { name: "Launch Promo", text: "Big news! 🚨 We are officially live with our brand new campaign. Check the link in bio to learn more! #launch #trending #new" },
  { name: "Discount Alert", text: "FLASH SALE ⚡ Save 20% off all products this weekend only. Use code FLASH20 at checkout! #sale #discount #offer" },
  { name: "Customer Review Hook", text: "Don't just take our word for it! Here is what our awesome clients are saying about working with us. 👇 #review #happyclient #testimonial" },
  { name: "Product Feature Outline", text: "Say hello to seamless publishing. 🚀 Here are the top 3 features you'll love: 1️⃣ speed, 2️⃣ efficiency, 3️⃣ auto-reach. #workflow #productivity" }
];

// Predefined mock analytics
const ANALYTICS_DATA = [
  { day: "Mon", Views: 152000, Likes: 8900, Comments: 1200, Growth: 140 },
  { day: "Tue", Views: 284000, Likes: 14200, Comments: 2100, Growth: 280 },
  { day: "Wed", Views: 210000, Likes: 9500, Comments: 1400, Growth: 190 },
  { day: "Thu", Views: 495000, Likes: 26400, Comments: 4200, Growth: 510 },
  { day: "Fri", Views: 390000, Likes: 18900, Comments: 2900, Growth: 320 },
  { day: "Sat", Views: 742000, Likes: 38700, Comments: 5600, Growth: 850 },
  { day: "Sun", Views: 680000, Likes: 32400, Comments: 4800, Growth: 710 },
];

function ContentForm({
  clients,
  assignees,
  onSuccess,
  defaultDate,
}: {
  clients: { id: string; companyName: string }[];
  assignees: { id: string; name: string }[];
  onSuccess: () => void;
  defaultDate?: string;
}) {
  const [state, formAction] = useActionState(createContentPost, initial);
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "linkedin", "youtube"]);

  useEffect(() => {
    if (state.ok) { onSuccess(); toast.success("Content created"); }
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state, onSuccess]);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2"><Label>Client *</Label>
        <select name="clientId" required className="flex h-9 w-full rounded-md border px-3 text-sm bg-background">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
      </div>
      <div className="space-y-2"><Label>Title *</Label><Input name="title" required /></div>
      <div className="space-y-2"><Label>Caption</Label><Textarea name="caption" rows={2} /></div>
      <div className="space-y-2"><Label>Script</Label><Textarea name="script" rows={3} /></div>
      <div className="space-y-2"><Label>Assignee</Label>
        <select name="assigneeId" className="flex h-9 w-full rounded-md border px-3 text-sm bg-background">
          <option value="">None</option>
          {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Schedule</Label>
        <Input name="scheduledAt" type="datetime-local" defaultValue={defaultDate} />
      </div>
      <div className="space-y-2">
        <Label>Publish Platforms</Label>
        <div className="flex gap-4 pt-1">
          <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={platforms.includes("instagram")}
              onChange={() => togglePlatform("instagram")}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            Instagram
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={platforms.includes("linkedin")}
              onChange={() => togglePlatform("linkedin")}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            LinkedIn
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={platforms.includes("youtube")}
              onChange={() => togglePlatform("youtube")}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            YouTube
          </label>
        </div>
      </div>
      <input type="hidden" name="status" value="IDEA" />
      <input type="hidden" name="platforms" value={JSON.stringify(platforms)} />
      <SubmitButton label="Add content" />
    </form>
  );
}

export function ContentManager({
  posts,
  clients,
  assignees,
  canManage,
  isAdmin,
}: {
  posts: {
    id: string;
    title: string;
    caption: string | null;
    script: string | null;
    status: string;
    platforms: string;
    scheduledAt: Date | null;
    publishedAt: Date | null;
    publishProof: string | null;
    client: { companyName: string };
  }[];
  clients: { id: string; companyName: string }[];
  assignees: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "calendar">("kanban");
  const [selectedPost, setSelectedPost] = useState<typeof posts[0] | null>(null);

  // Calendar & Local Post States
  const [localPosts, setLocalPosts] = useState(posts);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [defaultScheduleDate, setDefaultScheduleDate] = useState("");

  // Tab State: calendar vs client publishing hub
  const [activeMainTab, setActiveMainTab] = useState<"calendar" | "hub">("calendar");

  // Client Hub States
  const [activeHubClient, setActiveHubClient] = useState<{ id: string; companyName: string } | null>(null);
  const [hubMode, setHubMode] = useState<"admin" | "handler">("handler");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"publisher" | "bulk" | "analytics">("publisher");

  // One-Click Form States
  const [stagedFile, setStagedFile] = useState<{ name: string; size: string; type: "video" | "image" } | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "tiktok", "youtube_shorts", "instagram_reels", "facebook_reels", "snapchat", "x", "threads", "bluesky"
  ]);
  const [defaultCaption, setDefaultCaption] = useState("");
  const [platformCaptions, setPlatformCaptions] = useState<Record<string, string>>({});
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);
  const [customCover, setCustomCover] = useState<string | null>(null);
  const [autoFirstComment, setAutoFirstComment] = useState(true);
  const [scheduleDate, setScheduleDate] = useState("");
  const [captionTemplate, setCaptionTemplate] = useState("");
  const [previewPlatform, setPreviewPlatform] = useState<string>("instagram_reels");

  // Simulated progress popup states
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState<"optimizing" | "uploading" | "first_comment" | "done">("optimizing");
  const [optimizeProgress, setOptimizeProgress] = useState(0);
  const [platformProgress, setPlatformProgress] = useState<Record<string, number>>({});
  const [uploadLog, setUploadLog] = useState<string[]>([]);

  // Bulk Assets Staging Queue
  const [bulkQueue, setBulkQueue] = useState<Array<{
    id: string;
    title: string;
    file: { name: string; size: string; type: "video" | "image" };
    platforms: string[];
    caption: string;
    status: "Draft" | "Ready" | "Queued";
  }>>([
    {
      id: "q1",
      title: "Summer Collection Teaser Video",
      file: { name: "summer_teaser.mp4", size: "42.5 MB", type: "video" },
      platforms: ["tiktok", "instagram_reels", "youtube_shorts"],
      caption: "Get ready for the heat! ☀️ Our brand new summer lineup drops this Friday! #fashion #summervibe #newarrival",
      status: "Ready"
    },
    {
      id: "q2",
      title: "Behind The Scenes - Brand Store Delhi Launch",
      file: { name: "delhi_bts.mp4", size: "128.1 MB", type: "video" },
      platforms: ["youtube_shorts", "instagram_reels", "facebook_reels", "bluesky"],
      caption: "A sneak peek of the absolute madness at the grand launch of the Delhi store! Thank you all for showing up! 🙌 #retail #bts",
      status: "Draft"
    }
  ]);

  // Keep localPosts in sync if initial posts change
  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  // Handle template selection
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCaptionTemplate(val);
    if (val) {
      const template = CAPTION_TEMPLATES.find(t => t.name === val);
      if (template) {
        setDefaultCaption(template.text);
      }
    }
  };

  // Simulate file drops
  const handleSimulatedDrop = (type: "video" | "image") => {
    if (type === "video") {
      setStagedFile({ name: "campaign_reveal_9_16.mp4", size: "84.2 MB", type: "video" });
      toast.success("Short video staged successfully!");
    } else {
      setStagedFile({ name: "launch_banner_wide.png", size: "3.1 MB", type: "image" });
      toast.success("Post image staged successfully!");
    }
  };

  // Toggle cross-publishing targets
  const handleTogglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) ? prev.filter(p => p !== platformId) : [...prev, platformId]
    );
  };

  // One-click publish trigger simulation
  const handlePublishNow = () => {
    if (!stagedFile) {
      toast.error("Please drag/drop or stage a video or image file first!");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one publishing platform!");
      return;
    }

    setIsPublishing(true);
    setPublishStep("optimizing");
    setOptimizeProgress(0);
    setUploadLog(["Initializing format check..."]);

    // Phase 1: format checks (0-100%)
    const optInterval = setInterval(() => {
      setOptimizeProgress(prev => {
        if (prev >= 100) {
          clearInterval(optInterval);
          // Transition to uploading
          setPublishStep("uploading");
          setUploadLog(prevLog => [...prevLog, "Video format checks passed (9:16 vertical ratio).", "Audio compression leveled.", "Connecting platform streams...", "Starting parallel uploads..."]);
          startSimulatedUploads();
          return 100;
        }
        if (prev === 20) setUploadLog(prevLog => [...prevLog, "Analyzing aspect ratio..."]);
        if (prev === 50) setUploadLog(prevLog => [...prevLog, "Checking metadata compliance..."]);
        if (prev === 80) setUploadLog(prevLog => [...prevLog, "Optimizing container tags..."]);
        return prev + 10;
      });
    }, 150);
  };

  // Phase 2: parallel upload simulation
  const startSimulatedUploads = () => {
    const progress: Record<string, number> = {};
    selectedPlatforms.forEach(p => {
      progress[p] = 0;
    });
    setPlatformProgress(progress);

    const uploadInterval = setInterval(() => {
      let allDone = true;
      setPlatformProgress(prev => {
        const next = { ...prev };
        selectedPlatforms.forEach(p => {
          if (next[p] < 100) {
            next[p] = Math.min(100, next[p] + Math.floor(Math.random() * 20) + 5);
            allDone = false;
          }
        });

        if (allDone) {
          clearInterval(uploadInterval);
          // Transition to first comment
          if (autoFirstComment) {
            setPublishStep("first_comment");
            setUploadLog(prevLog => [...prevLog, "All platforms uploaded successfully.", "Initiating auto-posting of first comment templates..."]);
            setTimeout(() => {
              finalizePublish();
            }, 1200);
          } else {
            finalizePublish();
          }
        }
        return next;
      });
    }, 250);
  };

  // Finalize
  const finalizePublish = () => {
    setPublishStep("done");
    setUploadLog(prevLog => [
      ...prevLog,
      "First comments posted on TikTok & Instagram Reels.",
      "Coordinated launches successfully executed!",
      `Ayrshare Profile active ID: ${activeHubClient?.companyName.toLowerCase().replace(/\s/g, "")}`,
      "Engagement milestone tracking established."
    ]);

    // Append to local posts so it updates calendar instantly!
    const newPost = {
      id: `sim-${Date.now()}`,
      title: stagedFile?.name || "One-Click Social Video",
      caption: defaultCaption || "Coordinated platform publish",
      script: "Published instantly via Social Handler Hub",
      status: scheduleDate ? "ADMIN_APPROVED" : "PUBLISHED",
      platforms: JSON.stringify(selectedPlatforms),
      scheduledAt: scheduleDate ? new Date(scheduleDate) : new Date(),
      publishedAt: scheduleDate ? null : new Date(),
      publishProof: scheduleDate ? null : `sim-proof-ayrshare-${Date.now()}`,
      client: { companyName: activeHubClient?.companyName || "Client" }
    };
    
    setLocalPosts(prev => [newPost, ...prev]);
    toast.success(`Post successfully published across ${selectedPlatforms.length} platforms!`);
  };

  // Schedule Post simulation
  const handleSchedulePost = () => {
    if (!stagedFile) {
      toast.error("Please stage a file first.");
      return;
    }
    if (!scheduleDate) {
      toast.error("Please pick a schedule date & time.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select platforms first.");
      return;
    }

    const scheduled = {
      id: `sim-sched-${Date.now()}`,
      title: stagedFile.name,
      caption: defaultCaption || "Scheduled platform release",
      script: "Scheduled in advance via One-Click Hub",
      status: "ADMIN_APPROVED",
      platforms: JSON.stringify(selectedPlatforms),
      scheduledAt: new Date(scheduleDate),
      publishedAt: null,
      publishProof: null,
      client: { companyName: activeHubClient?.companyName || "Client" }
    };

    setLocalPosts(prev => [scheduled, ...prev]);
    toast.success(`Successfully scheduled for ${new Date(scheduleDate).toLocaleString()} across ${selectedPlatforms.length} channels.`);
    setScheduleDate("");
    setStagedFile(null);
  };

  // Save Draft Simulation
  const handleSaveDraft = () => {
    if (!stagedFile) {
      toast.error("Provide a file to save draft.");
      return;
    }
    toast.success("Draft saved successfully inside Client workspace.");
    setStagedFile(null);
  };

  // Bulk publish simulation
  const handleBulkLaunch = () => {
    if (bulkQueue.length === 0) {
      toast.error("No ready items in queue.");
      return;
    }
    setIsPublishing(true);
    setPublishStep("optimizing");
    setOptimizeProgress(0);
    setUploadLog(["Initializing Bulk Release workflow..."]);

    const optInterval = setInterval(() => {
      setOptimizeProgress(prev => {
        if (prev >= 100) {
          clearInterval(optInterval);
          setPublishStep("uploading");
          setUploadLog(prevLog => [...prevLog, "Format checks completed for all bulk assets.", "Starting multi-channel pipeline..."]);
          
          const progress: Record<string, number> = {};
          selectedPlatforms.forEach(p => {
            progress[p] = 0;
          });
          setPlatformProgress(progress);

          const uploadInterval = setInterval(() => {
            let allDone = true;
            setPlatformProgress(prevP => {
              const next = { ...prevP };
              selectedPlatforms.forEach(p => {
                if (next[p] < 100) {
                  next[p] = Math.min(100, next[p] + 12);
                  allDone = false;
                }
              });
              if (allDone) {
                clearInterval(uploadInterval);
                setPublishStep("done");
                setUploadLog(l => [...l, "Bulk campaign published!", "Draft queues cleared."]);
                
                // Add all bulk posts to calendar
                const bulkPosts = bulkQueue.map((item, idx) => ({
                  id: `sim-bulk-${idx}-${Date.now()}`,
                  title: item.title,
                  caption: item.caption,
                  script: "Bulk Upload Queue item",
                  status: "PUBLISHED",
                  platforms: JSON.stringify(item.platforms),
                  scheduledAt: new Date(),
                  publishedAt: new Date(),
                  publishProof: `sim-proof-bulk-${idx}`,
                  client: { companyName: activeHubClient?.companyName || "Client" }
                }));

                setLocalPosts(prev => [...bulkPosts, ...prev]);
                setBulkQueue([]);
                toast.success("Bulk campaign released successfully!");
              }
              return next;
            });
          }, 150);
          return 100;
        }
        return prev + 25;
      });
    }, 100);
  };

  // Kanban view mapping
  const byStatus = CONTENT_STATUSES.map((status) => ({
    status,
    posts: localPosts.filter((p) => p.status === status),
  }));

  // Calendar dates generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  const daysArray = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({
      date: new Date(year, month - 1, prevMonthTotalDays - i),
      isCurrentMonth: false,
    });
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }
  const totalCells = 42;
  const nextMonthPadding = totalCells - daysArray.length;
  for (let i = 1; i <= nextMonthPadding; i++) {
    daysArray.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(new Date(year, month + (direction === "prev" ? -1 : 1), 1));
  };

  const getWeekDayName = (idx: number) => {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx];
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "default";
      case "IN_REVIEW": return "outline";
      case "ADMIN_APPROVED": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Tab Bar: Toggle Calendar vs. Hub */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1 rounded-xl">
        <button
          onClick={() => setActiveMainTab("calendar")}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
            activeMainTab === "calendar" 
              ? "bg-slate-850 text-white border border-slate-700 shadow-md" 
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="h-4 w-4" /> Calendar & Workflows
        </button>
        <button
          onClick={() => setActiveMainTab("hub")}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
            activeMainTab === "hub" 
              ? "bg-slate-850 text-white border border-slate-700 shadow-md" 
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Share2 className="h-4 w-4 text-primary" /> Client Social Publishing Hub
        </button>
      </div>

      {activeMainTab === "calendar" ? (
        /* Calendar / Kanban main view (Original Dashboard) */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card p-2.5 border rounded-xl shadow-sm soft-transition">
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                onClick={() => setViewMode("kanban")}
                className="flex items-center gap-1.5 text-xs btn-micro-anim"
              >
                <List className="h-3.5 w-3.5" /> List Columns
              </Button>
              <Button
                size="sm"
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                onClick={() => setViewMode("calendar")}
                className="flex items-center gap-1.5 text-xs btn-micro-anim"
              >
                <Calendar className="h-3.5 w-3.5" /> Interactive Calendar
              </Button>
            </div>

            {canManage && (
              <Dialog open={open} onOpenChange={(openState) => {
                setOpen(openState);
                if (!openState) setDefaultScheduleDate("");
              }}>
                <DialogTrigger render={<Button size="sm" className="btn-micro-anim" />}><Plus className="h-4 w-4 mr-1.5" />Add content</DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New content piece</DialogTitle></DialogHeader>
                  <ContentForm
                    clients={clients}
                    assignees={assignees}
                    onSuccess={() => setOpen(false)}
                    defaultDate={defaultScheduleDate}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {viewMode === "kanban" ? (
            <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
              {byStatus.map(({ status, posts: col }) => (
                <Card key={status} className="border-slate-800 bg-slate-900/40 text-slate-100">
                  <CardHeader className="py-3 border-b border-slate-800/60 bg-slate-950/20">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {status.replace(/_/g, " ")} ({col.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 mt-3">
                    {col.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="border border-slate-800 rounded-lg p-3 text-sm cursor-pointer hover:border-slate-700/80 hover:bg-slate-900/60 scale-hover bg-slate-950/40 transition"
                      >
                        <p className="font-semibold text-slate-200 truncate">{post.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{post.client.companyName}</p>
                        
                        {post.platforms && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {JSON.parse(post.platforms).map((plat: string) => {
                              const match = PLATFORMS.find(p => p.id === plat);
                              return (
                                <span key={plat} className={`text-[9px] px-1 py-0.5 rounded uppercase font-bold border ${match?.bg || "bg-slate-800"} ${match?.color || "text-slate-300"} ${match?.border || "border-slate-700"}`}>
                                  {plat.replace("_reels", "").replace("_shorts", "")}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/40">
                          <Badge variant={getStatusBadgeVariant(post.status)} className="text-[9px]">
                            {post.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
              <CardHeader className="py-4 border-b border-slate-800 flex flex-row items-center justify-between bg-slate-950/20">
                <div>
                  <CardTitle className="text-base font-bold text-slate-200">
                    {currentDate.toLocaleString("default", { month: "long" })} {year}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">Select any day to schedule new content</CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="icon" variant="outline" className="h-8 w-8 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white btn-micro-anim" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white btn-micro-anim" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-7 border-b border-slate-800 text-center text-xs font-semibold text-slate-400 bg-slate-950/40 py-2">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <div key={idx}>{getWeekDayName(idx)}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 grid-rows-6 border-b border-slate-800 divide-x divide-y divide-slate-800/80 min-h-[500px]">
                  {daysArray.map((cell, idx) => {
                    const dayPosts = localPosts.filter((p) => p.scheduledAt && isSameDay(new Date(p.scheduledAt), cell.date));
                    return (
                      <div
                        key={idx}
                        className={`p-2 space-y-1.5 flex flex-col justify-between hover:bg-slate-800/20 transition min-h-[90px] relative ${
                          cell.isCurrentMonth ? "bg-slate-950/10 text-slate-200" : "bg-slate-950/30 text-slate-500"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold leading-none ${isSameDay(new Date(), cell.date) ? "h-5 w-5 bg-primary text-white rounded-full flex items-center justify-center font-extrabold" : ""}`}>
                            {cell.date.getDate()}
                          </span>
                          {cell.isCurrentMonth && canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                const formattedDate = cell.date.toISOString().slice(0, 16);
                                setDefaultScheduleDate(formattedDate);
                                setOpen(true);
                              }}
                              className="opacity-0 hover:opacity-100 focus:opacity-100 absolute top-2 right-2 text-primary hover:text-white bg-primary/20 hover:bg-primary rounded p-0.5"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <div className="flex-1 space-y-1 mt-1 overflow-y-auto max-h-[70px]">
                          {dayPosts.map((post) => (
                            <div
                              key={post.id}
                              onClick={() => setSelectedPost(post)}
                              className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate cursor-pointer transition ${
                                post.status === "PUBLISHED"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                  : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700"
                              }`}
                            >
                              {post.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ayrshare Simulated Queue log */}
          <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
            <CardHeader className="py-4 border-b border-slate-800 bg-slate-950/20">
              <CardTitle className="text-sm font-bold text-slate-200">Ayrshare Auto-Publishing Queue (Simulated)</CardTitle>
              <CardDescription className="text-xs text-slate-400">Real-time status logs of social posts publishing automatically from calendar</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Queue Status</span>
                  <span className="text-slate-200 font-medium">Ayrshare API: Connected</span>
                </div>
                {localPosts.filter(p => p.status === "PUBLISHED" || p.status === "ADMIN_APPROVED").map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border border-slate-800 bg-slate-950/30 p-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${p.status === "PUBLISHED" ? "bg-emerald-500" : "bg-blue-400 animate-pulse"}`} />
                      <span className="font-semibold text-slate-300 truncate max-w-[200px]">{p.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={`text-[9px] ${p.status === "PUBLISHED" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" : "border-blue-500/30 text-blue-400 bg-blue-500/5"}`}>
                        {p.status === "PUBLISHED" ? "Published Live" : "In Queue"}
                      </Badge>
                      <span className="text-[10px] text-slate-500">
                        {p.publishedAt ? new Date(p.publishedAt).toLocaleTimeString() : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
                {localPosts.filter(p => p.status === "PUBLISHED" || p.status === "ADMIN_APPROVED").length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No published or approved items in queue.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* CLIENT SOCIAL PUBLISHING HUB VIEW */
        <div className="space-y-6">
          {!activeHubClient ? (
            /* BRAND/CLIENT TABLE LIST */
            <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
              <CardHeader className="py-4 border-b border-slate-800 bg-slate-950/20">
                <CardTitle className="text-base font-bold text-slate-200">Social Publishing Brand Workspaces</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Select a client workspace to enter Admin or Social Media Handler view for core multi-channel cross-publishing.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-950/40 border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Client Brand Name</th>
                        <th className="px-6 py-4">API Credential Channels</th>
                        <th className="px-6 py-4">Workspace Access Level</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {clients.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-900/40 transition scale-hover">
                          <td className="px-6 py-4 font-semibold text-slate-200 flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center font-bold text-white text-xs uppercase shadow-sm">
                              {c.companyName.substring(0, 2)}
                            </div>
                            {c.companyName}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {PLATFORMS.map(p => (
                                <span key={p.id} className={`text-[9px] px-2 py-0.5 rounded font-semibold border ${p.bg} ${p.color} ${p.border}`}>
                                  {p.name.replace(" Spotlight", "").replace(" (Twitter)", "")}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <Badge variant="outline" className="border-indigo-500/20 text-indigo-400 bg-indigo-500/5">
                              8 Channels Integrated
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <Button 
                              size="xs" 
                              variant="outline"
                              className="border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/15 text-[11px] h-7"
                              onClick={() => {
                                setActiveHubClient(c);
                                setHubMode("admin");
                              }}
                            >
                              <Shield className="h-3 w-3 mr-1" /> Admin Panel
                            </Button>
                            <Button 
                              size="xs"
                              className="text-[11px] h-7 bg-primary hover:bg-primary/90"
                              onClick={() => {
                                setActiveHubClient(c);
                                setHubMode("handler");
                              }}
                            >
                              <UserCheck className="h-3 w-3 mr-1" /> Handler View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* BRAND WORKSPACE VIEW CONTAINER */
            <div className="space-y-6">
              {/* Back to clients & Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
                <div className="flex items-center gap-3">
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8 border-slate-800 hover:bg-slate-800"
                    onClick={() => setActiveHubClient(null)}
                  >
                    <ArrowLeft className="h-4 w-4 text-slate-400" />
                  </Button>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      {activeHubClient.companyName}
                      <Badge className={hubMode === "admin" ? "bg-blue-500 text-white" : "bg-primary text-white"}>
                        {hubMode === "admin" ? "Admin Mode" : "Handler Mode"}
                      </Badge>
                    </h2>
                    <p className="text-xs text-slate-400">Manage credentials, one-click coordinated publishing, and batch uploads.</p>
                  </div>
                </div>
                
                {/* Mode toggle */}
                <div className="flex items-center gap-1.5 border border-slate-800 p-0.5 rounded-lg bg-slate-950">
                  <button 
                    onClick={() => setHubMode("handler")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${hubMode === "handler" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-300"}`}
                  >
                    Handler
                  </button>
                  <button 
                    onClick={() => setHubMode("admin")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${hubMode === "admin" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-300"}`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Sub Navigation Inside Workspace */}
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setActiveWorkspaceTab("publisher")}
                  className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                    activeWorkspaceTab === "publisher" ? "border-primary text-white bg-slate-900/20" : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Share2 className="h-4 w-4" /> One-Click Cross-Publisher
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab("bulk")}
                  className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                    activeWorkspaceTab === "bulk" ? "border-primary text-white bg-slate-900/20" : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Layers className="h-4 w-4" /> Bulk Video Queue ({bulkQueue.length})
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab("analytics")}
                  className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                    activeWorkspaceTab === "analytics" ? "border-primary text-white bg-slate-900/20" : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <BarChart2 className="h-4 w-4" /> Performance & Analytics
                </button>
              </div>

              {activeWorkspaceTab === "publisher" && (
                /* ONE-CLICK CROSS PUBLISHER */
                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Left inputs */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Media Dropzone */}
                    <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                      <CardContent className="p-6">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Stage Content Media File</Label>
                        {!stagedFile ? (
                          <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center bg-slate-950/20 hover:bg-slate-950/40 transition">
                            <UploadCloud className="h-8 w-8 mx-auto text-slate-500 mb-2" />
                            <p className="text-xs text-slate-400 font-semibold">Drag and drop or click to upload video or image</p>
                            <p className="text-[10px] text-slate-500 mt-1">Recommended: 9:16 vertical video for Reels/Shorts/TikTok (Max 500MB)</p>
                            <div className="flex justify-center gap-2.5 mt-4">
                              <Button size="xs" variant="outline" onClick={() => handleSimulatedDrop("video")} className="h-7 text-[11px] border-slate-700 bg-slate-900">
                                <Film className="h-3 w-3 mr-1" /> Stage Demo Video
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => handleSimulatedDrop("image")} className="h-7 text-[11px] border-slate-700 bg-slate-900">
                                <ImageIcon className="h-3 w-3 mr-1" /> Stage Demo Banner
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-slate-800 bg-slate-950/50 p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-indigo-950 rounded-lg flex items-center justify-center text-primary border border-indigo-900/30">
                                {stagedFile.type === "video" ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-200">{stagedFile.name}</p>
                                <p className="text-[10px] text-slate-500">{stagedFile.size} • {stagedFile.type.toUpperCase()}</p>
                              </div>
                            </div>
                            <Button size="xs" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setStagedFile(null)}>
                              <CloseIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Platform Selector Grid */}
                    <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                      <CardHeader className="py-3 bg-slate-950/10 border-b border-slate-800/50">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Cross-Publish Channels</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {PLATFORMS.map((plat) => {
                            const isSel = selectedPlatforms.includes(plat.id);
                            return (
                              <button
                                key={plat.id}
                                onClick={() => handleTogglePlatform(plat.id)}
                                className={`p-3 rounded-lg border text-left flex flex-col justify-between gap-1 transition-all ${
                                  isSel 
                                    ? `bg-slate-950 ${plat.border} shadow-sm ring-1 ring-primary/20` 
                                    : "border-slate-850 hover:border-slate-700 bg-slate-950/20"
                                }`}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className={`text-xs font-bold ${isSel ? plat.color : "text-slate-400"}`}>
                                    {plat.name}
                                  </span>
                                  {isSel && <Check className="h-3 w-3 text-primary font-bold" />}
                                </div>
                                <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">
                                  {isSel ? "Connected" : "Inactive"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Core Captions and Templates */}
                    <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Default Content Messaging</Label>
                          <select 
                            onChange={handleTemplateChange}
                            value={captionTemplate}
                            className="text-[11px] bg-slate-950 border border-slate-800 rounded px-2 h-7 text-slate-300"
                          >
                            <option value="">-- Apply Caption Template --</option>
                            {CAPTION_TEMPLATES.map(t => (
                              <option key={t.name} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Textarea
                            rows={3}
                            placeholder="Enter the main message, call to action, and hashtags..."
                            value={defaultCaption}
                            onChange={(e) => setDefaultCaption(e.target.value)}
                            className="bg-slate-950 border-slate-850 text-sm"
                          />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2 border-t border-slate-850">
                          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-400">
                            <input
                              type="checkbox"
                              checked={autoFirstComment}
                              onChange={(e) => setAutoFirstComment(e.target.checked)}
                              className="rounded border-slate-800 text-primary h-4 w-4 bg-slate-950"
                            />
                            Auto-post first comment on Reels & TikTok
                          </label>

                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5 text-indigo-400" />
                            Increases platform SEO indexing.
                          </div>
                        </div>

                        {/* Thumbnail / Covers block */}
                        <div className="grid gap-3 md:grid-cols-2 pt-2">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-slate-400">YT Shorts Thumbnail (Optional)</Label>
                            <div className="border border-slate-850 rounded p-2 text-center bg-slate-950/20 text-[10px] text-slate-400 flex items-center justify-between h-9">
                              <span className="truncate max-w-[120px]">{customThumbnail || "None selected"}</span>
                              <Button size="xs" variant="ghost" onClick={() => setCustomThumbnail("shorts_thumbnail.jpg")} className="h-5 text-[9px] bg-slate-900 border border-slate-800">Choose</Button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-slate-400">Instagram Reels Cover (Optional)</Label>
                            <div className="border border-slate-850 rounded p-2 text-center bg-slate-950/20 text-[10px] text-slate-400 flex items-center justify-between h-9">
                              <span className="truncate max-w-[120px]">{customCover || "None selected"}</span>
                              <Button size="xs" variant="ghost" onClick={() => setCustomCover("reels_cover_art.png")} className="h-5 text-[9px] bg-slate-900 border border-slate-800">Choose</Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actions Panel */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-4 border border-slate-800 rounded-xl shadow">
                      <div className="flex items-center gap-2">
                        <Input 
                          type="datetime-local" 
                          value={scheduleDate} 
                          onChange={(e) => setScheduleDate(e.target.value)} 
                          className="h-9 w-[190px] bg-slate-950 border-slate-800 text-xs" 
                        />
                        <Button 
                          onClick={handleSchedulePost}
                          variant="outline" 
                          className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                        >
                          Schedule
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveDraft}
                          variant="outline" 
                          className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                        >
                          Save Draft
                        </Button>
                        <Button 
                          onClick={handlePublishNow}
                          className="h-9 text-xs font-bold bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/10"
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Publish Now (One-Click)
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Right live device mockup preview */}
                  <div className="lg:col-span-5 space-y-6">
                    <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                      <CardHeader className="py-3 bg-slate-950/10 border-b border-slate-800/50 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Platform Preview</CardTitle>
                        <select
                          value={previewPlatform}
                          onChange={(e) => setPreviewPlatform(e.target.value)}
                          className="text-[10px] bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5"
                        >
                          <option value="instagram_reels">Instagram Reels</option>
                          <option value="tiktok">TikTok Video</option>
                          <option value="youtube_shorts">YouTube Shorts</option>
                          <option value="x">X Post</option>
                        </select>
                      </CardHeader>
                      <CardContent className="p-4 flex justify-center">
                        {/* Device Frame */}
                        <div className="border-[6px] border-slate-800 rounded-[28px] w-64 overflow-hidden bg-black aspect-[9/16] shadow-2xl relative">
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800 rounded-full z-20" />
                          
                          {previewPlatform === "x" ? (
                            /* X Tweet preview */
                            <div className="p-4 text-white text-xs space-y-3 h-full overflow-y-auto bg-slate-950">
                              <div className="flex items-center gap-2 pt-4">
                                <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                                  {activeHubClient.companyName.substring(0,2)}
                                </div>
                                <div>
                                  <p className="font-bold leading-none">{activeHubClient.companyName}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">@{activeHubClient.companyName.toLowerCase().replace(/\s+/g, "")}</p>
                                </div>
                              </div>
                              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                {defaultCaption || "Type a caption to preview how it looks here..."}
                              </p>
                              {stagedFile && (
                                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900 aspect-video flex flex-col items-center justify-center relative">
                                  <Film className="h-8 w-8 text-slate-500" />
                                  <span className="text-[8px] text-slate-400 mt-1">{stagedFile.name}</span>
                                </div>
                              )}
                              <div className="text-[9px] text-slate-500 border-t border-slate-900 pt-2 flex justify-between">
                                <span>💬 0</span>
                                <span>🔄 0</span>
                                <span>❤️ 0</span>
                                <span>👁️ 0</span>
                              </div>
                            </div>
                          ) : (
                            /* Short Vertical Video mock view */
                            <div className="relative h-full w-full bg-slate-950 flex flex-col justify-between p-4 pt-10">
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/75 z-10" />
                              <div className="absolute inset-0 bg-indigo-950/20 flex flex-col items-center justify-center">
                                <Film className="h-10 w-10 text-slate-700 animate-pulse" />
                                <span className="text-[9px] text-slate-500 mt-1">Simulated Live Video</span>
                              </div>

                              <div className="relative z-20 flex justify-between items-center text-[10px] text-slate-300 font-semibold pt-1">
                                <span>Following</span>
                                <span className="underline decoration-primary decoration-2 underline-offset-4 text-white">For You</span>
                                <span>Live</span>
                              </div>

                              <div className="relative z-20 flex flex-row items-end justify-between mt-auto">
                                <div className="max-w-[80%] space-y-1.5 text-white">
                                  <p className="text-[11px] font-bold">@{activeHubClient.companyName.toLowerCase().replace(/\s+/g, "")}</p>
                                  <p className="text-[9px] leading-snug line-clamp-3 text-slate-200">
                                    {defaultCaption || "Staged content description here..."}
                                  </p>
                                  <p className="text-[8px] text-slate-400 flex items-center gap-1">
                                    🎵 Original Sound - {activeHubClient.companyName}
                                  </p>
                                </div>

                                <div className="flex flex-col items-center gap-3 text-slate-300 text-[10px]">
                                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center font-bold text-white text-[10px]">
                                    {activeHubClient.companyName.substring(0, 2)}
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span>❤️</span>
                                    <span className="text-[8px] text-slate-400">12k</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span>💬</span>
                                    <span className="text-[8px] text-slate-400">420</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span>📥</span>
                                    <span className="text-[8px] text-slate-400">Share</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeWorkspaceTab === "bulk" && (
                /* BULK VIDEO ASSET QUEUE */
                <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                  <CardHeader className="py-4 border-b border-slate-800 bg-slate-950/20 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-200">Bulk Video Assets Queue</CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Upload multiple vertical clips, write customized platform hooks, and publish all in one click.
                      </CardDescription>
                    </div>
                    <Button 
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-xs font-semibold h-8"
                      onClick={() => {
                        const newQ = {
                          id: `q-${Date.now()}`,
                          title: `Staged Clip #${bulkQueue.length + 1}`,
                          file: { name: `clip_${Date.now().toString().slice(-4)}.mp4`, size: "32.1 MB", type: "video" as const },
                          platforms: ["tiktok", "instagram_reels", "youtube_shorts"],
                          caption: "Coordinated marketing push. 🌟 #brand #marketing",
                          status: "Ready" as const
                        };
                        setBulkQueue(prev => [...prev, newQ]);
                        toast.success("Additional bulk asset queued!");
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Asset to Queue
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {bulkQueue.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-10">All queued bulk assets have been processed.</p>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {bulkQueue.map((item, index) => (
                          <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/10">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-mono">#{index + 1}</span>
                                <p className="text-xs font-bold text-slate-200">{item.title}</p>
                                <Badge variant="outline" className="text-[8px] px-1 border-slate-700 text-slate-400">
                                  {item.file.name} ({item.file.size})
                                </Badge>
                              </div>
                              <Textarea
                                rows={2}
                                value={item.caption}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setBulkQueue(prev => prev.map(q => q.id === item.id ? { ...q, caption: text } : q));
                                }}
                                className="bg-slate-950 border-slate-850 text-xs w-full max-w-2xl mt-1.5"
                              />
                              <div className="flex flex-wrap gap-1 mt-2.5">
                                {item.platforms.map(plat => {
                                  const pDet = PLATFORMS.find(p => p.id === plat);
                                  return (
                                    <span key={plat} className={`text-[8px] px-1.5 py-0.5 rounded font-bold border uppercase ${pDet?.bg} ${pDet?.color} ${pDet?.border}`}>
                                      {plat.replace("_reels", "").replace("_shorts", "")}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-[10px] text-slate-500">Status</p>
                                <p className="text-xs font-bold text-indigo-400">{item.status}</p>
                              </div>
                              
                              <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-8 w-8 border-slate-800 text-slate-400 hover:text-white"
                                onClick={() => setBulkQueue(prev => prev.filter(q => q.id !== item.id))}
                              >
                                <CloseIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {bulkQueue.length > 0 && (
                      <div className="p-4 bg-slate-950/40 border-t border-slate-800 text-right">
                        <Button 
                          onClick={handleBulkLaunch}
                          className="bg-primary hover:bg-primary/90 text-xs font-semibold px-4 h-9"
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Launch Coordinated Batch Publish ({bulkQueue.length} Videos)
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeWorkspaceTab === "analytics" && (
                /* PERFORMANCE & ANALYTICS */
                <div className="space-y-6">
                  {/* Stats Row */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                      <CardContent className="p-4 space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Combined Views</p>
                        <div className="flex items-baseline justify-between">
                          <p className="text-xl font-bold text-slate-200">2,947,000</p>
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center">
                            <TrendingUp className="h-3 w-3 mr-0.5" /> +18.4%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                      <CardContent className="p-4 space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Average Likes</p>
                        <div className="flex items-baseline justify-between">
                          <p className="text-xl font-bold text-slate-200">149,400</p>
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center">
                            <TrendingUp className="h-3 w-3 mr-0.5" /> +12.1%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                      <CardContent className="p-4 space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Engagement Index</p>
                        <div className="flex items-baseline justify-between">
                          <p className="text-xl font-bold text-slate-200">6.42%</p>
                          <span className="text-[10px] text-indigo-400 font-bold">Optimal Range</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                      <CardContent className="p-4 space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Accounts Synced</p>
                        <div className="flex items-baseline justify-between">
                          <p className="text-xl font-bold text-slate-200">8 / 8 Active</p>
                          <span className="text-[10px] text-emerald-400 font-bold">100% Online</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recharts AreaChart */}
                  <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                    <CardHeader className="py-4 border-b border-slate-800 bg-slate-950/20">
                      <CardTitle className="text-sm font-bold text-slate-200">Weekly Coordinated Views Trend</CardTitle>
                      <CardDescription className="text-xs text-slate-400">Total reach across combined TikTok, YouTube Shorts, Reels, and social channels</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={ANALYTICS_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                            <YAxis stroke="#94a3b8" fontSize={11} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", color: "#f8fafc" }}
                              itemStyle={{ color: "#818cf8" }}
                            />
                            <Area type="monotone" dataKey="Views" stroke="var(--color-primary, #6366f1)" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Platform Distribution */}
                  <Card className="border-slate-800 bg-slate-900/40 text-slate-100">
                    <CardHeader className="py-4 border-b border-slate-800 bg-slate-950/20">
                      <CardTitle className="text-sm font-bold text-slate-200">Views Share by Social Channel</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {[
                          { name: "YouTube Shorts", views: "1.05M", share: "35.6%", color: "text-[#FF0000]" },
                          { name: "TikTok", views: "860k", share: "29.2%", color: "text-[#FE2C55]" },
                          { name: "Instagram Reels", views: "620k", share: "21.0%", color: "text-[#E1306C]" },
                          { name: "X & Facebook", views: "417k", share: "14.2%", color: "text-slate-400" },
                        ].map((item, idx) => (
                          <div key={idx} className="border border-slate-800 bg-slate-950/30 p-3.5 rounded-lg flex flex-col justify-between">
                            <span className="text-xs text-slate-400">{item.name}</span>
                            <div className="flex justify-between items-baseline mt-2">
                              <span className="text-base font-bold text-slate-200">{item.views}</span>
                              <span className={`text-[10px] font-bold ${item.color}`}>{item.share}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Post Viewer & Verification Proof Dialog */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={(openState) => { if (!openState) setSelectedPost(null); }}>
          <DialogContent className="sm:max-w-[480px] bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-200">
                <FileText className="h-5 w-5 text-primary" />
                Content details
              </DialogTitle>
              <CardDescription className="text-slate-400">
                Client: {selectedPost.client.companyName} | Status: {selectedPost.status.replace(/_/g, " ")}
              </CardDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Title</p>
                <p className="text-sm font-semibold text-slate-200 mt-0.5">{selectedPost.title}</p>
              </div>

              {selectedPost.caption && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Caption</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap border border-slate-800 bg-slate-950 p-2.5 rounded-md mt-0.5">
                    {selectedPost.caption}
                  </p>
                </div>
              )}

              {selectedPost.script && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Video Script</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap border border-slate-800 bg-slate-950 p-2.5 rounded-md mt-0.5 italic">
                    {selectedPost.script}
                  </p>
                </div>
              )}

              {selectedPost.scheduledAt && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Scheduled publishing</p>
                  <p className="text-sm text-slate-300 mt-0.5">
                    {new Date(selectedPost.scheduledAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Feed Mockup Previews */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <Label className="text-xs font-semibold text-slate-400 uppercase">Platform Feed Mockup Previews</Label>
                <Tabs defaultValue="instagram" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full bg-slate-950 border border-slate-800 rounded-lg">
                    <TabsTrigger value="instagram" className="text-[11px] data-[state=active]:bg-slate-850">Instagram</TabsTrigger>
                    <TabsTrigger value="linkedin" className="text-[11px] data-[state=active]:bg-slate-850">LinkedIn</TabsTrigger>
                    <TabsTrigger value="youtube" className="text-[11px] data-[state=active]:bg-slate-850">YouTube</TabsTrigger>
                  </TabsList>

                  {/* Instagram Mockup */}
                  <TabsContent value="instagram" className="mt-2.5">
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 text-slate-200">
                      <div className="p-2.5 flex items-center gap-2 border-b border-slate-900 bg-slate-900/20">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                          {selectedPost.client.companyName.substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate leading-none">{selectedPost.client.companyName}</p>
                          <p className="text-[8px] text-slate-500 mt-0.5">Sponsored</p>
                        </div>
                      </div>

                      <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center p-4 text-center text-white relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-pink-950/80 opacity-60" />
                        <div className="relative z-10 flex flex-col items-center">
                          <p className="font-extrabold text-xs tracking-tight px-4 leading-tight">{selectedPost.title}</p>
                          <p className="text-[8px] text-slate-400 mt-1 font-mono">@blinkbeyond</p>
                        </div>
                      </div>

                      <div className="p-3 space-y-1 bg-slate-900/10">
                        <div className="flex gap-2.5 text-slate-400 text-[10px]">
                          <span>❤️ Like</span>
                          <span>💬 Comment</span>
                          <span>🚀 Share</span>
                        </div>
                        <p className="text-xs leading-normal">
                          <span className="font-bold mr-1.5">{selectedPost.client.companyName.toLowerCase().replace(/\s+/g, "")}</span>
                          {selectedPost.caption || "No caption provided."}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* LinkedIn Mockup */}
                  <TabsContent value="linkedin" className="mt-2.5">
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-3 text-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                          {selectedPost.client.companyName.substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate leading-none">{selectedPost.client.companyName}</p>
                          <p className="text-[8px] text-slate-500 mt-0.5">Promoted</p>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-300">
                        {selectedPost.caption || "No caption provided."}
                      </p>

                      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/20">
                        <div className="aspect-video bg-indigo-950 flex items-center justify-center text-white text-center font-bold text-xs p-4 relative">
                          <div className="absolute inset-0 bg-slate-950/40" />
                          <p className="z-10 px-4 leading-tight">{selectedPost.title}</p>
                        </div>
                        <div className="p-2 border-t border-slate-800">
                          <p className="text-[8px] text-slate-500 uppercase tracking-wider">blinkbeyond.com</p>
                          <p className="text-[11px] font-bold text-slate-200 mt-0.5 truncate">{selectedPost.title}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* YouTube Mockup */}
                  <TabsContent value="youtube" className="mt-2.5">
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 text-slate-200">
                      <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center text-white relative">
                        <div className="h-10 w-14 bg-red-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-700 transition">
                          <span className="text-xs text-white">▶</span>
                        </div>
                        <p className="absolute bottom-2 left-2 text-[8px] bg-black/60 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                          Shorts Preview
                        </p>
                      </div>

                      <div className="p-3 space-y-2">
                        <p className="font-bold text-xs leading-snug">{selectedPost.title}</p>
                        <div className="flex items-center gap-2 border-t border-slate-900 pt-2">
                          <div className="h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-[9px]">
                            {selectedPost.client.companyName.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold leading-none">{selectedPost.client.companyName}</p>
                            <p className="text-[8px] text-slate-500 mt-0.5">1.02M subscribers</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Status workflow operations */}
              <div className="flex flex-col gap-2 pt-3 border-t border-slate-800 mt-4">
                {canManage && selectedPost.status !== "PUBLISHED" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-400">Change Workflow Stage</Label>
                    <select
                      className="w-full text-sm border border-slate-800 rounded h-9 px-2 bg-slate-950 text-white"
                      value={selectedPost.status}
                      onChange={async (e) => {
                        const r = await updateContentStatus(selectedPost.id, e.target.value);
                        if (r.ok) {
                          toast.success("Stage updated");
                          setSelectedPost(null);
                        } else {
                          toast.error(r.error);
                        }
                      }}
                    >
                      {CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                )}

                {isAdmin && selectedPost.status === "IN_REVIEW" && (
                  <Button
                    size="sm"
                    className="w-full h-9 font-medium btn-micro-anim"
                    onClick={async () => {
                      const r = await approveContent(selectedPost.id);
                      if (r.ok) {
                        toast.success("Admin approved & published!");
                        setSelectedPost(null);
                      } else {
                        toast.error(r.error);
                      }
                    }}
                  >
                    Approve & Live Publish (Ayrshare)
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setSelectedPost(null)} className="text-slate-400 hover:text-white">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* COOPERATIVE MULTI-PLATFORM PUBLISHING OVERLAY PROGRESS */}
      {isPublishing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="border-slate-800 bg-slate-900 text-slate-100 max-w-lg w-full">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {publishStep !== "done" ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                )}
                Coordinated Social Release Pipeline
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Ayrshare profile key validated. Uploading format-optimized content stream.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              
              {/* Step 1: Format Checks */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">1. Automatic video format optimization check</span>
                  <span className="text-slate-400">{optimizeProgress}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-150"
                    style={{ width: `${optimizeProgress}%` }}
                  />
                </div>
              </div>

              {/* Step 2: Multi-Platform Uploads */}
              {publishStep !== "optimizing" && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">2. Coordinated Platform Channels</p>
                  <div className="grid gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {selectedPlatforms.map((platId) => {
                      const plat = PLATFORMS.find(p => p.id === platId);
                      const prog = platformProgress[platId] || 0;
                      return (
                        <div key={platId} className="border border-slate-850 bg-slate-950/40 p-2.5 rounded-lg flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-semibold flex items-center gap-1.5 ${plat?.color}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {plat?.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {prog >= 100 ? "Uploaded & Live" : `Uploading (${prog}%)`}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${prog}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Console Logs */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity Streams</p>
                <div className="bg-slate-950 border border-slate-850 rounded p-2.5 h-[100px] overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1">
                  {uploadLog.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-600 font-bold select-none">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
            <CardFooter className="border-t border-slate-850/80 pt-3 flex justify-between bg-slate-950/20">
              <span className="text-[10px] text-slate-500">Mode: Simulated Live Post</span>
              {publishStep === "done" && (
                <Button 
                  size="sm"
                  onClick={() => setIsPublishing(false)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold px-4 h-8"
                >
                  Close & View Calendar
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
