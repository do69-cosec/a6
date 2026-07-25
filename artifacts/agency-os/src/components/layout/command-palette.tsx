"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  Building2,
  FolderKanban,
  CheckSquare,
  TrendingUp,
  Loader2,
  FileText,
} from "lucide-react";
import { globalSearch, type SearchResultItem } from "@/lib/actions/search";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(-1);
  const router = useRouter();

  // Keyboard shortcut to open Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        const searchResults = await globalSearch(query);
        // Include static page search if they match
        const pages = [
          { id: "p-dash", title: "Dashboard", type: "page" as const, href: "/dashboard", subtitle: "Overview stats & charts" },
          { id: "p-clients", title: "Clients & CRM", type: "page" as const, href: "/clients", subtitle: "Manage clients & contacts" },
          { id: "p-sales", title: "Sales Funnel", type: "page" as const, href: "/sales", subtitle: "Sales pipeline & leads board" },
          { id: "p-projects", title: "Projects Portfolio", type: "page" as const, href: "/projects", subtitle: "All projects & milestones" },
          { id: "p-tasks", title: "Tasks Kanban", type: "page" as const, href: "/tasks", subtitle: "Task boards & assignments" },
          { id: "p-time", title: "Time Logs & Timesheets", type: "page" as const, href: "/time", subtitle: "Log hours & view metrics" },
          { id: "p-finance", title: "Finance Panel", type: "page" as const, href: "/finance", subtitle: "Invoices, Proposals, P&L" },
          { id: "p-content", title: "Content Calendar", type: "page" as const, href: "/content", subtitle: "Social media calendar" },
          { id: "p-hr", title: "HR Module", type: "page" as const, href: "/hr", subtitle: "Employees, Hiring, Reviews" },
          { id: "p-attendance", title: "Attendance & Leaves", type: "page" as const, href: "/attendance", subtitle: "Daily logs & leaves" },
          { id: "p-reports", title: "Reports & Insights", type: "page" as const, href: "/reports", subtitle: "Full analytics dashboards" },
          { id: "p-automation", title: "Automation rules", type: "page" as const, href: "/automation", subtitle: "Rule builder & logs" },
          { id: "p-settings", title: "Agency Settings", type: "page" as const, href: "/settings", subtitle: "General settings & configurations" },
        ];

        const matchedPages = pages.filter(p => 
          p.title.toLowerCase().includes(query.toLowerCase()) || 
          p.subtitle.toLowerCase().includes(query.toLowerCase())
        );

        setResults([...matchedPages, ...searchResults]);
        setActiveIndex(0);
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Navigate using Keyboard keys (ArrowUp, ArrowDown, Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      }
    }
  };

  const handleSelect = (item: SearchResultItem | { href: string }) => {
    router.push(item.href);
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "client":
        return <Building2 className="h-4 w-4 text-emerald-500" />;
      case "project":
        return <FolderKanban className="h-4 w-4 text-indigo-500" />;
      case "task":
        return <CheckSquare className="h-4 w-4 text-sky-500" />;
      case "lead":
        return <TrendingUp className="h-4 w-4 text-amber-500" />;
      default:
        return <FileText className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-full border bg-muted/40 hover:bg-muted/70 px-3 py-1.5 text-xs text-muted-foreground w-64 md:w-80 cursor-pointer transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search anything...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border bg-card/90 backdrop-blur-xl">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="sr-only">Search Command Palette</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search clients, projects, tasks, leads, pages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-base flex-1 h-8"
                autoFocus
              />
              {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </DialogHeader>
          <div className="max-h-[350px] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search...
              </div>
            ) : results.length === 0 && !isPending ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      idx === activeIndex
                        ? "bg-accent text-accent-foreground scale-[1.01]"
                        : "hover:bg-accent/50 text-foreground"
                    }`}
                  >
                    <div className="flex-shrink-0 p-1.5 rounded-md bg-background border">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate capitalize">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/75 px-1.5 py-0.5 rounded bg-muted">
                      {item.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 border-t p-3 text-[11px] text-muted-foreground bg-muted/20">
            <span className="flex items-center gap-1">
              <kbd className="border bg-background px-1 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border bg-background px-1 rounded">Enter</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border bg-background px-1 rounded">Esc</kbd> Close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
