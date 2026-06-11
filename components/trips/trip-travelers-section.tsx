"use client";

import { useState } from "react";
import { Loader2, Mail, Send, Trash2, UserPlus } from "lucide-react";
import { AddTravelerDialog } from "@/components/trips/add-traveler-dialog";
import { InviteDialog } from "@/components/trips/invite-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { removeParticipant } from "@/lib/api/trips";
import type { Participant } from "@/lib/api/types";

export function TripTravelersSection({
  tripId,
  participants,
  isAdmin,
  adminUid,
  onParticipantsChanged,
}: {
  tripId: string;
  participants: Participant[];
  isAdmin: boolean;
  adminUid?: string;
  onParticipantsChanged: () => void;
}) {
  const toast = useToast();
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!participantToRemove) return;

    setRemoving(true);
    try {
      await removeParticipant(tripId, participantToRemove.id);
      toast({
        kind: "success",
        title: `${participantToRemove.displayName} removed from trip`,
      });
      setParticipantToRemove(null);
      onParticipantsChanged();
    } catch (error) {
      toast({
        kind: "error",
        title: "Traveler could not be removed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setRemoving(false);
    }
  }

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
          <div className="flex flex-wrap gap-2">
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
                {isAdmin && (!adminUid || participant.claimedByUid !== adminUid) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Remove ${participant.displayName}`}
                    onClick={() => setParticipantToRemove(participant)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remove
                  </Button>
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

      <Dialog
        open={participantToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !removing) setParticipantToRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {participantToRemove?.displayName}?</DialogTitle>
            <DialogDescription>
              {participantToRemove?.claimedByUid
                ? "They lose access to this trip, and their traveler row and preferences are deleted."
                : "Their traveler row and preferences are deleted."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setParticipantToRemove(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRemove()}
              disabled={removing}
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              {removing ? "Removing..." : "Remove traveler"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
