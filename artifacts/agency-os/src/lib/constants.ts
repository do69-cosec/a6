// @ts-nocheck
import type { SystemRole } from "@/generated/prisma/client";

export const APP_NAME = "Blink Beyond";
export const APP_TAGLINE = "Agency Management System";

export const ROLE_LABELS: Record<SystemRole, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager / Team Lead",
  ACCOUNT_MANAGER: "Account Manager",
  DESIGNER: "Designer",
  SALES_EXECUTIVE: "Sales Executive",
  DEVELOPER: "Developer",
  FINANCE_EXECUTIVE: "Finance Executive",
  HR: "HR",
  CUSTOM: "Custom Role",
};

export const FUNNEL_STAGES = [
  { key: "LEAD", label: "Lead" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "DEMO_GIVEN", label: "Demo Given" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
] as const;

export const PROPOSAL_TEMPLATES = [
  { key: "website", name: "Website Development" },
  { key: "social", name: "Social Media Management" },
  { key: "performance", name: "Performance Marketing" },
  { key: "retainer", name: "Full-Service Retainer" },
  { key: "branding", name: "Custom Branding Package" },
] as const;

export const TASK_COLUMNS = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "IN_REVIEW", title: "In Review" },
  { id: "DONE", title: "Done" },
] as const;

export const CONTENT_STATUSES = [
  "IDEA",
  "SCRIPTING",
  "DESIGNING",
  "IN_REVIEW",
  "ADMIN_APPROVED",
  "SCHEDULED",
  "PUBLISHED",
] as const;
