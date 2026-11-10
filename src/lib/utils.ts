import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
export const STATUS_LABEL: Record<string, string> = { ACTIVE: "Aktif", GRADUATED: "Lulus", MOVED_OUT: "Pindah" };
export const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", GURU: "Guru Mapel" };
export const SEMESTER_LABEL: Record<string, string> = { GANJIL: "Ganjil", GENAP: "Genap" };
