import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PageLoader } from "@/components/page-loader";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Laju — Smart Road Palembang",
  description: "Dashboard pemantauan lalu lintas dan kondisi jalan Palembang",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <PageLoader />
        </Suspense>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
