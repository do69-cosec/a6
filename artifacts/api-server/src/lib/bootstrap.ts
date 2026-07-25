import { hash } from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

function requireAdminConfig(): { email: string; password: string; name: string } {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (process.env.NODE_ENV === "production" && (!email || !password)) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required in production."
    );
  }

  const resolvedEmail = email ?? "admin@agencyos.com";
  const DEFAULT_PASSWORD = "Admin@123";
  const resolvedPassword = password ?? DEFAULT_PASSWORD;

  if (!password) {
    logger.warn(
      { email: resolvedEmail, defaultPassword: DEFAULT_PASSWORD },
      `Bootstrap: ADMIN_PASSWORD not set — using default password. Set ADMIN_PASSWORD in Replit Secrets to use a custom password.`
    );
  }

  return { email: resolvedEmail, password: resolvedPassword, name };
}

export async function bootstrapDatabase(): Promise<void> {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'MANAGER',
        system_role TEXT NOT NULL DEFAULT 'ACCOUNT_MANAGER',
        department TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migrate: rename old 'password' column to 'password_hash' if it exists
    await db.execute(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'password'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'password_hash'
        ) THEN
          ALTER TABLE users RENAME COLUMN password TO password_hash;
        END IF;
      END $$;
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        website TEXT,
        category TEXT DEFAULT 'RETAINER',
        health TEXT DEFAULT 'GREEN',
        notes TEXT,
        service_type TEXT,
        service_details TEXT,
        social_handles TEXT,
        website_url TEXT,
        content_frequency TEXT,
        target_audience TEXT,
        platforms TEXT,
        social_goals TEXT,
        content_types TEXT,
        website_type TEXT,
        website_features TEXT,
        cms_preference TEXT,
        budget_range TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const col of [
      "service_type TEXT", "service_details TEXT", "social_handles TEXT",
      "website_url TEXT", "content_frequency TEXT", "target_audience TEXT",
      "platforms TEXT", "social_goals TEXT", "content_types TEXT",
      "website_type TEXT", "website_features TEXT", "cms_preference TEXT", "budget_range TEXT",
      "logo_url TEXT",
    ]) {
      const [colName] = col.split(" ");
      await db.execute(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    for (const col of [
      "system_role TEXT NOT NULL DEFAULT 'ACCOUNT_MANAGER'",
      "department TEXT",
      "role TEXT NOT NULL DEFAULT 'MANAGER'",
      "password_hash TEXT",
      "allowed_modules TEXT",
    ]) {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        title TEXT,
        company_name TEXT,
        contact_name TEXT,
        email TEXT,
        stage TEXT DEFAULT 'LEAD',
        value NUMERIC,
        stage_changed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migrate leads table to match current Drizzle schema
    for (const col of [
      "title TEXT",
      "contact_name TEXT",
      "value NUMERIC",
      "stage_changed_at TIMESTAMP DEFAULT NOW()",
    ]) {
      await db.execute(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'PLANNING',
        start_date TEXT,
        end_date TEXT,
        budget NUMERIC,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        assignee_id TEXT,
        status TEXT DEFAULT 'TODO',
        priority TEXT DEFAULT 'MEDIUM',
        due_date TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS content_posts (
        id TEXT PRIMARY KEY,
        platform TEXT DEFAULT 'INSTAGRAM',
        content_type TEXT DEFAULT 'POST',
        status TEXT DEFAULT 'IDEA',
        caption TEXT,
        description TEXT,
        reference_url TEXT,
        scheduled_at TEXT,
        client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const col of [
      "title TEXT", "script TEXT", "ideation TEXT",
      "reference_links JSON", "shoot_date TEXT", "assets_link TEXT",
      "format TEXT", "needs_revision TEXT DEFAULT 'false'",
      "custom_properties JSON", "comments JSON",
      "approval_status TEXT DEFAULT 'PENDING'",
      "approved_by TEXT",
      "approved_at TIMESTAMP",
      "rejection_note TEXT",
      "media_urls JSONB DEFAULT '[]'",
    ]) {
      await db.execute(`ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        number TEXT,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'DRAFT',
        invoice_date TEXT,
        due_date TEXT,
        subtotal REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        discount_type TEXT DEFAULT 'FIXED',
        total REAL DEFAULT 0,
        notes TEXT,
        currency TEXT DEFAULT 'INR',
        gst_type TEXT DEFAULT 'CGST_SGST',
        logo_url TEXT,
        business_name TEXT,
        business_phone TEXT,
        business_email TEXT,
        business_pan TEXT,
        company_gstin TEXT,
        business_address TEXT,
        business_city TEXT,
        business_postal_code TEXT,
        business_state TEXT,
        client_gstin TEXT,
        client_phone TEXT,
        client_email TEXT,
        client_pan TEXT,
        billing_address TEXT,
        client_city TEXT,
        client_postal_code TEXT,
        client_state TEXT,
        shipping_address TEXT,
        terms_and_conditions TEXT,
        signature_url TEXT,
        bank_details JSONB,
        line_items JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migrate existing invoices table: add number column (was invoice_number)
    for (const col of [
      "number TEXT",
      "tax_amount REAL DEFAULT 0",
      "discount REAL DEFAULT 0",
      "discount_type TEXT DEFAULT 'FIXED'",
      "currency TEXT DEFAULT 'INR'",
      "gst_type TEXT DEFAULT 'CGST_SGST'",
      "logo_url TEXT",
      "business_name TEXT", "business_phone TEXT", "business_email TEXT", "business_pan TEXT",
      "company_gstin TEXT",
      "business_address TEXT", "business_city TEXT", "business_postal_code TEXT", "business_state TEXT",
      "client_gstin TEXT", "client_phone TEXT", "client_email TEXT", "client_pan TEXT",
      "billing_address TEXT", "client_city TEXT", "client_postal_code TEXT", "client_state TEXT",
      "shipping_address TEXT",
      "terms_and_conditions TEXT",
      "signature_url TEXT",
      "bank_details JSONB",
      "line_items JSONB",
    ]) {
      await db.execute(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS quotations (
        id TEXT PRIMARY KEY,
        number TEXT,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'DRAFT',
        valid_until TEXT,
        subtotal NUMERIC DEFAULT 0,
        tax_amount NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const col of [
      "quotation_date TEXT",
      "due_date TEXT",
      "currency TEXT DEFAULT 'INR'",
      "company_name TEXT",
      "company_phone TEXT",
      "company_gstin TEXT",
      "company_address TEXT",
      "company_city TEXT",
      "company_postal TEXT",
      "company_state TEXT",
      "company_email TEXT",
      "company_pan TEXT",
      "logo_url TEXT",
      "client_name TEXT",
      "client_phone TEXT",
      "client_gstin TEXT",
      "client_address TEXT",
      "client_city TEXT",
      "client_postal TEXT",
      "client_state TEXT",
      "client_email TEXT",
      "client_pan TEXT",
      "billing_address TEXT",
      "shipping_address TEXT",
      "line_items JSON",
      "tax_amount NUMERIC DEFAULT 0",
      "discount NUMERIC DEFAULT 0",
      "discount_type TEXT DEFAULT 'AMOUNT'",
      "terms_and_conditions TEXT",
      "signature_text TEXT",
      "bank_details JSON",
      "quotation_number TEXT",
    ]) {
      const [colName] = col.split(" ");
      await db.execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        po_number TEXT,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        client_name TEXT,
        status TEXT DEFAULT 'DRAFT',
        po_date TEXT,
        delivery_date TEXT,
        subtotal NUMERIC DEFAULT 0,
        tax NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);


    await db.execute(`
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        client_name TEXT,
        status TEXT DEFAULT 'DRAFT',
        valid_until TEXT,
        total NUMERIC DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_social_accounts (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        handle TEXT,
        page_id TEXT,
        profile_url TEXT,
        access_token TEXT,
        is_active TEXT DEFAULT 'true',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_calendar_shares (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        share_token TEXT NOT NULL UNIQUE,
        label TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);

    // Add parentId (subtasks) to tasks
    await db.execute(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE`).catch(() => {});

    await db.execute(`
      CREATE TABLE IF NOT EXISTS file_attachments (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        uploaded_by TEXT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        casual_total INTEGER DEFAULT 12,
        casual_used INTEGER DEFAULT 0,
        sick_total INTEGER DEFAULT 6,
        sick_used INTEGER DEFAULT 0,
        earned_total INTEGER DEFAULT 15,
        earned_used INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, year)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS lead_contacts (
        id TEXT PRIMARY KEY,
        lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
        type TEXT NOT NULL DEFAULT 'NOTE',
        subject TEXT NOT NULL,
        body TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id),
        user_id TEXT REFERENCES users(id),
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMP,
        duration_min INTEGER,
        note TEXT,
        is_billable BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add priority/due_date/description to projects (schema uses these names)
    for (const col of [
      "priority TEXT DEFAULT 'MEDIUM'",
      "due_date TEXT",
      "description TEXT",
    ]) {
      await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    // Add probability/expected_close_date/source/notes to leads (schema uses these names)
    for (const col of [
      "probability INTEGER DEFAULT 0",
      "expected_close_date TEXT",
      "source TEXT",
      "notes TEXT",
    ]) {
      await db.execute(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        check_in_at TIMESTAMP NOT NULL DEFAULT NOW(),
        check_out_at TIMESTAMP,
        break_start_at TIMESTAMP,
        break_end_at TIMESTAMP,
        break_duration_min INTEGER DEFAULT 0,
        break_status TEXT DEFAULT 'IDLE',
        is_late BOOLEAN NOT NULL DEFAULT false,
        overtime_min INTEGER NOT NULL DEFAULT 0,
        overtime_check_in_at TIMESTAMP,
        overtime_check_out_at TIMESTAMP,
        date TEXT NOT NULL
      )
    `);

    for (const col of [
      "break_start_at TIMESTAMP",
      "break_end_at TIMESTAMP",
      "break_duration_min INTEGER DEFAULT 0",
      "break_status TEXT DEFAULT 'IDLE'",
      "overtime_check_in_at TIMESTAMP",
      "overtime_check_out_at TIMESTAMP",
      "status TEXT DEFAULT 'PRESENT'",
    ]) {
      await db.execute(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }
    await db.execute(`ALTER TABLE attendance ALTER COLUMN check_in_at DROP NOT NULL`).catch(() => {});

    // Deduplicate any pre-existing records prior to adding unique index
    await db.execute(`
      DELETE FROM attendance 
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_id, date) id 
        FROM attendance 
        ORDER BY user_id, date, check_in_at DESC NULLS LAST, id DESC
      )
    `).catch(() => {});

    // Create database-level unique constraint on (user_id, date)
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS attendance_user_id_date_idx 
      ON attendance (user_id, date)
    `).catch(() => {});

    await db.execute(`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        meeting_link TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER NOT NULL,
        location TEXT,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        organizer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const col of [
      "updated_by TEXT",
      "deleted_at TIMESTAMP",
    ]) {
      await db.execute(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS meeting_attendees (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        email TEXT,
        status TEXT NOT NULL DEFAULT 'INVITED',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'SYSTEM',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const col of [
      "expires_at TIMESTAMP",
      "updated_by TEXT",
      "deleted_at TIMESTAMP",
    ]) {
      await db.execute(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_date TEXT`).catch(() => {});

    await db.execute(`
      DO $$ BEGIN
        CREATE TYPE leave_type AS ENUM ('CASUAL', 'SICK', 'EARNED', 'UNPAID');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await db.execute(`
      DO $$ BEGIN
        CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type leave_type NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT,
        status leave_status NOT NULL DEFAULT 'PENDING',
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS agency_settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        agency_name TEXT NOT NULL DEFAULT 'Blink Beyond',
        email TEXT,
        phone TEXT,
        address TEXT,
        website TEXT,
        primary_color TEXT NOT NULL DEFAULT '#6366f1',
        currency TEXT NOT NULL DEFAULT 'INR',
        tax_label TEXT NOT NULL DEFAULT 'GST',
        tax_percent REAL NOT NULL DEFAULT 18,
        logo_url TEXT,
        work_day_start TEXT NOT NULL DEFAULT '09:00',
        work_day_end TEXT NOT NULL DEFAULT '18:00',
        working_days TEXT DEFAULT '1,2,3,4,5',
        grace_period_min INTEGER DEFAULT 30,
        half_day_cutoff_time TEXT DEFAULT '12:00',
        absent_cutoff_time TEXT DEFAULT '11:00',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const col of [
      "working_days TEXT DEFAULT '1,2,3,4,5'",
      "grace_period_min INTEGER DEFAULT 30",
      "half_day_cutoff_time TEXT DEFAULT '12:00'",
      "absent_cutoff_time TEXT DEFAULT '11:00'",
    ]) {
      await db.execute(`ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    const { email, password, name } = requireAdminConfig();
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (!existing) {
      const passwordHash = await hash(password, 12);
      await db.insert(usersTable).values({
        name,
        email,
        password: passwordHash,
        role: "SUPER_ADMIN",
        systemRole: "SUPER_ADMIN",
        isActive: true,
      });
      logger.info({ email }, "Bootstrap: admin user created");
    } else {
      // Only sync the password if ADMIN_PASSWORD is explicitly configured.
      // If no env var is set, leave the existing password untouched so restarts
      // never break login.
      if (process.env.ADMIN_PASSWORD) {
        const passwordHash = await hash(password, 12);
        await db.update(usersTable).set({ password: passwordHash }).where(eq(usersTable.email, email));
        logger.info({ email }, "Bootstrap: admin user already exists — password synced from ADMIN_PASSWORD");
      } else {
        logger.info({ email }, "Bootstrap: admin user already exists — password unchanged");
      }
    }
  } catch (err) {
    logger.error({ err }, "Bootstrap failed");
    throw err;
  }
}
