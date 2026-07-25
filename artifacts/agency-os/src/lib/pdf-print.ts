/**
 * PDF Print Utility
 * Opens a styled A4 print window and triggers the browser's Save as PDF dialog.
 */

// ─── HTML Safety Helpers ──────────────────────────────────────────────────────

/** Escapes plain-text values so they are safe to embed in HTML content. */
function esc(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Sanitises rich HTML (from TiptapEditor) by stripping script tags, event
 * handlers, and javascript: hrefs — while preserving structural formatting.
 */
function sanitizeRichHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>/gi, "")
    .replace(/\bon\w+\s*=/gi, "data-removed=")
    .replace(/href\s*=\s*["']?\s*javascript:[^"'>]*/gi, 'href="#"');
}

export function openPrintWindow(htmlContent: string, title = "Document") {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow popups for this site to download PDFs.");
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${esc(title)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; }
        @page { size: A4; margin: 18mm 16mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .page { max-width: 794px; margin: 0 auto; padding: 40px 36px; background: #fff; min-height: 1123px; }
        h1,h2,h3,h4 { font-weight: 700; }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 7px 10px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-muted { color: #6b7280; }
        .font-mono { font-family: 'Courier New', monospace; }
        .font-bold { font-weight: 700; }
        .border-bottom { border-bottom: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function() { window.print(); };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

// ─── Currency Helpers ─────────────────────────────────────────────────────────

const CURRENCY_SYM: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
export const sym = (c?: string | null) => CURRENCY_SYM[c ?? "INR"] ?? "₹";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Number to Words (for invoice total) ─────────────────────────────────────

const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
  "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

function twoDigit(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  return (TENS[Math.floor(n/10)] + (n%10 ? " "+ONES[n%10] : "")).trim();
}
function threeDigit(n: number): string {
  if (n < 100) return twoDigit(n);
  return ONES[Math.floor(n/100)] + " Hundred" + (n%100 ? " "+twoDigit(n%100) : "");
}
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  const lakh  = Math.floor((n % 10000000) / 100000);
  const thou  = Math.floor((n % 100000) / 1000);
  const rem   = n % 1000;
  let r = "";
  if (crore) r += twoDigit(crore) + " Crore ";
  if (lakh)  r += twoDigit(lakh)  + " Lakh ";
  if (thou)  r += twoDigit(thou)  + " Thousand ";
  if (rem)   r += threeDigit(rem);
  return r.trim();
}

export function amountToWords(amount: number, currency = "INR"): string {
  const unit = currency === "INR" ? "Rupee" : "Dollar";
  const sub  = currency === "INR" ? "Paise" : "Cent";

  // Round to 2 decimal places first to avoid floating-point edge cases
  const rounded = Math.round(amount * 100);
  const rupees  = Math.floor(rounded / 100);
  const paise   = rounded % 100;          // always 0–99, no carry-over needed

  let r = numberToWords(rupees) + " " + unit + (rupees !== 1 ? "s" : "");
  if (paise > 0) r += " And " + numberToWords(paise) + " " + sub;
  return r + " Only";
}

// ─── Invoice PDF HTML ─────────────────────────────────────────────────────────

export interface InvoiceData {
  number?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  gstType?: string | null;
  status?: string | null;

  logoUrl?: string | null;
  businessName?: string | null;
  businessPhone?: string | null;
  companyGstin?: string | null;
  businessAddress?: string | null;
  businessCity?: string | null;
  businessPostalCode?: string | null;
  businessState?: string | null;
  businessEmail?: string | null;
  businessPan?: string | null;

  clientName?: string | null;
  clientPhone?: string | null;
  clientGstin?: string | null;
  billingAddress?: string | null;
  clientCity?: string | null;
  clientPostalCode?: string | null;
  clientState?: string | null;
  clientEmail?: string | null;
  clientPan?: string | null;

  lineItems?: Array<{ description: string; hsnSac?: string; qty: number; unitPrice: number; taxPercent: number }> | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  discount?: number | null;
  total?: number | null;

  notes?: string | null;
  termsAndConditions?: string | null;
  signatureUrl?: string | null;
  bankDetails?: { bankName?: string; accountNumber?: string; ifsc?: string; accountName?: string } | null;
}

export function buildInvoiceHtml(inv: InvoiceData): string {
  const s          = sym(inv.currency);
  const isIGST     = inv.gstType === "IGST";
  const lines      = inv.lineItems ?? [];
  const subtotal   = inv.subtotal ?? 0;
  const taxAmount  = inv.taxAmount ?? 0;
  const discount   = inv.discount ?? 0;
  const total      = inv.total ?? 0;
  const bank       = inv.bankDetails as Record<string, string> | null;

  const lineRows = lines.map((item, i) => {
    const amount   = (item.qty || 0) * (item.unitPrice || 0);
    const taxAmt   = amount * ((item.taxPercent || 0) / 100);
    const half     = taxAmt / 2;
    const taxCols  = isIGST
      ? `<td class="text-right">${s}${fmt(taxAmt)}</td>`
      : `<td class="text-right" style="color:#059669">${s}${fmt(half)}</td>
         <td class="text-right" style="color:#059669">${s}${fmt(half)}</td>`;
    return `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="color:#6b7280">${i+1}</td>
        <td>${esc(item.description)}</td>
        <td style="color:#6b7280;font-family:monospace">${esc(item.hsnSac) || "—"}</td>
        <td class="text-right">${esc(item.taxPercent)}%</td>
        <td class="text-right">${esc(item.qty)}</td>
        <td class="text-right">${s}${fmt(item.unitPrice)}</td>
        <td class="text-right">${s}${fmt(amount)}</td>
        ${taxCols}
        <td class="text-right font-bold">${s}${fmt(amount + taxAmt)}</td>
      </tr>`;
  }).join("");

  const taxHeader = isIGST
    ? `<th class="text-right">IGST</th>`
    : `<th class="text-right" style="color:#a7f3d0">CGST</th>
       <th class="text-right" style="color:#a7f3d0">SGST</th>`;

  const taxSummary = isIGST
    ? `<div style="display:flex;justify-content:space-between"><span style="color:#6b7280">IGST</span><span class="font-mono">${s}${fmt(taxAmount)}</span></div>`
    : `<div style="display:flex;justify-content:space-between"><span style="color:#059669">CGST</span><span class="font-mono">${s}${fmt(taxAmount/2)}</span></div>
       <div style="display:flex;justify-content:space-between"><span style="color:#059669">SGST</span><span class="font-mono">${s}${fmt(taxAmount/2)}</span></div>`;

  const discountRow = discount > 0
    ? `<div style="display:flex;justify-content:space-between;color:#ef4444"><span>Discount</span><span class="font-mono">- ${s}${fmt(discount)}</span></div>`
    : "";

  const bankSection = bank?.bankName || bank?.accountNumber
    ? `<div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:10px">Bank Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
          ${bank.bankName ? `<div><span style="color:#6b7280">Bank: </span>${esc(bank.bankName)}</div>` : ""}
          ${bank.accountName ? `<div><span style="color:#6b7280">Account Name: </span>${esc(bank.accountName)}</div>` : ""}
          ${bank.accountNumber ? `<div><span style="color:#6b7280">Account No: </span><span style="font-family:monospace">${esc(bank.accountNumber)}</span></div>` : ""}
          ${bank.ifsc ? `<div><span style="color:#6b7280">IFSC: </span><span style="font-family:monospace">${esc(bank.ifsc)}</span></div>` : ""}
        </div>
      </div>`
    : "";

  const signatureSection = inv.signatureUrl
    ? `<div style="margin-top:16px;text-align:right">
        <img src="${esc(inv.signatureUrl)}" style="max-height:64px;max-width:160px;object-fit:contain" />
        <div style="font-size:11px;color:#6b7280;margin-top:4px">Authorised Signature</div>
      </div>`
    : "";

  const addrLine = [inv.businessCity, inv.businessState, inv.businessPostalCode].filter(Boolean).map(esc).join(", ");
  const clientAddrLine = [inv.clientCity, inv.clientState, inv.clientPostalCode].filter(Boolean).map(esc).join(", ");

  return `
  <div class="page">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
      <div style="display:flex;align-items:center;gap:16px">
        ${inv.logoUrl ? `<img src="${esc(inv.logoUrl)}" style="height:64px;width:auto;object-fit:contain" />` : ""}
        <div>
          <div style="font-size:22px;font-weight:800;color:#1e1b4b">${esc(inv.businessName) || "Your Business"}</div>
          ${inv.businessPhone ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${esc(inv.businessPhone)}</div>` : ""}
          ${inv.businessEmail ? `<div style="font-size:12px;color:#6b7280">${esc(inv.businessEmail)}</div>` : ""}
          ${inv.businessAddress ? `<div style="font-size:12px;color:#6b7280">${esc(inv.businessAddress)}${addrLine ? ", "+addrLine : ""}</div>` : ""}
          ${inv.companyGstin ? `<div style="font-size:11px;color:#6b7280;font-family:monospace">GSTIN: ${esc(inv.companyGstin)}</div>` : ""}
          ${inv.businessPan ? `<div style="font-size:11px;color:#6b7280;font-family:monospace">PAN: ${esc(inv.businessPan)}</div>` : ""}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:800;color:#4f46e5;letter-spacing:-0.5px">INVOICE</div>
        <div style="font-size:15px;font-weight:700;font-family:monospace;color:#374151;margin-top:4px">${esc(inv.number) || "—"}</div>
        <div style="margin-top:10px;font-size:12px;color:#6b7280">
          <div><span style="font-weight:600">Date:</span> ${esc(inv.invoiceDate) || "—"}</div>
          ${inv.dueDate ? `<div><span style="font-weight:600">Due:</span> ${esc(inv.dueDate)}</div>` : ""}
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div style="border-top:2px solid #4f46e5;margin-bottom:20px"></div>

    <!-- Bill To -->
    <div style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;padding:16px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#4f46e5;margin-bottom:8px">Bill To</div>
      <div style="font-size:14px;font-weight:700">${esc(inv.clientName) || "—"}</div>
      ${inv.billingAddress ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${esc(inv.billingAddress)}${clientAddrLine ? ", "+clientAddrLine : ""}</div>` : ""}
      ${inv.clientPhone ? `<div style="font-size:12px;color:#6b7280">Ph: ${esc(inv.clientPhone)}</div>` : ""}
      ${inv.clientEmail ? `<div style="font-size:12px;color:#6b7280">${esc(inv.clientEmail)}</div>` : ""}
      ${inv.clientGstin ? `<div style="font-size:11px;font-family:monospace;color:#6b7280">GSTIN: ${esc(inv.clientGstin)}</div>` : ""}
      ${inv.clientPan ? `<div style="font-size:11px;font-family:monospace;color:#6b7280">PAN: ${esc(inv.clientPan)}</div>` : ""}
    </div>

    <!-- Line Items -->
    <table style="margin-bottom:20px;font-size:12px">
      <thead>
        <tr style="background:#4f46e5;color:#fff">
          <th style="text-align:left;width:28px">#</th>
          <th style="text-align:left">Description</th>
          <th style="text-align:left">HSN/SAC</th>
          <th class="text-right">GST%</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
          ${taxHeader}
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <!-- Totals + Bank -->
    <div style="display:flex;gap:24px;justify-content:space-between;align-items:flex-start">
      ${bankSection ? `<div style="flex:1">${bankSection}</div>` : "<div></div>"}
      <div style="min-width:240px;font-size:13px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#6b7280">Subtotal</span><span class="font-mono">${s}${fmt(subtotal)}</span></div>
        ${taxSummary}
        ${discountRow}
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;border-top:2px solid #4f46e5;padding-top:8px;margin-top:8px;color:#1e1b4b">
          <span>Total (${esc(inv.currency) || "INR"})</span>
          <span class="font-mono">${s}${fmt(total)}</span>
        </div>
        ${total > 0 ? `<div style="font-size:11px;color:#6b7280;font-style:italic;margin-top:6px;border-top:1px dashed #e5e7eb;padding-top:6px">${esc(amountToWords(total, inv.currency ?? "INR"))}</div>` : ""}
      </div>
    </div>

    ${signatureSection}

    <!-- Notes & Terms -->
    ${inv.notes || inv.termsAndConditions ? `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:12px">
      ${inv.notes ? `<div><div style="font-weight:700;margin-bottom:4px;color:#374151">Notes</div><div style="color:#6b7280">${esc(inv.notes)}</div></div>` : ""}
      ${inv.termsAndConditions ? `<div><div style="font-weight:700;margin-bottom:4px;color:#374151">Terms &amp; Conditions</div><div style="color:#6b7280">${esc(inv.termsAndConditions)}</div></div>` : ""}
    </div>` : ""}

    <div style="margin-top:32px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px">
      Thank you for your business!
    </div>
  </div>`;
}

// ─── Quotation PDF HTML ───────────────────────────────────────────────────────

export interface QuotationData {
  number?: string | null;
  quotationDate?: string | null;
  validUntil?: string | null;
  currency?: string | null;
  status?: string | null;

  companyName?: string | null;
  companyPhone?: string | null;
  companyGstin?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyPostal?: string | null;
  companyState?: string | null;
  companyEmail?: string | null;
  companyPan?: string | null;

  clientName?: string | null;
  clientPhone?: string | null;
  clientGstin?: string | null;
  clientAddress?: string | null;
  clientCity?: string | null;
  clientPostal?: string | null;
  clientState?: string | null;
  clientEmail?: string | null;
  clientPan?: string | null;

  lineItems?: Array<{ itemName?: string; description?: string; hsnSac?: string; qty: number; unitPrice: number; taxPercent: number }> | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  discount?: number | null;
  discountType?: string | null;
  total?: number | null;

  notes?: string | null;
  termsAndConditions?: string | null;
  signatureText?: string | null;
  [key: string]: unknown;
}

export function buildQuotationHtml(q: QuotationData): string {
  const s       = sym(q.currency);
  const lines   = q.lineItems ?? [];
  const subtotal= q.subtotal ?? 0;
  const taxAmt  = q.taxAmount ?? 0;
  const discount= Number(q.discount ?? 0);
  const total   = q.total ?? 0;

  const lineRows = lines.map((item, i) => {
    const amount = (item.qty || 0) * (item.unitPrice || 0);
    const cgst   = amount * ((item.taxPercent || 0) / 2) / 100;
    const lineTotal = amount + cgst + cgst;
    return `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="color:#6b7280">${i+1}</td>
        <td>
          <div style="font-weight:600">${esc(item.itemName ?? item.description) || ""}</div>
          ${item.description && item.itemName ? `<div style="font-size:11px;color:#9ca3af">${esc(item.description)}</div>` : ""}
        </td>
        <td style="color:#6b7280;font-family:monospace">${esc(item.hsnSac) || "—"}</td>
        <td class="text-right">${esc(item.taxPercent)}%</td>
        <td class="text-right">${esc(item.qty)}</td>
        <td class="text-right">${s}${fmt(item.unitPrice)}</td>
        <td class="text-right">${s}${fmt(amount)}</td>
        <td class="text-right" style="color:#059669">${s}${fmt(cgst)}</td>
        <td class="text-right" style="color:#059669">${s}${fmt(cgst)}</td>
        <td class="text-right font-bold">${s}${fmt(lineTotal)}</td>
      </tr>`;
  }).join("");

  const coAddrLine = [q.companyCity, q.companyState, q.companyPostal].filter(Boolean).map(esc).join(", ");
  const clAddrLine = [q.clientCity, q.clientState, q.clientPostal].filter(Boolean).map(esc).join(", ");

  const discountRow = discount > 0
    ? `<div style="display:flex;justify-content:space-between;color:#ef4444"><span>Discount</span><span>${s}${fmt(discount)}</span></div>`
    : "";

  return `
  <div class="page">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>
        <div style="font-size:22px;font-weight:800;color:#1e1b4b">${esc(q.companyName) || "Your Business"}</div>
        ${q.companyPhone ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${esc(q.companyPhone)}</div>` : ""}
        ${q.companyEmail ? `<div style="font-size:12px;color:#6b7280">${esc(q.companyEmail)}</div>` : ""}
        ${q.companyAddress ? `<div style="font-size:12px;color:#6b7280">${esc(q.companyAddress)}${coAddrLine ? ", "+coAddrLine : ""}</div>` : ""}
        ${q.companyGstin ? `<div style="font-size:11px;color:#6b7280;font-family:monospace">GSTIN: ${esc(q.companyGstin)}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:26px;font-weight:800;color:#0891b2;letter-spacing:-0.5px">QUOTATION</div>
        <div style="font-size:14px;font-weight:700;font-family:monospace;color:#374151;margin-top:4px">${esc(q.number) || "—"}</div>
        <div style="margin-top:8px;font-size:12px;color:#6b7280">
          <div><span style="font-weight:600">Date:</span> ${esc(q.quotationDate) || "—"}</div>
          ${q.validUntil ? `<div><span style="font-weight:600">Valid Until:</span> ${esc(q.validUntil)}</div>` : ""}
        </div>
      </div>
    </div>

    <div style="border-top:2px solid #0891b2;margin-bottom:20px"></div>

    <!-- Parties -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;padding:14px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#0891b2;margin-bottom:6px">From</div>
        <div style="font-size:13px;font-weight:700">${esc(q.companyName) || "—"}</div>
        ${q.companyGstin ? `<div style="font-size:11px;font-family:monospace;color:#6b7280">GSTIN: ${esc(q.companyGstin)}</div>` : ""}
        ${q.companyPan ? `<div style="font-size:11px;font-family:monospace;color:#6b7280">PAN: ${esc(q.companyPan)}</div>` : ""}
      </div>
      <div style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;padding:14px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#0891b2;margin-bottom:6px">To</div>
        <div style="font-size:13px;font-weight:700">${esc(q.clientName) || "—"}</div>
        ${q.clientAddress ? `<div style="font-size:12px;color:#6b7280">${esc(q.clientAddress)}${clAddrLine ? ", "+clAddrLine : ""}</div>` : ""}
        ${q.clientPhone ? `<div style="font-size:12px;color:#6b7280">Ph: ${esc(q.clientPhone)}</div>` : ""}
        ${q.clientGstin ? `<div style="font-size:11px;font-family:monospace;color:#6b7280">GSTIN: ${esc(q.clientGstin)}</div>` : ""}
      </div>
    </div>

    <!-- Line Items -->
    <table style="margin-bottom:20px;font-size:12px">
      <thead>
        <tr style="background:#0891b2;color:#fff">
          <th style="text-align:left;width:24px">#</th>
          <th style="text-align:left">Item</th>
          <th style="text-align:left">HSN/SAC</th>
          <th class="text-right">GST%</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
          <th class="text-right" style="color:#a7f3d0">CGST</th>
          <th class="text-right" style="color:#a7f3d0">SGST</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end">
      <div style="min-width:240px;font-size:13px">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="color:#6b7280">Subtotal</span><span>${s}${fmt(subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#059669"><span>CGST</span><span>${s}${fmt(taxAmt/2)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#059669"><span>SGST</span><span>${s}${fmt(taxAmt/2)}</span></div>
        ${discountRow}
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;border-top:2px solid #0891b2;padding-top:8px;margin-top:8px;color:#1e1b4b">
          <span>Total (${esc(q.currency) || "INR"})</span>
          <span>${s}${fmt(total)}</span>
        </div>
        ${total > 0 ? `<div style="font-size:11px;color:#6b7280;font-style:italic;margin-top:6px;border-top:1px dashed #e5e7eb;padding-top:6px">${esc(amountToWords(total, q.currency ?? "INR"))}</div>` : ""}
      </div>
    </div>

    <!-- Notes & T&C -->
    ${q.notes || q.termsAndConditions ? `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:12px">
      ${q.notes ? `<div><div style="font-weight:700;margin-bottom:4px;color:#374151">Notes</div><div style="color:#6b7280">${esc(q.notes)}</div></div>` : ""}
      ${q.termsAndConditions ? `<div><div style="font-weight:700;margin-bottom:4px;color:#374151">Terms &amp; Conditions</div><div style="color:#6b7280">${esc(q.termsAndConditions)}</div></div>` : ""}
    </div>` : ""}

    ${q.signatureText ? `<div style="margin-top:24px;text-align:right;font-size:12px"><div style="color:#6b7280">Authorised by</div><div style="font-weight:700;font-size:15px;margin-top:4px">${esc(q.signatureText)}</div></div>` : ""}

    <div style="margin-top:28px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px">
      This quotation is valid until ${esc(q.validUntil) || "—"}. Prices are subject to change after this date.
    </div>
  </div>`;
}

// ─── Proposal PDF HTML ────────────────────────────────────────────────────────

export interface ProposalPdfData {
  title?: string | null;
  clientName?: string | null;
  template?: string | null;
  status?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  value?: number | null;
  [key: string]: unknown;
}

const TEMPLATE_LABEL: Record<string, string> = {
  website:     "Website Design",
  social:      "Social Media Management",
  performance: "Performance Marketing",
  retainer:    "Monthly Retainer",
  branding:    "Brand Identity",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT:    "#6b7280",
  SENT:     "#2563eb",
  APPROVED: "#059669",
  REJECTED: "#dc2626",
};

export function buildProposalHtml(p: ProposalPdfData): string {
  const statusColor = STATUS_COLOR[p.status ?? "DRAFT"] ?? "#6b7280";
  const templateLabel = esc(TEMPLATE_LABEL[p.template ?? ""] ?? p.template ?? "Proposal");

  // Proposal notes come from TiptapEditor — sanitize rich HTML, don't escape
  const notesHtml = p.notes
    ? sanitizeRichHtml(p.notes)
        .replace(/<h1>/g, '<h1 style="font-size:20px;margin:16px 0 8px">')
        .replace(/<h2>/g, '<h2 style="font-size:16px;margin:14px 0 6px">')
        .replace(/<h3>/g, '<h3 style="font-size:14px;margin:12px 0 4px">')
        .replace(/<p>/g, '<p style="margin:6px 0;line-height:1.6;color:#374151">')
        .replace(/<ul>/g, '<ul style="margin:8px 0 8px 20px;color:#374151">')
        .replace(/<ol>/g, '<ol style="margin:8px 0 8px 20px;color:#374151">')
        .replace(/<li>/g, '<li style="margin:3px 0">')
        .replace(/<strong>/g, '<strong style="font-weight:700">')
        .replace(/<blockquote>/g, '<blockquote style="border-left:3px solid #e5e7eb;padding-left:12px;color:#6b7280;margin:10px 0">')
    : "<p style='color:#9ca3af;font-style:italic'>No content added yet.</p>";

  return `
  <div class="page">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);color:#fff;border-radius:12px;padding:32px;margin-bottom:28px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;margin-bottom:8px">
        ${templateLabel}
      </div>
      <div style="font-size:26px;font-weight:800;line-height:1.2;margin-bottom:12px">${esc(p.title) || "Proposal"}</div>
      <div style="display:flex;gap:24px;font-size:13px;opacity:0.85;flex-wrap:wrap">
        ${p.clientName ? `<div><span style="opacity:0.6">Prepared for: </span><strong>${esc(p.clientName)}</strong></div>` : ""}
        ${p.validUntil ? `<div><span style="opacity:0.6">Valid until: </span><strong>${esc(p.validUntil)}</strong></div>` : ""}
        ${p.value ? `<div><span style="opacity:0.6">Value: </span><strong>₹${Number(p.value).toLocaleString("en-IN")}</strong></div>` : ""}
        <div>
          <span style="background:${statusColor};color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600">${esc(p.status) || "Draft"}</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div style="font-size:13px;line-height:1.7;color:#374151">
      ${notesHtml}
    </div>

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af">
      <div>Generated by AgencyOS</div>
      ${p.createdAt ? `<div>Created: ${new Date(p.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</div>` : ""}
    </div>
  </div>`;
}
