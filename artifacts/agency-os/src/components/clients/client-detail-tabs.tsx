"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FolderKanban,
  FileText,
  CalendarDays,
  Heart,
  Plus,
  Mail,
  Phone,
  Trash2,
  Bookmark,
  FileDown,
  User,
  History,
  Activity,
  Calendar,
  DollarSign,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  createClientContact,
  deleteClientContact,
  createClientDocument,
  deleteClientDocument,
  updateClientNotes,
} from "@/lib/actions/client-relations";
import { format } from "date-fns";

type Contact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

type Document = {
  id: string;
  name: string;
  fileUrl: string;
  type: string | null;
  createdAt: Date;
};

type Project = {
  id: string;
  name: string;
  status: string;
  progress: number;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  manager: { name: string } | null;
};

type Invoice = {
  id: string;
  number: string;
  status: string;
  total: number;
  dueDate: Date | null;
};

type ContentPost = {
  id: string;
  title: string;
  status: string;
  platforms: string; // JSON String
  scheduledAt: Date | null;
  assignee: { name: string } | null;
};

type AuditLog = {
  id: string;
  action: string;
  createdAt: Date;
  user: { name: string } | null;
};

type Client = {
  id: string;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  gstin: string | null;
  category: string;
  health: string;
  source: string | null;
  internalNotes: string | null;
  contacts: Contact[];
  documents: Document[];
  projects: Project[];
  invoices: Invoice[];
  contentPosts: ContentPost[];
};

export function ClientDetailTabs({
  client,
  auditLogs,
  canEdit,
}: {
  client: Client;
  auditLogs: AuditLog[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [internalNotes, setInternalNotes] = useState(client.internalNotes || "");
  const [contactOpen, setContactOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  // New contact form state
  const [newContact, setNewContact] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    isPrimary: false,
  });

  // New doc form state
  const [newDoc, setNewDoc] = useState({
    name: "",
    fileUrl: "",
    type: "Contract",
  });

  // Save notes handler
  const handleSaveNotes = () => {
    startTransition(async () => {
      const res = await updateClientNotes(client.id, internalNotes);
      if (res.ok) toast.success("Notes updated successfully");
      else toast.error(res.error);
    });
  };

  // Add contact handler
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name) return;

    startTransition(async () => {
      const res = await createClientContact(client.id, newContact);
      if (res.ok) {
        toast.success("Contact added successfully");
        setContactOpen(false);
        setNewContact({ name: "", role: "", email: "", phone: "", isPrimary: false });
      } else {
        toast.error(res.error);
      }
    });
  };

  // Delete contact handler
  const handleDeleteContact = (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    startTransition(async () => {
      const res = await deleteClientContact(contactId, client.id);
      if (res.ok) toast.success("Contact deleted");
      else toast.error(res.error);
    });
  };

  // Add document handler
  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name || !newDoc.fileUrl) return;

    startTransition(async () => {
      const res = await createClientDocument(client.id, newDoc);
      if (res.ok) {
        toast.success("Document saved successfully");
        setDocOpen(false);
        setNewDoc({ name: "", fileUrl: "", type: "Contract" });
      } else {
        toast.error(res.error);
      }
    });
  };

  // Delete document handler
  const handleDeleteDoc = (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    startTransition(async () => {
      const res = await deleteClientDocument(docId, client.id);
      if (res.ok) toast.success("Document deleted");
      else toast.error(res.error);
    });
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="flex flex-wrap h-auto gap-1 bg-card/65 backdrop-blur-md p-1 border rounded-lg">
        <TabsTrigger value="overview" className="text-xs py-2">Overview</TabsTrigger>
        <TabsTrigger value="contacts" className="text-xs py-2">Contacts ({client.contacts.length})</TabsTrigger>
        <TabsTrigger value="documents" className="text-xs py-2">Documents ({client.documents.length})</TabsTrigger>
        <TabsTrigger value="projects" className="text-xs py-2">Projects ({client.projects.length})</TabsTrigger>
        <TabsTrigger value="invoices" className="text-xs py-2">Invoices ({client.invoices.length})</TabsTrigger>
        <TabsTrigger value="content" className="text-xs py-2">Content Calendar ({client.contentPosts.length})</TabsTrigger>
        <TabsTrigger value="history" className="text-xs py-2">Audit History</TabsTrigger>
      </TabsList>

      {/* OVERVIEW TAB */}
      <TabsContent value="overview" className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Projects</p>
                <h4 className="text-xl font-bold text-foreground mt-0.5">{client.projects.length}</h4>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Invoices</p>
                <h4 className="text-xl font-bold text-foreground mt-0.5">{client.invoices.length}</h4>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-500">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Social Content</p>
                <h4 className="text-xl font-bold text-foreground mt-0.5">{client.contentPosts.length} posts</h4>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
                <Heart className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Client Health</p>
                <h4 className="text-xl font-bold text-foreground mt-0.5 capitalize">{client.health.toLowerCase()}</h4>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Client profile details */}
          <Card className="md:col-span-2 glass-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Billing & Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Primary Email</p>
                  <p className="mt-1 font-medium text-foreground">{client.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Primary Phone</p>
                  <p className="mt-1 font-medium text-foreground">{client.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">GSTIN Number</p>
                  <p className="mt-1 font-mono font-medium text-foreground">{client.gstin || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Deal Source</p>
                  <p className="mt-1 font-medium text-foreground capitalize">{client.source || "Direct"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground">Billing Address</p>
                  <p className="mt-1 font-medium text-foreground">{client.billingAddress || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Internal Private Notes */}
          <Card className="glass-card flex flex-col justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <Bookmark className="h-4 w-4 text-primary" /> Internal Notes
              </CardTitle>
              <CardDescription className="text-xs">Private agency logs, not visible to client portal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Write onboarding notes, budget arrangements, key deliverables details..."
                className="flex-1 min-h-[120px] text-xs resize-none"
              />
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={isPending}
                className="w-full mt-3 font-semibold text-xs"
              >
                {isPending ? "Saving notes..." : "Save internal notes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* CONTACTS TAB */}
      <TabsContent value="contacts" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-base text-foreground">Associated Contacts</h3>
            <p className="text-xs text-muted-foreground">Multiple department representatives</p>
          </div>

          {canEdit && (
            <Dialog open={contactOpen} onOpenChange={setContactOpen}>
              <DialogTrigger render={<Button size="sm" className="font-semibold text-xs" />}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Contact
              </DialogTrigger>
              <DialogContent className="max-w-md border bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle>Add Client Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddContact} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="c-name">Full Name *</Label>
                    <Input
                      id="c-name"
                      required
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="e.g. Sarah Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-role">Role / Department</Label>
                    <Input
                      id="c-role"
                      value={newContact.role}
                      onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                      placeholder="e.g. Marketing Director"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-email">Email</Label>
                    <Input
                      id="c-email"
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      placeholder="e.g. sarah@acme.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-phone">Phone</Label>
                    <Input
                      id="c-phone"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder="e.g. +91 99999 88888"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="c-primary"
                      checked={newContact.isPrimary}
                      onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <Label htmlFor="c-primary" className="cursor-pointer">Set as Primary Client Contact</Label>
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full mt-4 font-semibold">
                    {isPending ? "Adding..." : "Create Contact"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="rounded-xl border bg-card/65 backdrop-blur overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Primary</TableHead>
                {canEdit && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No contacts recorded. Add contacts to help coordinate campaigns.
                  </TableCell>
                </TableRow>
              ) : (
                client.contacts.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-bold flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {c.name}
                    </TableCell>
                    <TableCell className="font-medium">{c.role || "—"}</TableCell>
                    <TableCell>
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-primary hover:underline flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" /> {c.email}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:text-primary flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> {c.phone}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {c.isPrimary ? (
                        <Badge variant="default" className="text-[10px] font-bold">Primary</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteContact(c.id)}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* DOCUMENTS TAB */}
      <TabsContent value="documents" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-base text-foreground">Client Document Manager</h3>
            <p className="text-xs text-muted-foreground">Store agreements, requirements briefing files, credentials and branding PDFs</p>
          </div>

          {canEdit && (
            <Dialog open={docOpen} onOpenChange={setDocOpen}>
              <DialogTrigger render={<Button size="sm" className="font-semibold text-xs" />}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Document
              </DialogTrigger>
              <DialogContent className="max-w-md border bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle>Store Client Document</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddDoc} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="d-name">Document Name *</Label>
                    <Input
                      id="d-name"
                      required
                      value={newDoc.name}
                      onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                      placeholder="e.g. Website Branding Guidelines"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="d-url">File Link (Mock Upload) *</Label>
                    <Input
                      id="d-url"
                      required
                      value={newDoc.fileUrl}
                      onChange={(e) => setNewDoc({ ...newDoc, fileUrl: e.target.value })}
                      placeholder="e.g. https://drive.google.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="d-type">Document Classification</Label>
                    <select
                      id="d-type"
                      value={newDoc.type}
                      onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none"
                    >
                      <option value="Contract">Agreement/Contract</option>
                      <option value="Branding">Branding Asset</option>
                      <option value="Briefing">Briefing Document</option>
                      <option value="Receipt">Invoice/Receipt</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full mt-4 font-semibold">
                    {isPending ? "Saving..." : "Save Document Link"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="rounded-xl border bg-card/65 backdrop-blur overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="font-semibold">Document Name</TableHead>
                <TableHead className="font-semibold">Classification</TableHead>
                <TableHead className="font-semibold">Added On</TableHead>
                <TableHead className="font-semibold">View File</TableHead>
                {canEdit && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No documents uploaded. Add contracts or asset link logs here.
                  </TableCell>
                </TableRow>
              ) : (
                client.documents.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-bold flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-primary" />
                      {d.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">{d.type || "Other"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(d.createdAt), "PPP")}
                    </TableCell>
                    <TableCell>
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        Launch link <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDoc(d.id)}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* PROJECTS TAB */}
      <TabsContent value="projects" className="space-y-4">
        <div>
          <h3 className="font-bold text-base text-foreground">Projects Portfolio</h3>
          <p className="text-xs text-muted-foreground">Active and complete campaigns for this client</p>
        </div>

        <div className="rounded-xl border bg-card/65 backdrop-blur overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="font-semibold">Project Name</TableHead>
                <TableHead className="font-semibold">Manager</TableHead>
                <TableHead className="font-semibold">Budget</TableHead>
                <TableHead className="font-semibold">Progress</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No projects registered for this client.
                  </TableCell>
                </TableRow>
              ) : (
                client.projects.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-bold">
                      <Link href={`/projects`} className="hover:text-primary transition-colors">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{p.manager?.name || "—"}</TableCell>
                    <TableCell className="font-semibold">
                      {p.budget ? `₹${p.budget.toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs font-bold">{p.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                        {p.status.toLowerCase().replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* INVOICES TAB */}
      <TabsContent value="invoices" className="space-y-4">
        <div>
          <h3 className="font-bold text-base text-foreground">Invoices & Billings</h3>
          <p className="text-xs text-muted-foreground">Invoice records, payment tracking, and outstanding balances</p>
        </div>

        <div className="rounded-xl border bg-card/65 backdrop-blur overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="font-semibold">Invoice Number</TableHead>
                <TableHead className="font-semibold">Total Amount</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No invoices generated yet.
                  </TableCell>
                </TableRow>
              ) : (
                client.invoices.map((i) => (
                  <TableRow key={i.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-bold">
                      <Link href={`/finance`} className="hover:text-primary transition-colors">
                        Invoice #{i.number}
                      </Link>
                    </TableCell>
                    <TableCell className="font-bold">
                      ₹{i.total.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {i.dueDate ? format(new Date(i.dueDate), "PPP") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.status === "PAID" ? "default" : "secondary"} className="capitalize text-[10px] font-bold">
                        {i.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* CONTENT TAB */}
      <TabsContent value="content" className="space-y-4">
        <div>
          <h3 className="font-bold text-base text-foreground">Campaign Content Posts</h3>
          <p className="text-xs text-muted-foreground">Social media publishing schedule & campaign posts queue</p>
        </div>

        <div className="rounded-xl border bg-card/65 backdrop-blur overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="font-semibold">Post Title</TableHead>
                <TableHead className="font-semibold">Platforms</TableHead>
                <TableHead className="font-semibold">Assignee</TableHead>
                <TableHead className="font-semibold">Scheduled For</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.contentPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No scheduled content posts for this client.
                  </TableCell>
                </TableRow>
              ) : (
                client.contentPosts.map((post) => {
                  let parsedPlatforms: string[] = [];
                  try {
                    parsedPlatforms = JSON.parse(post.platforms);
                  } catch (e) {
                    parsedPlatforms = [post.platforms];
                  }
                  return (
                    <TableRow key={post.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-bold">
                        <Link href={`/content`} className="hover:text-primary transition-colors">
                          {post.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {parsedPlatforms.map((p) => (
                            <Badge key={p} variant="outline" className="text-[9px] uppercase font-bold tracking-wider">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{post.assignee?.name || "—"}</TableCell>
                      <TableCell className="text-xs font-medium">
                        {post.scheduledAt ? format(new Date(post.scheduledAt), "PPP p") : "Not scheduled"}
                      </TableCell>
                      <TableCell>
                        <Badge className="capitalize text-[10px] font-bold">
                          {post.status.toLowerCase().replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* AUDIT HISTORY TAB */}
      <TabsContent value="history" className="space-y-4">
        <div>
          <h3 className="font-bold text-base text-foreground flex items-center gap-1.5">
            <History className="h-5 w-5 text-muted-foreground" /> Audit History Trail
          </h3>
          <p className="text-xs text-muted-foreground">Automatic logs of client creation, details edit, and relation additions</p>
        </div>

        <div className="rounded-xl border bg-card/65 backdrop-blur overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/15">
              <TableRow>
                <TableHead className="font-semibold">Action / Event</TableHead>
                <TableHead className="font-semibold">Operator</TableHead>
                <TableHead className="font-semibold">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    No activity logs recorded.
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-sm text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary shrink-0" />
                      {log.action}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground">
                      {log.user?.name || "System"}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      {format(new Date(log.createdAt), "PPpp")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
