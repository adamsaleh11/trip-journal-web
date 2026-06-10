"use client";

import { useState, useCallback } from "react";
import {
  getPreferenceStatus,
  getGroupPreferences,
  updateParticipantCategoryPreference,
} from "@/lib/api/trips";
import {
  CompletionEntry,
  GroupPreferencesEntry,
  PreferenceCategory,
  MemberPreferences,
} from "@/lib/api/types";

export function usePreferences(tripId: string) {
  const [completionStatus, setCompletionStatus] = useState<CompletionEntry[]>([]);
  const [groupPreferences, setGroupPreferences] = useState<GroupPreferencesEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatusAndPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, prefsRes] = await Promise.all([
        getPreferenceStatus(tripId),
        getGroupPreferences(tripId),
      ]);
      setCompletionStatus(statusRes);
      setGroupPreferences(prefsRes);
    } catch (err) {
      console.error("Failed to fetch preferences", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const saveCategoryPreference = async <T extends PreferenceCategory>(
    participantId: string,
    category: T,
    payload: NonNullable<MemberPreferences[T]>
  ) => {
    try {
      const updatedPrefs = await updateParticipantCategoryPreference(
        tripId,
        participantId,
        category,
        payload
      );

      // Optimistic update
      setCompletionStatus((prev) =>
        prev.map((entry) =>
          entry.participantId === participantId
            ? {
                ...entry,
                filled: { ...entry.filled, [category]: true },
              }
            : entry
        )
      );

      setGroupPreferences((prev) =>
        prev.map((entry) =>
          entry.participantId === participantId
            ? {
                ...entry,
                preferences: updatedPrefs,
              }
            : entry
        )
      );
    } catch (err) {
      console.error(`Failed to save ${category} for ${participantId}`, err);
      throw err;
    }
  };

  return {
    completionStatus,
    groupPreferences,
    loading,
    fetchStatusAndPreferences,
    saveCategoryPreference,
  };
}
