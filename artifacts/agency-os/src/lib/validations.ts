import { z } from "zod";

export const clientSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  billingAddress: z.string().optional(),
  gstin: z.string().optional(),
  category: z.enum(["RETAINER", "ONE_TIME", "LEAD", "CHURNED"]),
  source: z.string().optional(),
  health: z.enum(["GREEN", "YELLOW", "RED"]),
  internalNotes: z.string().optional(),
});

export const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  systemRole: z.enum([
    "SUPER_ADMIN",
    "MANAGER",
    "ACCOUNT_MANAGER",
    "DESIGNER",
    "SALES_EXECUTIVE",
    "DEVELOPER",
    "FINANCE_EXECUTIVE",
    "HR",
  ]),
  isActive: z.boolean().optional(),
});

export const leadSchema = z.object({
  title: z.string().min(2, "Title is required"),
  companyName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  value: z.coerce.number().optional(),
  stage: z.enum([
    "LEAD",
    "CONTACTED",
    "DEMO_GIVEN",
    "PROPOSAL_SENT",
    "NEGOTIATION",
    "WON",
    "LOST",
  ]),
  lostReason: z.string().optional(),
  ownerId: z.string().optional(),
  followUpAt: z.string().optional(),
});

export const projectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  clientId: z.string().min(1, "Client is required"),
  serviceType: z.string().optional(),
  status: z.enum([
    "IN_PROGRESS",
    "ON_HOLD",
    "UNDER_REVIEW",
    "COMPLETED",
    "CANCELLED",
  ]),
  budget: z.coerce.number().optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  managerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(2, "Title is required"),
  projectId: z.string().min(1, "Project is required"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export const proposalSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(2),
  templateKey: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "VIEWED", "APPROVED", "REJECTED"]),
  subtotal: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE"]),
  currency: z.enum(["INR", "USD", "AED", "GBP"]),
  subtotal: z.coerce.number().min(0),
  gstRate: z.coerce.number().min(0).max(100),
  dueDate: z.string().optional(),
});

export const fullInvoiceLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01),
  rate: z.coerce.number().min(0),
  gstRate: z.coerce.number().min(0).max(100),
});

export const fullInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().optional(),
  currency: z.enum(["INR", "USD", "AED", "GBP"]),
  gstRate: z.coerce.number().min(0).max(100),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  discount: z.coerce.number().min(0).optional(),
  lineItems: z.array(fullInvoiceLineSchema).min(1, "At least one line item is required"),
});

export const fullQuotationLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  hours: z.coerce.number().min(0).optional(),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
});

export const fullQuotationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(2, "Title is required"),
  templateKey: z.string().optional(),
  validUntil: z.string().optional(),
  discount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  lineItems: z.array(fullQuotationLineSchema).min(1, "At least one line item is required"),
});

export const contentPostSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(2),
  caption: z.string().optional(),
  script: z.string().optional(),
  status: z.enum([
    "IDEA",
    "SCRIPTING",
    "DESIGNING",
    "IN_REVIEW",
    "ADMIN_APPROVED",
    "SCHEDULED",
    "PUBLISHED",
  ]),
  assigneeId: z.string().optional(),
  scheduledAt: z.string().optional(),
});

export const settingsSchema = z.object({
  companyName: z.string().min(2),
  primaryColor: z.string().optional(),
  emailDomain: z.string().optional(),
  gstNumber: z.string().optional(),
  defaultGstRate: z.coerce.number().min(0).max(100),
  sessionTimeoutMin: z.coerce.number().min(15).max(480),
  checkInDeadline: z.string().optional(),
});

export const contractSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  durationMonths: z.coerce.number().min(1, "Duration must be at least 1 month").max(36),
  startMonth: z.string().min(1, "Start month is required"),
  reelsPerMonth: z.coerce.number().min(0).default(0),
  postsPerMonth: z.coerce.number().min(0).default(0),
  carouselsPerMonth: z.coerce.number().min(0).default(0),
  blogsPerMonth: z.coerce.number().min(0).default(0),
  budget: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export const deliverableSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  scriptOrDraft: z.string().optional(),
  referenceLinks: z.union([z.string(), z.array(z.string())]).optional(),
  conceptIdeation: z.string().optional(),
  visualReferences: z.union([z.string(), z.array(z.string())]).optional(),
  imageReferenceUrl: z.string().optional(),
  captionDraft: z.string().optional(),
  hashtags: z.string().optional(),
  internalNotes: z.string().optional(),
  scheduledDate: z.string().optional(),
  status: z.enum([
    "PENDING",
    "IDEA_ADDED",
    "IN_PRODUCTION",
    "IN_REVIEW",
    "APPROVED",
    "PUBLISHED",
  ]),
});

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
