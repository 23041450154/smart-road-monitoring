"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function PageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // When pathname or searchParams change, navigation finished
    setIsNavigating(false);
    setProgress(100);
    const timer = setTimeout(() => {
      setProgress(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept clicks on internal links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        targetAttr !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentPath = window.location.pathname + window.location.search;
        if (href !== currentPath && href !== "#") {
          setIsNavigating(true);
          setProgress(25);

          setTimeout(() => setProgress((p) => (p > 0 && p < 85 ? p + 35 : p)), 100);
          setTimeout(() => setProgress((p) => (p > 0 && p < 90 ? p + 20 : p)), 300);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <>
      {/* Top Slim Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] bg-transparent pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-zinc-950 shadow-xs"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
            transition:
              progress === 100
                ? "width 150ms ease-out, opacity 200ms 80ms"
                : "width 200ms ease-out",
          }}
        />
      </div>

      {/* Floating Modern Spinner Pill */}
      {isNavigating && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/95 px-3.5 py-1.5 text-xs font-medium text-zinc-900 shadow-md backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Loader2 size={13} className="animate-spin text-zinc-900" />
          <span>Memuat...</span>
        </div>
      )}
    </>
  );
}
