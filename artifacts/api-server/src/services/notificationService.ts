import { db } from "@workspace/db";
import { notifications, users } from "@workspace/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export interface CreateNotificationParams {
  userId: string;
  senderId?: string | null;
  title: string;
  message: string;
  type?: string; // e.g., "TASK", "PROJECT", "MEETING", "LEAVE", "ANNOUNCEMENT", "SYSTEM"
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  action?: string | null;
  actionUrl?: string | null;
  referenceId?: string | null;
  referenceType?: string | null; // e.g., "TASK", "PROJECT", "MEETING", "LEAVE", "ANNOUNCEMENT"
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
}

export class NotificationService {
  /**
   * Create a single notification for a user
   */
  static async createNotification(params: CreateNotificationParams) {
    const {
      userId,
      senderId = null,
      title,
      message,
      type = "SYSTEM",
      priority = "LOW",
      action = null,
      actionUrl = null,
      referenceId = null,
      referenceType = null,
      metadata = null,
      createdBy = null,
    } = params;

    if (!userId || !title || !message) return null;

    try {
      const [notification] = await db
        .insert(notifications)
        .values({
          id: crypto.randomUUID(),
          userId,
          senderId: senderId || createdBy || null,
          title,
          message,
          type,
          priority,
          action,
          actionUrl,
          referenceId,
          referenceType,
          metadata: metadata || null,
          isRead: false,
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return notification;
    } catch (err) {
      console.error("[NotificationService] Error creating notification:", err);
      return null;
    }
  }

  /**
   * Create notifications for multiple users
   */
  static async createNotificationsForUsers(
    userIds: string[],
    params: Omit<CreateNotificationParams, "userId">
  ) {
    if (!userIds || userIds.length === 0) return [];

    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    const results = [];

    for (const uId of uniqueUserIds) {
      const created = await this.createNotification({
        ...params,
        userId: uId,
      });
      if (created) results.push(created);
    }

    return results;
  }

  /**
   * Send notification to all active users with specific role(s) or all users
   */
  static async sendBroadcast({
    title,
    message,
    type = "ANNOUNCEMENT",
    priority = "HIGH",
    targetRole = null, // null for all active users
    referenceId = null,
    referenceType = "ANNOUNCEMENT",
    createdBy = null,
  }: {
    title: string;
    message: string;
    type?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    targetRole?: string | null;
    referenceId?: string | null;
    referenceType?: string | null;
    createdBy?: string | null;
  }) {
    try {
      let query = db.select({ id: users.id }).from(users).where(eq(users.isActive, true));

      const activeUsers = await query;
      let targetUserIds = activeUsers.map((u) => u.id);

      if (targetRole) {
        // filter by system role or role
        const roleUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.isActive, true),
              sql`(${users.systemRole} = ${targetRole} OR ${users.role} = ${targetRole})`
            )
          );
        targetUserIds = roleUsers.map((u) => u.id);
      }

      return await this.createNotificationsForUsers(targetUserIds, {
        title,
        message,
        type,
        priority,
        referenceId,
        referenceType,
        createdBy,
      });
    } catch (err) {
      console.error("[NotificationService] Error broadcasting notifications:", err);
      return [];
    }
  }
}
