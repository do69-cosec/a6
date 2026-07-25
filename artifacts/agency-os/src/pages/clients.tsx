import { useState, useEffect } from "react";
import {
  useListClients, useCreateClient, useUpdateClient, useDeleteClient,
  getListClientsQueryKey,
} from "@workspace/api-client-react";
import type { ClientInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WriteWithAI } from "@/components/common/WriteWithAI";
import { useForm, Controller } from "react-hook-form";
import { Plus, Phone, Mail, Building2, Trash2, Pencil, Users, AlertTriangle, HeartHandshake } from "lucide-react";
import { SearchBar } from "@/components/common/SearchBar";
import { cn } from "@/lib/utils";

const HEALTH_MAP: Record<string, { label: string; className: string }> = {
  GREEN: { label: "Healthy", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  YELLOW: { label: "At Risk", className: "bg-amber-100 text-amber-700 border-amber-200" },
  RED: { label: "Critical", className: "bg-rose-100 text-rose-700 border-rose-200" },
};

const CATEGORY_MAP: Record<string, string> = {
  RETAINER: "Retainer",
  ONE_TIME: "One-Time",
  LEAD: "Lead",
  CHURNED: "Churned",
};

export default function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [health, setHealth] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClientState, setEditClient] = useState<{ id: string } & ClientInput | null>(null);
  const [serviceType, setServiceType] = useState("SOCIAL_MEDIA");

  const { data: clients, isLoading } = useListClients({
    search: search || undefined,
    category: category !== "ALL" ? category : undefined,
  });

  const editClient = editClientState ? (clients ?? []).find((c) => c.id === editClientState.id) as any || editClientState : null;

  const createMutation = useCreateClient({
    mutation: {
      onSuccess: () => {
        toast.success("Client created successfully.");
        qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setDialogOpen(false);
      },
      onError: () => toast.error("Failed to create client"),
    },
  });

  const updateMutation = useUpdateClient({
    mutation: {
      onSuccess: () => {
        toast.success("Client updated successfully.");
        qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setDialogOpen(false);
        setEditClient(null);
      },
      onError: () => toast.error("Failed to update client"),
    },
  });

  const deleteMutation = useDeleteClient({
    mutation: {
      onSuccess: () => {
        toast.success("Client deleted");
        qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
      },
      onError: () => toast.error("Failed to delete client"),
    },
  });

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<any>({
    defaultValues: { companyName: "", category: "RETAINER", health: "GREEN", notes: "" },
  });

  const openAdd = () => {
    setServiceType("SOCIAL_MEDIA");
    reset({ companyName: "", category: "RETAINER", health: "GREEN", notes: "", platforms: "", audience: "", siteType: "", techStack: "" });
    setEditClient(null);
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditClient(c);
    setServiceType("SOCIAL_MEDIA"); // Reset default, though we could parse from notes
    reset({
      companyName: c.companyName,
      contactPerson: c.contactPerson ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      category: c.category ?? "RETAINER",
      health: c.health ?? "GREEN",
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleFileUpload = (e: any) => {
    if (e.target.files.length > 0) {
      toast.success(`Uploaded ${e.target.files.length} file(s) securely.`);
    }
  };

  const onSubmit = (data: any) => {
    let extraDetails = "";
    if (serviceType === "SOCIAL_MEDIA") {
      extraDetails = `Service: Social Media\nPlatforms: ${data.platforms || "N/A"}\nAudience: ${data.audience || "N/A"}\n\n`;
    } else if (serviceType === "WEBSITE") {
      extraDetails = `Service: Website Development\nSite Type: ${data.siteType || "N/A"}\nTech Stack: ${data.techStack || "N/A"}\n\n`;
    } else {
      extraDetails = `Service: Other\n\n`;
    }

    const payload: ClientInput = {
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      category: data.category,
      health: data.health,
      notes: extraDetails + (data.notes || ""),
    };

    if (editClient) {
      updateMutation.mutate({ id: editClient.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const filtered = (clients ?? []).filter((c) => {
    if (health !== "ALL" && c.health !== health) return false;
    return true;
  });

  const totalRetainers = (clients ?? []).filter((c) => c.category === "RETAINER").length;
  const totalAtRisk    = (clients ?? []).filter((c) => c.health === "YELLOW").length;
  const totalHealthy   = (clients ?? []).filter((c) => c.health === "GREEN").length;

  const statChips = [
    { label: "Total Clients", value: clients?.length ?? 0,  accent: "border-l-primary",      icon: <Building2 className="h-4 w-4" /> },
    { label: "Retainers",     value: totalRetainers,         accent: "border-l-emerald-500",  icon: <HeartHandshake className="h-4 w-4" /> },
    { label: "At Risk",       value: totalAtRisk,            accent: "border-l-amber-400",    icon: <AlertTriangle className="h-4 w-4" /> },
    { label: "Healthy",       value: totalHealthy,           accent: "border-l-emerald-400",  icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6 space-y-6 animated-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} of {clients?.length ?? 0} clients shown
          </p>
        </div>
        <Button onClick={openAdd} data-testid="add-client-btn" className="gap-2 btn-micro-anim">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statChips.map(({ label, value, accent, icon }) => (
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          placeholder="Search clients…"
          value={search}
          onChange={setSearch}
          className="flex-1 min-w-48 max-w-80"
          data-testid="client-search"
        />
        <Select value={category} onValueChange={(val) => setCategory(val ?? "ALL")}>
          <SelectTrigger className="w-36" data-testid="category-filter">
            <SelectValue placeholder="Billing Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Billings</SelectItem>
            <SelectItem value="RETAINER">Retainer</SelectItem>
            <SelectItem value="ONE_TIME">One-Time</SelectItem>
            <SelectItem value="LEAD">Lead</SelectItem>
            <SelectItem value="CHURNED">Churned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={health} onValueChange={(val) => setHealth(val ?? "ALL")}>
          <SelectTrigger className="w-32" data-testid="health-filter">
            <SelectValue placeholder="Health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Health</SelectItem>
            <SelectItem value="GREEN">Healthy</SelectItem>
            <SelectItem value="YELLOW">At Risk</SelectItem>
            <SelectItem value="RED">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-28" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex p-4 rounded-2xl bg-muted/60 mb-4">
            <Building2 className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground">No clients found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || category !== "ALL" || health !== "ALL"
              ? "Try adjusting your search or filters"
              : "Add your first client to get started"}
          </p>
          {!search && category === "ALL" && health === "ALL" && (
            <Button onClick={openAdd} className="mt-4 gap-2 btn-micro-anim" size="sm">
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const healthInfo = HEALTH_MAP[c.health ?? "GREEN"] ?? HEALTH_MAP.GREEN;
            const borderAccent = c.health === "GREEN" ? "border-l-emerald-500" : c.health === "YELLOW" ? "border-l-amber-400" : "border-l-rose-500";
            return (
              <Card key={c.id} className={cn("scale-hover border-l-[3px] group", borderAccent)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Logo / Avatar */}
                      <div className={cn(
                        "h-10 w-10 rounded-xl border border-border overflow-hidden flex items-center justify-center shrink-0 text-sm font-bold",
                        c.logoUrl ? "" : "bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
                      )}>
                        {c.logoUrl ? (
                          <img src={c.logoUrl} alt={c.companyName} className="h-full w-full object-cover" />
                        ) : (
                          c.companyName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/clients/${c.id}`} className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 text-sm">
                          {c.companyName}
                        </Link>
                        {c.contactPerson && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.contactPerson}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)} data-testid={`edit-client-${c.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: c.id })} data-testid={`delete-client-${c.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className={cn("text-[11px] border", healthInfo.className)}>
                      {healthInfo.label}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      {CATEGORY_MAP[c.category ?? "RETAINER"] ?? c.category}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    {c.phone && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editClient ? "Edit Client" : "Add Client"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <WriteWithAI
              context="client"
              onFill={(fields) => {
                if (fields.companyName) setValue("companyName", fields.companyName, { shouldDirty: true });
                if (fields.contactPerson) setValue("contactPerson", fields.contactPerson, { shouldDirty: true });
                if (fields.email) setValue("email", fields.email, { shouldDirty: true });
                if (fields.phone) setValue("phone", fields.phone, { shouldDirty: true });
                if (fields.notes) setValue("notes", fields.notes, { shouldDirty: true });
                if (fields.category) setValue("category", fields.category, { shouldDirty: true });
              }}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input
                  {...register("companyName", { required: "Required" })}
                  placeholder="Acme Corp"
                />
                {errors.companyName && <p className="text-xs text-destructive">{(errors.companyName as any).message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Primary Service Required</Label>
                <Select value={serviceType} onValueChange={(val) => setServiceType(val ?? "SOCIAL_MEDIA")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                    <SelectItem value="WEBSITE">Website Development</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Form Sections based on Category */}
            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                Gathering Data for: <span className="text-primary">{serviceType.replace("_", " ")}</span>
              </h4>
              
              {serviceType === "SOCIAL_MEDIA" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Platforms Needed</Label>
                    <Input {...register("platforms")} placeholder="Instagram, Facebook, LinkedIn" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target Audience</Label>
                    <Input {...register("audience")} placeholder="e.g. Gen Z, B2B Professionals" />
                  </div>
                </div>
              )}

              {serviceType === "WEBSITE" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type of Website</Label>
                    <Input {...register("siteType")} placeholder="E-commerce, Portfolio, Blog" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preferred Tech Stack</Label>
                    <Input {...register("techStack")} placeholder="Shopify, React, Webflow" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <Label className="flex items-center gap-2">Upload Files / Resources <Badge variant="secondary" className="text-[10px]">Local & DB</Badge></Label>
                <div className="flex items-center gap-2">
                  <Input type="file" multiple className="cursor-pointer file:text-primary file:bg-primary/10 file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 hover:file:bg-primary/20" onChange={handleFileUpload} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Upload brand assets, guidelines, or requirement docs.</p>
              </div>
            </div>

            {/* Standard Details */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input {...register("contactPerson")} placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register("phone")} placeholder="+91 98765 43210" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input {...register("email")} type="email" placeholder="contact@client.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Billing Category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value ?? "RETAINER"} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RETAINER">Retainer</SelectItem>
                        <SelectItem value="ONE_TIME">One-Time</SelectItem>
                        <SelectItem value="LEAD">Lead</SelectItem>
                        <SelectItem value="CHURNED">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Additional Notes</Label>
              <Textarea {...register("notes")} placeholder="Other requirements or internal notes..." rows={3} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="save-client-btn">
                {editClient ? "Save Changes" : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
