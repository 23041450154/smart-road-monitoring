export default function Loading() {
  return (
    <div className="flex min-h-[55vh] w-full flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
      <div className="relative flex size-11 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-200/80" />
        <div className="absolute inset-0 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-zinc-950">L</span>
      </div>
      <p className="text-xs font-medium text-zinc-500 animate-pulse">
        Memuat data...
      </p>
    </div>
  );
}
