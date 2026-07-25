import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const timeEntrySchema = z.object({
  taskId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  minutes: z.number().int().min(1),
  startedAt: z.string(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const body = timeEntrySchema.safeParse(json);
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request data", details: body.error.issues }, { status: 400 });
    }

    const { taskId, projectId, description, minutes, startedAt } = body.data;

    // Check if task exists and get project ID if not provided
    let finalProjectId = projectId;
    if (taskId && !finalProjectId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { projectId: true },
      });
      if (task) {
        finalProjectId = task.projectId;
      }
    }

    const record = await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        taskId: taskId || null,
        projectId: finalProjectId || null,
        description: description || "Task timer entry",
        minutes,
        startedAt: new Date(startedAt),
        endedAt: new Date(),
        billable: true,
      },
    });

    revalidatePath("/time");
    revalidatePath("/dashboard");

    return NextResponse.json({ ok: true, record });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal Server Error" }, { status: 500 });
  }
}
