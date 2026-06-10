"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { AlertCircle, Play, RefreshCw, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { CategoryResult, PreferenceCategory } from "@/lib/api/types";
import { generateCategory } from "@/lib/api/trips";
import { useToast } from "@/components/ui/toast";

type CategoryAgentPanelProps = {
  tripId: string;
  category: PreferenceCategory;
  label: string;
};

export function CategoryAgentPanel({ tripId, category, label }: CategoryAgentPanelProps) {
  const [result, setResult] = useState<CategoryResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "trips", tripId, "categoryResults", category),
      (snapshot) => {
        if (snapshot.exists()) {
          setResult(snapshot.data() as CategoryResult);
        } else {
          setResult(null);
        }
      },
      (err) => {
        setError(err instanceof Error ? err.message : `Unable to load ${label} results.`);
      }
    );

    return () => unsub();
  }, [tripId, category, label]);

  const handleRunAgent = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await generateCategory(tripId, category);
      toast({ title: `Started generating ${label}` });
    } catch (err: unknown) {
      if (isApiStatus(err, 409)) {
        toast({ title: "Already running", description: "Generation is in progress." });
      } else {
        setError(err instanceof Error ? err.message : "Failed to start generation");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const isRunning = result?.status === "running" || isGenerating;

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{label} Agent</h3>
          {result?.stale && (
            <p className="text-sm text-yellow-600 flex items-center mt-1">
              <AlertCircle className="w-4 h-4 mr-1" />
              Preferences have changed since last run.
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={isRunning}
          onClick={handleRunAgent}
        >
          {isRunning ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {result ? (result.stale ? "Re-run Agent" : "Re-run Agent") : "Run Agent"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive mb-4">
          Error: {error}
        </div>
      )}

      {result?.status === "error" && (
        <div className="text-sm text-destructive mb-4">
          Agent Error: {result.error || "Generation failed"}
        </div>
      )}

      {!result && !isRunning && (
        <div className="text-sm text-muted-foreground">
          Not run yet.
        </div>
      )}

      {result?.candidates && result.candidates.length > 0 && (
        <div className="space-y-3 mt-4">
          {result.candidates.map((candidate, idx) => (
            <div key={idx} className="bg-muted/50 rounded-md p-3 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{candidate.name}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{candidate.address}</div>
                </div>
                {candidate.suggested && (
                  <Badge variant="secondary" className="ml-2 flex-shrink-0 text-[10px] uppercase">
                    <Wand2 className="w-3 h-3 mr-1" /> AI Suggested
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-muted-foreground">{candidate.whyItFits}</p>
              {candidate.travelersTip && (
                <div className="mt-2 bg-primary/10 text-primary px-2 py-1.5 rounded-sm text-xs italic">
                  Tip: {candidate.travelersTip}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function isApiStatus(error: unknown, status: number) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === status
  );
}
