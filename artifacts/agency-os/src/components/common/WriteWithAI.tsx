import { useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export type WriteWithAIContext =
  | "quotation"
  | "invoice"
  | "proposal"
  | "purchase-order"
  | "task"
  | "content-post"
  | "client"
  | "lead";

const CONTEXT_CONFIG: Record<WriteWithAIContext, { label: string; placeholder: string }> = {
  quotation: {
    label: "Quotation",
    placeholder:
      'e.g. "Quotation for Acme Corp for social media management — 3 platforms, 12 posts/month, ₹45,000 total, 18% GST, valid 30 days, 50% advance payment"',
  },
  invoice: {
    label: "Invoice",
    placeholder:
      'e.g. "Invoice for website development — 5 pages, ₹80,000, 18% GST, payment due in 15 days"',
  },
  proposal: {
    label: "Proposal",
    placeholder:
      'e.g. "Proposal for ABC Brand — 6-month social media retainer including strategy, content creation, 4 platforms, monthly reporting, ₹60,000/month"',
  },
  "purchase-order": {
    label: "Purchase Order",
    placeholder:
      'e.g. "PO for printing 500 brochures from XYZ Printers — A4 size, glossy, ₹12 per piece, delivery in 7 days"',
  },
  task: {
    label: "Task",
    placeholder:
      'e.g. "Design Instagram carousel for summer campaign — 5 slides, brand colors, high priority, due next Friday"',
  },
  "content-post": {
    label: "Content Post",
    placeholder:
      'e.g. "Instagram reel announcing our new brand refresh — exciting tone, focus on transformation, schedule for Monday"',
  },
  client: {
    label: "Client",
    placeholder:
      'e.g. "New client: Sunset Café, contact Priya Sharma, email priya@sunsetcafe.in, phone 9876543210, retainer for social media"',
  },
  lead: {
    label: "Lead",
    placeholder:
      'e.g. "New lead from BlueStar Tech — they need a website redesign and SEO, budget around ₹1.5L, spoke with Rahul Mehta"',
  },
};

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("agency_token") : null;
}

interface WriteWithAIProps {
  context: WriteWithAIContext;
  onFill: (fields: Record<string, any>) => void;
}

export function WriteWithAI({ context, onFill }: WriteWithAIProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const config = CONTEXT_CONFIG[context];

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what you want to create");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/fill-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ prompt, context }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "AI request failed");
      }
      const data = await res.json();
      const fields = data.fields || {};
      const filled = Object.keys(fields).filter(k => fields[k] !== null && fields[k] !== undefined && fields[k] !== "");
      onFill(fields);
      toast.success(`${config.label} filled — ${filled.length} field${filled.length !== 1 ? "s" : ""} populated`);
      setOpen(false);
      setPrompt("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 dark:border-violet-800 hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/40 dark:hover:to-purple-900/40 transition-colors group"
      >
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 shrink-0">
          <Wand2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Write with AI</p>
          <p className="text-xs text-violet-500 dark:text-violet-500 mt-0.5">
            Describe your {config.label.toLowerCase()} in plain language — AI will fill the form for you
          </p>
        </div>
        <Sparkles className="h-4 w-4 text-violet-400 shrink-0 group-hover:text-violet-600 transition-colors" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-violet-500" />
              Write {config.label} with AI
            </DialogTitle>
            <DialogDescription>
              Describe what you need in plain language. The AI will extract the details and fill in the form fields for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <Textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={config.placeholder}
              className="min-h-32 text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  generate();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Tip: include client name, services, amounts, deadlines — the more detail you give, the better the result.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setOpen(false); setPrompt(""); }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={generate}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Filling form…</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Fill Form</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
