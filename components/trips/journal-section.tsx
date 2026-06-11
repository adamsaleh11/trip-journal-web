"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  HelpCircle,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateJournalEntry } from "@/lib/api/trips";
import type { JournalContributionUpdate, JournalEntry } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const noteLimit = 1000;

type JournalSectionProps = {
  tripId: string;
  entries: JournalEntry[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onEntrySaved?: (entry: JournalEntry) => void;
  onSharedStateChanged?: () => void;
};

export function JournalSection({
  tripId,
  entries,
  loading = false,
  error = null,
  onRetry,
  onEntrySaved,
  onSharedStateChanged,
}: JournalSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-3xl font-semibold">Journal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rate each stop, keep private notes, or share an anonymized tip.
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card/70 p-5 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
          Loading journal stops
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-5">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-medium">Journal could not load</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          {onRetry ? (
            <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && entries.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/70 p-5">
          <p className="font-medium">No journal stops yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed itinerary stops and saved whims will appear here.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {entries.map((entry) => (
          <JournalCard
            key={entry.placeId}
            tripId={tripId}
            entry={entry}
            onSaved={onEntrySaved}
            onSharedStateChanged={onSharedStateChanged}
          />
        ))}
      </div>
    </section>
  );
}

function JournalCard({
  tripId,
  entry,
  onSaved,
  onSharedStateChanged,
}: {
  tripId: string;
  entry: JournalEntry;
  onSaved?: (entry: JournalEntry) => void;
  onSharedStateChanged?: () => void;
}) {
  const [rating, setRating] = useState<number | null>(entry.myEntry?.rating ?? null);
  const [note, setNote] = useState(entry.myEntry?.note ?? "");
  const [shareAnonymously, setShareAnonymously] = useState(
    entry.myEntry?.shareAnonymously ?? false,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setRating(entry.myEntry?.rating ?? null);
    setNote(entry.myEntry?.note ?? "");
    setShareAnonymously(entry.myEntry?.shareAnonymously ?? false);
    setSaveError(null);
    setSaveMessage(null);
  }, [entry]);

  const savedPayload = useMemo<JournalContributionUpdate>(
    () => ({
      rating: entry.myEntry?.rating ?? null,
      note: entry.myEntry?.note ?? "",
      shareAnonymously: entry.myEntry?.shareAnonymously ?? false,
    }),
    [entry.myEntry],
  );
  const currentPayload = { rating, note, shareAnonymously };
  const dirty =
    currentPayload.rating !== savedPayload.rating ||
    currentPayload.note !== savedPayload.note ||
    currentPayload.shareAnonymously !== savedPayload.shareAnonymously;
  const noteTooLong = note.length > noteLimit;
  const shareNeedsRating = shareAnonymously && rating === null;
  const canSave = dirty && !saving && !noteTooLong && !shareNeedsRating;
  const shared = Boolean(entry.myEntry?.shareAnonymously && entry.myEntry.sharedOpaqueId);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const updated = await updateJournalEntry(tripId, entry.placeId, currentPayload);
      onSaved?.(updated);
      if (updated.myEntry?.shareError === "share_failed") {
        setSaveError("Could not update anonymous sharing. Your note was saved privately.");
      } else {
        setSaveMessage(updated.myEntry?.shareAnonymously ? "Shared anonymously" : "Saved private");
      }
      if (
        updated.myEntry?.shareAnonymously !== entry.myEntry?.shareAnonymously ||
        updated.myEntry?.sharedOpaqueId !== entry.myEntry?.sharedOpaqueId
      ) {
        onSharedStateChanged?.();
        window.dispatchEvent(new CustomEvent("trip-journal:shares-updated"));
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card/75 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatCategory(entry.category)}</Badge>
            <Badge variant={shared ? "success" : "secondary"}>
              {saving ? "Saving..." : shared ? "Shared anonymously" : "Private"}
            </Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold leading-tight">{entry.name}</h3>
          <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>{entry.address}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <Label className="text-sm">Rating</Label>
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label={`${entry.name} rating`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                className="rounded-md p-1 text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setRating(value)}
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    rating && value <= rating && "fill-primary text-primary",
                  )}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`journal-note-${entry.placeId}`}>Note</Label>
            <span
              className={cn(
                "text-xs text-muted-foreground",
                noteTooLong && "text-destructive",
              )}
            >
              {note.length}/{noteLimit}
            </span>
          </div>
          <Textarea
            id={`journal-note-${entry.placeId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={noteLimit + 100}
            rows={4}
            placeholder="What should you remember about this stop?"
          />
        </div>

        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor={`share-${entry.placeId}`}>
                  Share anonymously to help other travelers
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="What gets shared"
                      >
                        <HelpCircle className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-popover text-popover-foreground">
                      Shared: destination, venue, rating, and a scrubbed tip. Never shared: your name, trip, friends, email, handles, phone, exact dates, or private notes you keep off.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Your name and trip are never included.
              </p>
            </div>
            <Switch
              id={`share-${entry.placeId}`}
              checked={shareAnonymously}
              disabled={saving}
              onCheckedChange={setShareAnonymously}
              aria-label="Share anonymously to help other travelers"
            />
          </div>
          {shareNeedsRating ? (
            <p className="mt-2 text-sm text-destructive">Add a rating before sharing.</p>
          ) : null}
        </div>

        {entry.myEntry?.shareError === "share_failed" ? (
          <p className="flex items-start gap-2 text-sm text-amber-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Could not update anonymous sharing. This note is private.
          </p>
        ) : null}

        {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
        {saveMessage ? <p className="text-sm text-muted-foreground">{saveMessage}</p> : null}

        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          Save
        </Button>
      </div>
    </article>
  );
}

function formatCategory(category: string) {
  return category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
