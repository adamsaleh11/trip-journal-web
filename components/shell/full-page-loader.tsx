import { Compass, Loader2 } from "lucide-react";

export function FullPageLoader({ label }: { label: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-md border border-primary/25 bg-primary/12 text-primary">
          <Compass className="h-7 w-7" aria-hidden="true" />
          <Loader2
            className="absolute -right-2 -top-2 h-5 w-5 animate-spin text-accent"
            aria-hidden="true"
          />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </main>
  );
}
