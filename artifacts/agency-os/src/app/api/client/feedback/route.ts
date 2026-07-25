import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const clientSession = cookieStore.get("client_session");

  if (!clientSession?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId, comment } = await request.json();

    if (!postId || !comment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the post belongs to the logged-in client
    const post = await prisma.contentPost.findUnique({
      where: { id: postId },
      select: { clientId: true },
    });

    if (!post || post.clientId !== clientSession.value) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Write content approval comment
    await prisma.contentApproval.create({
      data: {
        postId,
        reviewerId: `client-${clientSession.value}`,
        action: "revision",
        comment,
      },
    });

    // Move status back to "SCRIPTING" or "DESIGNING" depending on context, or keep IN_REVIEW
    await prisma.contentPost.update({
      where: { id: postId },
      data: { status: "SCRIPTING" }, // Client revisions send it back to scripting
    });

    revalidatePath("/content");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
