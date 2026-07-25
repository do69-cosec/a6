"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, LayoutGrid, List, Heart, ArrowUpRight, Phone, Mail, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  createClient,
  updateClient,
  deleteClient,
} from "@/lib/actions/clients";
import type { ActionResult } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/forms/submit-button";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type ClientRow = {
  id: string;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  category: string;
  health: string;
  source: string | null;
  _count: { projects: number };
};

const initial: ActionResult = { ok: false, error: "" };

const healthConfig = {
  GREEN: { label: "Green — Happy", color: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/25" },
  YELLOW: { label: "Yellow — At Risk", color: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/25" },
  RED: { label: "Red — Churned", color: "bg-rose-500", text: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/25" },
} as const;

function ClientForm({
  client,
  onSuccess,
}: {
  client?: ClientRow;
  onSuccess: () => void;
}) {
  const action = client ? updateClient : createClient;
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.ok) {
      onSuccess();
      toast.success(client ? "Client updated" : "Client created");
    } else if (!state.ok && state.error) {
      toast.error(state.error);
    }
  }, [state, client, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {client && <input type="hidden" name="id" value={client.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="companyName">Company name *</Label>
          <Input
            id="companyName"
            name="companyName"
            required
            defaultValue={client?.companyName}
            placeholder="e.g. Acme Corporation"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPerson">Contact person</Label>
          <Input
            id="contactPerson"
            name="contactPerson"
            defaultValue={client?.contactPerson ?? ""}
            placeholder="e.g. John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
            placeholder="e.g. billing@acme.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} placeholder="e.g. +91 98765 43210" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gstin">GSTIN</Label>
          <Input id="gstin" name="gstin" placeholder="e.g. 22AAAAA0000A1Z5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue={client?.category ?? "RETAINER"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none"
          >
            <option value="RETAINER">Retainer</option>
            <option value="ONE_TIME">One-time</option>
            <option value="LEAD">Lead</option>
            <option value="CHURNED">Churned</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="health">Health</Label>
          <select
            id="health"
            name="health"
            defaultValue={client?.health ?? "GREEN"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none"
          >
            <option value="GREEN">Green — Happy</option>
            <option value="YELLOW">Yellow — At risk</option>
            <option value="RED">Red — Churned</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            name="source"
            placeholder="e.g. Referral, Instagram, Google"
            defaultValue={client?.source ?? ""}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="billingAddress">Billing address</Label>
          <Input id="billingAddress" name="billingAddress" placeholder="123 business avenue, Mumbai" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="internalNotes">Internal notes</Label>
          <Textarea id="internalNotes" name="internalNotes" rows={3} placeholder="Add private notes only visible to agency staff..." />
        </div>
      </div>
      <SubmitButton label={client ? "Save changes" : "Add client"} />
    </form>
  );
}

export function ClientsManager({
  clients,
  canCreate,
  canEdit,
  canDelete,
}: {
  clients: ClientRow[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientRow | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [healthFilter, setHealthFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
    const result = await deleteClient(id);
    if (result.ok) toast.success("Client deleted");
    else toast.error(result.error);
  }

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === "ALL" || c.category === categoryFilter;
    const matchesHealth = healthFilter === "ALL" || c.health === healthFilter;

    return matchesSearch && matchesCategory && matchesHealth;
  });

  return (
    <div className="space-y-6">
      {/* Action Bars & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/65 backdrop-blur border p-4 rounded-xl shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="RETAINER">Retainers</option>
            <option value="ONE_TIME">One-time</option>
            <option value="LEAD">Leads</option>
            <option value="CHURNED">Churned</option>
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Health States</option>
            <option value="GREEN">Happy (Green)</option>
            <option value="YELLOW">At Risk (Yellow)</option>
            <option value="RED">Churned (Red)</option>
          </select>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center border rounded-lg overflow-hidden bg-background">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 transition-colors cursor-pointer ${
                viewMode === "table" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" className="font-semibold" />}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add client
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle>Add new client</DialogTitle>
                </DialogHeader>
                <ClientForm onSuccess={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl bg-card/30">
              No clients found matching filters.
            </div>
          ) : (
            filteredClients.map((c) => {
              const h = healthConfig[c.health as keyof typeof healthConfig] || healthConfig.GREEN;
              return (
                <Card key={c.id} className="glass-card overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                  <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <Link href={`/clients/${c.id}`} className="hover:underline flex-1 min-w-0">
                          <h3 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {c.companyName}
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </h3>
                        </Link>
                        <Badge className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${h.color}`} />
                          {c.health}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                          {c.category}
                        </Badge>
                        {c.source && (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            Source: {c.source}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
                      {c.contactPerson && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{c.contactPerson}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/75" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/75" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>{c._count.projects} Active Projects</span>
                      </div>

                      <div className="flex gap-1.5">
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setEditClient(c)}
                            title="Edit client"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => void handleDelete(c.id, c.companyName)}
                            className="text-rose-500 border-rose-500/20 hover:bg-rose-500/5 hover:text-rose-600"
                            title="Delete client"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Link href={`/clients/${c.id}`}>
                          <Button size="sm" variant="ghost" className="text-xs gap-1 font-semibold">
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="rounded-xl border bg-card/65 backdrop-blur-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="font-semibold">Company</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Health</TableHead>
                <TableHead className="font-semibold">Projects</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-[120px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                    No clients found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((c) => {
                  const h = healthConfig[c.health as keyof typeof healthConfig] || healthConfig.GREEN;
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-bold">
                        <Link href={`/clients/${c.id}`} className="hover:text-primary transition-colors flex items-center gap-1.5">
                          {c.companyName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold text-foreground">{c.contactPerson ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.email ?? c.phone ?? ""}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase">{c.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${h.color}`} />
                          {c.health}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{c._count.projects}</TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <div className="flex gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditClient(c)}
                                title="Edit client"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleDelete(c.id, c.companyName)}
                                title="Delete client"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            <Link href={`/clients/${c.id}`}>
                              <Button size="icon" variant="ghost" title="View detail">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Client Modal */}
      <Dialog open={!!editClient} onOpenChange={(v) => !v && setEditClient(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
          </DialogHeader>
          {editClient && (
            <ClientForm client={editClient} onSuccess={() => setEditClient(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
