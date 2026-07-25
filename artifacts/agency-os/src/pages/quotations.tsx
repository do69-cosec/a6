import { useState } from "react";
import {
  useListQuotations, useCreateQuotation, useUpdateQuotation, useDeleteQuotation,
  useConvertQuotationToInvoice, useListClients, getListQuotationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { WriteWithAI } from "@/components/common/WriteWithAI";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import {
  Plus, Trash2, FileText, ArrowRight, ChevronLeft, Save,
  Building2, User, Package, Calculator, StickyNote, PenLine, Download,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { openPrintWindow, buildQuotationHtml, type QuotationData } from "@/lib/pdf-print";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: "Draft",    className: "bg-slate-100 text-slate-600" },
  SENT:     { label: "Sent",     className: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Rejected", className: "bg-rose-100 text-rose-700" },
  EXPIRED:  { label: "Expired",  className: "bg-orange-100 text-orange-700" },
};

const GST_RATES = [0, 5, 12, 18, 28];

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "INR (₹)" },
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "GBP", symbol: "£", label: "GBP (£)" },
];

function getCurrencySymbol(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "₹";
}

function numberToWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return "zero rupees only";
  const a = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen"];
  const b = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function inWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "") + " ";
    if (n < 1000) return a[Math.floor(n / 100)] + " hundred " + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + "thousand " + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + "lakh " + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + "crore " + inWords(n % 10000000);
  }
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = inWords(rupees).trim();
  result += rupees === 1 ? " rupee" : " rupees";
  if (paise > 0) result += " and " + inWords(paise).trim() + " paise";
  return result + " only";
}

interface LineItemForm {
  itemName: string;
  description: string;
  hsnSac: string;
  taxPercent: number;
  qty: number;
  unitPrice: number;
}

interface QuotationForm {
  number: string;
  quotationDate: string;
  validUntil: string;
  currency: string;
  status: string;
  companyName: string;
  companyPhone: string;
  companyGstin: string;
  companyAddress: string;
  companyCity: string;
  companyPostal: string;
  companyState: string;
  companyEmail: string;
  companyPan: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientGstin: string;
  clientAddress: string;
  clientCity: string;
  clientPostal: string;
  clientState: string;
  clientEmail: string;
  clientPan: string;
  shippingAddress: string;
  lineItems: LineItemForm[];
  discount: number;
  discountType: string;
  notes: string;
  termsAndConditions: string;
  signatureText: string;
}

function defaultForm(): QuotationForm {
  return {
    number: "",
    quotationDate: format(new Date(), "yyyy-MM-dd"),
    validUntil: "",
    currency: "INR",
    status: "DRAFT",
    companyName: "", companyPhone: "", companyGstin: "",
    companyAddress: "", companyCity: "", companyPostal: "",
    companyState: "", companyEmail: "", companyPan: "",
    clientId: "", clientName: "", clientPhone: "", clientGstin: "",
    clientAddress: "", clientCity: "", clientPostal: "",
    clientState: "", clientEmail: "", clientPan: "",
    shippingAddress: "",
    lineItems: [{ itemName: "", description: "", hsnSac: "", taxPercent: 18, qty: 1, unitPrice: 0 }],
    discount: 0, discountType: "AMOUNT",
    notes: "", termsAndConditions: "", signatureText: "",
  };
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={cn("grid gap-3", cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3")}>
      {children}
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={cn("space-y-1.5", span === 2 && "col-span-2", span === 3 && "col-span-3", span === 4 && "col-span-4")}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

type QuotationRow = {
  id: string;
  number?: string | null;
  clientName?: string | null;
  status?: string | null;
  quotationDate?: string | null;
  validUntil?: string | null;
  total?: number | null;
  createdAt?: string | null;
  [key: string]: unknown;
};

function QuotationEditor({
  existing,
  onBack,
  onSaved,
}: {
  existing?: QuotationRow;
  onBack: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const { data: clients } = useListClients();
  const [showShipping, setShowShipping] = useState(!!(existing?.shippingAddress as string));

  const createMutation = useCreateQuotation({
    mutation: {
      onSuccess: () => {
        toast.success("Quotation created");
        qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
        onSaved();
      },
      onError: () => toast.error("Failed to save quotation"),
    },
  });

  const updateMutation = useUpdateQuotation({
    mutation: {
      onSuccess: () => {
        toast.success("Quotation saved");
        qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
        onSaved();
      },
      onError: () => toast.error("Failed to save quotation"),
    },
  });

  const isEditing = !!existing;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { register, handleSubmit, control, watch, setValue } = useForm<QuotationForm>({
    defaultValues: existing
      ? {
          number: (existing.number as string) ?? "",
          quotationDate: (existing.quotationDate as string) ?? format(new Date(), "yyyy-MM-dd"),
          validUntil: (existing.validUntil as string) ?? "",
          currency: (existing.currency as string) ?? "INR",
          status: (existing.status as string) ?? "DRAFT",
          companyName: (existing.companyName as string) ?? "",
          companyPhone: (existing.companyPhone as string) ?? "",
          companyGstin: (existing.companyGstin as string) ?? "",
          companyAddress: (existing.companyAddress as string) ?? "",
          companyCity: (existing.companyCity as string) ?? "",
          companyPostal: (existing.companyPostal as string) ?? "",
          companyState: (existing.companyState as string) ?? "",
          companyEmail: (existing.companyEmail as string) ?? "",
          companyPan: (existing.companyPan as string) ?? "",
          clientId: (existing.clientId as string) ?? "",
          clientName: (existing.clientName as string) ?? "",
          clientPhone: (existing.clientPhone as string) ?? "",
          clientGstin: (existing.clientGstin as string) ?? "",
          clientAddress: (existing.clientAddress as string) ?? "",
          clientCity: (existing.clientCity as string) ?? "",
          clientPostal: (existing.clientPostal as string) ?? "",
          clientState: (existing.clientState as string) ?? "",
          clientEmail: (existing.clientEmail as string) ?? "",
          clientPan: (existing.clientPan as string) ?? "",
          shippingAddress: (existing.shippingAddress as string) ?? "",
          lineItems: ((existing.lineItems as LineItemForm[]) ?? [{ itemName: "", description: "", hsnSac: "", taxPercent: 18, qty: 1, unitPrice: 0 }]),
          discount: (existing.discount as number) ?? 0,
          discountType: (existing.discountType as string) ?? "AMOUNT",
          notes: (existing.notes as string) ?? "",
          termsAndConditions: (existing.termsAndConditions as string) ?? "",
          signatureText: (existing.signatureText as string) ?? "",
        }
      : defaultForm(),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const watchedItems = watch("lineItems");
  const watchedDiscount = watch("discount");
  const watchedDiscountType = watch("discountType");
  const watchedCurrency = watch("currency");
  const symbol = getCurrencySymbol(watchedCurrency);

  const itemTotals = (watchedItems ?? []).map((item) => {
    const amount = Number(item.qty || 0) * Number(item.unitPrice || 0);
    const taxRate = Number(item.taxPercent || 0);
    const cgst = (amount * taxRate) / 2 / 100;
    const sgst = (amount * taxRate) / 2 / 100;
    return { amount, cgst, sgst, total: amount + cgst + sgst };
  });

  const subtotal = itemTotals.reduce((s, i) => s + i.amount, 0);
  const totalCgst = itemTotals.reduce((s, i) => s + i.cgst, 0);
  const totalSgst = itemTotals.reduce((s, i) => s + i.sgst, 0);
  const taxAmount = totalCgst + totalSgst;
  const preDiscount = subtotal + taxAmount;
  const discountAmt =
    watchedDiscountType === "PERCENT"
      ? (preDiscount * Number(watchedDiscount || 0)) / 100
      : Number(watchedDiscount || 0);
  const grandTotal = Math.max(0, preDiscount - discountAmt);

  const onSubmit = (data: QuotationForm) => {
    const payload = {
      ...data,
      clientId: data.clientId || undefined,
      subtotal,
      taxAmount,
      total: grandTotal,
    } as any;
    if (isEditing) {
      updateMutation.mutate({ id: existing!.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-semibold">{isEditing ? `Edit ${existing?.number ?? "Quotation"}` : "New Quotation"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Controller control={control} name="status" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
          <Button size="sm" className="gap-1.5" onClick={handleSubmit(onSubmit)} disabled={isPending}>
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Saving…" : "Save & Continue"}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-5">
        <WriteWithAI
          context="quotation"
          onFill={(fields) => {
            if (fields.clientName) setValue("clientName", fields.clientName, { shouldDirty: true });
            if (fields.clientEmail) setValue("clientEmail", fields.clientEmail, { shouldDirty: true });
            if (fields.clientPhone) setValue("clientPhone", fields.clientPhone, { shouldDirty: true });
            if (fields.currency) setValue("currency", fields.currency, { shouldDirty: true });
            if (fields.notes) setValue("notes", fields.notes, { shouldDirty: true });
            if (fields.termsAndConditions) setValue("termsAndConditions", fields.termsAndConditions, { shouldDirty: true });
            if (Array.isArray(fields.lineItems) && fields.lineItems.length > 0) {
              setValue("lineItems", fields.lineItems, { shouldDirty: true });
            }
          }}
        />
        <SectionCard icon={<FileText className="h-4 w-4" />} title="Quotation Details">
          <FieldGrid cols={4}>
            <Field label="Quotation No">
              <Input {...register("number")} placeholder="QT-00001" className="text-sm" />
            </Field>
            <Field label="Quotation Date *">
              <Input {...register("quotationDate")} type="date" className="text-sm" />
            </Field>
            <Field label="Valid Until">
              <Input {...register("validUntil")} type="date" className="text-sm" />
            </Field>
            <Field label="Currency *">
              <Controller control={control} name="currency" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>
          </FieldGrid>
        </SectionCard>

        <div className="grid grid-cols-2 gap-5">
          <SectionCard icon={<Building2 className="h-4 w-4" />} title="Your Details">
            <div className="space-y-3">
              <Field label="Your Business Name *">
                <Input {...register("companyName")} placeholder="Blink Beyond Agency" className="text-sm" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <Input {...register("companyPhone")} placeholder="+91 98765 43210" className="text-sm" />
                </Field>
                <Field label="GSTIN">
                  <Input {...register("companyGstin")} placeholder="22AAAAA0000A1Z5" className="text-sm" />
                </Field>
              </div>
              <Field label="Address">
                <Input {...register("companyAddress")} placeholder="Street address" className="text-sm" />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="City">
                  <Input {...register("companyCity")} placeholder="City" className="text-sm" />
                </Field>
                <Field label="Postal Code">
                  <Input {...register("companyPostal")} placeholder="400001" className="text-sm" />
                </Field>
                <Field label="State">
                  <Input {...register("companyState")} placeholder="Maharashtra" className="text-sm" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <Input {...register("companyEmail")} placeholder="you@company.com" className="text-sm" />
                </Field>
                <Field label="PAN">
                  <Input {...register("companyPan")} placeholder="AAAAA0000A" className="text-sm" />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<User className="h-4 w-4" />} title="Client's Details">
            <div className="space-y-3">
              <Field label="Select Existing Client">
                <Controller control={control} name="clientId" render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => {
                      field.onChange(v);
                      const cl = (clients ?? []).find((c) => c.id === v);
                      if (cl) {
                        setValue("clientName", cl.companyName ?? "");
                        setValue("clientEmail", (cl as any).email ?? "");
                        setValue("clientPhone", (cl as any).phone ?? "");
                        setValue("clientGstin", (cl as any).gstin ?? "");
                      }
                    }}
                  >
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Choose a client (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </Field>
              <Field label="Client's Business Name *">
                <Input {...register("clientName")} placeholder="Client Company Ltd." className="text-sm" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <Input {...register("clientPhone")} placeholder="+91 98765 43210" className="text-sm" />
                </Field>
                <Field label="GSTIN">
                  <Input {...register("clientGstin")} placeholder="22AAAAA0000A1Z5" className="text-sm" />
                </Field>
              </div>
              <Field label="Address">
                <Input {...register("clientAddress")} placeholder="Street address" className="text-sm" />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="City">
                  <Input {...register("clientCity")} placeholder="City" className="text-sm" />
                </Field>
                <Field label="Postal Code">
                  <Input {...register("clientPostal")} placeholder="400001" className="text-sm" />
                </Field>
                <Field label="State">
                  <Input {...register("clientState")} placeholder="Maharashtra" className="text-sm" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <Input {...register("clientEmail")} placeholder="client@company.com" className="text-sm" />
                </Field>
                <Field label="PAN">
                  <Input {...register("clientPan")} placeholder="AAAAA0000A" className="text-sm" />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        {showShipping ? (
          <SectionCard icon={<Package className="h-4 w-4" />} title="Shipping Details">
            <div className="space-y-2">
              <Field label="Shipping Address" span={3}>
                <Textarea {...register("shippingAddress")} placeholder="Enter shipping address…" rows={3} className="text-sm resize-none" />
              </Field>
              <button type="button" onClick={() => setShowShipping(false)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                Remove shipping details
              </button>
            </div>
          </SectionCard>
        ) : (
          <button
            type="button"
            onClick={() => setShowShipping(true)}
            className="text-xs text-primary underline-offset-2 hover:underline font-medium"
          >
            + Add Shipping Details
          </button>
        )}

        <SectionCard icon={<Package className="h-4 w-4" />} title="Items">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 pr-2 font-semibold text-muted-foreground w-[22%]">Item</th>
                  <th className="text-left pb-2 pr-2 font-semibold text-muted-foreground w-[12%]">HSN/SAC</th>
                  <th className="text-left pb-2 pr-2 font-semibold text-muted-foreground w-[10%]">GST %</th>
                  <th className="text-right pb-2 pr-2 font-semibold text-muted-foreground w-[8%]">Qty</th>
                  <th className="text-right pb-2 pr-2 font-semibold text-muted-foreground w-[10%]">Rate</th>
                  <th className="text-right pb-2 pr-2 font-semibold text-muted-foreground w-[10%]">Amount</th>
                  <th className="text-right pb-2 pr-2 font-semibold text-muted-foreground w-[8%]">CGST</th>
                  <th className="text-right pb-2 pr-2 font-semibold text-muted-foreground w-[8%]">SGST</th>
                  <th className="text-right pb-2 pr-2 font-semibold text-muted-foreground w-[10%]">Total</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {fields.map((field, idx) => {
                  const t = itemTotals[idx] ?? { amount: 0, cgst: 0, sgst: 0, total: 0 };
                  return (
                    <tr key={field.id} className="group">
                      <td className="py-2 pr-2">
                        <Input
                          {...register(`lineItems.${idx}.itemName`)}
                          placeholder="Item name"
                          className="text-xs h-8"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          {...register(`lineItems.${idx}.hsnSac`)}
                          placeholder="9983"
                          className="text-xs h-8"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Controller
                          control={control}
                          name={`lineItems.${idx}.taxPercent`}
                          render={({ field: f }) => (
                            <Select value={String(f.value)} onValueChange={(v) => f.onChange(Number(v))}>
                              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GST_RATES.map((r) => (
                                  <SelectItem key={r} value={String(r)} className="text-xs">{r}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          {...register(`lineItems.${idx}.qty`, { valueAsNumber: true })}
                          type="number"
                          min={1}
                          className="text-xs h-8 text-right"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          {...register(`lineItems.${idx}.unitPrice`, { valueAsNumber: true })}
                          type="number"
                          min={0}
                          step="0.01"
                          className="text-xs h-8 text-right"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right text-muted-foreground">
                        {symbol}{t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 pr-2 text-right text-muted-foreground">
                        {symbol}{t.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 pr-2 text-right text-muted-foreground">
                        {symbol}{t.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 pr-2 text-right font-semibold">
                        {symbol}{t.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5 text-xs"
            onClick={() => append({ itemName: "", description: "", hsnSac: "", taxPercent: 18, qty: 1, unitPrice: 0 })}
          >
            <Plus className="h-3 w-3" /> Add New Line
          </Button>
        </SectionCard>

        <SectionCard icon={<Calculator className="h-4 w-4" />} title="Summary">
          <div className="max-w-sm ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span>{symbol}{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">CGST</span>
              <span>{symbol}{totalCgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SGST</span>
              <span>{symbol}{totalSgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Discount</span>
                <div className="flex items-center gap-1">
                  <Input
                    {...register("discount", { valueAsNumber: true })}
                    type="number"
                    min={0}
                    step="0.01"
                    className="text-xs h-7 w-20"
                  />
                  <Controller control={control} name="discountType" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-xs h-7 w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AMOUNT" className="text-xs">Flat</SelectItem>
                        <SelectItem value="PERCENT" className="text-xs">%</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <span className="text-destructive">
                -{symbol}{discountAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total ({watchedCurrency})</span>
              <span>{symbol}{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground italic capitalize">
              {numberToWords(grandTotal)}
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<StickyNote className="h-4 w-4" />} title="Notes & Terms">
          <div className="space-y-4">
            <Field label="Notes">
              <Textarea
                {...register("notes")}
                placeholder="Any additional notes for the client…"
                rows={3}
                className="text-sm resize-none"
              />
            </Field>
            <Field label="Terms & Conditions">
              <Textarea
                {...register("termsAndConditions")}
                placeholder="Payment terms, delivery details, validity period…"
                rows={4}
                className="text-sm resize-none"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={<PenLine className="h-4 w-4" />} title="Signature">
          <Field label="Authorised Signatory Name">
            <Input {...register("signatureText")} placeholder="e.g. Director, Blink Beyond Agency" className="text-sm max-w-xs" />
          </Field>
        </SectionCard>

        <div className="flex justify-end pb-8">
          <Button size="lg" className="gap-2 px-8" onClick={handleSubmit(onSubmit)} disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? "Saving…" : "Save & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function QuotationsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingRowState, setEditingRow] = useState<QuotationRow | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: quotations, isLoading } = useListQuotations();

  const editingRow = editingRowState ? (quotations ?? []).find(q => q.id === editingRowState.id) as any || editingRowState : undefined;

  const deleteMutation = useDeleteQuotation({
    mutation: {
      onSuccess: () => {
        toast.success("Quotation deleted");
        qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
      },
    },
  });

  const updateMutation = useUpdateQuotation({
    mutation: {
      onSuccess: () => {
        toast.success("Status updated");
        qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
      },
    },
  });

  const convertMutation = useConvertQuotationToInvoice({
    mutation: {
      onSuccess: () => {
        toast.success("Converted to invoice!");
        qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
      },
      onError: () => toast.error("Conversion failed"),
    },
  });

  if (view === "editor") {
    return (
      <QuotationEditor
        existing={editingRow}
        onBack={() => { setView("list"); setEditingRow(undefined); }}
        onSaved={() => { setView("list"); setEditingRow(undefined); }}
      />
    );
  }

  const filtered = (quotations ?? []).filter(
    (q) => statusFilter === "ALL" || q.status === statusFilter
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Quotations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{quotations?.length ?? 0} quotations</p>
        </div>
        <Button
          onClick={() => { setEditingRow(undefined); setView("editor"); }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> New Quotation
        </Button>
      </div>

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No quotations yet</p>
          <p className="text-sm mt-1">Click "New Quotation" to create your first one</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Quotation #</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Valid Until</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((q) => {
                const sc = STATUS_CONFIG[q.status ?? "DRAFT"] ?? STATUS_CONFIG.DRAFT;
                const row = q as QuotationRow;
                return (
                  <tr
                    key={q.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => { setEditingRow(row); setView("editor"); }}
                  >
                    <td className="px-4 py-3 font-medium font-mono text-xs">{q.number ?? "—"}</td>
                    <td className="px-4 py-3">{q.clientName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {q.createdAt ? format(new Date(q.createdAt), "dd MMM yy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {q.validUntil ? format(new Date(q.validUntil), "dd MMM yy") : "—"}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={q.status ?? "DRAFT"}
                        onValueChange={(v) => {
                          if (v) updateMutation.mutate({ id: q.id, data: { status: v } as any });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-32 border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <Badge variant="secondary" className={cn("text-xs cursor-pointer", sc.className)}>
                            {sc.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ₹{(q.total ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        {q.status === "APPROVED" && (
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => convertMutation.mutate({ id: q.id })}
                            disabled={convertMutation.isPending}
                          >
                            <ArrowRight className="h-3 w-3" /> Invoice
                          </Button>
                        )}
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          title="Download PDF"
                          onClick={() => {
                            openPrintWindow(
                              buildQuotationHtml(row as unknown as QuotationData),
                              `Quotation-${q.number ?? "draft"}`
                            );
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: q.id })}
                        >
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
