import { useState, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import {
  useListInvoices, useGetFinancialSummary, useListClients,
  getListInvoicesQueryKey, getGetFinancialSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WriteWithAI } from "@/components/common/WriteWithAI";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Receipt, ArrowLeft, UploadCloud, ImageIcon, X as XIcon,
  IndianRupee, Building2, User, FileText, Banknote, Download,
} from "lucide-react";
import { format } from "date-fns";
import { openPrintWindow, buildInvoiceHtml, type InvoiceData } from "@/lib/pdf-print";

// ─── Helpers ───────────────────────────────────────────────────────────────

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigit(n: number) {
  if (n < 20) return ONES[n] ?? "";
  return (TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "")).trim();
}
function threeDigit(n: number) {
  if (n < 100) return twoDigit(n);
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigit(n % 100) : "");
}
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thou = Math.floor((n % 100000) / 1000);
  const rem = n % 1000;
  let r = "";
  if (crore) r += twoDigit(crore) + " Crore ";
  if (lakh) r += twoDigit(lakh) + " Lakh ";
  if (thou) r += twoDigit(thou) + " Thousand ";
  if (rem) r += threeDigit(rem);
  return r.trim();
}
function amountToWords(amount: number, currency = "INR") {
  const unit = currency === "INR" ? "Rupee" : "Dollar";
  const sub = currency === "INR" ? "Paise" : "Cent";
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let r = numberToWords(rupees) + " " + unit + (rupees !== 1 ? "s" : "");
  if (paise > 0) r += " And " + numberToWords(paise) + " " + sub;
  return r + " Only";
}

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
const sym = (c: string) => CURRENCY_SYMBOL[c] ?? c;

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  DRAFT: { label: "Draft", variant: "secondary", className: "" },
  SENT: { label: "Sent", variant: "outline", className: "border-blue-300 text-blue-700" },
  VIEWED: { label: "Viewed", variant: "outline", className: "border-indigo-300 text-indigo-700" },
  PAID: { label: "Paid", variant: "default", className: "bg-emerald-600 border-emerald-600" },
  OVERDUE: { label: "Overdue", variant: "destructive", className: "" },
  CANCELLED: { label: "Cancelled", variant: "secondary", className: "line-through opacity-60" },
};

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("agency_token") : null;
}
function authHeaders(json = false) {
  const h: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface LineItem { description: string; hsnSac: string; taxPercent: number; qty: number; unitPrice: number; }
interface BuilderForm {
  invoiceNumber: string; invoiceDate: string; dueDate: string;
  currency: string; gstType: string;
  logoUrl: string;
  businessName: string; businessPhone: string; businessGstin: string;
  businessAddress: string; businessCity: string; businessPostalCode: string; businessState: string;
  businessEmail: string; businessPan: string;
  clientId: string; clientPhone: string; clientGstin: string;
  clientAddress: string; clientCity: string; clientPostalCode: string; clientState: string;
  clientEmail: string; clientPan: string;
  lineItems: LineItem[];
  discount: number; discountType: string;
  termsAndConditions: string; notes: string;
  bankName: string; bankAccount: string; bankIfsc: string; bankAccountName: string;
  signatureUrl: string;
}

const BKEY = "agencyos_biz_details";
function loadBiz(): Partial<BuilderForm> {
  try { return JSON.parse(localStorage.getItem(BKEY) ?? "{}"); } catch { return {}; }
}
function saveBiz(data: BuilderForm) {
  const keys: (keyof BuilderForm)[] = ["businessName", "businessPhone", "businessGstin", "businessAddress",
    "businessCity", "businessPostalCode", "businessState", "businessEmail", "businessPan",
    "bankName", "bankAccount", "bankIfsc", "bankAccountName"];
  const save: Partial<BuilderForm> = {};
  keys.forEach(k => { (save as Record<string, unknown>)[k] = data[k]; });
  localStorage.setItem(BKEY, JSON.stringify(save));
}

// ─── Invoice Builder ───────────────────────────────────────────────────────

function InvoiceBuilder({ onBack, editData }: { onBack: () => void; editData?: Record<string, unknown> | null }) {
  const qc = useQueryClient();
  const { data: clients } = useListClients();
  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [sigUploading, setSigUploading] = useState(false);

  const biz = loadBiz();
  const defaults: BuilderForm = {
    invoiceNumber: "", invoiceDate: new Date().toISOString().split("T")[0], dueDate: "",
    currency: "INR", gstType: "CGST_SGST",
    logoUrl: (editData?.logoUrl as string) ?? biz.logoUrl ?? "",
    businessName: (editData?.businessName as string) ?? biz.businessName ?? "",
    businessPhone: (editData?.businessPhone as string) ?? biz.businessPhone ?? "",
    businessGstin: (editData?.companyGstin as string) ?? biz.businessGstin ?? "",
    businessAddress: (editData?.businessAddress as string) ?? biz.businessAddress ?? "",
    businessCity: (editData?.businessCity as string) ?? biz.businessCity ?? "",
    businessPostalCode: (editData?.businessPostalCode as string) ?? biz.businessPostalCode ?? "",
    businessState: (editData?.businessState as string) ?? biz.businessState ?? "",
    businessEmail: (editData?.businessEmail as string) ?? biz.businessEmail ?? "",
    businessPan: (editData?.businessPan as string) ?? biz.businessPan ?? "",
    clientId: (editData?.clientId as string) ?? "",
    clientPhone: (editData?.clientPhone as string) ?? "",
    clientGstin: (editData?.clientGstin as string) ?? "",
    clientAddress: (editData?.billingAddress as string) ?? "",
    clientCity: (editData?.clientCity as string) ?? "",
    clientPostalCode: (editData?.clientPostalCode as string) ?? "",
    clientState: (editData?.clientState as string) ?? "",
    clientEmail: (editData?.clientEmail as string) ?? "",
    clientPan: (editData?.clientPan as string) ?? "",
    lineItems: (editData?.lineItems as LineItem[]) ?? [{ description: "", hsnSac: "", taxPercent: 18, qty: 1, unitPrice: 0 }],
    discount: (editData?.discount as number) ?? 0,
    discountType: (editData?.discountType as string) ?? "FIXED",
    termsAndConditions: (editData?.termsAndConditions as string) ?? "",
    notes: (editData?.notes as string) ?? "",
    bankName: (editData?.bankDetails as Record<string, string>)?.bankName ?? biz.bankName ?? "",
    bankAccount: (editData?.bankDetails as Record<string, string>)?.accountNumber ?? biz.bankAccount ?? "",
    bankIfsc: (editData?.bankDetails as Record<string, string>)?.ifsc ?? biz.bankIfsc ?? "",
    bankAccountName: (editData?.bankDetails as Record<string, string>)?.accountName ?? biz.bankAccountName ?? "",
    signatureUrl: (editData?.signatureUrl as string) ?? "",
    ...(!editData && {
      invoiceNumber: "",
      currency: (editData as Record<string, string>)?.currency ?? "INR",
      gstType: (editData as Record<string, string>)?.gstType ?? "CGST_SGST",
    }),
  };
  if (editData) {
    defaults.invoiceNumber = (editData.number as string) ?? "";
    defaults.currency = (editData.currency as string) ?? "INR";
    defaults.gstType = (editData.gstType as string) ?? "CGST_SGST";
    defaults.invoiceDate = (editData.invoiceDate as string) ?? defaults.invoiceDate;
    defaults.dueDate = (editData.dueDate as string) ?? "";
  }

  const { register, control, watch, setValue, handleSubmit } = useForm<BuilderForm>({ defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const watched = watch();

  // Calculations
  const lines = watched.lineItems ?? [];
  const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);
  const totalTax = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0) * (Number(l.taxPercent) || 0) / 100, 0);
  const discountAmt = watched.discountType === "PERCENT"
    ? subtotal * (Number(watched.discount) || 0) / 100
    : Number(watched.discount) || 0;
  const grandTotal = subtotal + totalTax - discountAmt;
  const isIGST = watched.gstType === "IGST";
  const s = sym(watched.currency ?? "INR");

  async function uploadFile(file: File, setUploading: (v: boolean) => void, field: "logoUrl" | "signatureUrl") {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", headers: authHeaders(), body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setValue(field, data.url);
      toast.success("Uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  }

  async function onSubmit(data: BuilderForm) {
    setSaving(true);
    saveBiz(data);
    const lineItems = data.lineItems.map(l => ({
      description: l.description, hsnSac: l.hsnSac || undefined,
      qty: Number(l.qty), unitPrice: Number(l.unitPrice), taxPercent: Number(l.taxPercent),
    }));
    const payload = {
      number: data.invoiceNumber || undefined,
      clientId: data.clientId || undefined,
      invoiceDate: data.invoiceDate, dueDate: data.dueDate || undefined,
      currency: data.currency, gstType: data.gstType,
      logoUrl: data.logoUrl || undefined,
      businessName: data.businessName || undefined,
      businessPhone: data.businessPhone || undefined, companyGstin: data.businessGstin || undefined,
      businessAddress: data.businessAddress || undefined, businessCity: data.businessCity || undefined,
      businessPostalCode: data.businessPostalCode || undefined, businessState: data.businessState || undefined,
      businessEmail: data.businessEmail || undefined, businessPan: data.businessPan || undefined,
      clientGstin: data.clientGstin || undefined, clientPhone: data.clientPhone || undefined,
      clientEmail: data.clientEmail || undefined, clientPan: data.clientPan || undefined,
      billingAddress: data.clientAddress || undefined, clientCity: data.clientCity || undefined,
      clientPostalCode: data.clientPostalCode || undefined, clientState: data.clientState || undefined,
      subtotal, taxAmount: totalTax, discount: discountAmt, discountType: data.discountType, total: grandTotal,
      lineItems,
      notes: data.notes || undefined, termsAndConditions: data.termsAndConditions || undefined,
      signatureUrl: data.signatureUrl || undefined,
      bankDetails: (data.bankName || data.bankAccount)
        ? { bankName: data.bankName, accountNumber: data.bankAccount, ifsc: data.bankIfsc, accountName: data.bankAccountName }
        : undefined,
    };
    try {
      const url = editData ? `/api/invoices/${(editData as Record<string, string>).id}` : "/api/invoices";
      const method = editData ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(true), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(editData ? "Invoice updated!" : "Invoice created!");
      qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
      onBack();
    } catch { toast.error("Failed to save invoice"); }
    finally { setSaving(false); }
  }

  const SectionHead = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
      <span className="text-primary">{icon}</span>
      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-6 py-3 flex items-center justify-between shadow-sm">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </button>
        <h1 className="font-bold font-heading text-base">{editData ? "Edit Invoice" : "New Invoice"}</h1>
        <div className="flex gap-2">
          {editData && (
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={() => openPrintWindow(buildInvoiceHtml(editData as InvoiceData), `Invoice-${(editData as Record<string,string>).number ?? "draft"}`)}
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSubmit(async (d) => { d.status = "DRAFT"; await onSubmit(d as BuilderForm); })} disabled={saving}>
            Save Draft
          </Button>
          <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={saving} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> {saving ? "Saving…" : editData ? "Update Invoice" : "Create Invoice"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <WriteWithAI
          context="invoice"
          onFill={(fields) => {
            if (fields.currency) setValue("currency", fields.currency, { shouldDirty: true });
            if (fields.notes) setValue("notes", fields.notes, { shouldDirty: true });
            if (fields.termsAndConditions) setValue("termsAndConditions", fields.termsAndConditions, { shouldDirty: true });
            if (Array.isArray(fields.lineItems) && fields.lineItems.length > 0) {
              setValue("lineItems", fields.lineItems, { shouldDirty: true });
            }
          }}
        />

        {/* ── Invoice Info ── */}
        <Card>
          <CardContent className="p-5">
            <SectionHead icon={<Receipt className="h-4 w-4" />} title="Invoice Details" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice No *</Label>
                <Input {...register("invoiceNumber")} placeholder="A00001 (auto if blank)" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice Date *</Label>
                <Input {...register("invoiceDate")} type="date" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Due Date</Label>
                <Input {...register("dueDate")} type="date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Currency</Label>
                <Controller control={control} name="currency" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR — ₹ Indian Rupee</SelectItem>
                      <SelectItem value="USD">USD — $ US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR — € Euro</SelectItem>
                      <SelectItem value="GBP">GBP — £ British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">GST Type</Label>
                <Controller control={control} name="gstType" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CGST_SGST">CGST + SGST (Intra-State)</SelectItem>
                      <SelectItem value="IGST">IGST (Inter-State)</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Business Logo + Your Details ── */}
        <Card>
          <CardContent className="p-5">
            <SectionHead icon={<Building2 className="h-4 w-4" />} title="Your Details" />
            <div className="flex gap-5 flex-wrap">
              {/* Logo */}
              <div className="flex flex-col items-center gap-2">
                {watched.logoUrl ? (
                  <div className="relative w-24 h-24 rounded-lg border border-border overflow-hidden bg-muted">
                    <img src={watched.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 p-0.5 bg-background/80 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => setValue("logoUrl", "")}
                    ><XIcon className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <div
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    onClick={() => logoRef.current?.click()}
                  >
                    {logoUploading
                      ? <UploadCloud className="h-5 w-5 text-primary animate-bounce" />
                      : <><ImageIcon className="h-5 w-5 text-muted-foreground" /><span className="text-xs text-muted-foreground text-center">Add Logo</span></>}
                  </div>
                )}
                <span className="text-xs text-muted-foreground">1080×1080 max</span>
                <input ref={logoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, setLogoUploading, "logoUrl"); }} />
              </div>

              {/* Business Fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Business Name *</Label>
                  <Input {...register("businessName")} placeholder="Your Business Name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <div className="flex gap-1.5">
                    <span className="flex items-center px-2 text-sm bg-muted border border-border rounded-md text-muted-foreground">+91</span>
                    <Input {...register("businessPhone")} placeholder="Phone number" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">GSTIN</Label>
                  <Input {...register("businessGstin")} placeholder="22AAAAA0000A1Z5" className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Address</Label>
                  <Input {...register("businessAddress")} placeholder="Street address" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input {...register("businessCity")} placeholder="City" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Input {...register("businessState")} placeholder="State" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Postal Code</Label>
                  <Input {...register("businessPostalCode")} placeholder="PIN Code" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input {...register("businessEmail")} type="email" placeholder="billing@yourbusiness.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">PAN</Label>
                  <Input {...register("businessPan")} placeholder="AAAAA0000A" className="font-mono text-xs" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Client Details ── */}
        <Card>
          <CardContent className="p-5">
            <SectionHead icon={<User className="h-4 w-4" />} title="Client's Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Client *</Label>
                <Controller control={control} name="clientId" render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {(clients ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <div className="flex gap-1.5">
                  <span className="flex items-center px-2 text-sm bg-muted border border-border rounded-md text-muted-foreground">+91</span>
                  <Input {...register("clientPhone")} placeholder="Phone number" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">GSTIN</Label>
                <Input {...register("clientGstin")} placeholder="Client GSTIN" className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Billing Address</Label>
                <Input {...register("clientAddress")} placeholder="Street address" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input {...register("clientCity")} placeholder="City" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Input {...register("clientState")} placeholder="State" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Postal Code</Label>
                <Input {...register("clientPostalCode")} placeholder="PIN Code" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input {...register("clientEmail")} type="email" placeholder="client@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PAN</Label>
                <Input {...register("clientPan")} placeholder="AAAAA0000A" className="font-mono text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Line Items ── */}
        <Card>
          <CardContent className="p-5">
            <SectionHead icon={<IndianRupee className="h-4 w-4" />} title="Line Items" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-2 text-xs text-muted-foreground font-semibold w-6">#</th>
                    <th className="text-left py-2 pr-2 text-xs text-muted-foreground font-semibold">Item</th>
                    <th className="text-left py-2 pr-2 text-xs text-muted-foreground font-semibold w-24">HSN/SAC</th>
                    <th className="text-left py-2 pr-2 text-xs text-muted-foreground font-semibold w-20">GST %</th>
                    <th className="text-left py-2 pr-2 text-xs text-muted-foreground font-semibold w-16">Qty</th>
                    <th className="text-left py-2 pr-2 text-xs text-muted-foreground font-semibold w-24">Rate</th>
                    <th className="text-right py-2 pr-2 text-xs text-muted-foreground font-semibold w-24">Amount</th>
                    {isIGST
                      ? <th className="text-right py-2 pr-2 text-xs text-muted-foreground font-semibold w-24">IGST</th>
                      : <>
                          <th className="text-right py-2 pr-2 text-xs text-muted-foreground font-semibold w-24">CGST</th>
                          <th className="text-right py-2 pr-2 text-xs text-muted-foreground font-semibold w-24">SGST</th>
                        </>}
                    <th className="text-right py-2 pr-2 text-xs text-muted-foreground font-semibold w-28">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((field, idx) => {
                    const qty = Number(watched.lineItems?.[idx]?.qty ?? 0);
                    const rate = Number(watched.lineItems?.[idx]?.unitPrice ?? 0);
                    const gst = Number(watched.lineItems?.[idx]?.taxPercent ?? 0);
                    const amount = qty * rate;
                    const taxTotal = amount * gst / 100;
                    const half = taxTotal / 2;
                    return (
                      <tr key={field.id} className="align-top">
                        <td className="py-2 pr-2 text-muted-foreground text-xs pt-3">{idx + 1}</td>
                        <td className="py-2 pr-2"><Input {...register(`lineItems.${idx}.description`)} placeholder="Item description" className="text-xs h-8 min-w-[140px]" /></td>
                        <td className="py-2 pr-2"><Input {...register(`lineItems.${idx}.hsnSac`)} placeholder="998314" className="text-xs h-8 font-mono" /></td>
                        <td className="py-2 pr-2"><Input {...register(`lineItems.${idx}.taxPercent`)} type="number" placeholder="18" className="text-xs h-8" /></td>
                        <td className="py-2 pr-2"><Input {...register(`lineItems.${idx}.qty`)} type="number" placeholder="1" className="text-xs h-8" /></td>
                        <td className="py-2 pr-2"><Input {...register(`lineItems.${idx}.unitPrice`)} type="number" placeholder="0.00" className="text-xs h-8" /></td>
                        <td className="py-2 pr-2 text-right text-xs pt-3 font-mono">{s}{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        {isIGST
                          ? <td className="py-2 pr-2 text-right text-xs pt-3 font-mono text-blue-600">{s}{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          : <>
                              <td className="py-2 pr-2 text-right text-xs pt-3 font-mono text-emerald-600">{s}{half.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="py-2 pr-2 text-right text-xs pt-3 font-mono text-emerald-600">{s}{half.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </>}
                        <td className="py-2 pr-2 text-right text-xs pt-3 font-bold font-mono">{s}{(amount + taxTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2">
                          <button type="button" className="text-muted-foreground hover:text-destructive p-1 mt-0.5" onClick={() => remove(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-3 gap-1 text-xs"
              onClick={() => append({ description: "", hsnSac: "", taxPercent: 18, qty: 1, unitPrice: 0 })}>
              <Plus className="h-3 w-3" /> Add New Line
            </Button>

            {/* Totals */}
            <div className="mt-5 flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono">{s}{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {isIGST
                  ? <div className="flex justify-between text-blue-600">
                      <span>IGST</span>
                      <span className="font-mono">{s}{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  : <>
                      <div className="flex justify-between text-emerald-600">
                        <span>CGST</span>
                        <span className="font-mono">{s}{(totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>SGST</span>
                        <span className="font-mono">{s}{(totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>}
                {discountAmt > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount</span>
                    <span className="font-mono">- {s}{discountAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-border pt-2 text-base">
                  <span>Total ({watched.currency})</span>
                  <span className="font-mono">{s}{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {grandTotal > 0 && (
                  <div className="text-xs text-muted-foreground italic pt-1 border-t border-dashed border-border">
                    {amountToWords(grandTotal, watched.currency)}
                  </div>
                )}
              </div>
            </div>

            {/* Discount */}
            <div className="mt-4 flex items-center gap-3">
              <Label className="text-xs shrink-0">Discount</Label>
              <Input {...register("discount")} type="number" placeholder="0" className="w-28 text-xs h-8" />
              <Controller control={control} name="discountType" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed ({s})</SelectItem>
                    <SelectItem value="PERCENT">Percent (%)</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* ── Bank Details ── */}
        <Card>
          <CardContent className="p-5">
            <SectionHead icon={<Banknote className="h-4 w-4" />} title="Bank Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Bank Name</Label>
                <Input {...register("bankName")} placeholder="State Bank of India" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Name</Label>
                <Input {...register("bankAccountName")} placeholder="Account holder name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Number</Label>
                <Input {...register("bankAccount")} placeholder="1234567890" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">IFSC Code</Label>
                <Input {...register("bankIfsc")} placeholder="SBIN0001234" className="font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Signature ── */}
        <Card>
          <CardContent className="p-5">
            <SectionHead icon={<FileText className="h-4 w-4" />} title="Signature & Notes" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs mb-2 block">Signature</Label>
                {watched.signatureUrl ? (
                  <div className="relative h-24 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    <img src={watched.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                    <button type="button" className="absolute top-1 right-1 p-0.5 bg-background/80 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => setValue("signatureUrl", "")}><XIcon className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <div className="h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    onClick={() => sigRef.current?.click()}>
                    {sigUploading
                      ? <UploadCloud className="h-5 w-5 text-primary animate-bounce" />
                      : <><UploadCloud className="h-5 w-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Upload Signature</span></>}
                  </div>
                )}
                <input ref={sigRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, setSigUploading, "signatureUrl"); }} />
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Terms & Conditions</Label>
                  <Textarea {...register("termsAndConditions")} placeholder="Payment due within 30 days…" className="text-xs resize-none h-20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea {...register("notes")} placeholder="Thank you for your business!" className="text-xs resize-none h-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-6">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={saving} className="gap-1.5 min-w-32">
            <FileText className="h-4 w-4" /> {saving ? "Saving…" : editData ? "Update Invoice" : "Create Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice List ───────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editInvoiceState, setEditInvoice] = useState<Record<string, unknown> | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: invoices, isLoading } = useListInvoices();
  const { data: summary, isLoading: summaryLoading } = useGetFinancialSummary();

  const editInvoice = editInvoiceState ? (invoices ?? []).find(inv => inv.id === editInvoiceState.id) as any || editInvoiceState : null;

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/invoices/${id}`, { method: "PATCH", headers: authHeaders(true), body: JSON.stringify({ status }) });
      qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
    } catch { toast.error("Failed to update"); }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await fetch(`/api/invoices/${id}`, { method: "DELETE", headers: authHeaders() });
      toast.success("Invoice deleted");
      qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
    } catch { toast.error("Failed to delete"); }
  };

  if (builderOpen) {
    return <InvoiceBuilder
      onBack={() => { setBuilderOpen(false); setEditInvoice(null); }}
      editData={editInvoice}
    />;
  }

  const filtered = (invoices ?? []).filter(inv => statusFilter === "ALL" || inv.status === statusFilter);

  return (
    <div className="p-6 animated-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{invoices?.length ?? 0} total invoices</p>
        </div>
        <Button onClick={() => { setEditInvoice(null); setBuilderOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (
          <>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</p>
              <p className="text-xl font-bold mt-1">₹{((summary?.totalRevenue ?? 0) / 100000).toFixed(1)}L</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding</p>
              <p className="text-xl font-bold mt-1 text-amber-600">₹{((summary?.outstanding ?? 0) / 100000).toFixed(1)}L</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Overdue</p>
              <p className="text-xl font-bold mt-1 text-destructive">₹{((summary?.overdue ?? 0) / 100000).toFixed(1)}L</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Paid / Total</p>
              <p className="text-xl font-bold mt-1">{summary?.paidCount ?? 0} / {summary?.invoiceCount ?? 0}</p>
            </CardContent></Card>
          </>
        )}
      </div>

      <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? "ALL")}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No invoices found</p>
          <p className="text-sm mt-1">Click "New Invoice" to create your first GST invoice</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Invoice #</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Due</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(inv => {
                const sc = STATUS_CONFIG[inv.status ?? "DRAFT"] ?? STATUS_CONFIG.DRAFT;
                const currSym = sym(inv.currency ?? "INR");
                return (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => { setEditInvoice(inv as unknown as Record<string, unknown>); setBuilderOpen(true); }}>
                    <td className="px-4 py-3 font-medium font-mono text-xs">{inv.number}</td>
                    <td className="px-4 py-3">{inv.clientName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd MMM yy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {inv.dueDate ? format(new Date(inv.dueDate), "dd MMM yy") : "—"}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Select value={inv.status ?? "DRAFT"} onValueChange={v => { if (v) updateStatus(inv.id, v); }}>
                        <SelectTrigger className="h-7 text-xs w-32 border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <Badge variant={sc.variant} className={cn("text-xs cursor-pointer", sc.className)}>{sc.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold font-mono text-sm">
                      {currSym}{(inv.total ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          title="Download PDF"
                          onClick={() => {
                            openPrintWindow(
                              buildInvoiceHtml(inv as unknown as InvoiceData),
                              `Invoice-${inv.number ?? "draft"}`
                            );
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteInvoice(inv.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
