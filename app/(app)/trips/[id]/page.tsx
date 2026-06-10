"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Crown,
  Mail,
  MapPin,
  RotateCw,
  ShieldAlert,
} from "lucide-react";
import { InviteDialog } from "@/components/trips/invite-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { getPreferenceStatus, getTrip, listMembers } from "@/lib/api/trips";
import { ApiError } from "@/lib/api/client";
import type { CompletionEntry, Member, PreferenceCategory, Trip } from "@/lib/api/types";

type DetailState =
  | { status: "loading" }
  | { status: "forbidden" }
  | { status: "error"; message: string }
  | { status: "ready"; trip: Trip; members: Member[]; completions: CompletionEntry[] };

const categories: Array<{ key: PreferenceCategory; label: string }> = [
  { key: "food_drink", label: "Food" },
  { key: "outdoors_scenic", label: "Outdoors" },
  { key: "nightlife", label: "Nightlife" },
  { key: "culture_local", label: "Culture" },
  { key: "logistics", label: "Logistics" },
];

const statusLabel: Record<Trip["status"], string> = {
  planning: "Planning",
  generated: "Generated",
  completed: "Completed",
};

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [state, setState] = useState<DetailState>({ status: "loading" });

  const loadTrip = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [trip, members, completions] = await Promise.all([
        getTrip(params.id),
        listMembers(params.id),
        getPreferenceStatus(params.id),
      ]);
      setState({ status: "ready", trip, members, completions });
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setState({ status: "forbidden" });
        return;
      }
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to load trip.",
      });
    }
  }, [params.id]);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  if (state.status === "loading") {
    return <TripDetailSkeleton />;
  }

  if (state.status === "forbidden") {
    return (
      <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-6">
        <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold">You do not have access</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          This trip belongs to another group. Ask an admin for a fresh invite link.
        </p>
        <Button asChild className="mt-5" variant="secondary">
          <Link href="/trips">Back to trips</Link>
        </Button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-6">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold">Trip could not load</h1>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
        <Button className="mt-5" variant="secondary" onClick={loadTrip}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  const isAdmin = state.members.some(
    (member) => member.uid === user?.uid && member.role === "admin",
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card/80 p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Badge variant={state.trip.status === "completed" ? "success" : "secondary"}>
              {statusLabel[state.trip.status]}
            </Badge>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight">
              {state.trip.name}
            </h1>
            <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
                {state.trip.destination.text}
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                {formatDate(state.trip.startDate)} - {formatDate(state.trip.endDate)}
              </span>
            </div>
            {state.trip.lodgingArea ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Staying around {state.trip.lodgingArea}
              </p>
            ) : null}
          </div>
          {isAdmin ? (
            <InviteDialog
              tripId={state.trip.id}
              trigger={
                <Button>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Invite
                </Button>
              }
            />
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-card/80 p-5">
          <h2 className="text-xl font-semibold">Members</h2>
          <div className="mt-4 space-y-3">
            {state.members.map((member) => (
              <div key={member.uid} className="flex items-center gap-3 rounded-md bg-muted/45 p-3">
                <Avatar>
                  <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{member.displayName ?? "Traveler"}</p>
                  <p className="text-xs text-muted-foreground">Joined {formatDate(member.joinedAt.slice(0, 10))}</p>
                </div>
                {member.role === "admin" ? (
                  <Badge variant="outline" className="gap-1">
                    <Crown className="h-3 w-3" aria-hidden="true" />
                    Admin
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/80 p-5">
          <h2 className="text-xl font-semibold">Preference progress</h2>
          <div className="mt-4 space-y-4">
            {state.completions.map((entry) => (
              <PreferenceRow key={entry.uid} entry={entry} tripId={state.trip.id} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function PreferenceRow({ entry, tripId }: { entry: CompletionEntry; tripId: string }) {
  const completed = categories.filter((category) => entry.filled[category.key]).length;

  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{entry.displayName ?? "Traveler"}</p>
        <span className="text-xs text-muted-foreground">{completed}/5 done</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.map((category) => (
          <Link
            key={category.key}
            href={`/trips/${tripId}/preferences?category=${category.key}`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Badge
              variant={entry.filled[category.key] ? "success" : "outline"}
              className="gap-1"
            >
              {entry.filled[category.key] ? (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              ) : null}
              {category.label}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TripDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card/80 p-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-5 h-12 w-3/4" />
        <Skeleton className="mt-4 h-5 w-2/3" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function initials(name: string | null | undefined) {
  if (!name) return "T";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
