import { useState } from "react";
import {
  useListLeaveRequests,
  useCreateLeaveRequest,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  getListLeaveRequestsQueryKey,
} from "@workspace/api-client-react";
import type { LeaveRequestInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Plus, Check, X, FileText, User } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useForm, Controller } from "react-hook-form";

const LEAVE_TYPE_MAP: Record<string, string> = {
  CASUAL: "Casual Leave",
  SICK: "Sick Leave",
  EARNED: "Earned Leave",
  UNPAID: "Unpaid Leave",
};

const LEAVE_STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Rejected", className: "bg-rose-100 text-rose-700 border-rose-200" },
};

export default function LeavesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isUserAdminOrManager = user?.systemRole === "SUPER_ADMIN" || user?.systemRole === "MANAGER";

  // List of current user's leave requests
  const { data: myLeaves, isLoading: myLeavesLoading } = useListLeaveRequests(
    { userId: user?.id },
    {
      query: {
        queryKey: getListLeaveRequestsQueryKey({ userId: user?.id }),
        enabled: !!user?.id,
      },
    }
  );

  // List of all leave requests (for approvals tab)
  const { data: allLeaves, isLoading: allLeavesLoading } = useListLeaveRequests(
    { status: "PENDING" },
    {
      query: {
        queryKey: getListLeaveRequestsQueryKey({ status: "PENDING" }),
        enabled: isUserAdminOrManager,
      },
    }
  );

  const createMutation = useCreateLeaveRequest({
    mutation: {
      onSuccess: () => {
        toast.success("Leave request submitted");
        qc.invalidateQueries({ queryKey: getListLeaveRequestsQueryKey() });
        setDialogOpen(false);
        reset();
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to submit request");
      },
    },
  });

  const approveMutation = useApproveLeaveRequest({
    mutation: {
      onSuccess: () => {
        toast.success("Leave request approved");
        qc.invalidateQueries({ queryKey: getListLeaveRequestsQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to approve request");
      },
    },
  });

  const rejectMutation = useRejectLeaveRequest({
    mutation: {
      onSuccess: () => {
        toast.success("Leave request rejected");
        qc.invalidateQueries({ queryKey: getListLeaveRequestsQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to reject request");
      },
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<LeaveRequestInput>({
    defaultValues: { type: "CASUAL", startDate: "", endDate: "", reason: "" },
  });

  const onSubmit = (data: LeaveRequestInput) => {
    createMutation.mutate({ data });
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id });
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate({ id });
  };

  const calculateDays = (start: string, end: string) => {
    try {
      const days = differenceInDays(new Date(end), new Date(start)) + 1;
      return isNaN(days) ? 0 : days;
    } catch {
      return 0;
    }
  };

  return (
    <div className="p-6 space-y-6 animated-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Leaves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submit leave requests and view approval status
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 btn-micro-anim" data-testid="request-leave-btn">
          <Plus className="h-4 w-4" /> Request Leave
        </Button>
      </div>

      <Tabs defaultValue="my-leaves" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-leaves">My Requests</TabsTrigger>
          {isUserAdminOrManager && (
            <TabsTrigger value="approvals" data-testid="approvals-tab">
              Pending Approvals ({allLeaves?.length ?? 0})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-leaves">
          <Card className="shadow-sm border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Leave History</CardTitle>
            </CardHeader>
            <CardContent>
              {myLeavesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (myLeaves ?? []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No leave requests found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(myLeaves ?? []).map((l) => {
                      const statusInfo = LEAVE_STATUS_MAP[l.status ?? "PENDING"] ?? { label: l.status, className: "bg-slate-100 text-slate-800" };
                      const days = calculateDays(l.startDate, l.endDate);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">
                            {LEAVE_TYPE_MAP[l.type] ?? l.type}
                          </TableCell>
                          <TableCell>
                            {format(new Date(l.startDate), "dd MMM")} - {format(new Date(l.endDate), "dd MMM, yyyy")}
                          </TableCell>
                          <TableCell>{days} {days === 1 ? "day" : "days"}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={l.reason || ""}>
                            {l.reason || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={statusInfo.className}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isUserAdminOrManager && (
          <TabsContent value="approvals">
            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
                <CardDescription>Review and action leave requests submitted by staff members</CardDescription>
              </CardHeader>
              <CardContent>
                {allLeavesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (allLeaves ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No pending leave requests to review.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(allLeaves ?? []).map((l) => {
                        const days = calculateDays(l.startDate, l.endDate);
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-semibold flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span>{l.userName ?? "Unknown"}</span>
                            </TableCell>
                            <TableCell>{LEAVE_TYPE_MAP[l.type] ?? l.type}</TableCell>
                            <TableCell>
                              {format(new Date(l.startDate), "dd MMM")} - {format(new Date(l.endDate), "dd MMM, yyyy")}
                            </TableCell>
                            <TableCell>{days} {days === 1 ? "day" : "days"}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={l.reason || ""}>
                              {l.reason || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleApprove(l.id)}
                                  className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="Approve"
                                  data-testid={`approve-leave-${l.id}`}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReject(l.id)}
                                  className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  title="Reject"
                                  data-testid={`reject-leave-${l.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
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
          </TabsContent>
        )}
      </Tabs>

      {/* Request Leave Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="leave-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASUAL">Casual Leave</SelectItem>
                      <SelectItem value="SICK">Sick Leave</SelectItem>
                      <SelectItem value="EARNED">Earned Leave</SelectItem>
                      <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  {...register("startDate", { required: "Required" })}
                  type="date"
                  data-testid="leave-start-date"
                />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  {...register("endDate", { required: "Required" })}
                  type="date"
                  data-testid="leave-end-date"
                />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                {...register("reason")}
                placeholder="Reason for leave request..."
                rows={3}
                data-testid="leave-reason"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="submit-leave-btn">
                {createMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
