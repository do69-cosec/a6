import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateOnly(dateVal?: string | null | Date, fmt = "dd MMM yyyy"): string {
  if (!dateVal) return "—";

  const hasTimeFmt = /[Hhmsa]/.test(fmt);

  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return "—";
    return format(dateVal, fmt);
  }

  const str = String(dateVal).trim();
  if (!str) return "—";

  if (hasTimeFmt) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return format(d, fmt);
    }
  }

  const clean = str.split("T")[0];
  if (!clean) return "—";
  const parts = clean.split("-").map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return format(d, fmt);
    return "—";
  }
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  return format(d, fmt);
}

export function formatDateTime(dateVal?: string | null | Date, fmt = "dd MMM yyyy, HH:mm"): string {
  if (!dateVal) return "—";
  try {
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
}

export function formatTimeOnly(dateVal?: string | null | Date, fmt = "HH:mm"): string {
  if (!dateVal) return "—";
  try {
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
}

export function toInputDate(dateVal?: string | null): string {
  if (!dateVal) return "";
  return dateVal.split("T")[0] || "";
}

