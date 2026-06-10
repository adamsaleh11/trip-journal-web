"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, Circle } from "lucide-react";
import { usePreferences } from "./use-preferences";
import {
  PreferenceCategory,
  Participant,
  Member,
} from "@/lib/api/types";
import {
  FoodDrinkForm,
  OutdoorsScenicForm,
  NightlifeForm,
  CultureLocalForm,
  LogisticsForm,
} from "./category-forms";
import { summarizeCategory } from "@/lib/preferences/summary";

const CATEGORIES: Array<{
  key: PreferenceCategory;
  label: string;
  icon: string;
}> = [
  { key: "food_drink", label: "Food & Drink", icon: "🍔" },
  { key: "outdoors_scenic", label: "Outdoors", icon: "⛰️" },
  { key: "nightlife", label: "Nightlife", icon: "🍸" },
  { key: "culture_local", label: "Culture & Local", icon: "🏛️" },
  { key: "logistics", label: "Logistics", icon: "🧳" },
];

export function PreferencesSection({
  tripId,
  participants,
  members,
  currentUid,
}: {
  tripId: string;
  participants: Participant[];
  members: Member[];
  currentUid?: string;
}) {
  const {
    completionStatus,
    groupPreferences,
    loading,
    fetchStatusAndPreferences,
    saveCategoryPreference,
  } = usePreferences(tripId);

  useEffect(() => {
    fetchStatusAndPreferences();
  }, [fetchStatusAndPreferences]);

  const [selectedParticipantId, setSelectedParticipantId] = useState<
    string | null
  >(null);
  const [activeForm, setActiveForm] = useState<PreferenceCategory | null>(null);

  const isAdmin = members.some(
    (m) => m.uid === currentUid && m.role === "admin"
  );

  // Auto-select current user's participant if it exists
  useEffect(() => {
    if (!selectedParticipantId && currentUid && participants.length > 0) {
      const myParticipant = participants.find(
        (p) => p.claimedByUid === currentUid
      );
      if (myParticipant) setSelectedParticipantId(myParticipant.id);
    }
  }, [currentUid, participants, selectedParticipantId]);

  if (loading && completionStatus.length === 0) {
    return <div className="text-sm text-muted-foreground animate-pulse">Loading preferences...</div>;
  }

  const selectedParticipant = participants.find(
    (p) => p.id === selectedParticipantId
  );
  
  const isReadOnly = (participantId: string) => {
    if (isAdmin) return false;
    const participant = participants.find((p) => p.id === participantId);
    return participant?.claimedByUid !== currentUid;
  };

  const handleOpenForm = (participantId: string, category: PreferenceCategory) => {
    setSelectedParticipantId(participantId);
    setActiveForm(category);
  };

  const activeGroupPrefs = groupPreferences.find(
    (g) => g.participantId === selectedParticipantId
  )?.preferences;

  return (
    <div className="space-y-8">
      {/* Matrix View */}
      <div className="rounded-lg border border-border bg-card/80 p-5">
        <h2 className="text-xl font-semibold mb-4">Group Preferences</h2>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-3 px-2 font-medium">Traveler</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} className="py-3 px-2 font-medium text-center">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {completionStatus.map((entry) => (
                <tr key={entry.participantId} className="border-b border-border/20 last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-2 font-medium cursor-pointer" onClick={() => setSelectedParticipantId(entry.participantId)}>
                    {entry.displayName ?? "Unknown"}
                    {entry.claimedByUid === currentUid && " (You)"}
                  </td>
                  {CATEGORIES.map((c) => (
                    <td key={c.key} className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleOpenForm(entry.participantId, c.key)}
                        className="inline-flex items-center justify-center rounded-full w-8 h-8 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label={`${c.label} for ${entry.displayName}`}
                      >
                        {entry.filled[c.key] ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground/30" />
                        )}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Matrix */}
        <div className="sm:hidden space-y-4">
          {completionStatus.map((entry) => {
            const completed = CATEGORIES.filter((c) => entry.filled[c.key]).length;
            return (
              <div key={entry.participantId} className="rounded-md border border-border bg-background/35 p-3">
                <div 
                  className="flex items-center justify-between gap-3 cursor-pointer"
                  onClick={() => setSelectedParticipantId(entry.participantId)}
                >
                  <p className="font-medium">
                    {entry.displayName ?? "Unknown"}
                    {entry.claimedByUid === currentUid && " (You)"}
                  </p>
                  <span className="text-xs text-muted-foreground">{completed}/5 done</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.key}
                      onClick={() => handleOpenForm(entry.participantId, category.key)}
                      className={`inline-flex items-center px-2 py-1 text-xs rounded-full border ${
                        entry.filled[category.key]
                          ? "border-success/50 bg-success/10 text-success"
                          : "border-border text-muted-foreground"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                    >
                      {entry.filled[category.key] && (
                        <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                      )}
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Participant Cards */}
      {selectedParticipant && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
          <h3 className="text-lg font-semibold mb-4">
            {selectedParticipant.displayName}&apos;s Preferences
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((category) => {
              const status = completionStatus.find(
                (c) => c.participantId === selectedParticipantId
              );
              const isFilled = status?.filled[category.key];
              const summary = summarizeCategory(
                category.key,
                activeGroupPrefs?.[category.key],
              );

              return (
                <div
                  key={category.key}
                  onClick={() => handleOpenForm(selectedParticipant.id, category.key)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenForm(selectedParticipant.id, category.key);
                    }
                  }}
                  className={`relative flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring ${
                    isFilled ? "bg-card border-border" : "bg-card/50 border-dashed border-border"
                  }`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Edit ${category.label} for ${selectedParticipant.displayName}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {category.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{category.label}</p>
                      {isFilled ? (
                        <span className="text-xs text-emerald-300 flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Filled
                        </span>
                      ) : (
                        <span className="text-xs text-primary flex items-center gap-1 mt-1">
                          <Sparkles className="w-3 h-3" aria-hidden="true" /> AI will auto-fill
                        </span>
                      )}
                    </div>
                  </div>

                  {!summary.isEmpty && (
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        ...summary.chips,
                        ...summary.wishlistTags,
                      ].map((chip, index) => (
                        <span
                          key={`${chip}-${index}`}
                          title={chip}
                          className="inline-flex max-w-full items-center truncate rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drawer Forms */}
      {activeForm === "food_drink" && selectedParticipantId && (
        <FoodDrinkForm
          open={true}
          onOpenChange={(v) => !v && setActiveForm(null)}
          defaultValues={activeGroupPrefs?.food_drink}
          onSave={(data) => saveCategoryPreference(selectedParticipantId!, "food_drink", data)}
          readOnly={isReadOnly(selectedParticipantId)}
        />
      )}
      {activeForm === "outdoors_scenic" && selectedParticipantId && (
        <OutdoorsScenicForm
          open={true}
          onOpenChange={(v) => !v && setActiveForm(null)}
          defaultValues={activeGroupPrefs?.outdoors_scenic}
          onSave={(data) => saveCategoryPreference(selectedParticipantId!, "outdoors_scenic", data)}
          readOnly={isReadOnly(selectedParticipantId)}
        />
      )}
      {activeForm === "nightlife" && selectedParticipantId && (
        <NightlifeForm
          open={true}
          onOpenChange={(v) => !v && setActiveForm(null)}
          defaultValues={activeGroupPrefs?.nightlife}
          onSave={(data) => saveCategoryPreference(selectedParticipantId!, "nightlife", data)}
          readOnly={isReadOnly(selectedParticipantId)}
        />
      )}
      {activeForm === "culture_local" && selectedParticipantId && (
        <CultureLocalForm
          open={true}
          onOpenChange={(v) => !v && setActiveForm(null)}
          defaultValues={activeGroupPrefs?.culture_local}
          onSave={(data) => saveCategoryPreference(selectedParticipantId!, "culture_local", data)}
          readOnly={isReadOnly(selectedParticipantId)}
        />
      )}
      {activeForm === "logistics" && selectedParticipantId && (
        <LogisticsForm
          open={true}
          onOpenChange={(v) => !v && setActiveForm(null)}
          defaultValues={activeGroupPrefs?.logistics}
          onSave={(data) => saveCategoryPreference(selectedParticipantId!, "logistics", data)}
          readOnly={isReadOnly(selectedParticipantId)}
        />
      )}
    </div>
  );
}
