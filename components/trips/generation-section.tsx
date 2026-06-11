"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminLockTooltip } from "./admin-lock-tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { generateItinerary, getGenerationQuota } from "@/lib/api/trips";
import { ApiError } from "@/lib/api/client";
import type {
  CompletionEntry,
  GenerationQuota,
  ManualPlan,
  ModelProvider,
  Participant,
} from "@/lib/api/types";
import { useGenerationDoc } from "./use-generation-doc";
import { GenerationProgressPanel } from "./generation-progress-panel";
import { ItineraryView } from "./itinerary-view";
import { GenerationPreflightDialog } from "./generation-preflight-dialog";
import { buildPreflight, type Preflight } from "./generation-preflight";
import {
  fetchCategoryFreshness,
  fetchLatestGenerationId,
} from "./generation-data";

type GenerationSectionProps = {
  tripId: string;
  participants: Participant[];
  completions: CompletionEntry[];
  manualPlans: ManualPlan[];
  isAdmin?: boolean;
};

function readRunningGenerationId(error: ApiError): string | null {
  const body = error.body as
    | { generationId?: string; detail?: { generationId?: string } }
    | null;
  return body?.generationId ?? body?.detail?.generationId ?? null;
}

export function GenerationSection({
  tripId,
  participants,
  completions,
  manualPlans,
  isAdmin = false,
}: GenerationSectionProps) {
  const toast = useToast();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [activeGenId, setActiveGenId] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provider, setProvider] = useState<ModelProvider>("groq");
  const [quota, setQuota] = useState<GenerationQuota | null>(null);

  const refreshQuota = useCallback(() => {
    // Advisory only — the backend enforces the cap, so failures stay silent.
    getGenerationQuota(tripId)
      .then(setQuota)
      .catch(() => setQuota(null));
  }, [tripId]);

  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  const { doc, error: generationError, isStale } = useGenerationDoc(tripId, activeGenId);

  useEffect(() => {
    let cancelled = false;
    fetchLatestGenerationId(tripId)
      .then((id) => {
        if (!cancelled) setActiveGenId(id);
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const runGeneration = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const { generationId } = await generateItinerary(tripId, provider);
      setActiveGenId(generationId);
      setPreflightOpen(false);
      refreshQuota();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const runningId = readRunningGenerationId(error);
        if (runningId) {
          setActiveGenId(runningId);
          setPreflightOpen(false);
          toast({ title: "Attaching to the run already in progress" });
          return;
        }
      }
      toast({
        title: "Couldn't start generation",
        description: error instanceof Error ? error.message : "Please try again.",
        kind: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [tripId, provider, toast, refreshQuota]);

  const openPreflight = useCallback(async () => {
    const freshness = await fetchCategoryFreshness(tripId).catch(() => ({}));
    setPreflight(buildPreflight(completions, participants, manualPlans, freshness));
    setPreflightOpen(true);
  }, [tripId, completions, participants, manualPlans]);

  if (bootstrapping) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (generationError) {
    return (
      <section className="rounded-lg border border-destructive/35 bg-destructive/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-destructive">Generation contract mismatch</h2>
            <p className="mt-1 text-sm text-muted-foreground">{generationError}</p>
          </div>
        </div>
      </section>
    );
  }

  if (doc?.status === "running") {
    return (
      <GenerationProgressPanel doc={doc} isStale={isStale} onRetry={runGeneration} />
    );
  }

  if (doc?.status === "error") {
    return <GenerationProgressPanel doc={doc} onRetry={runGeneration} />;
  }

  if (doc?.status === "complete" && doc.itinerary) {
    return (
      <ItineraryView
        itinerary={doc.itinerary}
        metrics={doc.metrics}
        onRegenerate={runGeneration}
        canRegenerate={isAdmin}
      />
    );
  }

  const quotaExhausted = quota?.remaining === 0;

  return (
    <section className="rounded-lg border border-border bg-card/80 p-5 sm:p-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Generate your itinerary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Six agents research real venues and compose a day-by-day plan from
            everyone&apos;s preferences and your manual plans.
          </p>
          {quota && quota.remaining !== null && (
            <p
              className={`mt-2 text-xs ${
                quotaExhausted ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {quotaExhausted
                ? `Daily limit reached (${quota.cap} per day). Resets at midnight UTC.`
                : `${quota.remaining} of ${quota.cap} generations left today`}
            </p>
          )}
        </div>
        <AdminLockTooltip locked={!isAdmin}>
          <Button
            size="lg"
            onClick={openPreflight}
            disabled={quotaExhausted || !isAdmin}
            className="flex-shrink-0"
          >
            {isAdmin ? (
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Generate Itinerary
          </Button>
        </AdminLockTooltip>
      </div>

      {preflight && (
        <GenerationPreflightDialog
          open={preflightOpen}
          onOpenChange={setPreflightOpen}
          preflight={preflight}
          onConfirm={runGeneration}
          isSubmitting={isSubmitting}
          isAdmin={isAdmin}
          provider={provider}
          onProviderChange={setProvider}
        />
      )}
    </section>
  );
}
