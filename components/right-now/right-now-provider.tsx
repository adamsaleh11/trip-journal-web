"use client";

import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  BookOpenCheck,
  Clock3,
  Dice5,
  History,
  Loader2,
  MapPin,
  Navigation,
  Quote,
  Radar,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { createWhim } from "@/lib/api/whims";
import { saveWhimToJournal } from "@/lib/api/trips";
import type { WhimCreated, WhimLocation } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const rememberedCityKey = "trip-journal-right-now-city";
const placeholderMoods = ["something sweet", "watch the game", "surprise me"];
const excludeCap = 20;

type RightNowLaunchOptions = {
  tripId?: string;
  tripDestinationText?: string | null;
};

type RightNowContextValue = {
  openRightNow: (options?: RightNowLaunchOptions) => void;
};

type SuggestionRecord = WhimCreated & {
  whimText: string;
};

type SubmitErrorKind = "api" | "no-results" | "repeat";

type SubmitError = {
  kind: SubmitErrorKind;
  message: string;
};

const RightNowContext = createContext<RightNowContextValue | null>(null);

export function RightNowProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [launchOptions, setLaunchOptions] = useState<RightNowLaunchOptions>({});

  const openRightNow = useCallback((options: RightNowLaunchOptions = {}) => {
    setLaunchOptions(options);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openRightNow }), [openRightNow]);

  return (
    <RightNowContext.Provider value={value}>
      {children}
      <RightNowDialog
        open={open}
        onOpenChange={setOpen}
        launchOptions={launchOptions}
      />
    </RightNowContext.Provider>
  );
}

export function useRightNow() {
  const value = useContext(RightNowContext);

  if (!value) {
    throw new Error("useRightNow must be used inside RightNowProvider");
  }

  return value;
}

function RightNowDialog({
  open,
  onOpenChange,
  launchOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  launchOptions: RightNowLaunchOptions;
}) {
  const [whimText, setWhimText] = useState("");
  const [city, setCity] = useState("");
  const [needsCity, setNeedsCity] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<SubmitError | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<SuggestionRecord | null>(null);
  const [history, setHistory] = useState<SuggestionRecord[]>([]);
  const [seenPlaceIds, setSeenPlaceIds] = useState<string[]>([]);
  const [savedWhimIds, setSavedWhimIds] = useState<string[]>([]);
  const [savingWhimId, setSavingWhimId] = useState<string | null>(null);
  const [saveJournalError, setSaveJournalError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (!open) return;

    setWhimText("");
    setSubmitting(false);
    setError(null);
    setActiveSuggestion(null);
    setHistory([]);
    setSeenPlaceIds([]);
    setSavedWhimIds([]);
    setSavingWhimId(null);
    setSaveJournalError(null);
    const rememberedCity = window.localStorage.getItem(rememberedCityKey);
    const initialCity = rememberedCity ?? launchOptions.tripDestinationText ?? "";
    setCity(initialCity);
    setNeedsCity(Boolean(rememberedCity));
  }, [launchOptions.tripDestinationText, open]);

  useEffect(() => {
    if (!open) return;

    const intervalId = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % placeholderMoods.length);
    }, 2600);

    return () => window.clearInterval(intervalId);
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitWhim();
  }

  async function submitWhim(options: { reroll?: boolean } = {}) {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const location = needsCity ? getCityLocation(city) : await getBrowserLocation();
      const requestText = whimText.trim();
      if ("city" in location) {
        window.localStorage.setItem(rememberedCityKey, location.city);
        setCity(location.city);
        setNeedsCity(true);
      }

      const excludePlaceIds = seenPlaceIds.slice(0, excludeCap);
      const response = await createWhim({
        whimText: requestText,
        location,
        ...(launchOptions.tripId ? { tripId: launchOptions.tripId } : {}),
        ...(excludePlaceIds.length > 0 ? { excludePlaceIds } : {}),
      });

      if (!response?.suggestion) {
        setError({
          kind: "no-results",
          message: "Nothing nearby for that. Try another mood.",
        });
        return;
      }

      if (seenPlaceIds.includes(response.suggestion.placeId)) {
        setError({
          kind: "repeat",
          message: "That place already came up. Roll again for something new.",
        });
        return;
      }

      const nextSuggestion = { ...response, whimText: requestText };
      if (options.reroll && activeSuggestion) {
        setHistory((current) => [activeSuggestion, ...current]);
      }
      setActiveSuggestion(nextSuggestion);
      setSaveJournalError(null);
      setSeenPlaceIds((current) =>
        [...current, response.suggestion.placeId].slice(0, excludeCap),
      );
    } catch (submitError) {
      if (submitError instanceof GeolocationDeniedError) {
        const fallbackCity = city || launchOptions.tripDestinationText || "";
        setCity(fallbackCity);
        setNeedsCity(true);
        setError({
          kind: "api",
          message: "Location is unavailable. Enter a city and roll again.",
        });
        return;
      }

      setError(classifySubmitError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  function restoreSuggestion(suggestion: SuggestionRecord) {
    if (activeSuggestion) {
      setHistory((current) => [
        activeSuggestion,
        ...current.filter((item) => item.whimId !== suggestion.whimId),
      ]);
    } else {
      setHistory((current) => current.filter((item) => item.whimId !== suggestion.whimId));
    }
    setActiveSuggestion(suggestion);
    setError(null);
    setSaveJournalError(null);
  }

  async function handleSaveToJournal(suggestion: SuggestionRecord) {
    if (!launchOptions.tripId || savingWhimId) return;

    setSavingWhimId(suggestion.whimId);
    setSaveJournalError(null);
    try {
      await saveWhimToJournal(launchOptions.tripId, suggestion.whimId);
      setSavedWhimIds((current) =>
        current.includes(suggestion.whimId) ? current : [...current, suggestion.whimId],
      );
      window.dispatchEvent(
        new CustomEvent("trip-journal:journal-updated", {
          detail: { tripId: launchOptions.tripId },
        }),
      );
    } catch (saveError) {
      if (isApiErrorLike(saveError) && saveError.status === 403) {
        setSaveJournalError("You no longer have access to this trip.");
      } else {
        setSaveJournalError(
          saveError instanceof Error
            ? saveError.message
            : "Could not save this whim to the journal.",
        );
      }
    } finally {
      setSavingWhimId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-5 p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Dice5 className="h-5 w-5" aria-hidden="true" />
            <DialogTitle>Right Now</DialogTitle>
          </div>
          <DialogDescription>
            Roll one nearby idea for this exact moment.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="right-now-whim">Mood</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="right-now-whim"
                value={whimText}
                onChange={(event) => setWhimText(event.target.value)}
                placeholder={placeholderMoods[placeholderIndex]}
                autoComplete="off"
                className="h-12"
              />
              <Button type="submit" className="h-12 sm:min-w-36" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                Roll
              </Button>
            </div>
          </div>

          {needsCity ? (
            <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
              <Label htmlFor="right-now-city">City</Label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
                <Input
                  id="right-now-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Toronto"
                  required={needsCity}
                />
              </div>
            </div>
          ) : null}
        </form>

        {submitting ? <RightNowLoading /> : null}

        {error ? <RightNowError error={error} onRetry={() => void submitWhim()} /> : null}

        {activeSuggestion ? (
          <SuggestionCard
            suggestionRecord={activeSuggestion}
            onReroll={() => void submitWhim({ reroll: true })}
            submitting={submitting}
            tripScoped={Boolean(launchOptions.tripId)}
            saveState={
              savedWhimIds.includes(activeSuggestion.whimId)
                ? "saved"
                : savingWhimId === activeSuggestion.whimId
                  ? "saving"
                  : "idle"
            }
            saveError={saveJournalError}
            onSaveToJournal={() => void handleSaveToJournal(activeSuggestion)}
          />
        ) : null}

        {history.length > 0 ? (
          <HistoryStrip history={history} onRestore={restoreSuggestion} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SuggestionCard({
  suggestionRecord,
  onReroll,
  submitting,
  tripScoped,
  saveState,
  saveError,
  onSaveToJournal,
}: {
  suggestionRecord: SuggestionRecord;
  onReroll: () => void;
  submitting: boolean;
  tripScoped: boolean;
  saveState: "idle" | "saving" | "saved";
  saveError: string | null;
  onSaveToJournal: () => void;
}) {
  const suggestion = suggestionRecord.suggestion;
  return (
    <section className="rounded-lg border border-primary/25 bg-background/55 p-4 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
              <CategoryIcon category={suggestion.category} />
            </span>
            <Badge variant={suggestion.openNow === true ? "success" : "outline"}>
              {suggestion.openNow === true
                ? "Open now"
                : suggestion.openNow === false
                  ? "Closed now"
                  : "Hours not available"}
            </Badge>
          </div>
          <h3 className="mt-3 text-2xl font-semibold leading-tight">{suggestion.name}</h3>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>{suggestion.address}</span>
          </p>
        </div>
      </div>

      <p className="mt-4 rounded-md bg-muted/45 px-3 py-2 text-sm">{suggestion.whyThis}</p>

      {suggestion.travelersTip ? (
        <blockquote className="mt-3 rounded-md border-l-4 border-accent bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
          <Quote className="mb-1 h-4 w-4 text-accent" aria-hidden="true" />
          {suggestion.travelersTip}
        </blockquote>
      ) : null}

      {saveError ? <p className="mt-3 text-sm text-destructive">{saveError}</p> : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="secondary" onClick={onReroll} disabled={submitting}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Another one
        </Button>
        <Button asChild>
          <a href={suggestion.mapsUri} target="_blank" rel="noreferrer">
            <Navigation className="h-4 w-4" aria-hidden="true" />
            Take me there
          </a>
        </Button>
        {tripScoped ? (
          <Button
            type="button"
            variant={saveState === "saved" ? "secondary" : "outline"}
            onClick={onSaveToJournal}
            disabled={saveState !== "idle"}
            className="sm:col-span-2"
          >
            {saveState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            )}
            {saveState === "saved" ? "Saved to journal" : "Save to journal"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function HistoryStrip({
  history,
  onRestore,
}: {
  history: SuggestionRecord[];
  onRestore: (suggestion: SuggestionRecord) => void;
}) {
  return (
    <section aria-label="Rejected suggestions">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <History className="h-3.5 w-3.5" aria-hidden="true" />
        Previous rolls
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {history.map((item) => (
          <button
            key={item.whimId}
            type="button"
            className="flex min-w-40 items-center gap-2 rounded-md border border-border bg-muted/35 px-3 py-2 text-left text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onRestore(item)}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-primary">
              <CategoryIcon category={item.suggestion.category} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.suggestion.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {item.suggestion.category}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RightNowLoading() {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border bg-muted/30 p-5"
      aria-live="polite"
    >
      <div className="absolute inset-0 origin-center animate-pulse bg-primary/5" />
      <div className="relative flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <Radar className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium">Rolling the neighborhood</p>
          <p className="text-sm text-muted-foreground">Looking for one good move.</p>
        </div>
      </div>
    </div>
  );
}

function RightNowError({
  error,
  onRetry,
}: {
  error: SubmitError;
  onRetry: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-3 text-sm",
        error.kind === "no-results"
          ? "border-accent/35 bg-accent/10"
          : "border-destructive/35 bg-destructive/10",
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{error.message}</p>
      </div>
      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const normalized = category.toLowerCase();
  if (normalized.includes("night") || normalized.includes("bar")) {
    return <Sparkles className="h-4 w-4" aria-hidden="true" />;
  }
  if (normalized.includes("outdoor") || normalized.includes("park")) {
    return <MapPin className="h-4 w-4" aria-hidden="true" />;
  }
  if (normalized.includes("logistic") || normalized.includes("shop")) {
    return <Clock3 className="h-4 w-4" aria-hidden="true" />;
  }
  return <Dice5 className="h-4 w-4" aria-hidden="true" />;
}

function getCityLocation(city: string): WhimLocation {
  const trimmedCity = city.trim();
  if (!trimmedCity) {
    throw new GeolocationDeniedError();
  }
  return { city: trimmedCity };
}

function getBrowserLocation(): Promise<WhimLocation> {
  if (!navigator.geolocation) {
    return Promise.reject(new GeolocationDeniedError());
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => reject(new GeolocationDeniedError()),
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 8000 },
    );
  });
}

function classifySubmitError(error: unknown): SubmitError {
  if (isApiErrorLike(error)) {
    if (error.status === 404 || error.status === 422 || error.code === "not_found") {
      return {
        kind: "no-results",
        message: "Nothing nearby for that. Try another mood.",
      };
    }
    return {
      kind: "api",
      message: error.message || "Right Now could not roll. Try again.",
    };
  }

  return {
    kind: "api",
    message: error instanceof Error ? error.message : "Right Now could not roll. Try again.",
  };
}

function isApiErrorLike(error: unknown): error is {
  status?: number;
  code?: string;
  message?: string;
} {
  return typeof error === "object" && error !== null && "status" in error;
}

class GeolocationDeniedError extends Error {
  constructor() {
    super("Location unavailable");
    this.name = "GeolocationDeniedError";
  }
}
