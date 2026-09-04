import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Laju — Smart Road Palembang",
  description: "Dashboard pemantauan lalu lintas dan kondisi jalan Palembang",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
