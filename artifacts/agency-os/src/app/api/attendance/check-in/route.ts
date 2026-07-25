import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let latitude: number | null = null;
  let longitude: number | null = null;
  try {
    const body = await request.json();
    if (typeof body.latitude === "number") latitude = body.latitude;
    if (typeof body.longitude === "number") longitude = body.longitude;
  } catch (e) {
    // Ignore missing body
  }

  const today = startOfDay(new Date());
  const existing = await prisma.attendance.findFirst({
    where: {
      userId: session.user.id,
      checkInAt: { gte: today },
      checkOutAt: null,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already checked in" },
      { status: 400 }
    );
  }

  const settings = await prisma.agencySettings.findUnique({
    where: { id: "default" },
  });
  const deadline = settings?.checkInDeadline ?? "10:30";
  const [h, m] = deadline.split(":").map(Number);
  const now = new Date();
  const deadlineDate = new Date(today);
  deadlineDate.setHours(h ?? 10, m ?? 30, 0, 0);
  const isLate = now > deadlineDate;

  const record = await prisma.attendance.create({
    data: {
      userId: session.user.id,
      checkInAt: now,
      isLate,
      latitude,
      longitude,
    },
  });

  return NextResponse.json(record);
}
