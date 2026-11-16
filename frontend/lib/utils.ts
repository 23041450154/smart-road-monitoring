import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function dateTime(value: string | null) {
  if (!value) return "Belum ada data";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function routeLabel(value: string) {
  return {
    commute_to_work: "Rute Berangkat",
    commute_home: "Rute Pulang",
    custom: "Rute Kustom",
  }[value] ?? value;
}

export function cleanCameraName(name: string): string {
  if (!name) return "";
  return name.replace(/\s*\(Palembang\)/gi, "").replace(/^CCTV\s+/i, "").trim();
}

export function fiveMinuteWindowLabel(value?: string | null): string {
  if (!value) return "5 menit terakhir";
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return "5 menit terakhir";
  const start = new Date(end.getTime() - 5 * 60 * 1000);
  const fmt = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  const startStr = fmt.format(start).replace(/\./g, ":");
  const endStr = fmt.format(end).replace(/\./g, ":");
  return `${startStr} - ${endStr} WIB`;
}

