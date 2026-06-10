"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Check, Copy, Loader2, Mail } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { createInvite } from "@/lib/api/trips";

type PendingInvite = {
  email: string;
  inviteUrl: string;
  emailSent: boolean;
};

export function InviteDialog({
  tripId,
  trigger,
}: {
  tripId: string;
  trigger: ReactNode;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<PendingInvite | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const invite = await createInvite(tripId, email);
      const pendingInvite = { email, ...invite };
      setCreatedInvite(pendingInvite);
      setPendingInvites((current) => [pendingInvite, ...current]);
      setEmail("");
      toast({
        kind: invite.emailSent ? "success" : "info",
        title: invite.emailSent ? `Email sent to ${pendingInvite.email}` : "Invite link ready",
        description: invite.emailSent ? undefined : "Email could not be sent. Share the link instead.",
      });
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Invite failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInviteLink(inviteUrl: string) {
    await navigator.clipboard.writeText(inviteUrl);
    toast({ kind: "success", title: "Invite link copied" });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a friend</DialogTitle>
          <DialogDescription>
            Send by email and keep the copyable link as a fallback.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="friend@example.com"
              required
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
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            Send invite
          </Button>
        </form>

        {createdInvite ? (
          <div className="rounded-md border border-border bg-background/45 p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              {createdInvite.emailSent
                ? `Email sent to ${createdInvite.email}`
                : "Email could not be sent"}
            </p>
            {!createdInvite.emailSent ? (
              <p className="mt-1 text-sm text-muted-foreground">Share this link instead.</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <Input readOnly value={createdInvite.inviteUrl} className="text-xs" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label="Copy invite link"
                onClick={() => void copyInviteLink(createdInvite.inviteUrl)}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}

        {pendingInvites.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium">Pending invites</h3>
            <div className="mt-2 space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={`${invite.email}-${invite.inviteUrl}`}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/45 px-3 py-2"
                >
                  <span className="truncate text-sm">{invite.email}</span>
                  <Badge variant="outline">{invite.emailSent ? "Email sent" : "Link only"}</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
