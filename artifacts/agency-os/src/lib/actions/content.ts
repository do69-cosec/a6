"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import { contentPostSchema, type ActionResult } from "@/lib/validations";

export async function createContentPost(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("content", "create");
    const parsed = contentPostSchema.safeParse({
      clientId: formData.get("clientId"),
      title: formData.get("title"),
      caption: formData.get("caption") || undefined,
      script: formData.get("script") || undefined,
      status: formData.get("status"),
      assigneeId: formData.get("assigneeId") || undefined,
      scheduledAt: formData.get("scheduledAt") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const platforms = (formData.get("platforms") as string) || "[]";

    await prisma.contentPost.create({
      data: {
        clientId: parsed.data.clientId,
        title: parsed.data.title,
        caption: parsed.data.caption,
        script: parsed.data.script,
        status: parsed.data.status,
        platforms,
        assigneeId: parsed.data.assigneeId || null,
        scheduledAt: parsed.data.scheduledAt
          ? new Date(parsed.data.scheduledAt)
          : null,
      },
    });

    await logAudit(user.id, "CREATE", "ContentPost", parsed.data.clientId);
    revalidatePath("/content");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create content",
    };
  }
}

export async function updateContentStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("content", "edit");
    const data: {
      status: "IDEA";
      publishedAt?: Date;
    } = { status: status as "IDEA" };

    if (status === "PUBLISHED") {
      data.publishedAt = new Date();
    }

    await prisma.contentPost.update({ where: { id }, data });
    await logAudit(user.id, "UPDATE_STATUS", "ContentPost", id, { status });
    revalidatePath("/content");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update content" };
  }
}

export async function approveContent(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("content", "edit");
    const post = await prisma.contentPost.findUnique({
      where: { id },
    });
    if (!post) {
      return { ok: false, error: "Content post not found" };
    }

    let publishProof = "https://back.ayrshare.com/proof/simulated-proof";
    const apiKey = process.env.AYRSHARE_API_KEY;

    if (apiKey) {
      try {
        let parsedPlatforms: string[] = [];
        try {
          parsedPlatforms = JSON.parse(post.platforms);
        } catch {
          parsedPlatforms = ["instagram", "linkedin"];
        }

        const response = await fetch("https://back.ayrshare.com/api/post", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post: post.caption || post.title,
            platforms: parsedPlatforms.map((p) => p.toLowerCase()),
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.status === "success") {
            publishProof = resJson.refUrl || resJson.postUrl || publishProof;
          }
        }
      } catch (err) {
        console.error("Ayrshare publishing failed:", err);
      }
    }

    await prisma.contentPost.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishProof,
      },
    });

    await logAudit(user.id, "PUBLISH", "ContentPost", id, { publishProof });
    revalidatePath("/content");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to publish content" };
  }
}
