import { useState, useRef } from "react";
import { useAuth } from "@/App";
import { useGetClient, useGetClientContracts, useListProjects, useListInvoices, useUpdateClient, getGetClientQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Phone, Mail, Globe, Instagram, Camera, Loader2, RefreshCw, Plus, MessageSquare, Phone as PhoneIcon, Mail as MailIcon, Calendar, FileText, AlertCircle, Activity } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn, formatDateOnly } from "@/lib/utils";

const STATUS_MAP: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  UNDER_REVIEW: "Under Review",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

const INV_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "outline" },
  PAID: { label: "Paid", variant: "default" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
};

const HEALTH_MAP: Record<string, { label: string; className: string }> = {
  GREEN: { label: "Healthy", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  YELLOW: { label: "At Risk", className: "bg-amber-100 text-amber-700 border-amber-200" },
  RED: { label: "Critical", className: "bg-rose-100 text-rose-700 border-rose-200" },
};

const ACTIVITY_TYPES = [
  { value: "NOTE", label: "Note", icon: MessageSquare, color: "text-blue-500" },
  { value: "CALL", label: "Call", icon: PhoneIcon, color: "text-green-500" },
  { value: "EMAIL", label: "Email", icon: MailIcon, color: "text-purple-500" },
  { value: "MEETING", label: "Meeting", icon: Calendar, color: "text-orange-500" },
  { value: "PROPOSAL", label: "Proposal", icon: FileText, color: "text-indigo-500" },
  { value: "ISSUE", label: "Issue", icon: AlertCircle, color: "text-red-500" },
];

function ActivityIcon({ type }: { type: string }) {
  const t = ACTIVITY_TYPES.find(a => a.value === type) ?? ACTIVITY_TYPES[0];
  const Icon = t.icon;
  return (
    <div className={cn("h-7 w-7 rounded-full border-2 border-border bg-background flex items-center justify-center shrink-0", t.color)}>
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

interface ActivityLog {
  id: string;
  clientId: string | null;
  type: string;
  title: string;
  description: string | null;
  metadata: string | null;
  createdAt: string | null;
}

export default function ClientDetailPage({ id }: { id: string }) {
  const qc = useQueryClient();
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityType, setActivityType] = useState("NOTE");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDesc, setActivityDesc] = useState("");

  const { data: client, isLoading } = useGetClient(id);
  const { data: contracts } = useGetClientContracts(id);
  const { data: allProjects } = useListProjects();
  const { data: allInvoices } = useListInvoices();

  const { data: activityLogs, refetch: refetchActivity } = useQuery<ActivityLog[]>({
    queryKey: ["client-activity", id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
  });

  const updateMutation = useUpdateClient({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetClientQueryKey(id) });
        toast.success("Logo updated successfully");
      },
      onError: () => toast.error("Failed to update logo"),
    },
  });

  const recalcHealthMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${id}/recalculate-health`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ health: string }>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: getGetClientQueryKey(id) });
      const labels: Record<string, string> = { GREEN: "Healthy", YELLOW: "At Risk", RED: "Critical" };
      toast.success(`Health score updated: ${labels[data.health] ?? data.health}`);
    },
    onError: () => toast.error("Failed to recalculate health score"),
  });

  const addActivityMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${id}/activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: activityType, title: activityTitle, description: activityDesc }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      refetchActivity();
      setActivityDialogOpen(false);
      setActivityTitle("");
      setActivityDesc("");
      toast.success("Activity logged");
    },
    onError: () => toast.error("Failed to log activity"),
  });

  const projects = (allProjects ?? []).filter(p => p.clientId === id);
  const invoices = (allInvoices ?? []).filter(inv => inv.clientId === id);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      await updateMutation.mutateAsync({ id, data: { companyName: client!.companyName, logoUrl: url } });
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Client not found.</p>
        <Link href="/clients" className="text-primary text-sm mt-2 inline-block">Back to Clients</Link>
      </div>
    );
  }

  const healthInfo = HEALTH_MAP[client.health ?? "GREEN"] ?? HEALTH_MAP.GREEN;
  const initials = client.companyName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="p-6 space-y-6 animated-fade-in">
      {/* Back + header */}
      <div>
        <Link href="/clients" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 w-fit">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Clients
        </Link>
        <div className="flex items-start gap-4">
          {/* Avatar with upload */}
          <div className="relative group shrink-0">
            <div className={cn(
              "h-16 w-16 rounded-2xl border-2 border-border overflow-hidden flex items-center justify-center text-xl font-bold",
              client.logoUrl ? "bg-transparent" : "bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
            )}>
              {client.logoUrl ? (
                <img src={client.logoUrl} alt={client.companyName} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Upload logo"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold font-heading">{client.companyName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className={healthInfo.className}>{healthInfo.label}</Badge>
              <Badge variant="secondary">{client.category}</Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => recalcHealthMutation.mutate()}
                disabled={recalcHealthMutation.isPending}
                title="Auto-calculate health from invoice history"
              >
                {recalcHealthMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Recalc Health
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: Contact + Activity Timeline */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {client.contactPerson && <p className="font-medium">{client.contactPerson}</p>}
              {client.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.websiteUrl && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  <a href={client.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary truncate hover:underline">
                    {client.websiteUrl}
                  </a>
                </div>
              )}
              {client.socialHandles && (
                <div className="pt-2 border-t border-border space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Social Accounts</p>
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <span>{client.socialHandles}</span>
                  </div>
                </div>
              )}
              {client.onboardingDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0 text-primary" />
                  <span>Onboarded: {formatDateOnly(client.onboardingDate)}</span>
                </div>
              )}
              {client.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                  <p className="text-muted-foreground text-xs whitespace-pre-line">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Timeline
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => setActivityDialogOpen(true)}
                >
                  <Plus className="h-3 w-3" /> Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!activityLogs || activityLogs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity logged yet</p>
                  <p className="text-xs">Log calls, emails, notes, and meetings</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex gap-3 relative">
                        <ActivityIcon type={log.type} />
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-sm font-medium leading-tight">{log.title}</p>
                          {log.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Projects + invoices + contracts */}
        <div className="lg:col-span-2 space-y-5">
          {contracts && contracts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Content Contracts</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {contracts.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Status: {c.status} | Period: {c.startDate ? format(new Date(c.startDate), "PP") : "—"} to {c.endDate ? format(new Date(c.endDate), "PP") : "—"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">₹{c.value?.toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Projects</CardTitle></CardHeader>
            <CardContent>
              {!projects || projects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No projects linked</p>
              ) : (
                <div className="divide-y divide-border">
                  {projects.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{STATUS_MAP[p.status ?? "NOT_STARTED"]}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Due: {p.dueDate ? format(new Date(p.dueDate), "PP") : "—"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
            <CardContent>
              {!invoices || invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No invoices found</p>
              ) : (
                <div className="divide-y divide-border">
                  {invoices.slice(0, 5).map((inv) => {
                    const s = INV_STATUS_MAP[inv.status ?? "DRAFT"] ?? { label: inv.status, variant: "secondary" as const };
                    return (
                      <div key={inv.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{inv.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd MMM yyyy") : "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                          <p className="text-sm font-semibold">₹{inv.total?.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select value={activityType} onValueChange={(v) => setActivityType(v ?? "NOTE")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={activityTitle}
                onChange={e => setActivityTitle(e.target.value)}
                placeholder="e.g. Follow-up call with John"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={activityDesc}
                onChange={e => setActivityDesc(e.target.value)}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addActivityMutation.mutate()}
              disabled={!activityTitle.trim() || addActivityMutation.isPending}
            >
              {addActivityMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Log Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
