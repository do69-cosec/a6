import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Instagram, Youtube, Facebook, Linkedin } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  IDEA: { label: "Idea", className: "bg-slate-100 text-slate-600" },
  SCRIPTING: { label: "Scripting", className: "bg-blue-100 text-blue-700" },
  DESIGNING: { label: "Designing", className: "bg-violet-100 text-violet-700" },
  IN_REVIEW: { label: "In Review", className: "bg-amber-100 text-amber-700" },
  ADMIN_APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  SCHEDULED: { label: "Scheduled", className: "bg-cyan-100 text-cyan-700" },
  PUBLISHED: { label: "Published", className: "bg-green-100 text-green-700" },
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="h-3.5 w-3.5 text-pink-500" />,
  YOUTUBE: <Youtube className="h-3.5 w-3.5 text-red-500" />,
  FACEBOOK: <Facebook className="h-3.5 w-3.5 text-blue-500" />,
  LINKEDIN: <Linkedin className="h-3.5 w-3.5 text-blue-600" />,
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PublicCalendarPage({ params }: { params: { shareToken: string } }) {
  const { shareToken } = params;
  const [data, setData] = useState<{ label: string | null; clientId: string; posts: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewPost, setViewPost] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/public/calendar/${shareToken}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load shared calendar. It may have expired.");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setIsLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setIsLoading(false);
      });
  }, [shareToken]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading calendar...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-border p-8 text-center space-y-4">
          <Calendar className="h-12 w-12 mx-auto text-destructive/50" />
          <h2 className="text-xl font-semibold">Link Unavailable</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentMonth = new Date();
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));

  const postsByDay: Record<number, any[]> = {};
  (data.posts ?? []).forEach((p) => {
    if (p.scheduledAt) {
      const cleanDate = p.scheduledAt.split("T")[0];
      const dayPart = Number(cleanDate.split("-")[2]);
      const day = !isNaN(dayPart) ? dayPart : new Date(p.scheduledAt).getUTCDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day]!.push(p);
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-border p-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading">{data.label || "Shared Content Calendar"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Read-only view • {format(currentMonth, "MMMM yyyy")}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="rounded-xl border border-border overflow-hidden bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px] border-b border-r border-border bg-muted/5" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPosts = postsByDay[day] ?? [];
              return (
                <div key={day} className="min-h-[120px] border-b border-r border-border p-2 bg-white">
                  <p className="text-sm font-medium text-muted-foreground mb-1.5">{day}</p>
                  <div className="space-y-1">
                    {dayPosts.map((p) => (
                      <div key={p.id} onClick={() => setViewPost(p)} className="flex items-center gap-1.5 text-xs bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors border border-primary/10 rounded-md px-1.5 py-1 truncate shadow-sm">
                        {PLATFORM_ICON[p.platform ?? "INSTAGRAM"]}
                        <span className="truncate font-medium">{p.title || p.caption?.slice(0, 20) || p.contentType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Read-Only Notion Style Modal */}
      <Dialog open={!!viewPost} onOpenChange={(open) => !open && setViewPost(null)}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
          {viewPost && (
            <div>
              <DialogHeader className="mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  {PLATFORM_ICON[viewPost.platform ?? "INSTAGRAM"]}
                  <span>{viewPost.platform}</span>
                  <span>•</span>
                  <span>{viewPost.contentType}</span>
                  <span>•</span>
                  <Badge variant="secondary" className={cn("text-[10px]", STATUS_CONFIG[viewPost.status ?? "IDEA"]?.className)}>
                    {STATUS_CONFIG[viewPost.status ?? "IDEA"]?.label}
                  </Badge>
                </div>
                
                <h1 className="text-4xl font-bold leading-tight mb-2">
                  {viewPost.title || "Untitled Post"}
                </h1>
                
                {viewPost.scheduledAt && (
                  <div className="flex items-center text-muted-foreground gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>Scheduled for {format(new Date(viewPost.scheduledAt), "MMMM d, yyyy")}</span>
                  </div>
                )}
              </DialogHeader>

              <hr className="my-6 border-border" />

              <div className="space-y-8">
                {viewPost.script && (
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">📝 Script</h3>
                    <div className="bg-slate-50 p-5 rounded-xl text-base whitespace-pre-wrap border border-slate-100 leading-relaxed text-slate-800">
                      {viewPost.script}
                    </div>
                  </div>
                )}

                {viewPost.ideation && (
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">💡 Ideation</h3>
                    <div className="bg-slate-50 p-5 rounded-xl text-base whitespace-pre-wrap border border-slate-100 leading-relaxed text-slate-800">
                      {viewPost.ideation}
                    </div>
                  </div>
                )}

                {viewPost.referenceLinks && viewPost.referenceLinks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">🔗 Reference Links</h3>
                    <ul className="space-y-2">
                      {viewPost.referenceLinks.map((link: any, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="font-medium text-slate-700 min-w-[120px]">{link.label}</span>
                          <span className="text-slate-300">→</span>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all truncate">
                            {link.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewPost.caption && (
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">💬 Caption</h3>
                    <div className="bg-slate-50 p-5 rounded-xl text-base whitespace-pre-wrap border border-slate-100 leading-relaxed text-slate-800">
                      {viewPost.caption}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
