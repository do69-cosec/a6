"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TASK_COLUMNS } from "@/lib/constants";
import { toast } from "sonner";
import { Play, Square, Timer, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TaskItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  project: { name: string };
};

type ActiveTimer = {
  taskId: string;
  taskTitle: string;
  projectName: string;
  startedAt: string; // ISO String
};

function DroppableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={isOver ? "ring-2 ring-primary/40 rounded-lg" : undefined}
    >
      {children}
    </div>
  );
}

function SortableTask({
  task,
  isActive,
  onStart,
  onStop,
}: {
  task: TaskItem;
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative"
    >
      <p className="text-sm font-medium leading-snug pr-8">{task.title}</p>
      <p className="text-xs text-muted-foreground mt-1">{task.project.name}</p>
      <div className="flex justify-between items-center mt-2 pt-1 border-t border-muted/50">
        <Badge variant="outline" className="text-[10px]">
          {task.priority}
        </Badge>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isActive) onStop();
            else onStart();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border transition-all cursor-pointer shadow-sm",
            isActive
              ? "bg-red-500 text-white border-red-500 hover:bg-red-600 animate-pulse"
              : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
          )}
        >
          {isActive ? (
            <Square className="h-3 w-3 fill-current" />
          ) : (
            <Play className="h-3 w-3 fill-current ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function KanbanBoard({ initialTasks }: { initialTasks: TaskItem[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Timer states
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [logDesc, setLogDesc] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load timer from local storage
  useEffect(() => {
    const saved = localStorage.getItem("blink_beyond_timer");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ActiveTimer;
        setActiveTimer(parsed);
        const elapsed = Math.floor((Date.now() - new Date(parsed.startedAt).getTime()) / 1000);
        setElapsedTime(Math.max(0, elapsed));
      } catch (e) {
        localStorage.removeItem("blink_beyond_timer");
      }
    }
  }, []);

  // Update ticking duration
  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeTimer.startedAt).getTime()) / 1000);
        setElapsedTime(Math.max(0, elapsed));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsedTime(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTimer]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeTask = tasks.find((t) => t.id === activeId);

  async function updateStatus(taskId: string, status: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) toast.error("Failed to update task");
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = active.id as string;
    let newStatus = over.id as string;

    if (!TASK_COLUMNS.some((c) => c.id === newStatus)) {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) newStatus = overTask.status;
      else return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    void updateStatus(taskId, newStatus);
  }

  // Handle play/pause timer
  function handleStart(task: TaskItem) {
    if (activeTimer) {
      toast.warning(`Please stop the running timer for "${activeTimer.taskTitle}" first.`);
      return;
    }
    const timer: ActiveTimer = {
      taskId: task.id,
      taskTitle: task.title,
      projectName: task.project.name,
      startedAt: new Date().toISOString(),
    };
    setActiveTimer(timer);
    localStorage.setItem("blink_beyond_timer", JSON.stringify(timer));
    toast.success(`Timer started for "${task.title}"`);
  }

  function handleStop() {
    if (!activeTimer) return;
    setLogDesc(`Worked on task: ${activeTimer.taskTitle}`);
    setShowLogDialog(true);
  }

  async function saveTimeLog() {
    if (!activeTimer) return;
    setSavingLog(true);

    const minutes = Math.max(1, Math.round(elapsedTime / 60));

    try {
      const res = await fetch("/api/time/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeTimer.taskId,
          description: logDesc,
          minutes,
          startedAt: activeTimer.startedAt,
        }),
      });

      if (!res.ok) throw new Error("Failed to save timesheet log");

      toast.success(`Logged ${minutes}m for "${activeTimer.taskTitle}"`);
      setActiveTimer(null);
      localStorage.removeItem("blink_beyond_timer");
      setShowLogDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving log");
    } finally {
      setSavingLog(false);
    }
  }

  function discardTimer() {
    if (confirm("Are you sure you want to discard this timer session? The logged time will not be saved.")) {
      setActiveTimer(null);
      localStorage.removeItem("blink_beyond_timer");
      setShowLogDialog(false);
    }
  }

  // Format elapsed time (seconds -> HH:MM:SS)
  function formatTime(totalSeconds: number) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {TASK_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <DroppableColumn key={col.id} id={col.id}>
              <Card className="bg-muted/30 h-full">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex justify-between">
                    {col.title}
                    <span className="text-muted-foreground font-normal">
                      {colTasks.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 min-h-[160px]">
                  <SortableContext
                    items={colTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {colTasks.map((task) => (
                      <SortableTask
                        key={task.id}
                        task={task}
                        isActive={activeTimer?.taskId === task.id}
                        onStart={() => handleStart(task)}
                        onStop={handleStop}
                      />
                    ))}
                  </SortableContext>
                </CardContent>
              </Card>
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rounded-lg border bg-card p-3 shadow-lg opacity-90 w-64">
            <p className="text-sm font-medium">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>

      {/* Floating Global Timer Banner */}
      {activeTimer && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl p-4 flex items-center gap-4 z-50 animate-bounce duration-1000 max-w-sm">
          <div className="h-10 w-10 bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-center text-primary animate-pulse">
            <Timer className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Session</p>
            <p className="text-sm font-bold truncate text-slate-100">{activeTimer.taskTitle}</p>
            <p className="text-[10px] text-slate-400 truncate">{activeTimer.projectName}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-bold text-emerald-400">{formatTime(elapsedTime)}</p>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs px-2.5 mt-1 cursor-pointer font-medium"
              onClick={handleStop}
            >
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* Log Time Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Log Time Entry
            </DialogTitle>
            <DialogDescription>
              Submit your logged time for task: <strong>{activeTimer?.taskTitle}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center border bg-slate-50 p-3 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">ELAPSED TIME</p>
                <p className="text-2xl font-mono font-bold text-slate-800">{activeTimer && formatTime(elapsedTime)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-semibold">LOGGED AS</p>
                <p className="text-lg font-semibold text-slate-800">
                  {Math.max(1, Math.round(elapsedTime / 60))} minute(s)
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Work description</Label>
              <Input
                id="desc"
                value={logDesc}
                onChange={(e) => setLogDesc(e.target.value)}
                placeholder="What did you work on?"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={discardTimer} disabled={savingLog} className="text-destructive hover:bg-destructive/10">
              Discard
            </Button>
            <Button onClick={saveTimeLog} disabled={savingLog}>
              {savingLog ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Log
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
