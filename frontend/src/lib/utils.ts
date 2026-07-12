import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function apiClient(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    available: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_shop: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    retired: "bg-red-500/10 text-red-500 border-red-500/20",
    on_trip: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    on_leave: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    suspended: "bg-red-500/10 text-red-500 border-red-500/20",
    draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    dispatched: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_progress: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    // Maintenance & misc
    low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    // AI grades
    A: "bg-emerald-500/10 text-emerald-500",
    B: "bg-blue-500/10 text-blue-500",
    C: "bg-amber-500/10 text-amber-500",
    D: "bg-red-500/10 text-red-500",
    // Notification
    info: "bg-blue-500/10 text-blue-500",
    warning: "bg-amber-500/10 text-amber-500",
    danger: "bg-red-500/10 text-red-500",
    success: "bg-emerald-500/10 text-emerald-500",
  };
  return colors[status] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Active",
    available: "Available",
    in_shop: "In Shop",
    retired: "Retired",
    on_trip: "On Trip",
    on_leave: "On Leave",
    suspended: "Suspended",
    draft: "Draft",
    dispatched: "Dispatched",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    scheduled: "Scheduled",
    preventive: "Preventive",
    corrective: "Corrective",
  };
  return labels[status] || status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function daysUntil(date: string | Date): number {
  const target = new Date(date);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
