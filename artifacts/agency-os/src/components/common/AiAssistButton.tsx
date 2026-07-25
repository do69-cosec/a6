import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

export type AiAssistContext =
  | "general"
  | "proposal"
  | "quotation"
  | "invoice"
  | "content-caption"
  | "task"
  | "client-notes"
  | "lead"
  | "email";

interface AiAssistButtonProps {
  context?: AiAssistContext;
  currentValue?: string;
  onResult: (text: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  side?: "top" | "bottom" | "left" | "right";
}

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("agency_token") : null;
}

export function AiAssistButton({
  context = "general",
  currentValue,
  onResult,
  placeholder = "e.g. Make it more formal, or write a follow-up about the delayed timeline...",
  className,
  label = "AI Assist",
  side = "bottom",
}: AiAssistButtonProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Tell the AI what to write first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          prompt,
          context,
          existingText: currentValue,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "AI request failed");
      }
      const data = await res.json();
      onResult(data.text || "");
      toast.success("AI content generated");
      setOpen(false);
      setPrompt("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          data-testid="button-ai-assist"
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} align="end" className="w-80 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            AI Assist
          </p>
          <p className="text-xs text-muted-foreground">
            Describe what you want written. The AI will {currentValue?.trim() ? "improve or rewrite" : "fill in"} this field.
          </p>
        </div>
        <Textarea
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          className="min-h-20 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              generate();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={generate}
          disabled={loading}
          data-testid="button-ai-generate"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Generate
            </>
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
