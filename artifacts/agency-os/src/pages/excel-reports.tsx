import * as XLSX from "xlsx";
import {
  useListInvoices,
  useListQuotations,
  useListPurchaseOrders,
  useListProposals,
  useListLeads,
  useListClients,
  useListProjects,
  useListTasks,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Receipt, FileText, ShoppingCart, ClipboardList,
  TrendingUp, Users, FolderKanban, CheckSquare,
  Download, Sheet, Layers,
} from "lucide-react";
import { format } from "date-fns";

function fmt(n: number | null | undefined, currency = "₹") {
  if (n == null) return "-";
  return `${currency}${n.toLocaleString("en-IN")}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

type SheetDef = {
  name: string;
  icon: React.ReactNode;
  color: string;
  badgeClass: string;
  headers: string[];
  rows: (string | number | null)[][];
  loading: boolean;
};

function downloadSingle(sheetDef: SheetDef) {
  const ws = XLSX.utils.aoa_to_sheet([sheetDef.headers, ...sheetDef.rows]);
  const colWidths = sheetDef.headers.map((h, i) => ({
    wch: Math.max(h.length, ...sheetDef.rows.map((r) => String(r[i] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetDef.name.slice(0, 31));
  XLSX.writeFile(wb, `${sheetDef.name.replace(/\s+/g, "_")}.xlsx`);
}

function downloadAll(sheets: SheetDef[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    if (!s.rows.length) continue;
    const ws = XLSX.utils.aoa_to_sheet([s.headers, ...s.rows]);
    ws["!cols"] = s.headers.map((h, i) => ({
      wch: Math.max(h.length, ...s.rows.map((r) => String(r[i] ?? "").length)) + 2,
    }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, `AgencyOS_Export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

function ExportCard({ sheet }: { sheet: SheetDef }) {
  const preview = sheet.rows.slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${sheet.color}`}>
            {sheet.icon}
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{sheet.name}</p>
            {sheet.loading ? (
              <Skeleton className="h-3.5 w-16 mt-1" />
            ) : (
              <p className="text-xs text-muted-foreground">{sheet.rows.length} records</p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          disabled={sheet.loading || sheet.rows.length === 0}
          onClick={() => downloadSingle(sheet)}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {sheet.loading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : sheet.rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No data to export</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                {sheet.headers.map((h) => (
                  <TableHead key={h} className="text-xs font-semibold whitespace-nowrap py-2">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row, ri) => (
                <TableRow key={ri} className="text-xs">
                  {row.map((cell, ci) => (
                    <TableCell key={ci} className="py-2 max-w-[160px] truncate whitespace-nowrap">
                      {cell ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sheet.rows.length > 5 && (
            <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">
              +{sheet.rows.length - 5} more rows in export
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExcelReportsPage() {
  const { data: invoices, isLoading: loadInv } = useListInvoices();
  const { data: quotations, isLoading: loadQt } = useListQuotations();
  const { data: purchaseOrders, isLoading: loadPO } = useListPurchaseOrders();
  const { data: proposals, isLoading: loadProp } = useListProposals();
  const { data: leads, isLoading: loadLeads } = useListLeads();
  const { data: clients, isLoading: loadClients } = useListClients();
  const { data: projects, isLoading: loadProj } = useListProjects();
  const { data: tasks, isLoading: loadTasks } = useListTasks();

  const sheets: SheetDef[] = [
    {
      name: "Invoices",
      icon: <Receipt className="h-4 w-4 text-blue-600" />,
      color: "bg-blue-50 dark:bg-blue-950/40",
      badgeClass: "bg-blue-100 text-blue-700",
      loading: loadInv,
      headers: ["Invoice #", "Client", "Status", "Issue Date", "Due Date", "Subtotal", "Tax", "Total", "Currency", "Notes"],
      rows: (invoices ?? []).map((inv: any) => [
        inv.number ?? "-",
        inv.clientName ?? inv.client?.companyName ?? "-",
        inv.status ?? "-",
        fmtDate(inv.issueDate),
        fmtDate(inv.dueDate),
        inv.subtotal ?? 0,
        inv.taxAmount ?? 0,
        inv.total ?? 0,
        inv.currency ?? "INR",
        inv.notes ?? "",
      ]),
    },
    {
      name: "Quotations",
      icon: <FileText className="h-4 w-4 text-violet-600" />,
      color: "bg-violet-50 dark:bg-violet-950/40",
      badgeClass: "bg-violet-100 text-violet-700",
      loading: loadQt,
      headers: ["Quotation #", "Client", "Status", "Date", "Valid Until", "Subtotal", "Tax", "Total", "Currency"],
      rows: (quotations ?? []).map((q: any) => [
        q.number ?? "-",
        q.clientName ?? q.client?.companyName ?? "-",
        q.status ?? "-",
        fmtDate(q.date ?? q.issueDate ?? q.createdAt),
        fmtDate(q.validUntil),
        q.subtotal ?? 0,
        q.taxAmount ?? 0,
        q.total ?? 0,
        q.currency ?? "INR",
      ]),
    },
    {
      name: "Purchase Orders",
      icon: <ShoppingCart className="h-4 w-4 text-emerald-600" />,
      color: "bg-emerald-50 dark:bg-emerald-950/40",
      badgeClass: "bg-emerald-100 text-emerald-700",
      loading: loadPO,
      headers: ["PO #", "Vendor / Client", "Status", "Date", "Subtotal", "Tax", "Total", "Notes"],
      rows: (purchaseOrders ?? []).map((po: any) => [
        po.number ?? "-",
        po.vendorName ?? po.client?.companyName ?? po.clientName ?? "-",
        po.status ?? "-",
        fmtDate(po.date ?? po.createdAt),
        po.subtotal ?? 0,
        po.taxAmount ?? 0,
        po.total ?? 0,
        po.notes ?? "",
      ]),
    },
    {
      name: "Proposals",
      icon: <ClipboardList className="h-4 w-4 text-amber-600" />,
      color: "bg-amber-50 dark:bg-amber-950/40",
      badgeClass: "bg-amber-100 text-amber-700",
      loading: loadProp,
      headers: ["Title", "Client", "Status", "Template", "Created"],
      rows: (proposals ?? []).map((p: any) => [
        p.title ?? "-",
        p.client?.companyName ?? p.clientName ?? "-",
        p.status ?? "-",
        p.template ?? "-",
        fmtDate(p.createdAt),
      ]),
    },
    {
      name: "Leads & Sales",
      icon: <TrendingUp className="h-4 w-4 text-pink-600" />,
      color: "bg-pink-50 dark:bg-pink-950/40",
      badgeClass: "bg-pink-100 text-pink-700",
      loading: loadLeads,
      headers: ["Title", "Company", "Contact", "Email", "Stage", "Value", "Created"],
      rows: (leads ?? []).map((l: any) => [
        l.title ?? "-",
        l.companyName ?? "-",
        l.contactName ?? "-",
        l.email ?? "-",
        l.stage ?? "-",
        l.value ?? 0,
        fmtDate(l.createdAt),
      ]),
    },
    {
      name: "Clients",
      icon: <Users className="h-4 w-4 text-indigo-600" />,
      color: "bg-indigo-50 dark:bg-indigo-950/40",
      badgeClass: "bg-indigo-100 text-indigo-700",
      loading: loadClients,
      headers: ["Company", "Contact Person", "Email", "Phone", "Category", "Health", "Notes"],
      rows: (clients ?? []).map((c: any) => [
        c.companyName ?? "-",
        c.contactPerson ?? "-",
        c.email ?? "-",
        c.phone ?? "-",
        c.category ?? "-",
        c.health ?? "-",
        c.notes ?? "",
      ]),
    },
    {
      name: "Projects",
      icon: <FolderKanban className="h-4 w-4 text-cyan-600" />,
      color: "bg-cyan-50 dark:bg-cyan-950/40",
      badgeClass: "bg-cyan-100 text-cyan-700",
      loading: loadProj,
      headers: ["Title", "Client", "Status", "Budget", "Start Date", "End Date", "Description"],
      rows: (projects ?? []).map((p: any) => [
        p.title ?? "-",
        p.client?.companyName ?? p.clientName ?? "-",
        p.status ?? "-",
        p.budget ?? 0,
        fmtDate(p.startDate),
        fmtDate(p.endDate),
        p.description ?? "",
      ]),
    },
    {
      name: "Tasks",
      icon: <CheckSquare className="h-4 w-4 text-rose-600" />,
      color: "bg-rose-50 dark:bg-rose-950/40",
      badgeClass: "bg-rose-100 text-rose-700",
      loading: loadTasks,
      headers: ["Title", "Status", "Priority", "Project", "Assignee", "Due Date", "Description"],
      rows: (tasks ?? []).map((t: any) => [
        t.title ?? "-",
        t.status ?? "-",
        t.priority ?? "-",
        t.project?.title ?? t.projectTitle ?? "-",
        t.assignee?.name ?? t.assigneeName ?? "-",
        fmtDate(t.dueDate),
        t.description ?? "",
      ]),
    },
  ];

  const allLoading = sheets.some((s) => s.loading);
  const totalRecords = sheets.reduce((sum, s) => sum + s.rows.length, 0);
  const nonEmptySheets = sheets.filter((s) => s.rows.length > 0);

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-green-100 dark:bg-green-950/40">
              <Sheet className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading text-foreground">Excel Reports</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Export your agency data to .xlsx — ready for analysis in Excel or Google Sheets
              </p>
            </div>
          </div>

          <Button
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            disabled={allLoading || nonEmptySheets.length === 0}
            onClick={() => downloadAll(sheets)}
          >
            <Layers className="h-4 w-4" />
            Export All ({nonEmptySheets.length} sheets)
          </Button>
        </div>

        {/* Stats strip */}
        <div className="flex gap-4 mt-3 flex-wrap">
          {sheets.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{s.name}:</span>
              {s.loading ? (
                <Skeleton className="h-4 w-8" />
              ) : (
                <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${s.badgeClass}`}>
                  {s.rows.length}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Grid of export cards */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
        {sheets.map((sheet) => (
          <ExportCard key={sheet.name} sheet={sheet} />
        ))}
      </div>
    </div>
  );
}
