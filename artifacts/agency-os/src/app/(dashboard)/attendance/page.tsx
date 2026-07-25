import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckInControls } from "@/components/attendance/check-in-controls";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { isAdmin } from "@/lib/permissions";

export default async function AttendancePage() {
  const session = await auth();
  const userId = session!.user!.id;
  const today = startOfDay(new Date());

  const myOpen = await prisma.attendance.findFirst({
    where: { userId, checkInAt: { gte: today }, checkOutAt: null },
  });

  const liveBoard = isAdmin(session!.user!.systemRole)
    ? await prisma.attendance.findMany({
        where: { checkInAt: { gte: today }, checkOutAt: null },
        include: { user: { select: { name: true, department: true } } },
      })
    : [];

  const history = await prisma.attendance.findMany({
    where: { userId },
    orderBy: { checkInAt: "desc" },
    take: 14,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Daily check-in, live board & history
          </p>
        </div>
        <CheckInControls isCheckedIn={!!myOpen} />
      </div>

      {liveBoard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Live — checked in now ({liveBoard.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {liveBoard.map((a) => (
              <Badge key={a.id} variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5">
                <span>{a.user.name}</span>
                {a.isLate && <span className="text-[10px] text-destructive font-semibold">(late)</span>}
                {a.latitude != null && a.longitude != null && (
                  <a
                    href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline font-bold flex items-center ml-1"
                    title="View Location"
                  >
                    📍 Map
                  </a>
                )}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your recent attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check in</TableHead>
                <TableHead>Check out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{format(a.checkInAt, "PP")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{format(a.checkInAt, "p")}</span>
                      {a.latitude != null && a.longitude != null && (
                        <a
                          href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          📍 Map
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.checkOutAt ? format(a.checkOutAt, "p") : "—"}
                  </TableCell>
                  <TableCell>
                    {a.isLate ? (
                      <Badge variant="destructive">Late</Badge>
                    ) : (
                      <Badge variant="outline">On time</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
