"use client";

import { useState } from "react";
import { AlertCircle, Clock, Lock, Play, RefreshCw, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CategoryResult, PreferenceCategory } from "@/lib/api/types";
import { generateCategory } from "@/lib/api/trips";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { useCategoryResult } from "./use-category-result";
import { AdminLockTooltip } from "./admin-lock-tooltip";

type CategoryAgentPanelProps = {
  tripId: string;
  category: PreferenceCategory;
  label: string;
  isAdmin?: boolean;
};

export function CategoryAgentPanel({
  tripId,
  category,
  label,
  isAdmin = false,
}: CategoryAgentPanelProps) {
  const { result, error: listenError, goLive } = useCategoryResult(tripId, category);
  const [isStarting, setIsStarting] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const toast = useToast();

  const isRunning = result?.status === "running" || isStarting;
  const hasRun = Boolean(result);

  const handleRunAgent = async () => {
    setIsStarting(true);
    setRunError(null);
    try {
      await generateCategory(tripId, category);
      goLive();
      toast({ title: `Researching ${label}…` });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        goLive();
        toast({ title: "Already running", description: `${label} is being researched.` });
      } else {
        setRunError(err instanceof Error ? err.message : "Failed to start the agent.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const error = runError ?? listenError ?? (result?.status === "error" ? result.error : null);

  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{label}</h3>
          {result?.stale && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-300">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Preferences changed since this ran.
            </p>
          )}
        </div>
        <AdminLockTooltip locked={!isAdmin}>
          <Button
            size="sm"
            variant="outline"
            disabled={isRunning || !isAdmin}
            onClick={handleRunAgent}
          >
            {!isAdmin ? (
              <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : isRunning ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {isRunning ? "Running…" : hasRun ? "Re-run agent" : "Run agent"}
          </Button>
        </AdminLockTooltip>
      </div>

      {error && (
        <p className="mb-3 text-sm text-destructive">{error}</p>
      )}

      {!hasRun && !isRunning && !error && (
        <p className="text-sm text-muted-foreground">Not run yet.</p>
      )}

      {result && result.candidates.length > 0 && (
        <>
          <ul className="space-y-3">
            {result.candidates.map((candidate, index) => (
              <li
                key={candidate.placeId || `${candidate.name}-${index}`}
                className="rounded-md bg-muted/50 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{candidate.name}</p>
                    {candidate.address && (
                      <p className="truncate text-xs text-muted-foreground">
                        {candidate.address}
                      </p>
                    )}
                  </div>
                  {candidate.suggested && (
                    <Badge
                      variant="secondary"
                      className="flex-shrink-0 gap-1 text-[10px] uppercase tracking-wide"
                    >
                      <Wand2 className="h-3 w-3" aria-hidden="true" /> AI-suggested
                    </Badge>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {candidate.timeOfDayFit && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {candidate.timeOfDayFit}
                    </span>
                  )}
                  {candidate.priceLevel && (
                    <span className="rounded-full border border-border px-2 py-0.5">
                      {candidate.priceLevel}
                    </span>
                  )}
                </div>

                {candidate.whyItFits && (
                  <p className="mt-2 text-muted-foreground">{candidate.whyItFits}</p>
                )}
                {candidate.travelersTip && (
                  <p className="mt-2 rounded-sm bg-primary/10 px-2 py-1.5 text-xs italic text-primary">
                    Tip: {candidate.travelersTip}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <CategoryMetricsSummary result={result} />
        </>
      )}

      {result && result.status === "complete" && result.candidates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No recommendations yet — try adjusting preferences and re-running.
        </p>
      )}
    </div>
  );
}

function CategoryMetricsSummary({ result }: { result: CategoryResult }) {
  const metrics = result.metrics as { latencyMs?: number; totalTokens?: number };
  const parts: string[] = [`${result.candidates.length} picks`];
  if (typeof metrics.latencyMs === "number") {
    parts.push(`${(metrics.latencyMs / 1000).toFixed(1)}s`);
  }
  if (typeof metrics.totalTokens === "number") {
    parts.push(`~${metrics.totalTokens.toLocaleString()} tokens`);
  }
  return (
    <p className="mt-3 text-xs text-muted-foreground/80">{parts.join(" · ")}</p>
  );
}
