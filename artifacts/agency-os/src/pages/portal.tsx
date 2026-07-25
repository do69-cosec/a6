import { useState } from "react";
import {
  useListContentPosts,
  useGetClient,
  useListInvoices,
  useListProjects,
  useListProposals,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Instagram, Youtube, Facebook, Linkedin, Calendar as CalendarIcon,
  FileText, FolderKanban, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Content Calendar ────────────────────────────────────────────────────────

const CONTENT_STATUS: Record<string, { label: string; className: string }> = {
  IDEA:           { label: "Idea",          className: "bg-slate-100 text-slate-600 border-slate-200" },
  SCRIPTING:      { label: "Scripting",     className: "bg-blue-100 text-blue-700 border-blue-200" },
  DESIGNING:      { label: "Designing",     className: "bg-violet-100 text-violet-700 border-violet-200" },
  IN_REVIEW:      { label: "In Review",     className: "bg-amber-100 text-amber-700 border-amber-200" },
  ADMIN_APPROVED: { label: "Approved",      className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  SCHEDULED:      { label: "Scheduled",     className: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  PUBLISHED:      { label: "Published",     className: "bg-green-100 text-green-700 border-green-200" },
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="h-4 w-4 text-pink-500" />,
  YOUTUBE:   <Youtube className="h-4 w-4 text-red-500" />,
  FACEBOOK:  <Facebook className="h-4 w-4 text-blue-500" />,
  LINKEDIN:  <Linkedin className="h-4 w-4 text-blue-600" />,
};

// ─── Invoice status ──────────────────────────────────────────────────────────

const INV_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: "Draft",    className: "bg-slate-100 text-slate-600" },
  SENT:     { label: "Sent",     className: "bg-blue-100 text-blue-700" },
  VIEWED:   { label: "Viewed",   className: "bg-indigo-100 text-indigo-700" },
  PAID:     { label: "Paid",     className: "bg-emerald-100 text-emerald-700" },
  OVERDUE:  { label: "Overdue",  className: "bg-rose-100 text-rose-700" },
  CANCELLED:{ label: "Cancelled",className: "bg-gray-100 text-gray-500" },
};

// ─── Project status ──────────────────────────────────────────────────────────

const PROJ_STATUS: Record<string, { label: string; className: string }> = {
  NOT_STARTED:  { label: "Not Started",  className: "bg-slate-100 text-slate-600" },
  IN_PROGRESS:  { label: "In Progress",  className: "bg-blue-100 text-blue-700" },
  UNDER_REVIEW: { label: "Under Review", className: "bg-amber-100 text-amber-700" },
  COMPLETED:    { label: "Completed",    className: "bg-emerald-100 text-emerald-700" },
  ON_HOLD:      { label: "On Hold",      className: "bg-orange-100 text-orange-700" },
  CANCELLED:    { label: "Cancelled",    className: "bg-rose-100 text-rose-700" },
};

// ─── Proposal status ─────────────────────────────────────────────────────────

const PROP_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: "Draft",    className: "bg-slate-100 text-slate-600" },
  SENT:     { label: "Sent",     className: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Rejected", className: "bg-rose-100 text-rose-700" },
};

// ─── Portal Page ─────────────────────────────────────────────────────────────

export default function ClientPortalPage({ clientId }: { clientId: string }) {
  const [currentMonth] = useState(new Date());
  const month = format(currentMonth, "yyyy-MM");

  const { data: client, isLoading: clientLoading } = useGetClient(clientId);
  const { data: posts, isLoading: postsLoading } = useListContentPosts({ clientId, month });
  const { data: allInvoices, isLoading: invLoading } = useListInvoices();
  const { data: allProjects, isLoading: projLoading } = useListProjects();
  const { data: allProposals, isLoading: propLoading } = useListProposals();

  const invoices = (allInvoices ?? []).filter((inv) => inv.clientId === clientId);
  const projects = (allProjects ?? []).filter((p) => p.clientId === clientId);
  const proposals = (allProposals ?? []).filter((p) => p.clientId === clientId);

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 animated-fade-in">

        {/* Header */}
        <div className="text-center space-y-2">
          {clientLoading ? (
            <Skeleton className="h-8 w-48 mx-auto" />
          ) : (
            <h1 className="text-3xl font-bold font-heading text-foreground">
              {client?.companyName ?? "Client Portal"}
            </h1>
          )}
          <p className="text-muted-foreground">Your project & content overview</p>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="content" className="flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" /> Content
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" /> Projects
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Invoices
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Proposals
            </TabsTrigger>
          </TabsList>

          {/* Content Calendar Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Content planned for {format(currentMonth, "MMMM yyyy")}
              </p>
            </div>
            {postsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : (posts ?? []).length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
                <p className="font-medium text-foreground">No posts scheduled yet</p>
                <p className="text-sm text-muted-foreground">We are preparing content for you.</p>
              </div>
            ) : (
              (posts ?? []).map((post) => {
                const sc = CONTENT_STATUS[post.status ?? "IDEA"] ?? CONTENT_STATUS.IDEA;
                return (
                  <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex border-l-4 border-primary">
                      <CardContent className="p-5 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="mt-1 p-2 rounded-full bg-muted/50 shrink-0">
                              {PLATFORM_ICON[post.platform ?? "INSTAGRAM"]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className="text-xs uppercase tracking-wider">{post.contentType}</Badge>
                                <Badge variant="outline" className={cn("text-xs border", sc.className)}>{sc.label}</Badge>
                                {post.scheduledAt && (
                                  <span className="text-sm font-medium text-foreground bg-muted px-2 py-0.5 rounded-md">
                                    {format(new Date(post.scheduledAt), "dd MMM, EEE")}
                                  </span>
                                )}
                              </div>
                              <p className="text-base text-foreground leading-relaxed">
                                {post.caption || <span className="text-muted-foreground italic">Caption is being drafted...</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            {projLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : projects.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
                <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
                <p className="font-medium text-foreground">No projects yet</p>
              </div>
            ) : (
              projects.map((project) => {
                const ps = PROJ_STATUS[project.status ?? "NOT_STARTED"] ?? PROJ_STATUS.NOT_STARTED;
                return (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{project.name}</p>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                            {project.startDate && (
                              <span>Start: {format(new Date(project.startDate), "dd MMM yyyy")}</span>
                            )}
                            {project.dueDate && (
                              <span>Due: {format(new Date(project.dueDate), "dd MMM yyyy")}</span>
                            )}
                          </div>
                        </div>
                        <Badge className={cn("text-xs border shrink-0", ps.className)}>{ps.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            {invLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : invoices.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
                <p className="font-medium text-foreground">No invoices yet</p>
              </div>
            ) : (
              invoices.map((inv) => {
                const is = INV_STATUS[inv.status ?? "DRAFT"] ?? INV_STATUS.DRAFT;
                return (
                  <Card key={inv.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{inv.number}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                            {inv.invoiceDate && (
                              <span>Date: {format(new Date(inv.invoiceDate), "dd MMM yyyy")}</span>
                            )}
                            {inv.dueDate && (
                              <span>Due: {format(new Date(inv.dueDate), "dd MMM yyyy")}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={cn("text-xs border", is.className)}>{is.label}</Badge>
                          <p className="text-base font-bold text-foreground block">
                            ₹{(inv.total ?? 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-4">
            {propLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : proposals.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
                <p className="font-medium text-foreground">No proposals yet</p>
              </div>
            ) : (
              proposals.map((prop: any) => {
                const ps = PROP_STATUS[prop.status ?? "DRAFT"] ?? PROP_STATUS.DRAFT;
                return (
                  <Card key={prop.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{prop.title ?? prop.number ?? "Proposal"}</p>
                          {prop.validUntil && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Valid until: {format(new Date(prop.validUntil), "dd MMM yyyy")}
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={cn("text-xs border", ps.className)}>{ps.label}</Badge>
                          {prop.total && (
                            <p className="text-base font-bold text-foreground block">
                              ₹{(prop.total ?? 0).toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
