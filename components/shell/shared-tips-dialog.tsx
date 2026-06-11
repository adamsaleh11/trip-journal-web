"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteSharedTip, listSharedTips } from "@/lib/api/me";
import type { SharedTip } from "@/lib/api/types";

type SharedTipsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SharedTipsDialog({ open, onOpenChange }: SharedTipsDialogProps) {
  const [tips, setTips] = useState<SharedTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SharedTip | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadTips() {
    setLoading(true);
    setError(null);
    try {
      setTips((await listSharedTips()) ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load shared tips.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      void loadTips();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleSharesUpdated() {
      void loadTips();
    }

    window.addEventListener("trip-journal:shares-updated", handleSharesUpdated);
    return () => window.removeEventListener("trip-journal:shares-updated", handleSharesUpdated);
  }, [open]);

  async function handleDelete() {
    if (!confirmDelete) return;

    setDeletingId(confirmDelete.opaqueId);
    setError(null);
    try {
      await deleteSharedTip(confirmDelete.opaqueId);
      setTips((current) =>
        current.filter((tip) => tip.opaqueId !== confirmDelete.opaqueId),
      );
      setConfirmDelete(null);
      window.dispatchEvent(
        new CustomEvent("trip-journal:shares-updated", {
          detail: { opaqueId: confirmDelete.opaqueId },
        }),
      );
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete shared tip.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shared tips</DialogTitle>
            <DialogDescription>
              Manage the anonymous tips you have shared with other travelers.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="rounded-lg border border-border bg-card/70 p-5 text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
              Loading shared tips
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/35 bg-destructive/10 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true" />
                <p>{error}</p>
              </div>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={loadTips}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            </div>
          ) : null}

          {!loading && !error && tips.length === 0 ? (
            <div className="rounded-lg border border-border bg-card/70 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-medium">No shared tips</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tips appear here only after you explicitly share a journal note.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {tips.map((tip) => (
              <article
                key={tip.opaqueId}
                className="rounded-lg border border-border bg-card/75 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{formatCategory(tip.category)}</Badge>
                      <Badge variant="success">Shared anonymously</Badge>
                    </div>
                    <h3 className="mt-3 font-semibold">{tip.venueName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{tip.tripName}</p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDelete(tip)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(nextOpen) => !nextOpen && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete shared tip?</DialogTitle>
            <DialogDescription>
              This removes the anonymous tip from collective memory.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={Boolean(deletingId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatCategory(category: string) {
  return category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
