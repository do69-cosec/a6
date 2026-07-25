CREATE TYPE "public"."leave_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('CASUAL', 'SICK', 'EARNED', 'UNPAID');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"check_in_at" timestamp DEFAULT now() NOT NULL,
	"check_out_at" timestamp,
	"is_late" boolean DEFAULT false NOT NULL,
	"overtime_min" integer DEFAULT 0 NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"email" text,
	"category" text DEFAULT 'RETAINER',
	"health" text DEFAULT 'GREEN',
	"notes" text,
	"service_type" text,
	"service_details" text,
	"social_handles" text,
	"website_url" text,
	"content_frequency" text,
	"target_audience" text,
	"platforms" text,
	"social_goals" text,
	"content_types" text,
	"website_type" text,
	"website_features" text,
	"cms_preference" text,
	"budget_range" text,
	"logo_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_calendar_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"share_token" text NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "client_calendar_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "client_social_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"platform" text NOT NULL,
	"handle" text,
	"page_id" text,
	"profile_url" text,
	"access_token" text,
	"is_active" text DEFAULT 'true',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" text DEFAULT 'INSTAGRAM',
	"content_type" text DEFAULT 'POST',
	"status" text DEFAULT 'IDEA',
	"caption" text,
	"scheduled_at" text,
	"shoot_date" text,
	"client_id" text,
	"reference_url" text,
	"assets_link" text,
	"description" text,
	"script" text,
	"ideation" text,
	"format" text,
	"needs_revision" text DEFAULT 'false',
	"reference_links" json,
	"custom_properties" json,
	"comments" json,
	"title" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agency_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"agency_name" text DEFAULT 'Blink Beyond' NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"website" text,
	"primary_color" text DEFAULT '#6366f1' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"tax_label" text DEFAULT 'GST' NOT NULL,
	"tax_percent" real DEFAULT 18 NOT NULL,
	"logo_url" text,
	"work_day_start" text DEFAULT '09:00' NOT NULL,
	"work_day_end" text DEFAULT '18:00' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text,
	"client_id" text,
	"status" text DEFAULT 'DRAFT',
	"invoice_date" text,
	"due_date" text,
	"logo_url" text,
	"business_name" text,
	"business_phone" text,
	"business_email" text,
	"business_pan" text,
	"company_gstin" text,
	"business_address" text,
	"business_city" text,
	"business_postal_code" text,
	"business_state" text,
	"client_gstin" text,
	"client_phone" text,
	"client_email" text,
	"client_pan" text,
	"billing_address" text,
	"client_city" text,
	"client_postal_code" text,
	"client_state" text,
	"shipping_address" text,
	"currency" text DEFAULT 'INR',
	"gst_type" text DEFAULT 'CGST_SGST',
	"subtotal" real DEFAULT 0,
	"tax_amount" real DEFAULT 0,
	"discount" real DEFAULT 0,
	"discount_type" text DEFAULT 'FIXED',
	"total" real DEFAULT 0,
	"notes" text,
	"terms_and_conditions" text,
	"signature_url" text,
	"bank_details" json,
	"line_items" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"stage" text DEFAULT 'LEAD' NOT NULL,
	"company_name" text,
	"contact_name" text,
	"email" text,
	"value" real,
	"stage_changed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "leave_type" NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"reason" text,
	"status" "leave_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'NOT_STARTED',
	"priority" text DEFAULT 'MEDIUM',
	"client_id" text,
	"start_date" text,
	"due_date" text,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"client_id" text,
	"status" text DEFAULT 'DRAFT',
	"template" text,
	"value" real,
	"valid_until" text,
	"scope" text,
	"deliverables" text,
	"timeline" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text,
	"client_id" text,
	"status" text DEFAULT 'DRAFT',
	"order_date" text,
	"delivery_date" text,
	"company_gstin" text,
	"vendor_gstin" text,
	"billing_address" text,
	"shipping_address" text,
	"subtotal" real DEFAULT 0,
	"tax_amount" real DEFAULT 0,
	"total" real DEFAULT 0,
	"notes" text,
	"terms_and_conditions" text,
	"line_items" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text,
	"client_id" text,
	"status" text DEFAULT 'DRAFT',
	"quotation_date" text,
	"valid_until" text,
	"due_date" text,
	"currency" text DEFAULT 'INR',
	"company_name" text,
	"company_phone" text,
	"company_gstin" text,
	"company_address" text,
	"company_city" text,
	"company_postal" text,
	"company_state" text,
	"company_email" text,
	"company_pan" text,
	"logo_url" text,
	"client_name" text,
	"client_phone" text,
	"client_gstin" text,
	"client_address" text,
	"client_city" text,
	"client_postal" text,
	"client_state" text,
	"client_email" text,
	"client_pan" text,
	"billing_address" text,
	"shipping_address" text,
	"line_items" json,
	"subtotal" real DEFAULT 0,
	"tax_amount" real DEFAULT 0,
	"discount" real DEFAULT 0,
	"discount_type" text DEFAULT 'AMOUNT',
	"total" real DEFAULT 0,
	"notes" text,
	"terms_and_conditions" text,
	"signature_text" text,
	"bank_details" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'TODO',
	"priority" text DEFAULT 'MEDIUM',
	"project_id" text,
	"assignee_id" text,
	"due_date" text,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"role" text DEFAULT 'MANAGER' NOT NULL,
	"system_role" text DEFAULT 'ACCOUNT_MANAGER' NOT NULL,
	"department" text,
	"is_active" boolean DEFAULT true,
	"allowed_modules" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "lead_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"type" text DEFAULT 'NOTE' NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_calendar_shares" ADD CONSTRAINT "client_calendar_shares_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_social_accounts" ADD CONSTRAINT "client_social_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;