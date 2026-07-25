ALTER TABLE "tasks" ADD COLUMN "approval_status" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "requested_by" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;