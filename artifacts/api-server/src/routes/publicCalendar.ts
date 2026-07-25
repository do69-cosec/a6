import { Router } from "express";
import { db } from "@workspace/db";
import { clientCalendarSharesTable, contentPostsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/calendar/:shareToken", async (req, res) => {
  try {
    const { shareToken } = req.params;

    const [share] = await db
      .select()
      .from(clientCalendarSharesTable)
      .where(eq(clientCalendarSharesTable.shareToken, shareToken));

    if (!share) {
      res.status(404).json({ error: "Share link not found" });
      return;
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      res.status(410).json({ error: "This share link has expired" });
      return;
    }

    const posts = await db
      .select()
      .from(contentPostsTable)
      .where(eq(contentPostsTable.clientId, share.clientId));

    res.json({
      label: share.label,
      clientId: share.clientId,
      posts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
