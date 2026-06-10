"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
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
import { createParticipant } from "@/lib/api/trips";

export function AddTravelerDialog({
  tripId,
  trigger,
  onParticipantCreated,
}: {
  tripId: string;
  trigger: ReactNode;
  onParticipantCreated?: () => void;
}) {
  const toast = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createParticipant(tripId, {
        displayName,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setDisplayName("");
      setEmail("");
      setNotes("");
      onParticipantCreated?.();
      toast({ kind: "success", title: "Traveler added" });
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Unable to add traveler.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Traveler</DialogTitle>
          <DialogDescription>
            Add someone to the planning roster without sending an invite.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="traveler-name">Name</Label>
            <Input
              id="traveler-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Sarah"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="traveler-email">Email</Label>
            <Input
              id="traveler-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="sarah@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="traveler-notes">Notes</Label>
            <Input
              id="traveler-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Dietary needs, rooming, planning notes"
            />
          </div>
          {error ? (
            <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            Add traveler
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
