"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Download,
  Save,
  FileText,
  Building2,
  CalendarDays,
  IndianRupee,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { createFullInvoice } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  gstRate: number;
};

type ClientInfo = {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  gstin?: string | null;
};

type AgencyInfo = {
  companyName: string;
  gstNumber?: string | null;
  defaultGstRate: number;
};

const CURRENCIES: { value: string; label: string; symbol: string }[] = [
  { value: "INR", label: "INR (₹)", symbol: "₹" },
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "AED", label: "AED (د.إ)", symbol: "د.إ" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function InvoiceMaker({
  clients,
  agency,
}: {
  clients: ClientInfo[];
  agency: AgencyInfo;
}) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState(
    "1. Payment is due within 15 days of invoice date.\n2. Please quote the invoice number for wire payments.\n3. This is a computer-generated invoice."
  );
  const [discount, setDiscount] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: generateId(),
      description: "",
      quantity: 1,
      rate: 0,
      gstRate: agency.defaultGstRate,
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const currencyObj = CURRENCIES.find((c) => c.value === currency)!;

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: generateId(),
        description: "",
        quantity: 1,
        rate: 0,
        gstRate: agency.defaultGstRate,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateLineItem = (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Calculations
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );
  const totalGst = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.rate * item.gstRate) / 100,
    0
  );
  const grandTotal = subtotal - discount + totalGst;

  const formatAmount = useCallback(
    (amount: number) => {
      if (currency === "INR")
        return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return `${currencyObj.symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    [currency, currencyObj]
  );

  const handleSave = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }
    if (lineItems.some((item) => !item.description.trim())) {
      toast.error("All line items need a description");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createFullInvoice({
        clientId: selectedClientId,
        currency: currency as "INR" | "USD" | "AED" | "GBP",
        gstRate: agency.defaultGstRate,
        dueDate: dueDate || undefined,
        discount,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
        })),
      });
      if (res.ok) {
        toast.success("Invoice saved successfully!");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const clientName = selectedClient?.companyName || "—";
    const clientEmail = selectedClient?.email || "—";
    const clientAddress = selectedClient?.billingAddress || "—";
    const clientGstin = selectedClient?.gstin;

    const lineItemsHtml = lineItems
      .map(
        (item, idx) => `
      <tr>
        <td style="padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${idx + 1}</td>
        <td style="padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${item.description || "—"}</td>
        <td style="padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: right;">${item.quantity}</td>
        <td style="padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: right;">${formatAmount(item.rate)}</td>
        <td style="padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: right;">${item.gstRate}%</td>
        <td style="padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: right; font-weight: 600;">${formatAmount(item.quantity * item.rate)}</td>
      </tr>
    `
      )
      .join("");

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; background: #fff; padding: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; margin-bottom: 32px; border-bottom: 3px solid #6366f1; }
        .brand h1 { font-size: 28px; font-weight: 900; color: #4f46e5; letter-spacing: -0.03em; }
        .brand p { font-size: 12px; color: #64748b; margin-top: 4px; }
        .inv-title { font-size: 36px; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; }
        .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.08em; margin-bottom: 8px; }
        .value { font-size: 14px; color: #334155; margin: 3px 0; }
        .value strong { color: #0f172a; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 11px; color: #94a3b8; letter-spacing: 0.06em; padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: left; }
        .summary { display: flex; justify-content: flex-end; margin-bottom: 32px; }
        .summary-table { width: 300px; }
        .summary-table td { padding: 8px 16px; font-size: 14px; color: #334155; }
        .summary-table .total td { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 12px; }
        .notes { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; white-space: pre-wrap; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body>
      <div class="container">
        <div class="header">
          <div class="brand">
            <h1>${agency.companyName.toUpperCase()}</h1>
            <p>Creative & Tech Agency</p>
            ${agency.gstNumber ? `<p style="margin-top:6px; font-size:12px; color:#475569;">GSTIN: <strong>${agency.gstNumber}</strong></p>` : ""}
          </div>
          <div style="text-align:right;">
            <div class="inv-title">INVOICE</div>
            <p style="font-size:13px; color:#64748b; margin-top:4px;">Date: ${invoiceDate}</p>
            ${dueDate ? `<p style="font-size:13px; color:#64748b;">Due: ${dueDate}</p>` : ""}
          </div>
        </div>
        <div class="grid">
          <div>
            <div class="label">Billed To</div>
            <p class="value"><strong>${clientName}</strong></p>
            <p class="value">${clientEmail}</p>
            <p class="value">${clientAddress}</p>
            ${clientGstin ? `<p class="value">GSTIN: <strong>${clientGstin}</strong></p>` : ""}
          </div>
          <div style="text-align:right;">
            <div class="label">Currency</div>
            <p class="value"><strong>${currency}</strong></p>
          </div>
        </div>
        <table>
          <thead><tr>
            <th style="width:40px;">#</th><th>Description</th>
            <th style="text-align:right; width:60px;">Qty</th>
            <th style="text-align:right; width:100px;">Rate</th>
            <th style="text-align:right; width:60px;">Tax</th>
            <th style="text-align:right; width:120px;">Amount</th>
          </tr></thead>
          <tbody>${lineItemsHtml}</tbody>
        </table>
        <div class="summary"><table class="summary-table">
          <tr><td>Subtotal</td><td style="text-align:right;">${formatAmount(subtotal)}</td></tr>
          ${discount > 0 ? `<tr><td>Discount</td><td style="text-align:right; color:#ef4444;">-${formatAmount(discount)}</td></tr>` : ""}
          <tr><td>Tax (GST)</td><td style="text-align:right;">${formatAmount(totalGst)}</td></tr>
          <tr class="total"><td>Grand Total</td><td style="text-align:right;">${formatAmount(grandTotal)}</td></tr>
        </table></div>
        ${notes ? `<div class="notes"><strong style="color:#475569;">Terms & Conditions</strong><br><br>${notes}</div>` : ""}
      </div>
      <script>window.onload=function(){window.print();window.close();}<\/script>
    </body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Invoice Maker
            </h1>
            <p className="text-sm text-muted-foreground">
              Create professional invoices with live preview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 gap-1.5"
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0"
          >
            <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Form */}
        <div className="space-y-5">
          {/* Client & Currency */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-4 w-4 text-indigo-500" /> Client Details
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Select Client
                </Label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border/60 bg-background px-3 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                >
                  <option value="">Choose a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>
              {selectedClient && (
                <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-0.5 border border-border/30">
                  <p className="font-medium text-foreground">
                    {selectedClient.companyName}
                  </p>
                  {selectedClient.email && <p>{selectedClient.email}</p>}
                  {selectedClient.billingAddress && (
                    <p>{selectedClient.billingAddress}</p>
                  )}
                  {selectedClient.gstin && (
                    <p>GSTIN: {selectedClient.gstin}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates & Currency */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarDays className="h-4 w-4 text-violet-500" /> Invoice Info
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Invoice Date
                  </Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Due Date
                  </Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Currency
                </Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border/60 bg-background px-3 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-emerald-500" /> Line Items
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-muted/20 rounded-lg p-3 border border-border/30 space-y-2.5 group relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                        #{idx + 1}
                      </span>
                      {lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Service description..."
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, "description", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">
                          Qty
                        </Label>
                        <Input
                          type="number"
                          min={0.01}
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">
                          Rate
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={item.rate}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "rate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">
                          GST %
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.gstRate}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "gstRate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-foreground">
                      {formatAmount(item.quantity * item.rate)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Discount & Notes */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {currency === "INR" ? (
                  <IndianRupee className="h-4 w-4 text-amber-500" />
                ) : (
                  <DollarSign className="h-4 w-4 text-amber-500" />
                )}
                Totals & Notes
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Discount
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(parseFloat(e.target.value) || 0)
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Terms & Notes
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="border-border/50 shadow-lg overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
            <CardContent className="p-6 space-y-5">
              {/* Preview header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                    {agency.companyName.toUpperCase()}
                  </h2>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mt-0.5">
                    Creative & Tech Agency
                  </p>
                  {agency.gstNumber && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      GSTIN: {agency.gstNumber}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-3xl font-black tracking-tighter text-foreground">
                    INVOICE
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Date: {invoiceDate}
                  </p>
                  {dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Due: {dueDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-border/30" />

              {/* Billed to */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-1.5">
                    Billed To
                  </p>
                  {selectedClient ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">
                        {selectedClient.companyName}
                      </p>
                      {selectedClient.email && (
                        <p className="text-xs text-muted-foreground">
                          {selectedClient.email}
                        </p>
                      )}
                      {selectedClient.billingAddress && (
                        <p className="text-xs text-muted-foreground">
                          {selectedClient.billingAddress}
                        </p>
                      )}
                      {selectedClient.gstin && (
                        <p className="text-xs text-muted-foreground">
                          GSTIN: {selectedClient.gstin}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Select a client...
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-1.5">
                    Currency
                  </p>
                  <p className="text-sm font-bold">{currency}</p>
                </div>
              </div>

              {/* Line items table */}
              <div className="rounded-lg border border-border/30 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-left py-2.5 px-3 font-bold text-muted-foreground/70 uppercase tracking-wider text-[10px]">
                        #
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-muted-foreground/70 uppercase tracking-wider text-[10px]">
                        Description
                      </th>
                      <th className="text-right py-2.5 px-3 font-bold text-muted-foreground/70 uppercase tracking-wider text-[10px]">
                        Qty
                      </th>
                      <th className="text-right py-2.5 px-3 font-bold text-muted-foreground/70 uppercase tracking-wider text-[10px]">
                        Rate
                      </th>
                      <th className="text-right py-2.5 px-3 font-bold text-muted-foreground/70 uppercase tracking-wider text-[10px]">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-t border-border/20"
                      >
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-foreground font-medium">
                          {item.description || (
                            <span className="italic text-muted-foreground/50">
                              No description
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">
                          {formatAmount(item.rate)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                          {formatAmount(item.quantity * item.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-56 space-y-1.5 text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatAmount(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium text-red-500">
                        -{formatAmount(discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Tax (GST)</span>
                    <span className="font-medium">{formatAmount(totalGst)}</span>
                  </div>
                  <div className="border-t border-border/40" />
                  <div className="flex justify-between py-2">
                    <span className="font-black text-sm">Grand Total</span>
                    <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                      {formatAmount(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes preview */}
              {notes && (
                <>
                  <div className="border-t border-border/30" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-1.5">
                      Terms & Conditions
                    </p>
                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
