import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = startOfDay(new Date());
  const open = await prisma.attendance.findFirst({
    where: {
      userId: session.user.id,
      checkInAt: { gte: today },
      checkOutAt: null,
    },
  });

  if (!open) {
    return NextResponse.json({ error: "No open check-in" }, { status: 400 });
  }

  const now = new Date();
  const minutes = Math.floor(
    (now.getTime() - open.checkInAt.getTime()) / 60000
  );
  const shiftMinutes = 8 * 60;
  const overtimeMin = Math.max(0, minutes - shiftMinutes);

  const record = await prisma.attendance.update({
    where: { id: open.id },
    data: { checkOutAt: now, overtimeMin },
  });

  return NextResponse.json(record);
}
