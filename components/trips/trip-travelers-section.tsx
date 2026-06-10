"use client";

import { Mail, Send, UserPlus } from "lucide-react";
import { AddTravelerDialog } from "@/components/trips/add-traveler-dialog";
import { InviteDialog } from "@/components/trips/invite-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Participant } from "@/lib/api/types";

export function TripTravelersSection({
  tripId,
  participants,
  isAdmin,
  onParticipantsChanged,
}: {
  tripId: string;
  participants: Participant[];
  isAdmin: boolean;
  onParticipantsChanged: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/80 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Travelers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Planning roster for this trip.
          </p>
        </div>
        {isAdmin ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <AddTravelerDialog
              tripId={tripId}
              onParticipantCreated={onParticipantsChanged}
              trigger={
                <Button variant="secondary">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Add Traveler
                </Button>
              }
            />
            <InviteDialog
              tripId={tripId}
              participants={participants}
              onInviteCreated={onParticipantsChanged}
              trigger={
                <Button>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Invite Traveler
                </Button>
              }
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <div
              key={participant.id}
              className="flex flex-col gap-3 rounded-md bg-muted/45 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials(participant.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{participant.displayName}</p>
                  {participant.email ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {participant.email}
                    </p>
                  ) : null}
                  {participant.notes ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {participant.notes}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <Badge
                  variant={participant.claimedByUid ? "success" : "outline"}
                  className="w-fit"
                >
                  {participant.claimedByUid ? "Claimed" : "Unclaimed"}
                </Badge>
                {isAdmin && !participant.claimedByUid ? (
                  <InviteDialog
                    tripId={tripId}
                    participants={participants}
                    initialParticipantId={participant.id}
                    onInviteCreated={onParticipantsChanged}
                    trigger={
                      <Button size="sm" variant="outline">
                        <Send className="h-4 w-4" aria-hidden="true" />
                        Invite
                      </Button>
                    }
                  />
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            No travelers added yet.
          </div>
        )}
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
