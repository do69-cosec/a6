"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { Plus, Mic, MicOff, FileText, Check, Download, Landmark, FileSignature, Edit, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createProposal, updateProposalStatus } from "@/lib/actions/proposals";
import { markInvoicePaid as markPaid, createInvoice as createInv } from "@/lib/actions/invoices";
import { updateAgreementContent, signAgreement, updateAgreementStatus } from "@/lib/actions/agreements";
import { generateAITemplate, generateAIClause } from "@/lib/actions/ai-generator";
import type { ActionResult } from "@/lib/validations";
import { PROPOSAL_TEMPLATES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/forms/submit-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionResult = { ok: false, error: "" };

const DRAFT_PRESETS = {
  website: {
    clientName: "Nike Retail",
    projectTitle: "E-Commerce Website Development",
    amount: "120000",
    revisions: "3",
    termsDays: "15",
    scope: "Design, development, and launch of a fully responsive e-commerce web application with custom product pages, checkout flow, search filters, and an admin dashboard interface.",
  },
  social: {
    clientName: "Adidas Originals",
    projectTitle: "Social Media Campaign Retainer",
    amount: "45000",
    revisions: "2",
    termsDays: "10",
    scope: "Creation of 15 social media assets per month, monthly calendar setup, post scheduling, performance analytics tracking, and community engagement for Instagram and LinkedIn channels.",
  },
  performance: {
    clientName: "Puma Fitness",
    projectTitle: "Paid Performance Marketing",
    amount: "80000",
    revisions: "2",
    termsDays: "15",
    scope: "Management of paid advertisement campaigns across Meta Ads Manager and Google Ads. A/B testing copy, audience segmentation, budget optimization, and bi-weekly growth reports.",
  },
  retainer: {
    clientName: "Reebok India",
    projectTitle: "Full-Service Digital Agency Retainer",
    amount: "150000",
    revisions: "4",
    termsDays: "30",
    scope: "Comprehensive marketing and technical support including search engine optimization (SEO), custom landing pages, monthly creative creatives, newsletter copy, and server maintenance.",
  },
};

function ProposalForm({
  clients,
  onSuccess,
  prefill,
}: {
  clients: { id: string; companyName: string }[];
  onSuccess: () => void;
  prefill?: { title: string; subtotal: number; discount: number; templateKey: string };
}) {
  const [state, formAction] = useActionState(createProposal, initial);
  useEffect(() => {
    if (state.ok) { onSuccess(); toast.success("Proposal created"); }
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state, onSuccess]);
  return (
    <form action={formAction} className="space-y-4" key={JSON.stringify(prefill)}>
      <div className="space-y-2"><Label>Client *</Label>
        <select name="clientId" required className="flex h-9 w-full rounded-md border px-3 text-sm bg-background">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
      </div>
      <div className="space-y-2"><Label>Title *</Label><Input name="title" required defaultValue={prefill?.title || ""} /></div>
      <div className="space-y-2"><Label>Template</Label>
        <select name="templateKey" className="flex h-9 w-full rounded-md border px-3 text-sm bg-background" defaultValue={prefill?.templateKey || "website"}>
          {PROPOSAL_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Subtotal ₹</Label><Input name="subtotal" type="number" required defaultValue={prefill?.subtotal ?? 0} /></div>
        <div className="space-y-2"><Label>Discount ₹</Label><Input name="discount" type="number" defaultValue={prefill?.discount ?? 0} /></div>
      </div>
      <input type="hidden" name="status" value="DRAFT" />
      <SubmitButton label="Create proposal" />
    </form>
  );
}

function InvoiceForm({
  clients,
  onSuccess,
  prefill,
}: {
  clients: { id: string; companyName: string }[];
  onSuccess: () => void;
  prefill?: { lineDescription: string; subtotal: number; gstRate: number; dueDate: string };
}) {
  const [state, formAction] = useActionState(createInv, initial);
  useEffect(() => {
    if (state.ok) { onSuccess(); toast.success("Invoice created"); }
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state, onSuccess]);
  return (
    <form action={formAction} className="space-y-4" key={JSON.stringify(prefill)}>
      <div className="space-y-2"><Label>Client *</Label>
        <select name="clientId" required className="flex h-9 w-full rounded-md border px-3 text-sm bg-background">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
      </div>
      <div className="space-y-2"><Label>Description</Label><Input name="lineDescription" defaultValue={prefill?.lineDescription || "Professional services"} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Amount ₹</Label><Input name="subtotal" type="number" required defaultValue={prefill?.subtotal ?? ""} /></div>
        <div className="space-y-2"><Label>GST %</Label><Input name="gstRate" type="number" defaultValue={prefill?.gstRate ?? 18} /></div>
      </div>
      <div className="space-y-2"><Label>Due date</Label><Input name="dueDate" type="date" defaultValue={prefill?.dueDate || ""} /></div>
      <input type="hidden" name="status" value="SENT" />
      <input type="hidden" name="currency" value="INR" />
      <SubmitButton label="Create invoice" />
    </form>
  );
}
export function FinanceManager({
  proposals,
  invoices,
  agreements,
  clients,
  canManage,
}: {
  proposals: { id: string; title: string; status: string; total: number; client: { companyName: string } }[];
  invoices: { id: string; number: string; status: string; total: number; subtotal: number; gstRate: number; gstAmount: number; dueDate: Date | null; createdAt: Date; currency?: string; client: { companyName: string; email?: string | null; billingAddress?: string | null; gstin?: string | null } }[];
  agreements: { id: string; title: string; status: string; content: string; client: { companyName: string }; signedAt: Date | null }[];
  clients: { id: string; companyName: string }[];
  canManage: boolean;
}) {
  const [propOpen, setPropOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<typeof agreements[0] | null>(null);
  const [agreementContent, setAgreementContent] = useState("");
  const [signName, setSignName] = useState("");
  const [isListening, setIsListening] = useState(false);

  // AI template drafter states
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiType, setAiType] = useState<"invoice" | "proposal" | "agreement">("invoice");
  const [aiProvider, setAiProvider] = useState<"gemini" | "groq" | "openrouter" | "local">("local");
  const [aiApiKey, setAiApiKey] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Structured fields for template drafting
  const [aiClientName, setAiClientName] = useState("");
  const [aiProjectTitle, setAiProjectTitle] = useState("");
  const [aiAmount, setAiAmount] = useState("");
  const [aiScope, setAiScope] = useState("");
  const [aiRevisions, setAiRevisions] = useState("3");
  const [aiTermsDays, setAiTermsDays] = useState("15");

  // Prefill states
  const [prefilledProposal, setPrefilledProposal] = useState<{ title: string; subtotal: number; discount: number; templateKey: string } | null>(null);
  const [prefilledInvoice, setPrefilledInvoice] = useState<{ lineDescription: string; subtotal: number; gstRate: number; dueDate: string } | null>(null);

  // Clause writer states inside agreement view
  const [aiClausePrompt, setAiClausePrompt] = useState("");
  const [isClauseGenerating, setIsClauseGenerating] = useState(false);

  // Load saved AI configurations from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("blink_beyond_ai_key");
      const savedProvider = localStorage.getItem("blink_beyond_ai_provider");
      if (savedKey) setAiApiKey(savedKey);
      if (savedProvider) setAiProvider(savedProvider as any);
    }
  }, []);

  // Apply presets to inputs
  const handleApplyPreset = (key: "website" | "social" | "performance" | "retainer") => {
    const preset = DRAFT_PRESETS[key];
    if (preset) {
      setAiClientName(preset.clientName);
      setAiProjectTitle(preset.projectTitle);
      setAiAmount(preset.amount);
      setAiRevisions(preset.revisions);
      setAiTermsDays(preset.termsDays);
      setAiScope(preset.scope);
      toast.success(`Preset "${preset.projectTitle}" loaded!`);
    }
  };

  // 100% deterministic local instant draft generator
  const generateDraftInstantly = () => {
    const amountNum = Number(aiAmount) || 75000;
    const daysNum = Number(aiTermsDays) || 15;
    const dueDateStr = new Date(Date.now() + daysNum * 24 * 3600000).toISOString().slice(0, 10);
    const clientNameStr = aiClientName || "Client Corp";
    const titleStr = aiProjectTitle || "Professional Retainer Services";
    const scopeStr = aiScope || "Creative and technical retainer services.";

    if (aiType === "invoice") {
      setAiResult({
        lineDescription: `${titleStr} - Retainer Payment`,
        subtotal: amountNum,
        gstRate: 18,
        dueDate: dueDateStr,
      });
      toast.success("Invoice template drafted instantly!");
    } else if (aiType === "proposal") {
      setAiResult({
        title: `Proposal: ${titleStr} for ${clientNameStr}`,
        subtotal: amountNum,
        discount: amountNum > 50000 ? amountNum * 0.1 : 0,
        templateKey: "website",
        scopeDescription: scopeStr,
      });
      toast.success("Proposal template drafted instantly!");
    } else if (aiType === "agreement") {
      setAiResult({
        title: `Master Services Agreement: ${clientNameStr} & Blink Beyond`,
        content: `# Master Services Agreement

This Agreement is made on May 24, 2026, by and between **Blink Beyond Agency Pvt Ltd** ("Agency") and **${clientNameStr}** ("Client").

## 1. Scope of Services & Deliverables
${scopeStr}

## 2. Financial Terms & Revisions
* **Service Fee:** ₹${amountNum.toLocaleString("en-IN")} (exclusive of 18% GST).
* **Payment Terms:** Net-${daysNum} days from invoice date.
* **Allowed Revisions:** Up to ${aiRevisions} rounds of revisions.

## 3. SLA & Revisions
* Standard turnaround for review is 3 business days.
* Any additional revisions will be billed at standard hourly rates.

## 4. Confidentiality & Term
* Both parties agree to protect intellectual property.
* 30-day written notice required for termination.`
      });
      toast.success("Agreement contract drafted instantly!");
    }
  };

  // AI Refine & Format Handler
  const handleAITemplateGenerate = async () => {
    setIsAiGenerating(true);
    setAiResult(null);

    // Save key & provider to localStorage if remember is checked
    if (typeof window !== "undefined") {
      if (rememberKey) {
        localStorage.setItem("blink_beyond_ai_key", aiApiKey);
      } else {
        localStorage.removeItem("blink_beyond_ai_key");
      }
      localStorage.setItem("blink_beyond_ai_provider", aiProvider);
    }

    const clientNameStr = aiClientName || "Client Corp";
    const titleStr = aiProjectTitle || "Creative Retainer";
    const amountStr = aiAmount || "75000";
    const scopeStr = aiScope || "General services";

    const promptText = `
Client Company: ${clientNameStr}
Project Title: ${titleStr}
Base Fee Amount: ₹${amountStr}
Scope deliverables: ${scopeStr}
Notice Period/Term days: ${aiTermsDays} days
Allowed Revisions: ${aiRevisions}

Instruction: Clean up, polish, and professionally format the scope details and parameters for a ${aiType} template. Output valid JSON.
    `;

    try {
      const res = await generateAITemplate(promptText, aiType, aiApiKey, aiProvider);
      if (res.ok && res.data) {
        setAiResult(res.data);
        toast.success("AI refined draft generated successfully!");
      } else {
        toast.error(res.error || "Failed to generate draft.");
      }
    } catch (e) {
      toast.error("Error occurred while communicating with AI service.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Action handler for appending AI clause to current contract content
  const handleAIClauseAdd = async () => {
    setIsClauseGenerating(true);
    try {
      const res = await generateAIClause(aiClausePrompt, agreementContent, aiApiKey, aiProvider);
      if (res.ok && res.clause) {
        setAgreementContent(prev => prev + res.clause);
        setAiClausePrompt("");
        toast.success("Clause drafted and appended to agreement content!");
      } else {
        toast.error(res.error || "Failed to draft contract clause.");
      }
    } catch (e) {
      toast.error("Error communicating with AI service.");
    } finally {
      setIsClauseGenerating(false);
    }
  };

  // Applies AI drafted parameters to forms
  const handleApplyAIDraft = () => {
    if (!aiResult) return;
    if (aiType === "invoice") {
      setPrefilledInvoice({
        lineDescription: aiResult.lineDescription || "AI Drafted Professional Retainer Services",
        subtotal: Number(aiResult.subtotal) || 0,
        gstRate: Number(aiResult.gstRate) || 18,
        dueDate: aiResult.dueDate || "",
      });
      setAiOpen(false);
      setInvOpen(true);
      toast.success("AI draft parameters applied. Opening Invoice creation form!");
    } else if (aiType === "proposal") {
      setPrefilledProposal({
        title: aiResult.title || "AI Drafted Proposal",
        subtotal: Number(aiResult.subtotal) || 0,
        discount: Number(aiResult.discount) || 0,
        templateKey: aiResult.templateKey || "retainer",
      });
      setAiOpen(false);
      setPropOpen(true);
      toast.success("AI draft parameters applied. Opening Proposal creation form!");
    } else if (aiType === "agreement") {
      navigator.clipboard.writeText(aiResult.content || "");
      toast.success("Full agreement text copied to clipboard! You can paste this in any contract draft.");
    }
  };

  // E-Sign drawing states
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load selected agreement content
  useEffect(() => {
    if (selectedAgreement) {
      setAgreementContent(selectedAgreement.content);
    }
  }, [selectedAgreement]);

  // Web Speech API Voice Dictation
  const startVoiceDictation = () => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Web Speech API not supported in this browser. Running simulation...");
        setIsListening(true);
        setTimeout(() => {
          setAgreementContent(prev => prev + "\n- Blink Beyond agrees to deliver campaign creatives, monthly performance audits, and optimized search engine ads for Nilesh Nilesh Nilesh Nilesh Nilesh Nilesh.");
          setIsListening(false);
          toast.success("Simulated clause added!");
        }, 2500);
        return;
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN";

      rec.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Speak now");
      };
      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setAgreementContent(prev => prev + " " + text);
        toast.success("Text added successfully!");
      };
      rec.onerror = () => {
        setIsListening(false);
        toast.error("Failed to capture speech");
      };
      rec.onend = () => {
        setIsListening(false);
      };
      rec.start();
    }
  };

  // E-Sign Drawing Canvas Handlers
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

  // Save changes to Agreement draft
  async function handleSaveAgreementDraft() {
    if (!selectedAgreement) return;
    const r = await updateAgreementContent(selectedAgreement.id, agreementContent);
    if (r.ok) toast.success("Draft saved"); else toast.error(r.error);
  }

  // Sign agreement action
  async function handleSignAgreement() {
    if (!selectedAgreement) return;
    if (!signName.trim()) {
      toast.error("Please enter your name to sign the agreement");
      return;
    }
    const r = await signAgreement(selectedAgreement.id, signName.trim());
    if (r.ok) {
      toast.success("Agreement signed successfully!");
      setSelectedAgreement(null);
      setSignName("");
    } else {
      toast.error(r.error);
    }
  }
  const printAgreement = () => {
    if (!selectedAgreement) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Agreement: ${selectedAgreement.title}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; color: #0f172a; }
            .meta { font-size: 14px; color: #64748b; margin-top: 5px; }
            .content { font-size: 16px; white-space: pre-wrap; margin-bottom: 40px; }
            .signature-section { margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 20px; }
            .signature-title { font-weight: bold; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${selectedAgreement.title}</h1>
            <div class="meta">Client: ${selectedAgreement.client.companyName} | Status: ${selectedAgreement.status}</div>
          </div>
          <div class="content">${agreementContent}</div>
          <div class="signature-section">
            <div class="signature-title">Acceptance and Signatures</div>
            <p>By signing below, both parties agree to the terms listed in this document.</p>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print Invoice Sheet (Modern Agency Style)
  const printInvoice = (inv: typeof invoices[0]) => {
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
                <p style="font-weight: 700; font-size: 16px; color: #0f172a; margin-bottom: 6px;">${inv.client.companyName}</p>
                <p>Email: ${inv.client.email || "—"}</p>
                <p>Address: ${inv.client.billingAddress || "—"}</p>
                ${inv.client.gstin ? `<p>GSTIN: <strong>${inv.client.gstin}</strong></p>` : ""}
              </div>
              <div class="details-block" style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
                <div style="text-align: left;">
                  <h3>Invoice Details</h3>
                  <ul class="meta-list">
                    <li><span>Invoice No:</span> <strong>${inv.number}</strong></li>
                    <li><span>Date:</span> ${new Date(inv.createdAt).toLocaleDateString()}</li>
                    <li><span>Due Date:</span> ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</li>
                    <li><span>Currency:</span> ${inv.currency || "INR"}</li>
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
    <div className="space-y-6">
      {canManage && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 scale-hover soft-transition">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" />
              AI Copilot Draft Assistant
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Describe client requirements in plain text to automatically draft proposals, invoices, or agreements instantly.
            </p>
          </div>
          <Button onClick={() => setAiOpen(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs h-9 flex items-center gap-1.5 btn-micro-anim border-0">
            <Sparkles className="h-3.5 w-3.5 text-white" />
            Open AI Drafter
          </Button>
        </div>
      )}

      <Tabs defaultValue="proposals">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

      <TabsContent value="proposals" className="space-y-4 mt-4">
        {canManage && (
          <Dialog open={propOpen} onOpenChange={setPropOpen}>
            <div className="flex justify-end"><DialogTrigger render={<Button />}><Plus className="h-4 w-4 mr-2" />New proposal</DialogTrigger></div>
            <DialogContent><DialogHeader><DialogTitle>New proposal</DialogTitle></DialogHeader>
              <ProposalForm clients={clients} onSuccess={() => { setPropOpen(false); setPrefilledProposal(null); }} prefill={prefilledProposal || undefined} />
            </DialogContent>
          </Dialog>
        )}
        <div className="space-y-2">
          {proposals.map((p) => (
            <Card key={p.id}><CardContent className="py-4 flex justify-between items-center">
              <div><p className="font-medium">{p.title}</p><p className="text-sm text-muted-foreground">{p.client.companyName}</p></div>
              <div className="flex items-center gap-2">
                <Badge>{p.status}</Badge><span className="font-medium">₹{p.total.toLocaleString("en-IN")}</span>
                {canManage && (
                  <select className="text-xs border rounded px-2 h-8 bg-background" value={p.status} onChange={async (e) => {
                    const r = await updateProposalStatus(p.id, e.target.value);
                    if (r.ok) toast.success("Updated"); else toast.error(r.error);
                  }}>
                    <option value="DRAFT">Draft</option><option value="SENT">Sent</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
                  </select>
                )}
              </div>
            </CardContent></Card>
          ))}
        </div>
      </TabsContent>

      {/* Agreements Tab */}
      <TabsContent value="agreements" className="space-y-4 mt-4">
        <div className="space-y-2">
          {agreements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
              No agreements generated yet. Approve a proposal to generate a draft contract.
            </div>
          ) : (
            agreements.map((a) => (
              <Card key={a.id}>
                <CardContent className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.client.companyName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "SIGNED" ? "default" : "outline"}>
                      {a.status}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setSelectedAgreement(a)}>
                      <FileSignature className="h-4 w-4 mr-1.5" />
                      {a.status === "SIGNED" ? "View & Print" : "View & Sign"}
                    </Button>
                    {canManage && a.status !== "SIGNED" && (
                      <select className="text-xs border rounded px-2 h-8 bg-background" value={a.status} onChange={async (e) => {
                        const r = await updateAgreementStatus(a.id, e.target.value);
                        if (r.ok) toast.success("Status updated"); else toast.error(r.error);
                      }}>
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="SIGNED">Signed</option>
                        <option value="EXPIRED">Expired</option>
                      </select>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </TabsContent>

      {/* Invoices Tab */}
      <TabsContent value="invoices" className="space-y-4 mt-4">
        {canManage && (
          <Dialog open={invOpen} onOpenChange={setInvOpen}>
            <div className="flex justify-end"><DialogTrigger render={<Button />}><Plus className="h-4 w-4 mr-2" />New invoice</DialogTrigger></div>
            <DialogContent><DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
              <InvoiceForm clients={clients} onSuccess={() => { setInvOpen(false); setPrefilledInvoice(null); }} prefill={prefilledInvoice || undefined} />
            </DialogContent>
          </Dialog>
        )}
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Card key={inv.id}><CardContent className="py-4 flex justify-between items-center">
              <div><p className="font-medium">{inv.number}</p><p className="text-sm text-muted-foreground">{inv.client.companyName}</p></div>
              <div className="flex items-center gap-2">
                <Badge>{inv.status}</Badge><span>₹{inv.total.toLocaleString("en-IN")}</span>
                <Button size="sm" variant="outline" className="h-9 scale-hover btn-micro-anim" onClick={() => printInvoice(inv)}>
                  <Download className="h-4 w-4 mr-1.5" /> PDF Print
                </Button>
                {canManage && inv.status !== "PAID" && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    const r = await markPaid(inv.id);
                    if (r.ok) toast.success("Marked paid"); else toast.error(r.error);
                  }}>Mark paid</Button>
                )}
              </div>
            </CardContent></Card>
          ))}
        </div>
      </TabsContent>

      {/* View/Edit/Sign Agreement Dialog */}
      {selectedAgreement && (
        <Dialog open={!!selectedAgreement} onOpenChange={(open) => { if (!open) setSelectedAgreement(null); }}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Agreement Contract
              </DialogTitle>
              <CardDescription>
                Client: {selectedAgreement.client.companyName} | Status: {selectedAgreement.status}
              </CardDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-semibold text-slate-800">{selectedAgreement.title}</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={printAgreement}>
                    <Download className="h-3.5 w-3.5 mr-1" /> PDF Print
                  </Button>
                  {selectedAgreement.status !== "SIGNED" && (
                    <Button size="sm" onClick={handleSaveAgreementDraft}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Save Draft
                    </Button>
                  )}
                </div>
              </div>

              {/* Dictation Box */}
              {selectedAgreement.status !== "SIGNED" && (
                <div className="bg-slate-50 border p-3 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex-1 text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">Voice-to-Agreement</p>
                    <p>Dictate customized agreement terms directly into the draft below.</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isListening ? "destructive" : "secondary"}
                    onClick={startVoiceDictation}
                    className="flex items-center gap-1.5 shrink-0"
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-3.5 w-3.5 animate-pulse text-red-100" />
                        Listening...
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5 text-primary" />
                        Dictate
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* AI Clause Generator */}
              {selectedAgreement.status !== "SIGNED" && (
                <div className="bg-violet-50/50 border border-violet-100 p-3 rounded-lg space-y-2 dark:bg-violet-950/10 dark:border-violet-900/40">
                  <div className="flex justify-between items-center">
                    <div className="text-xs">
                      <p className="font-semibold text-violet-800 dark:text-violet-400 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-violet-650" /> AI Contract Clause Generator
                      </p>
                      <p className="text-[10px] text-slate-500">Draft complex custom legal terms based on raw prompts</p>
                    </div>
                    <Badge className="bg-violet-100 text-violet-700 border-0 text-[8px] py-0 leading-none hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-400">
                      {aiProvider === "local" ? "Local Simulator" : aiProvider.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., SLA response within 48 hours and 10% refund if late"
                      value={aiClausePrompt}
                      onChange={(e) => setAiClausePrompt(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-slate-950"
                    />
                    <Button
                      size="sm"
                      onClick={handleAIClauseAdd}
                      disabled={isClauseGenerating || !aiClausePrompt.trim()}
                      className="bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs h-8 shrink-0 btn-micro-anim border-0"
                    >
                      {isClauseGenerating ? "Drafting..." : "Add Clause"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Content Editor */}
              <div className="space-y-1">
                <Label>Agreement Content</Label>
                <Textarea
                  value={agreementContent}
                  onChange={(e) => setAgreementContent(e.target.value)}
                  disabled={selectedAgreement.status === "SIGNED"}
                  rows={8}
                  className="font-mono text-sm leading-relaxed"
                />
              </div>

              {/* E-Sign panel */}
              {selectedAgreement.status !== "SIGNED" ? (
                <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-sm">Draw Digital Signature</Label>
                      <p className="text-[10px] text-muted-foreground">Draw using your mouse, stylus, or touchpad</p>
                    </div>
                    <Button size="xs" variant="ghost" className="text-xs h-7 hover:bg-slate-200" onClick={clearCanvas}>
                      Clear Canvas
                    </Button>
                  </div>

                  <div className="border border-slate-200 bg-white rounded-lg overflow-hidden flex items-center justify-center">
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
                      <Label htmlFor="signName">Type Full Name *</Label>
                      <Input
                        id="signName"
                        value={signName}
                        onChange={(e) => setSignName(e.target.value)}
                        placeholder="John Doe"
                        className="bg-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSignAgreement} className="w-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5 h-10 font-medium">
                        <Check className="h-4 w-4" /> Sign & Lock Agreement
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 text-emerald-800">
                  <Check className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">Signed Contract Lock</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      This contract is legally locked and signed. You can download the completed document or export to PDF print.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedAgreement(null)}>
                Close Window
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Tabs>

      {/* AI Drafter Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-violet-400 animate-pulse" />
              AI & Template Copilot
            </DialogTitle>
            <CardDescription className="text-slate-400">
              Generate proposals, invoices, or agreements instantly from structured inputs and templates. Optionally refine with AI.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Select Document Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["invoice", "proposal", "agreement"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setAiType(t); setAiResult(null); }}
                    className={`py-2 text-xs font-semibold rounded-lg border capitalize transition-all ${aiType === t ? 'border-primary bg-primary/15 text-primary font-bold' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Presets */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Load a Preset Template (Optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {(["website", "social", "performance", "retainer"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyPreset(key)}
                    className="text-[11px] px-2.5 py-1 bg-slate-950 border border-slate-850 text-slate-350 hover:bg-slate-800 rounded-md transition"
                  >
                    ✨ {key === "website" ? "Website Build" : key === "social" ? "Social Retainer" : key === "performance" ? "Paid Ads" : "Full Retainer"}
                  </button>
                ))}
              </div>
            </div>

            {/* Structured Fields */}
            <div className="space-y-3 border-t border-slate-850 pt-3">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. Document Specifications</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="aiClientName" className="text-[10px] text-slate-450">Client / Company Name</Label>
                  <Input
                    id="aiClientName"
                    value={aiClientName}
                    onChange={(e) => setAiClientName(e.target.value)}
                    placeholder="e.g. Nike Retail"
                    className="bg-slate-950 border-slate-850 h-8 text-xs text-white placeholder-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="aiProjectTitle" className="text-[10px] text-slate-455">Project / Service Title</Label>
                  <Input
                    id="aiProjectTitle"
                    value={aiProjectTitle}
                    onChange={(e) => setAiProjectTitle(e.target.value)}
                    placeholder="e.g. Website Redesign"
                    className="bg-slate-950 border-slate-855 h-8 text-xs text-white placeholder-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="aiAmount" className="text-[10px] text-slate-450">Amount (₹)</Label>
                  <Input
                    id="aiAmount"
                    type="number"
                    value={aiAmount}
                    onChange={(e) => setAiAmount(e.target.value)}
                    placeholder="75000"
                    className="bg-slate-950 border-slate-850 h-8 text-xs text-white placeholder-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="aiRevisions" className="text-[10px] text-slate-450">Max Revisions</Label>
                  <Input
                    id="aiRevisions"
                    type="number"
                    value={aiRevisions}
                    onChange={(e) => setAiRevisions(e.target.value)}
                    placeholder="3"
                    className="bg-slate-950 border-slate-850 h-8 text-xs text-white placeholder-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="aiTermsDays" className="text-[10px] text-slate-455">Payment Term (Days)</Label>
                  <Input
                    id="aiTermsDays"
                    type="number"
                    value={aiTermsDays}
                    onChange={(e) => setAiTermsDays(e.target.value)}
                    placeholder="15"
                    className="bg-slate-950 border-slate-855 h-8 text-xs text-white placeholder-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="aiScope" className="text-[10px] text-slate-450">Scope of Deliverables</Label>
                <Textarea
                  id="aiScope"
                  rows={2}
                  value={aiScope}
                  onChange={(e) => setAiScope(e.target.value)}
                  placeholder="Describe detailed deliverables, milestones, or services..."
                  className="bg-slate-950 border-slate-850 text-xs text-white placeholder-slate-700"
                />
              </div>
            </div>

            {/* Config Expandable Accordion / Panel */}
            <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Config (For Refinements only)</span>
                <Badge variant="outline" className="text-[8px] border-slate-800 text-slate-500">Optional</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500">AI Provider</Label>
                  <select
                    value={aiProvider}
                    onChange={(e) => { setAiProvider(e.target.value as any); setAiResult(null); }}
                    className="flex h-7 w-full rounded-md border border-slate-850 bg-slate-950 px-1 text-[11px] text-white"
                  >
                    <option value="local">Local Simulator (Free)</option>
                    <option value="gemini">Gemini API</option>
                    <option value="groq">Groq API</option>
                    <option value="openrouter">OpenRouter API</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500">API Key</Label>
                  <Input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    disabled={aiProvider === "local"}
                    placeholder={aiProvider === "local" ? "No key needed for mock" : "Paste API key..."}
                    className="bg-slate-950 border-slate-850 h-7 text-[11px] text-white placeholder-slate-700 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-850 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={generateDraftInstantly}
                className="border-slate-750 hover:bg-slate-800 hover:text-white text-xs font-bold h-10 flex items-center justify-center gap-1.5 btn-micro-anim"
              >
                <FileText className="h-4 w-4 text-slate-400" />
                Draft Instantly (Local)
              </Button>
              
              <Button
                type="button"
                onClick={handleAITemplateGenerate}
                disabled={isAiGenerating}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs h-10 flex items-center justify-center gap-1.5 btn-micro-anim border-0"
              >
                {isAiGenerating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                    AI Refining...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                    AI Refine & Expand
                  </>
                )}
              </Button>
            </div>

            {/* Output Display */}
            {aiResult && (
              <div className="space-y-3 border-t border-slate-850 pt-3.5 mt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Draft Preview</Label>
                  <Button
                    onClick={handleApplyAIDraft}
                    className="h-7 text-[10px] px-3 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 font-bold border-0 btn-micro-anim"
                  >
                    <Check className="h-3 w-3" />
                    {aiType === "agreement" ? "Copy to Clipboard" : "Apply Draft to Form"}
                  </Button>
                </div>

                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 max-h-[180px] overflow-y-auto text-xs font-mono text-slate-300 text-left">
                  {aiType === "agreement" ? (
                    <div className="space-y-2 whitespace-pre-wrap font-sans text-xs">
                      <p className="font-bold text-sm text-white">{aiResult.title}</p>
                      <div className="text-slate-300 leading-relaxed border-t border-slate-850 pt-2">{aiResult.content}</div>
                    </div>
                  ) : (
                    <pre>{JSON.stringify(aiResult, null, 2)}</pre>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-1">
            <Button variant="ghost" onClick={() => setAiOpen(false)} className="text-slate-400 hover:text-white">Close Copilot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
