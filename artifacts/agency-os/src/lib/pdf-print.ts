/**
 * PDF Print Utility & Reusable Letterhead Service
 * Opens a styled A4 print window and triggers the browser's Save as PDF dialog.
 * Configured with official "Blink Beyond" letterhead, watermark, and print styling.
 */

// ─── Centralized Letterhead Configuration ─────────────────────────────────────

export interface LetterheadConfig {
  brandName: string;
  brandSubtitle: string;
  contactLine1: string;
  contactLine2: string;
  contactLine3: string;
  footerBarText: string;
  watermarkText: string;
  primaryColor: string;
  accentColor: string;
}

export const DEFAULT_LETTERHEAD_CONFIG: LetterheadConfig = {
  brandName: "BLINK BEYOND",
  brandSubtitle: "Website | Social Media | Marketing",
  contactLine1: "HO–PALGHAR, 401404, MUMBAI, MAHARASTRA",
  contactLine2: "+91 95455 56009 | SUPPORT@BLINKBEYOND.CO.IN",
  contactLine3: "WWW.BLINKBEYOND.CO.IN",
  footerBarText: "BLINK BEYOND | SUPPORT@BLINKBEYOND.CO.IN | WWW.BLINKBEYOND.CO.IN | +91 95455 56009",
  watermarkText: "BLINK BEYOND",
  primaryColor: "#3451FF",
  accentColor: "#e0e7ff",
};

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

// ─── Reusable Letterhead Renderers ────────────────────────────────────────────

export interface LetterheadRenderOptions {
  config?: Partial<LetterheadConfig>;
  thankYouNote?: string;
  customHeaderRight?: string;
}

/** Renders the top header block for the letterhead */
export function renderLetterheadHeader(options?: LetterheadRenderOptions): string {
  const cfg = { ...DEFAULT_LETTERHEAD_CONFIG, ...options?.config };
  return `
    <div class="letterhead-header">
      <div class="header-content">
        <div class="brand-group">
          <svg width="42" height="28" viewBox="0 0 54 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
            <path d="M0 0L18 18L0 36V0Z" fill="${cfg.primaryColor}"/>
            <path d="M22 0L40 18L22 36V0Z" fill="${cfg.primaryColor}"/>
          </svg>
          <div>
            <div class="brand-title" style="color: ${cfg.primaryColor}">${esc(cfg.brandName)}</div>
            <div class="brand-subtitle">${esc(cfg.brandSubtitle)}</div>
          </div>
        </div>
        ${
          options?.customHeaderRight
            ? `<div class="contact-details">${options.customHeaderRight}</div>`
            : `<div class="contact-details">
                <div>${esc(cfg.contactLine1)}</div>
                <div>${esc(cfg.contactLine2)}</div>
                <div>${esc(cfg.contactLine3)}</div>
              </div>`
        }
      </div>
    </div>
  `;
}

/** Renders the bottom footer block for the letterhead */
export function renderLetterheadFooter(options?: LetterheadRenderOptions): string {
  const cfg = { ...DEFAULT_LETTERHEAD_CONFIG, ...options?.config };
  const note = options?.thankYouNote ?? "Thank you for your business!";
  return `
    <div class="letterhead-footer">
      ${note ? `<div class="thank-you-note">${esc(note)}</div>` : ""}
      <div class="footer-bar" style="background-color: ${cfg.primaryColor}">
        ${esc(cfg.footerBarText)}
      </div>
    </div>
  `;
}

/**
 * Wraps document content into a multi-page ready letterhead layout table.
 * Uses table-header-group and table-footer-group to automatically repeat
 * header and footer across printed pages.
 */
export function wrapInLetterhead(
  bodyContent: string,
  options?: LetterheadRenderOptions
): string {
  const cfg = { ...DEFAULT_LETTERHEAD_CONFIG, ...options?.config };
  const headerHtml = renderLetterheadHeader(options);
  const footerHtml = renderLetterheadFooter(options);

  return `
  <div class="page-container">
    <div class="letterhead-watermark" style="color: ${cfg.primaryColor}">${esc(cfg.watermarkText)}</div>

    <table class="document-layout-table">
      <thead class="document-header-group">
        <tr>
          <td class="layout-cell">
            ${headerHtml}
          </td>
        </tr>
      </thead>

      <tfoot class="document-footer-group">
        <tr>
          <td class="layout-cell">
            ${footerHtml}
          </td>
        </tr>
      </tfoot>

      <tbody>
        <tr>
          <td class="layout-cell">
            <div class="document-body">
              ${bodyContent}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

// ─── PDF Window Printing Launcher ─────────────────────────────────────────────

export function openPrintWindow(htmlContent: string, title = "Document") {
  const win = window.open("", "_blank", "width=920,height=800");
  if (!win) {
    alert("Please allow popups for this site to download or print PDFs.");
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
        
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          font-size: 12px;
          color: #1f2937;
          background: #f3f4f6;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Suppress default browser printing headers and footers (URL, Date, Page Numbers) */
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-container {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
            min-height: 100vh !important;
          }
          thead.document-header-group {
            display: table-header-group !important;
          }
          tfoot.document-footer-group {
            display: table-footer-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }

        .page-container {
          max-width: 820px;
          margin: 20px auto;
          background: #ffffff;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05);
          position: relative;
          overflow: hidden;
          min-height: 1120px;
        }

        table.document-layout-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
        }

        td.layout-cell {
          padding: 0;
          border: none;
        }

        /* Letterhead Header */
        .letterhead-header {
          padding: 24px 32px 14px 32px;
          background: #ffffff;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 14px;
          border-bottom: 2px solid #e0e7ff;
          box-shadow: 0 4px 6px -2px rgba(52, 81, 255, 0.12);
        }

        .brand-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-title {
          font-size: 22px;
          font-weight: 900;
          color: #3451FF;
          letter-spacing: -0.5px;
          line-height: 1;
        }

        .brand-subtitle {
          font-size: 10px;
          font-weight: 600;
          color: #374151;
          margin-top: 3px;
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }

        .contact-details {
          text-align: right;
          font-size: 10px;
          font-weight: 700;
          color: #111827;
          line-height: 1.45;
          letter-spacing: 0.2px;
        }

        /* Body Content Padding */
        .document-body {
          padding: 20px 32px 28px 32px;
        }

        /* Letterhead Footer */
        .letterhead-footer {
          width: 100%;
          background: #ffffff;
          padding: 12px 0 0 0;
        }

        .footer-bar {
          width: 100%;
          background: #3451FF;
          padding: 10px 16px;
          text-align: center;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .thank-you-note {
          text-align: center;
          font-size: 11px;
          color: #64748b;
          font-style: italic;
          margin-bottom: 10px;
        }

        /* Watermark - Prominent, crisp, subtle background branding */
        .letterhead-watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-25deg);
          font-size: 78px;
          font-weight: 900;
          color: #3451FF;
          opacity: 0.08;
          letter-spacing: 12px;
          z-index: 0;
          pointer-events: none;
          white-space: nowrap;
          text-transform: uppercase;
          user-select: none;
        }

        /* Line Items Table Border Styling */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 22px;
          font-size: 11px;
          border: 1px solid #cbd5e1;
        }

        .items-table th {
          background-color: #3451FF;
          color: #ffffff;
          padding: 10px 8px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          border: 1px solid #2840d8;
        }

        .items-table td {
          padding: 9px 8px;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .items-table tr:nth-child(even) {
          background-color: #f8fafc;
        }

        h1,h2,h3,h4 { font-weight: 700; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-muted { color: #6b7280; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .font-bold { font-weight: 700; }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 250);
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

// ─── Currency & Format Helpers ────────────────────────────────────────────────

const CURRENCY_SYM: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
export const sym = (c?: string | null) => CURRENCY_SYM[c ?? "INR"] ?? "₹";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Number to Words ──────────────────────────────────────────────────────────

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

  const rounded = Math.round(amount * 100);
  const rupees  = Math.floor(rounded / 100);
  const paise   = rounded % 100;

  let r = numberToWords(rupees) + " " + unit + (rupees !== 1 ? "s" : "");
  if (paise > 0) r += " And " + numberToWords(paise) + " " + sub;
  return r + " Only";
}

// ─── Invoice PDF HTML Generator ───────────────────────────────────────────────

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
      : `<td class="text-right" style="color:#059669;font-weight:600">${s}${fmt(half)}</td>
         <td class="text-right" style="color:#059669;font-weight:600">${s}${fmt(half)}</td>`;
    return `
      <tr>
        <td style="color:#64748b;text-align:center">${i+1}</td>
        <td style="font-weight:600;color:#0f172a">${esc(item.description)}</td>
        <td style="color:#64748b;font-family:monospace">${esc(item.hsnSac) || "—"}</td>
        <td class="text-right">${esc(item.taxPercent)}%</td>
        <td class="text-right">${esc(item.qty)}</td>
        <td class="text-right">${s}${fmt(item.unitPrice)}</td>
        <td class="text-right">${s}${fmt(amount)}</td>
        ${taxCols}
        <td class="text-right font-bold" style="color:#0f172a">${s}${fmt(amount + taxAmt)}</td>
      </tr>`;
  }).join("");

  const taxHeader = isIGST
    ? `<th class="text-right">IGST</th>`
    : `<th class="text-right">CGST</th>
       <th class="text-right">SGST</th>`;

  const taxSummary = isIGST
    ? `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#475569"><span style="color:#64748b">IGST</span><span class="font-mono">${s}${fmt(taxAmount)}</span></div>`
    : `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#059669;font-weight:600"><span>CGST</span><span class="font-mono">${s}${fmt(taxAmount/2)}</span></div>
       <div style="display:flex;justify-content:space-between;padding:3px 0;color:#059669;font-weight:600"><span>SGST</span><span class="font-mono">${s}${fmt(taxAmount/2)}</span></div>`;

  const discountRow = discount > 0
    ? `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#ef4444"><span>Discount</span><span class="font-mono">- ${s}${fmt(discount)}</span></div>`
    : "";

  const bankSection = bank?.bankName || bank?.accountNumber
    ? `<div style="background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;padding:14px">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#475569;margin-bottom:8px">Bank Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
          ${bank.bankName ? `<div><span style="color:#64748b">Bank: </span><strong style="color:#1e293b">${esc(bank.bankName)}</strong></div>` : ""}
          ${bank.accountName ? `<div><span style="color:#64748b">Account Name: </span><strong style="color:#1e293b">${esc(bank.accountName)}</strong></div>` : ""}
          ${bank.accountNumber ? `<div><span style="color:#64748b">Account No: </span><span style="font-family:monospace;font-weight:700;color:#1e293b">${esc(bank.accountNumber)}</span></div>` : ""}
          ${bank.ifsc ? `<div><span style="color:#64748b">IFSC: </span><span style="font-family:monospace;font-weight:700;color:#1e293b">${esc(bank.ifsc)}</span></div>` : ""}
        </div>
      </div>`
    : "";

  const signatureSection = inv.signatureUrl
    ? `<div style="margin-top:16px;text-align:right">
        <img src="${esc(inv.signatureUrl)}" style="max-height:60px;max-width:160px;object-fit:contain" />
        <div style="font-size:10.5px;color:#64748b;margin-top:4px;font-weight:600">Authorised Signature</div>
      </div>`
    : "";

  const clientAddrLine = [inv.clientCity, inv.clientState, inv.clientPostalCode].filter(Boolean).map(esc).join(", ");

  const bodyContent = `
    <!-- Invoice Header Info -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
      <div>
        ${(inv.companyGstin || inv.businessPan) ? `
        <div style="font-size:11px;color:#64748b;line-height:1.5">
          ${inv.companyGstin ? `<div><span style="font-weight:600">GSTIN:</span> <span style="font-family:monospace">${esc(inv.companyGstin)}</span></div>` : ""}
          ${inv.businessPan ? `<div><span style="font-weight:600">PAN:</span> <span style="font-family:monospace">${esc(inv.businessPan)}</span></div>` : ""}
        </div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:26px;font-weight:900;color:#3451FF;letter-spacing:1px;line-height:1">INVOICE</div>
        <div style="font-size:14px;font-weight:700;font-family:monospace;color:#374151;margin-top:3px">${esc(inv.number) || "A00001"}</div>
        <div style="margin-top:8px;font-size:11.5px;color:#64748b;line-height:1.45">
          <div><span style="font-weight:600;color:#334155">Date:</span> ${esc(inv.invoiceDate) || "—"}</div>
          ${inv.dueDate ? `<div><span style="font-weight:600;color:#334155">Due Date:</span> ${esc(inv.dueDate)}</div>` : ""}
        </div>
      </div>
    </div>

    <!-- Bill To Box -->
    <div style="background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;padding:14px 18px;margin-bottom:22px">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#3451FF;margin-bottom:6px">Bill To</div>
      <div style="font-size:14px;font-weight:700;color:#0f172a">${esc(inv.clientName) || "—"}</div>
      ${inv.billingAddress ? `<div style="font-size:11.5px;color:#475569;margin-top:2px;line-height:1.4">${esc(inv.billingAddress)}${clientAddrLine ? ", "+clientAddrLine : ""}</div>` : ""}
      ${inv.clientPhone ? `<div style="font-size:11.5px;color:#475569">Ph: ${esc(inv.clientPhone)}</div>` : ""}
      ${inv.clientEmail ? `<div style="font-size:11.5px;color:#475569">${esc(inv.clientEmail)}</div>` : ""}
      ${inv.clientGstin ? `<div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px">GSTIN: ${esc(inv.clientGstin)}</div>` : ""}
      ${inv.clientPan ? `<div style="font-size:11px;font-family:monospace;color:#64748b">PAN: ${esc(inv.clientPan)}</div>` : ""}
    </div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:28px;text-align:center">#</th>
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

    <!-- Totals + Bank Details Grid -->
    <div style="display:flex;gap:20px;justify-content:space-between;align-items:flex-start;margin-bottom:22px">
      ${bankSection ? `<div style="flex:1">${bankSection}</div>` : "<div></div>"}
      <div style="min-width:260px;font-size:12px">
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:#475569">
          <span>Subtotal</span>
          <span class="font-mono">${s}${fmt(subtotal)}</span>
        </div>
        ${taxSummary}
        ${discountRow}
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;border-top:2px solid #3451FF;border-bottom:2px solid #3451FF;padding:7px 0;margin-top:6px;color:#0f172a">
          <span>Total (${esc(inv.currency) || "INR"})</span>
          <span class="font-mono">${s}${fmt(total)}</span>
        </div>
        ${total > 0 ? `<div style="font-size:10.5px;color:#64748b;font-style:italic;margin-top:6px;text-align:right">${esc(amountToWords(total, inv.currency ?? "INR"))}</div>` : ""}
      </div>
    </div>

    ${signatureSection}

    <!-- Notes & Terms -->
    ${inv.notes || inv.termsAndConditions ? `
    <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:11px">
      ${inv.notes ? `<div><div style="font-weight:700;color:#334155;margin-bottom:4px">Notes</div><div style="color:#64748b;line-height:1.4">${esc(inv.notes)}</div></div>` : ""}
      ${inv.termsAndConditions ? `<div><div style="font-weight:700;color:#334155;margin-bottom:4px">Terms &amp; Conditions</div><div style="color:#64748b;line-height:1.4">${esc(inv.termsAndConditions)}</div></div>` : ""}
    </div>` : ""}
  `;

  return wrapInLetterhead(bodyContent, { thankYouNote: "Thank you for your business!" });
}

// ─── Quotation PDF HTML Generator ─────────────────────────────────────────────

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
      <tr>
        <td style="color:#64748b;text-align:center">${i+1}</td>
        <td>
          <div style="font-weight:600;color:#0f172a">${esc(item.itemName ?? item.description) || ""}</div>
          ${item.description && item.itemName ? `<div style="font-size:10.5px;color:#64748b">${esc(item.description)}</div>` : ""}
        </td>
        <td style="color:#64748b;font-family:monospace">${esc(item.hsnSac) || "—"}</td>
        <td class="text-right">${esc(item.taxPercent)}%</td>
        <td class="text-right">${esc(item.qty)}</td>
        <td class="text-right">${s}${fmt(item.unitPrice)}</td>
        <td class="text-right">${s}${fmt(amount)}</td>
        <td class="text-right" style="color:#059669;font-weight:600">${s}${fmt(cgst)}</td>
        <td class="text-right" style="color:#059669;font-weight:600">${s}${fmt(cgst)}</td>
        <td class="text-right font-bold" style="color:#0f172a">${s}${fmt(lineTotal)}</td>
      </tr>`;
  }).join("");

  const clAddrLine = [q.clientCity, q.clientState, q.clientPostal].filter(Boolean).map(esc).join(", ");

  const discountRow = discount > 0
    ? `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#ef4444"><span>Discount</span><span>${s}${fmt(discount)}</span></div>`
    : "";

  const bodyContent = `
    <!-- Header Meta -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
      <div>
        ${q.companyGstin ? `<div style="font-size:11px;color:#64748b"><span style="font-weight:600">GSTIN:</span> <span style="font-family:monospace">${esc(q.companyGstin)}</span></div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:26px;font-weight:900;color:#0891b2;letter-spacing:1px;line-height:1">QUOTATION</div>
        <div style="font-size:14px;font-weight:700;font-family:monospace;color:#374151;margin-top:3px">${esc(q.number) || "—"}</div>
        <div style="margin-top:8px;font-size:11.5px;color:#64748b;line-height:1.45">
          <div><span style="font-weight:600;color:#334155">Date:</span> ${esc(q.quotationDate) || "—"}</div>
          ${q.validUntil ? `<div><span style="font-weight:600;color:#334155">Valid Until:</span> ${esc(q.validUntil)}</div>` : ""}
        </div>
      </div>
    </div>

    <!-- Client Box -->
    <div style="background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;padding:14px 18px;margin-bottom:22px">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#0891b2;margin-bottom:6px">Quotation For</div>
      <div style="font-size:14px;font-weight:700;color:#0f172a">${esc(q.clientName) || "—"}</div>
      ${q.clientAddress ? `<div style="font-size:11.5px;color:#475569;margin-top:2px;line-height:1.4">${esc(q.clientAddress)}${clAddrLine ? ", "+clAddrLine : ""}</div>` : ""}
      ${q.clientPhone ? `<div style="font-size:11.5px;color:#475569">Ph: ${esc(q.clientPhone)}</div>` : ""}
      ${q.clientGstin ? `<div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px">GSTIN: ${esc(q.clientGstin)}</div>` : ""}
    </div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr style="background-color:#0891b2">
          <th style="width:28px;text-align:center">#</th>
          <th style="text-align:left">Item</th>
          <th style="text-align:left">HSN/SAC</th>
          <th class="text-right">GST%</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
          <th class="text-right">CGST</th>
          <th class="text-right">SGST</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:22px">
      <div style="min-width:260px;font-size:12px">
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:#475569"><span>Subtotal</span><span>${s}${fmt(subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:#059669;font-weight:600"><span>CGST</span><span>${s}${fmt(taxAmt/2)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:#059669;font-weight:600"><span>SGST</span><span>${s}${fmt(taxAmt/2)}</span></div>
        ${discountRow}
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;border-top:2px solid #0891b2;border-bottom:2px solid #0891b2;padding:7px 0;margin-top:6px;color:#0f172a">
          <span>Total (${esc(q.currency) || "INR"})</span>
          <span class="font-mono">${s}${fmt(total)}</span>
        </div>
        ${total > 0 ? `<div style="font-size:10.5px;color:#64748b;font-style:italic;margin-top:6px;text-align:right">${esc(amountToWords(total, q.currency ?? "INR"))}</div>` : ""}
      </div>
    </div>

    <!-- Notes & T&C -->
    ${q.notes || q.termsAndConditions ? `
    <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:11px">
      ${q.notes ? `<div><div style="font-weight:700;color:#334155;margin-bottom:4px">Notes</div><div style="color:#64748b;line-height:1.4">${esc(q.notes)}</div></div>` : ""}
      ${q.termsAndConditions ? `<div><div style="font-weight:700;color:#334155;margin-bottom:4px">Terms &amp; Conditions</div><div style="color:#64748b;line-height:1.4">${esc(q.termsAndConditions)}</div></div>` : ""}
    </div>` : ""}

    ${q.signatureText ? `<div style="margin-top:20px;text-align:right;font-size:11px"><div style="color:#64748b">Authorised by</div><div style="font-weight:700;font-size:14px;color:#0f172a;margin-top:4px">${esc(q.signatureText)}</div></div>` : ""}
  `;

  return wrapInLetterhead(bodyContent, {
    thankYouNote: `This quotation is valid until ${esc(q.validUntil) || "—"}. Prices are subject to change after this date.`,
  });
}

// ─── Proposal PDF HTML Generator ─────────────────────────────────────────────

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

  const bodyContent = `
    <!-- Header Hero Banner -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);color:#fff;border-radius:8px;padding:28px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;margin-bottom:8px">
        ${templateLabel}
      </div>
      <div style="font-size:24px;font-weight:800;line-height:1.2;margin-bottom:12px">${esc(p.title) || "Proposal"}</div>
      <div style="display:flex;gap:20px;font-size:12.5px;opacity:0.9;flex-wrap:wrap">
        ${p.clientName ? `<div><span style="opacity:0.75">Prepared for: </span><strong>${esc(p.clientName)}</strong></div>` : ""}
        ${p.validUntil ? `<div><span style="opacity:0.75">Valid until: </span><strong>${esc(p.validUntil)}</strong></div>` : ""}
        ${p.value ? `<div><span style="opacity:0.75">Value: </span><strong>₹${Number(p.value).toLocaleString("en-IN")}</strong></div>` : ""}
        <div>
          <span style="background:${statusColor};color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600">${esc(p.status) || "Draft"}</span>
        </div>
      </div>
    </div>

    <!-- Document Notes Content -->
    <div style="font-size:12.5px;line-height:1.7;color:#374151">
      ${notesHtml}
    </div>
  `;

  return wrapInLetterhead(bodyContent, {
    thankYouNote: p.createdAt
      ? `Created on ${new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
      : "Official AgencyOS Proposal",
  });
}
