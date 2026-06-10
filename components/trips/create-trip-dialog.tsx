"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createTrip } from "@/lib/api/trips";
import type { Destination } from "@/lib/api/types";
import { searchDestinations, type DestinationSuggestion } from "@/lib/mapbox";

export function CreateTripDialog({ trigger }: { trigger: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lodgingArea, setLodgingArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      selectedDestination !== null &&
      Number.isFinite(selectedDestination.lat) &&
      Number.isFinite(selectedDestination.lng) &&
      startDate.length > 0 &&
      endDate.length > 0 &&
      !submitting,
    [endDate, name, selectedDestination, startDate, submitting],
  );

  useEffect(() => {
    if (!open) return;
    if (selectedDestination?.text === destinationQuery) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        setSuggestions(await searchDestinations(destinationQuery, controller.signal));
      } catch (error) {
        if (!controller.signal.aborted) {
          setSearchError(error instanceof Error ? error.message : "Search failed.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [destinationQuery, open, selectedDestination?.text]);

  function reset() {
    setName("");
    setDestinationQuery("");
    setSelectedDestination(null);
    setSuggestions([]);
    setSearchError(null);
    setStartDate("");
    setEndDate("");
    setLodgingArea("");
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !selectedDestination) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const trip = await createTrip({
        name: name.trim(),
        destination: selectedDestination,
        startDate,
        endDate,
        lodgingArea: lodgingArea.trim() || null,
      });
      toast({ kind: "success", title: "Trip created", description: trip.name });
      setOpen(false);
      reset();
      router.push(`/trips/${trip.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create trip.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a trip</DialogTitle>
          <DialogDescription>
            Pick a resolved destination so the trip can power the Phase 4 map.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="trip-name">Trip name</Label>
            <Input
              id="trip-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Lisbon long weekend"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="destination"
                value={destinationQuery}
                onChange={(event) => {
                  setDestinationQuery(event.target.value);
                  setSelectedDestination(null);
                }}
                className="pl-9"
                placeholder="Search a city or region"
                required
              />
            </div>
            {searching ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Searching places
              </p>
            ) : null}
            {searchError ? (
              <p className="text-sm text-destructive-foreground">{searchError}</p>
            ) : null}
            {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <p className="text-sm text-muted-foreground">
                Set NEXT_PUBLIC_MAPBOX_TOKEN to enable destination search.
              </p>
            ) : null}
            {suggestions.length > 0 && !selectedDestination ? (
              <div className="overflow-hidden rounded-md border border-border">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left text-sm last:border-b-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setSelectedDestination(suggestion);
                      setDestinationQuery(suggestion.text);
                      setSuggestions([]);
                    }}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 text-accent" aria-hidden="true" />
                    <span>
                      <span className="block font-medium">{suggestion.text}</span>
                      <span className="block text-xs text-muted-foreground">
                        {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {selectedDestination ? (
              <p className="flex items-center gap-2 text-sm text-emerald-200">
                <Check className="h-4 w-4" aria-hidden="true" />
                Coordinates resolved
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start date</Label>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End date</Label>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="end-date"
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lodging-area">Lodging area</Label>
            <Input
              id="lodging-area"
              value={lodgingArea}
              onChange={(event) => setLodgingArea(event.target.value)}
              placeholder="Alfama, near the train station, undecided"
            />
          </div>

          {submitError ? (
            <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {submitError}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={!canSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Create trip
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
