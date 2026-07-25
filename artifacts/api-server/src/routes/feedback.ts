import { Router } from "express";
import { db } from "@workspace/db";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { sanitizeAndValidate, isValidUUID } from "../lib/validation";

const router = Router();

// POST /api/client/feedback — store content post feedback/comment
router.post("/feedback", asyncHandler(async (req, res) => {
  const { postId, comment } = req.body as { postId?: string; comment?: string };
  if (!postId || !comment) throw createError("postId and comment are required", 400);

  if (!isValidUUID(postId)) {
    throw createError("Invalid postId format", 400);
  }

  const sanitized = sanitizeAndValidate({ postId, comment });

  const userId = (req as any).userId ?? null;

  // Store as a comment on the content post's comments JSON column
  // First fetch the post, then append
  const result = await db.execute(
    `SELECT id, comments FROM content_posts WHERE id = $1`,
    [sanitized.postId]
  );
  const post = (result.rows ?? result)[0] as { id: string; comments: unknown } | undefined;
  if (!post) throw createError("Post not found", 404);

  const existing: Array<{ id: string; userId: string | null; comment: string; createdAt: string }> =
    Array.isArray(post.comments) ? (post.comments as any[]) : [];

  const newComment = {
    id: crypto.randomUUID(),
    userId,
    comment: sanitized.comment,
    createdAt: new Date().toISOString(),
  };
  const updated = [...existing, newComment];

  await db.execute(
    `UPDATE content_posts SET comments = $1::jsonb WHERE id = $2`,
    [JSON.stringify(updated), sanitized.postId]
  );

  return res.status(201).json(newComment);
}));

export default router;
