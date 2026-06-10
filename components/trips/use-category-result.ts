"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CategoryResult, PreferenceCategory } from "@/lib/api/types";

type UseCategoryResult = {
  result: CategoryResult | null;
  error: string | null;
  /** Start (or keep) a realtime listener. Idempotent. */
  goLive: () => void;
};

/**
 * Lazy reader for a single category's results doc.
 *
 * On mount it does a one-time `getDoc`; if a result already exists it upgrades
 * to a realtime listener. Otherwise it stays quiet — callers invoke `goLive()`
 * after kicking off a run so an idle, never-run category holds no listener.
 */
export function useCategoryResult(
  tripId: string,
  category: PreferenceCategory,
): UseCategoryResult {
  const [result, setResult] = useState<CategoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const goLive = useCallback(() => {
    if (unsubRef.current) return;
    unsubRef.current = onSnapshot(
      doc(db, "trips", tripId, "categoryResults", category),
      (snapshot) => {
        if (!snapshot.exists()) {
          setResult(null);
          return;
        }

        const rawData = snapshot.data();
        const divergence = getCategoryResultContractDivergence(rawData);
        if (divergence) {
          setResult(null);
          setError(`Contract divergence in category result: ${divergence}`);
          return;
        }

        setError(null);
        setResult(rawData as CategoryResult);
      },
      (err) => {
        setError(err instanceof Error ? err.message : "Unable to load results.");
      },
    );
  }, [tripId, category]);

  useEffect(() => {
    let cancelled = false;

    getDoc(doc(db, "trips", tripId, "categoryResults", category))
      .then((snapshot) => {
        if (cancelled) return;
        if (snapshot.exists()) {
          const rawData = snapshot.data();
          const divergence = getCategoryResultContractDivergence(rawData);
          if (divergence) {
            setResult(null);
            setError(`Contract divergence in category result: ${divergence}`);
            return;
          }
          setError(null);
          setResult(rawData as CategoryResult);
          goLive();
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load results.");
      });

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [tripId, category, goLive]);

  return { result, error, goLive };
}

const CATEGORY_RESULT_STATUSES = ["running", "complete", "error"] as const;

function getCategoryResultContractDivergence(value: unknown): string | null {
  if (!isRecord(value)) return "doc is not an object";
  if (!isOneOf(value.status, CATEGORY_RESULT_STATUSES)) return "status is missing or unknown";
  if (!Array.isArray(value.candidates)) return "candidates is missing";
  if (!Array.isArray(value.sourceParticipantIds)) return "sourceParticipantIds is missing";
  if (!isRecord(value.metrics)) return "metrics is missing";
  if (typeof value.traceId !== "string") return "traceId is missing";
  if (typeof value.updatedAt !== "string") return "updatedAt is missing";
  if (typeof value.stale !== "boolean") return "stale is missing";

  for (const [index, candidate] of value.candidates.entries()) {
    if (!isRecord(candidate)) return `candidates[${index}] is not an object`;
    if (typeof candidate.placeId !== "string") return `candidates[${index}].placeId is missing`;
    if (typeof candidate.name !== "string") return `candidates[${index}].name is missing`;
    if (typeof candidate.address !== "string") return `candidates[${index}].address is missing`;
    if (typeof candidate.lat !== "number") return `candidates[${index}].lat is missing`;
    if (typeof candidate.lng !== "number") return `candidates[${index}].lng is missing`;
    if (typeof candidate.whyItFits !== "string") return `candidates[${index}].whyItFits is missing`;
    if (typeof candidate.suggested !== "boolean") return `candidates[${index}].suggested is missing`;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}
