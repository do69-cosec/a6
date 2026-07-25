"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { FolderKanban, FileText, Wallet, CalendarDays, LogOut, Landmark, Check, Download, FileSignature, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { signAgreement } from "@/lib/actions/agreements";

type ClientData = {
  id: string;
  companyName: string;
  contactPerson: string | null;
  email: string | null;
};

type ProjectData = {
  id: string;
  name: string;
  serviceType: string | null;
  status: string;
  progress: number;
  startDate: Date | null;
  endDate: Date | null;
  milestones: { id: string; title: string; completed: boolean; dueDate: Date | null }[];
};

type ProposalData = {
  id: string;
  title: string;
  status: string;
  total: number;
};

type AgreementData = {
  id: string;
  title: string;
  status: string;
  content: string;
  signedAt: Date | null;
};

type InvoiceData = {
  id: string;
  number: string;
  status: string;
  total: number;
  dueDate: Date | null;
  subtotal: number;
  gstAmount: number;
  gstRate: number;
};

type ContentPostData = {
  id: string;
  title: string;
  caption: string | null;
  script: string | null;
  status: string;
  platforms: string;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  publishProof: string | null;
};

export function ClientDashboard({
  client,
  projects,
  proposals,
  agreements,
  invoices,
  contentPosts,
}: {
  client: ClientData;
  projects: ProjectData[];
  proposals: ProposalData[];
  agreements: AgreementData[];
  invoices: InvoiceData[];
  contentPosts: ContentPostData[];
}) {
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementData | null>(null);
  const [selectedPost, setSelectedPost] = useState<ContentPostData | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // Sign agreement states
  const [signName, setSignName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Content revision states
  const [feedback, setFeedback] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleClientLogout = () => {
    document.cookie = "client_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/client/portal";
  };

  // E-Sign signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    let x, y;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      x = e.touches[0]!.clientX - rect.left;
      y = e.touches[0]!.clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let x, y;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      if (e.cancelable) e.preventDefault();
      x = e.touches[0]!.clientX - rect.left;
      y = e.touches[0]!.clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Sign contract action
  const handleClientSign = async () => {
    if (!selectedAgreement) return;
    if (!signName.trim()) {
      toast.error("Please type your name to sign the document.");
      return;
    }

    const r = await signAgreement(selectedAgreement.id, signName.trim());
    if (r.ok) {
      toast.success("Document signed successfully!");
      setSelectedAgreement(null);
      setSignName("");
      window.location.reload();
    } else {
      toast.error(r.error);
    }
  };

  // Submit Feedback
  const handleFeedbackSubmit = async () => {
    if (!selectedPost || !feedback.trim()) return;
    setSubmittingFeedback(true);

    try {
      const res = await fetch("/api/client/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: selectedPost.id,
          comment: feedback,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");

      toast.success("Feedback submitted. Content status reverted for review.");
      setSelectedPost(null);
      setFeedback("");
      window.location.reload();
    } catch (err) {
      toast.error("Error submitting revision request");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Print Invoice Sheet
  const printInvoice = (inv: InvoiceData) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice: ${inv.number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 50px; color: #1e293b; line-height: 1.6; background-color: #ffffff; }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 25px; margin-bottom: 35px; }
            .brand-title { font-size: 26px; font-weight: 800; color: #4f46e5; margin: 0; letter-spacing: -0.025em; }
            .brand-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
            .invoice-title { font-size: 32px; font-weight: 900; color: #0f172a; margin: 0; text-align: right; letter-spacing: -0.03em; }
            .invoice-status { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; margin-top: 8px; }
            .status-paid { background-color: #dcfce7; color: #15803d; }
            .status-unpaid { background-color: #fef3c7; color: #b45309; }
            .grid-details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .details-block h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 0 0 10px 0; letter-spacing: 0.05em; }
            .details-block p { font-size: 14px; margin: 3px 0; color: #334155; }
            .meta-list { list-style: none; padding: 0; margin: 0; }
            .meta-list li { font-size: 14px; margin-bottom: 6px; color: #334155; display: flex; }
            .meta-list li span:first-child { font-weight: 600; color: #64748b; width: 110px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; margin-bottom: 30px; }
            th { background-color: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 11px; color: #64748b; letter-spacing: 0.05em; padding: 14px 16px; border-bottom: 2px solid #e2e8f0; text-align: left; }
            td { padding: 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; }
            .text-right { text-align: right; }
            .summary-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .summary-table { width: 300px; margin: 0; }
            .summary-table td { padding: 8px 16px; border: none; font-size: 14px; }
            .summary-table tr.total-row td { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 12px; }
            .bank-details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 40px; }
            .bank-details-box h4 { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; margin: 0 0 12px 0; letter-spacing: 0.05em; }
            .bank-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .bank-details-grid p { font-size: 13px; margin: 0; color: #334155; }
            .bank-details-grid p span { font-weight: 600; color: #64748b; }
            .terms-box { margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .terms-box p { margin: 4px 0; }
            @media print {
              body { padding: 20px; }
              .bank-details-box { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div>
                <h1 class="brand-title">BLINK BEYOND</h1>
                <div class="brand-subtitle">Creative & Tech Agency</div>
                <p style="font-size: 13px; color: #475569; margin: 6px 0 0 0;">
                  info@blinkbeyond.com | www.blinkbeyond.com<br>
                  Plot 45, Sector 18, Gurugram, HR, India
                </p>
              </div>
              <div style="text-align: right;">
                <h2 class="invoice-title">INVOICE</h2>
                <div class="invoice-status ${inv.status === 'PAID' ? 'status-paid' : 'status-unpaid'}">
                  ${inv.status}
                </div>
              </div>
            </div>

            <div class="grid-details">
              <div class="details-block">
                <h3>Billed To</h3>
                <p style="font-weight: 700; font-size: 16px; color: #0f172a; margin-bottom: 6px;">${client.companyName}</p>
                <p>Email: ${client.email || "—"}</p>
                <p>Address: ${inv.subtotal > 0 ? (client as any).billingAddress || "—" : "—"}</p>
                ${(client as any).gstin ? `<p>GSTIN: <strong>${(client as any).gstin}</strong></p>` : ""}
              </div>
              <div class="details-block" style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
                <div style="text-align: left;">
                  <h3>Invoice Details</h3>
                  <ul class="meta-list">
                    <li><span>Invoice No:</span> <strong>${inv.number}</strong></li>
                    <li><span>Date:</span> ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : new Date().toLocaleDateString()}</li>
                    <li><span>Due Date:</span> ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</li>
                    <li><span>Currency:</span> INR</li>
                  </ul>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right" style="width: 100px;">Qty</th>
                  <th class="text-right" style="width: 120px;">Rate</th>
                  <th class="text-right" style="width: 150px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Professional Creative & Marketing Retainer Services</td>
                  <td class="text-right">1.0</td>
                  <td class="text-right">₹${inv.subtotal.toLocaleString("en-IN")}</td>
                  <td class="text-right">₹${inv.subtotal.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>

            <div class="summary-section">
              <table class="summary-table">
                <tr>
                  <td>Subtotal</td>
                  <td class="text-right">₹${inv.subtotal.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                  <td>GST (${inv.gstRate || 18}%)</td>
                  <td class="text-right">₹${(inv.gstAmount || (inv.subtotal * (inv.gstRate || 18) / 100)).toLocaleString("en-IN")}</td>
                </tr>
                <tr class="total-row">
                  <td>Grand Total</td>
                  <td class="text-right">₹${inv.total.toLocaleString("en-IN")}</td>
                </tr>
              </table>
            </div>

            <div class="bank-details-box">
              <h4>Official Wire Payment Details</h4>
              <div class="bank-details-grid">
                <div>
                  <p><span>Bank Name:</span> HDFC Bank Ltd</p>
                  <p><span>Account Name:</span> Blink Beyond Agency Private Limited</p>
                </div>
                <div>
                  <p><span>Account No:</span> 50200084729103 (Current Account)</p>
                  <p><span>IFSC Code:</span> HDFC0000240</p>
                  <p><span>Branch:</span> DLF Phase 3, Gurugram</p>
                </div>
              </div>
            </div>

            <div class="terms-box">
              <p><strong>Terms & Conditions:</strong></p>
              <p>1. Payment is due within 15 days of invoice date.</p>
              <p>2. Please quote the invoice number as a reference for wire payments.</p>
              <p>3. This is a computer-generated tax invoice and requires no physical signature.</p>
            </div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Client Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            BB
          </div>
          <div>
            <h1 className="text-md font-bold leading-tight">{client.companyName}</h1>
            <p className="text-xs text-slate-400">Client Workspace · White-label Portal</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClientLogout} className="text-slate-400 hover:text-white">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </header>

      {/* Workspace Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="projects" className="data-[state=active]:bg-primary/20"><FolderKanban className="h-4 w-4 mr-2" /> Projects</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-primary/20"><FileText className="h-4 w-4 mr-2" /> Proposals & Contracts</TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-primary/20"><Wallet className="h-4 w-4 mr-2" /> Invoices</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-primary/20"><CalendarDays className="h-4 w-4 mr-2" /> Content Planner</TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            {projects.length === 0 ? (
              <Card className="bg-slate-900/40 border-slate-900"><CardContent className="py-8 text-center text-slate-400 text-sm">No active projects logged.</CardContent></Card>
            ) : (
              projects.map((proj) => (
                <Card key={proj.id} className="bg-slate-900/40 border-slate-800/80 text-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-bold">{proj.name}</CardTitle>
                      <CardDescription className="text-slate-400 text-xs mt-0.5">{proj.serviceType}</CardDescription>
                    </div>
                    <Badge variant="outline" className="capitalize text-slate-300 border-slate-700 bg-slate-950">
                      {proj.status.replace("_", " ")}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Project Progress</span>
                        <span>{proj.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${proj.progress}%` }} />
                      </div>
                    </div>

                    {/* Milestones list */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Milestones</p>
                      {proj.milestones.length === 0 ? (
                        <p className="text-xs text-slate-500">No milestones registered.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {proj.milestones.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 border border-slate-800 bg-slate-950 p-2.5 rounded-lg text-sm">
                              <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${m.completed ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "border-slate-700 text-transparent"}`}>
                                {m.completed && <Check className="h-3 w-3" />}
                              </div>
                              <span className="font-medium text-slate-300 truncate">{m.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Proposals & Contracts Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Agreements */}
            <Card className="bg-slate-900/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-md">Contracts & Agreements</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {agreements.length === 0 ? (
                  <p className="text-sm text-slate-400">No agreement documents listed.</p>
                ) : (
                  agreements.map((a) => (
                    <div key={a.id} className="flex justify-between items-center border border-slate-800/80 bg-slate-950/60 p-3 rounded-lg text-sm">
                      <div>
                        <p className="font-semibold text-slate-200">{a.title}</p>
                        <p className="text-xs text-slate-500">
                          {a.signedAt ? `Signed on ${new Date(a.signedAt).toLocaleDateString()}` : "Pending Signature"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-900" onClick={() => setSelectedAgreement(a)}>
                          <FileSignature className="h-3.5 w-3.5 mr-1" />
                          {a.status === "SIGNED" ? "View Completed" : "Review & Sign"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Proposals */}
            <Card className="bg-slate-900/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-md">Proposals</CardTitle></CardHeader>
              <CardContent>
                {proposals.length === 0 ? (
                  <p className="text-sm text-slate-400">No proposals available.</p>
                ) : (
                  <Table className="border-slate-800">
                    <TableHeader className="bg-slate-950/50">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Proposal</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposals.map((p) => (
                        <TableRow key={p.id} className="border-slate-800 hover:bg-slate-900/20">
                          <TableCell className="font-medium text-slate-200">{p.title}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "APPROVED" ? "default" : "outline"} className={p.status === "APPROVED" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "border-slate-800 text-slate-400"}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-200 font-medium">₹{p.total.toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <Card className="bg-slate-900/40 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-md">Invoices & Receipts</CardTitle></CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-sm text-slate-400">No invoices generated.</p>
                ) : (
                  <Table className="border-slate-800">
                    <TableHeader className="bg-slate-950/50">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Invoice Number</TableHead>
                        <TableHead className="text-slate-400">Due Date</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400 text-right">Amount</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-900/20">
                          <TableCell className="font-medium text-slate-200">{inv.number}</TableCell>
                          <TableCell className="text-slate-300">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={inv.status === "PAID" ? "default" : "outline"} className={inv.status === "PAID" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "border-slate-800 text-slate-400"}>
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-200 font-medium">₹{inv.total.toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            <Button size="xs" variant="ghost" onClick={() => printInvoice(inv)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <Card className="bg-slate-900/40 border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="text-md">Social Media Feed Preview</CardTitle>
                <CardDescription className="text-slate-400">Review planned creatives, scripts, and request revisions</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {contentPosts.length === 0 ? (
                  <p className="text-sm text-slate-400 col-span-full text-center py-6">No media content pieces currently listed.</p>
                ) : (
                  contentPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="border border-slate-800/80 bg-slate-950 hover:border-slate-700/80 rounded-xl overflow-hidden shadow-lg cursor-pointer transition flex flex-col justify-between"
                    >
                      <div className="p-3 border-b border-slate-900 flex justify-between items-center bg-slate-900/25">
                        <span className="text-xs font-bold text-slate-200 truncate">{post.title}</span>
                        <Badge className="text-[9px] bg-primary/20 text-primary border-0">
                          {post.status}
                        </Badge>
                      </div>
                      
                      <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center p-4 text-center border-b border-slate-900">
                        <FileText className="h-6 w-6 text-slate-600 mb-1" />
                        <p className="text-xs font-medium text-slate-400 line-clamp-2 px-2">
                          {post.caption || "No visual caption loaded"}
                        </p>
                      </div>

                      <div className="p-3 text-[10px] text-slate-400 flex justify-between bg-slate-900/10">
                        <span>Platforms: {post.platforms.replace(/[\[\]"]/g, "").replace(/,/g, ", ")}</span>
                        {post.status === "IN_REVIEW" && (
                          <span className="text-primary font-bold hover:underline flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Feedback
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Review & E-Sign Agreement Dialog */}
      {selectedAgreement && (
        <Dialog open={!!selectedAgreement} onOpenChange={(open) => { if (!open) setSelectedAgreement(null); }}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-white">
                <Landmark className="h-5 w-5 text-primary" />
                Agreement Contract
              </DialogTitle>
              <CardDescription className="text-slate-400">
                Please review terms below and draw your signature to execute the agreement.
              </CardDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <h3 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">{selectedAgreement.title}</h3>

              {/* Agreement Content */}
              <div className="space-y-1">
                <Textarea
                  value={selectedAgreement.content}
                  readOnly
                  rows={8}
                  className="font-mono text-sm leading-relaxed bg-slate-950 border-slate-800 text-slate-300"
                />
              </div>

              {/* Signature Board */}
              {selectedAgreement.status !== "SIGNED" ? (
                <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-sm text-slate-200">Draw Client Signature</Label>
                      <p className="text-[10px] text-slate-500">Touchpad or cursor input</p>
                    </div>
                    <Button size="xs" variant="ghost" className="text-xs h-7 hover:bg-slate-900 text-slate-400" onClick={clearCanvas}>
                      Clear
                    </Button>
                  </div>

                  <div className="border border-slate-800 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                    <canvas
                      ref={canvasRef}
                      width={620}
                      height={120}
                      className="cursor-crosshair w-full block bg-white"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="signName" className="text-slate-300">Type Authorized Representative Name *</Label>
                      <Input
                        id="signName"
                        value={signName}
                        onChange={(e) => setSignName(e.target.value)}
                        placeholder="Sarah Johnson"
                        className="bg-slate-900 border-slate-800 text-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleClientSign} className="w-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1.5 h-10 font-medium">
                        <Check className="h-4 w-4" /> Sign Contract
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3 text-emerald-400">
                  <Check className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-300">Signed Contract Lock</p>
                    <p className="text-xs text-emerald-400/80 mt-0.5">
                      This contract is legally locked and signed.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedAgreement(null)} className="text-slate-400 hover:text-white">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Review Content & Feedback Dialog */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={(openState) => { if (!openState) setSelectedPost(null); }}>
          <DialogContent className="sm:max-w-[450px] bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                <CalendarDays className="h-5 w-5 text-primary" />
                Review Content Piece
              </DialogTitle>
              <CardDescription className="text-slate-400">
                Read planned copy/scripts and submit approval or comments.
              </CardDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Title</p>
                <p className="text-sm font-medium text-slate-200 mt-0.5">{selectedPost.title}</p>
              </div>

              {selectedPost.caption && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Post Caption</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap border border-slate-800 bg-slate-950 p-2.5 rounded-md mt-0.5">
                    {selectedPost.caption}
                  </p>
                </div>
              )}

              {selectedPost.script && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Visual/Video Script</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap border border-slate-800 bg-slate-950 p-2.5 rounded-md mt-0.5 italic">
                    {selectedPost.script}
                  </p>
                </div>
              )}

              {/* Feed Proof Mockup for Live Posts */}
              {selectedPost.status === "PUBLISHED" && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-md">
                  <div className="p-3 flex items-center justify-between border-b border-slate-900 bg-slate-900/10">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                        {client.companyName.substring(0, 2)}
                      </div>
                      <span className="text-xs font-bold text-slate-200">{client.companyName}</span>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[8px]">Live Feed Proof</Badge>
                  </div>
                  <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-xs font-bold text-slate-300">{selectedPost.title}</p>
                  </div>
                </div>
              )}

              {/* Action area */}
              {selectedPost.status === "IN_REVIEW" && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="space-y-1.5">
                    <Label htmlFor="feedback" className="text-slate-300">Request Revisions & Comments</Label>
                    <Textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="e.g. Please change the first line of the copy, or swap the logo placement..."
                      className="bg-slate-950 border-slate-800 text-white"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleFeedbackSubmit}
                    disabled={submittingFeedback || !feedback.trim()}
                    className="w-full bg-slate-200 hover:bg-white text-slate-900 font-medium"
                  >
                    {submittingFeedback ? "Submitting..." : "Submit Revision Request"}
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedPost(null)} className="text-slate-400 hover:text-white">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
