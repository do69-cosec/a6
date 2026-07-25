"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Square, Clock, DollarSign, BarChart3, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

type TimeEntry = {
  id: string;
  description: string | null;
  minutes: number;
  billable: boolean;
  startedAt: Date;
  project: { name: string } | null;
  task: { title: string } | null;
};

type Project = { id: string; name: string };

export function TimeTracker({
  entries,
  projects,
  totalMin,
  billableMin,
  weekMin,
}: {
  entries: TimeEntry[];
  projects: Project[];
  totalMin: number;
  billableMin: number;
  weekMin: number;
}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [billable, setBillable] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [running, startTime]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startTimer = () => {
    const now = new Date();
    setStartTime(now);
    setElapsed(0);
    setRunning(true);
    toast.success("Timer started");
  };

  const stopTimer = async () => {
    if (!startTime) return;
    setRunning(false);
    const minutes = Math.ceil(elapsed / 60);
    if (minutes < 1) { toast.error("Log at least 1 minute"); return; }

    try {
      const res = await fetch("/api/time/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description || "Time entry",
          projectId: projectId || undefined,
          minutes,
          billable,
          startedAt: startTime.toISOString(),
          endedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        toast.success(`${minutes}min logged${billable ? " (billable)" : ""}`);
        setElapsed(0);
        setDescription("");
      } else {
        toast.error("Failed to save entry");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const utilizationRate = weekMin > 0 ? Math.min(Math.round((billableMin / (40 * 60)) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-900/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Total Logged</span>
            </div>
            <p className="text-2xl font-bold">{(totalMin / 60).toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Billable</span>
            </div>
            <p className="text-2xl font-bold">{(billableMin / 60).toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">revenue generating</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">This Week</span>
            </div>
            <p className="text-2xl font-bold">{(weekMin / 60).toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">of 40h target</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Utilization</span>
            </div>
            <p className="text-2xl font-bold">{utilizationRate}%</p>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${utilizationRate >= 80 ? "bg-emerald-500" : utilizationRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${utilizationRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Timer */}
      <Card className={`border-2 transition-colors ${running ? "border-primary shadow-lg shadow-primary/10" : "border-border"}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${running ? "bg-red-500 animate-pulse" : "bg-muted"}`} />
            Live Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className={`text-6xl font-mono font-bold tracking-widest transition-colors ${running ? "text-primary" : "text-muted-foreground"}`}>
              {formatTime(elapsed)}
            </div>
            {running && (
              <p className="text-xs text-muted-foreground mt-2">
                Started at {startTime ? format(startTime, "hh:mm a") : "—"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="What are you working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={running}
              />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={running}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                disabled={running}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Billable hours</span>
              {billable && <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20">💰 Billable</Badge>}
            </label>

            <div className="flex gap-3">
              {!running ? (
                <Button onClick={startTimer} className="gap-2 bg-primary">
                  <Play className="h-4 w-4" /> Start Timer
                </Button>
              ) : (
                <Button onClick={stopTimer} variant="destructive" className="gap-2">
                  <Square className="h-4 w-4" /> Stop & Save
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No entries yet — start your first timer above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => {
                const hours = Math.floor(e.minutes / 60);
                const mins = e.minutes % 60;
                return (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/30 rounded-lg px-2 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{e.description ?? e.project?.name ?? "Time entry"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {e.project && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            {e.project.name}
                          </span>
                        )}
                        {e.task && (
                          <span className="text-xs text-muted-foreground">{e.task.title}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(e.startedAt), "MMM d, hh:mm a")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {e.billable && (
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20">
                          Billable
                        </Badge>
                      )}
                      <span className="text-sm font-bold tabular-nums text-foreground min-w-[4rem] text-right">
                        {hours > 0 ? `${hours}h ` : ""}{mins > 0 ? `${mins}m` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
