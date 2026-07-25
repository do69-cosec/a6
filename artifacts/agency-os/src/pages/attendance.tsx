import { useState } from "react";
import {
  useGetTodayAttendance,
  useCheckIn,
  useCheckOut,
  useListAttendance,
  getGetTodayAttendanceQueryKey,
  getListAttendanceQueryKey,
  useOvertimeCheckIn,
  useOvertimeCheckOut,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Clock, CheckCircle2, AlertTriangle, Users, Download, Coffee, PauseCircle, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import { formatDateOnly } from "@/lib/utils";

function calculateDuration(startStr?: string | null, endStr?: string | null): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  return Math.max(0, end.getTime() - start.getTime());
}

function calculateNetWorkingMs(checkInAt?: string | null, checkOutAt?: string | null, breakDurationMin = 0): number {
  if (!checkInAt || !checkOutAt) return 0;
  const rawMs = calculateDuration(checkInAt, checkOutAt);
  const breakMs = breakDurationMin * 60000;
  return Math.max(0, rawMs - breakMs);
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs === 0 && mins === 0) return "—";
  return `${hrs}h ${mins}m`;
}

function exportAttendanceCSV(records: any[]) {
  const headers = ["Date", "Employee", "Check In", "Check Out", "Break (mins)", "Overtime", "Net Working Hours", "Status"];
  const rows = records.map((r) => {
    const normalNetMs = calculateNetWorkingMs(r.checkInAt, r.checkOutAt, r.breakDurationMin || 0);
    const otMs = calculateDuration(r.overtimeCheckInAt, r.overtimeCheckOutAt);
    const totalMs = normalNetMs + otMs;

    let otStr = "—";
    if (r.overtimeCheckInAt) {
      const otStart = format(new Date(r.overtimeCheckInAt), "HH:mm");
      const otEnd = r.overtimeCheckOutAt ? format(new Date(r.overtimeCheckOutAt), "HH:mm") : "Working";
      otStr = `${otStart} - ${otEnd}`;
    }

    return [
      r.date ?? formatDateOnly(r.checkInAt, "yyyy-MM-dd"),
      r.userName || "Unknown",
      r.checkInAt ? format(new Date(r.checkInAt), "HH:mm") : "",
      r.checkOutAt ? format(new Date(r.checkOutAt), "HH:mm") : "",
      r.breakDurationMin ?? 0,
      otStr,
      totalMs > 0 ? formatDuration(totalMs) : "—",
      r.isLate ? "Late" : "On Time",
    ];
  });
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${format(new Date(), "yyyy-MM")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendancePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: todayStatus, isLoading: todayLoading } = useGetTodayAttendance();
  const { data: attendanceHistory, isLoading: historyLoading } = useListAttendance();
  const [isBreakPending, setIsBreakPending] = useState(false);

  const isUserAdminOrManager = user?.systemRole === "SUPER_ADMIN" || user?.systemRole === "MANAGER";

  const checkInMutation = useCheckIn({
    mutation: {
      onSuccess: () => {
        toast.success("Checked in successfully");
        qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to check in");
      },
    },
  });

  const checkOutMutation = useCheckOut({
    mutation: {
      onSuccess: () => {
        toast.success("Checked out successfully");
        qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to check out");
      },
    },
  });

  const overtimeCheckInMutation = useOvertimeCheckIn({
    mutation: {
      onSuccess: () => {
        toast.success("Overtime started successfully");
        qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to start overtime");
      },
    },
  });

  const overtimeCheckOutMutation = useOvertimeCheckOut({
    mutation: {
      onSuccess: () => {
        toast.success("Overtime completed successfully");
        qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to complete overtime");
      },
    },
  });

  const handleStartBreak = async () => {
    setIsBreakPending(true);
    try {
      const res = await fetch("/api/attendance/start-break", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start break");
      toast.success("Break started ☕");
      qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
      qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
    } catch (err: any) {
      toast.error(err.message || "Failed to start break");
    } finally {
      setIsBreakPending(false);
    }
  };

  const handleEndBreak = async () => {
    setIsBreakPending(true);
    try {
      const res = await fetch("/api/attendance/end-break", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to end break");
      toast.success("Break ended! Back to work");
      qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
      qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
    } catch (err: any) {
      toast.error(err.message || "Failed to end break");
    } finally {
      setIsBreakPending(false);
    }
  };

  // Live board checked-in users for today
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const liveBoardUsers = isUserAdminOrManager
    ? (attendanceHistory ?? []).filter((r) => {
        const isToday = r.date === todayDateStr;
        const activeRegular = r.checkInAt !== null && r.checkOutAt === null;
        const activeOvertime = r.overtimeCheckInAt !== null && r.overtimeCheckOutAt === null;
        return isToday && (activeRegular || activeOvertime);
      })
    : [];

  return (
    <div className="p-6 space-y-6 animated-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daily check-in, break tracking, live board & history logs
          </p>
        </div>
        {isUserAdminOrManager && (attendanceHistory ?? []).length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportAttendanceCSV(attendanceHistory ?? [])}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Check In / Out / Break Control Card */}
        <Card className="md:col-span-1 shadow-sm border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Daily Shift & Breaks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !todayStatus?.checkedIn ? (
              <div className="space-y-4 text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Hello <strong>{user?.name}</strong>, you are not checked in for today.
                </p>
                <Button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  className="w-full btn-micro-anim"
                  data-testid="check-in-btn"
                >
                  {checkInMutation.isPending ? "Checking in..." : "Check In Now"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Employee Greeting */}
                <div className="text-xs font-medium text-muted-foreground flex items-center justify-between border-b pb-2">
                  <span>Logged in as: <strong>{user?.name}</strong></span>
                  <Badge variant="outline" className="text-[10px]">{user?.systemRole || "EMPLOYEE"}</Badge>
                </div>

                {/* Regular Shift Status */}
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>Shift Status</span>
                    </div>
                    {todayStatus.checkOutAt ? (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">
                        Completed
                      </Badge>
                    ) : (todayStatus as any).breakStatus === "ON_BREAK" ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] animate-pulse">
                        ☕ On Break
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] animate-pulse">
                        Active Working
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                    <p>
                      <strong>Check In:</strong>{" "}
                      {todayStatus.checkInAt ? format(new Date(todayStatus.checkInAt), "p") : "—"}
                    </p>
                    {todayStatus.checkOutAt && (
                      <p>
                        <strong>Check Out:</strong>{" "}
                        {format(new Date(todayStatus.checkOutAt), "p")}
                      </p>
                    )}
                    {((todayStatus as any).breakDurationMin ?? 0) > 0 && (
                      <p className="text-amber-700 dark:text-amber-400">
                        <strong>Total Break:</strong> {(todayStatus as any).breakDurationMin} mins
                      </p>
                    )}
                  </div>
                </div>

                {/* Break Management Buttons */}
                {!todayStatus.checkOutAt && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium">Break Management</p>
                    {(todayStatus as any).breakStatus === "ON_BREAK" ? (
                      <Button
                        variant="default"
                        onClick={handleEndBreak}
                        disabled={isBreakPending}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2 btn-micro-anim"
                      >
                        <PlayCircle className="h-4 w-4" /> End Break
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleStartBreak}
                        disabled={isBreakPending}
                        className="w-full border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 gap-2 btn-micro-anim"
                      >
                        <Coffee className="h-4 w-4" /> Start Break
                      </Button>
                    )}
                  </div>
                )}

                {/* Overtime Shift Details */}
                {todayStatus.overtimeCheckInAt && (
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300 font-semibold text-sm">
                        <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                        <span>Overtime Shift</span>
                      </div>
                      {todayStatus.overtimeCheckOutAt ? (
                        <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 text-[10px]">
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-violet-500 text-white dark:bg-violet-600 text-[10px] animate-pulse">
                          🟣 Overtime
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-violet-700 dark:text-violet-400 space-y-1">
                      <p>
                        <strong>Overtime Check In:</strong>{" "}
                        {format(new Date(todayStatus.overtimeCheckInAt), "p")}
                      </p>
                      {todayStatus.overtimeCheckOutAt && (
                        <p>
                          <strong>Overtime Check Out:</strong>{" "}
                          {format(new Date(todayStatus.overtimeCheckOutAt), "p")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Main Action Buttons */}
                {!todayStatus.checkOutAt ? (
                  <Button
                    variant="outline"
                    onClick={() => checkOutMutation.mutate()}
                    disabled={checkOutMutation.isPending || (todayStatus as any).breakStatus === "ON_BREAK"}
                    className="w-full btn-micro-anim text-destructive hover:text-destructive hover:bg-destructive/10"
                    data-testid="check-out-btn"
                  >
                    {checkOutMutation.isPending ? "Checking out..." : "Check Out Shift"}
                  </Button>
                ) : !todayStatus.overtimeCheckInAt ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                      Regular shift completed. Start overtime?
                    </p>
                    <Button
                      variant="default"
                      onClick={() => overtimeCheckInMutation.mutate()}
                      disabled={overtimeCheckInMutation.isPending}
                      className="w-full btn-micro-anim bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-700 dark:hover:bg-violet-600"
                      data-testid="overtime-check-in-btn"
                    >
                      {overtimeCheckInMutation.isPending ? "Starting Overtime..." : "Overtime Check In"}
                    </Button>
                  </div>
                ) : !todayStatus.overtimeCheckOutAt ? (
                  <Button
                    variant="outline"
                    onClick={() => overtimeCheckOutMutation.mutate()}
                    disabled={overtimeCheckOutMutation.isPending}
                    className="w-full btn-micro-anim border-violet-500 text-violet-400 hover:bg-violet-950/20 dark:border-violet-600 dark:text-violet-300 dark:hover:bg-violet-900/20"
                    data-testid="overtime-check-out-btn"
                  >
                    {overtimeCheckOutMutation.isPending ? "Ending Overtime..." : "Overtime Check Out"}
                  </Button>
                ) : (
                  <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border">
                    🎉 Attendance completed for today!
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Board */}
        {isUserAdminOrManager && (
          <Card className="md:col-span-2 shadow-sm border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Live Board — Team Status ({liveBoardUsers.length} checked in)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-full" />
                  ))}
                </div>
              ) : liveBoardUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No team members checked in currently.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {liveBoardUsers.map((r: any) => {
                    const isOvertime = r.overtimeCheckInAt !== null && r.overtimeCheckOutAt === null;
                    const isOnBreak = r.breakStatus === "ON_BREAK";
                    return (
                      <Badge key={r.id} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
                        <span className="font-semibold text-xs">{r.userName || "Employee"}</span>
                        {isOnBreak ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50 font-bold dark:bg-amber-950/30 dark:text-amber-300">
                            ☕ On Break
                          </Badge>
                        ) : isOvertime ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-violet-300 text-violet-400 bg-violet-950/20 font-bold dark:border-violet-600 dark:text-violet-300">
                            🟣 Overtime
                          </Badge>
                        ) : r.isLate ? (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 scale-95 origin-center font-bold">
                            LATE
                          </Badge>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Attendance Logs & History Table */}
      <Card className="shadow-sm border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Attendance Logs & History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (attendanceHistory ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No attendance logs found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Break Time</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Total Working Hours</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(attendanceHistory ?? []).map((r: any) => {
                  const netWorkMs = calculateNetWorkingMs(r.checkInAt, r.checkOutAt, r.breakDurationMin || 0);
                  const otMs = calculateDuration(r.overtimeCheckInAt, r.overtimeCheckOutAt);
                  const totalMs = netWorkMs + otMs;

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {r.date ? format(new Date(`${r.date}T00:00:00`), "MMM dd, yyyy") : (r.checkInAt ? formatDateOnly(r.checkInAt, "MMM dd, yyyy") : "—")}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {r.userName || "Unknown Employee"}
                      </TableCell>
                      <TableCell>
                        {r.checkInAt ? format(new Date(r.checkInAt), "HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        {r.checkOutAt ? format(new Date(r.checkOutAt), "HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        {(r.breakDurationMin || 0) > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {r.breakDurationMin} mins
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {r.overtimeCheckInAt ? (
                          <span className="text-violet-600 dark:text-violet-300 font-medium">
                            {format(new Date(r.overtimeCheckInAt), "HH:mm")} – {r.overtimeCheckOutAt ? format(new Date(r.overtimeCheckOutAt), "HH:mm") : "Working"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {totalMs > 0 ? formatDuration(totalMs) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          {r.status === "ABSENT" ? (
                            <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 font-semibold">
                              Absent
                            </Badge>
                          ) : r.status === "ON_LEAVE" ? (
                            <Badge variant="outline" className="border-sky-200 text-sky-700 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-900/50 dark:text-sky-400 font-semibold">
                              On Leave
                            </Badge>
                          ) : r.status === "HALF_DAY" ? (
                            <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400 font-semibold">
                              Half Day
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400 font-semibold">
                              Present
                            </Badge>
                          )}
                          {r.isLate && r.status !== "ABSENT" && (
                            <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" /> Late
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
