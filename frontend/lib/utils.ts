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
