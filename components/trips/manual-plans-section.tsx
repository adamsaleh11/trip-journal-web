"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { ManualPlan, ManualPlanCreate } from "@/lib/api/types";
import { createManualPlan, deleteManualPlan, updateManualPlan } from "@/lib/api/trips";
import { useToast } from "@/components/ui/toast";

type ManualPlansSectionProps = {
  tripId: string;
  manualPlans: ManualPlan[];
  isAdmin: boolean;
  onManualPlansChanged: () => void;
};

const CATEGORIES = [
  { value: "food_drink", label: "Food & Drink" },
  { value: "outdoors_scenic", label: "Outdoors & Scenic" },
  { value: "nightlife", label: "Nightlife" },
  { value: "culture_local", label: "Culture & Local" },
  { value: "logistics", label: "Logistics" },
];

const TIMES_OF_DAY = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

export function ManualPlansSection({
  tripId,
  manualPlans,
  isAdmin,
  onManualPlansChanged,
}: ManualPlansSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ManualPlan | null>(null);
  const toast = useToast();

  const handleEdit = (plan: ManualPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = async (plan: ManualPlan) => {
    if (!confirm(`Are you sure you want to remove "${plan.activity}"?`)) return;
    try {
      await deleteManualPlan(tripId, plan.id);
      onManualPlansChanged();
      toast({ title: "Manual plan removed" });
    } catch (err: unknown) {
      toast({
        title: "Failed to remove plan",
        description: getErrorMessage(err),
        kind: "error",
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
  };

  return (
    <section className="rounded-lg border border-border bg-card/80 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Manual Plans</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Required activities that the AI must include in the itinerary.
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => {
              setEditingPlan(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Plan
          </Button>
        )}
      </div>

      {manualPlans.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No manual plans added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {manualPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-start justify-between rounded-md border p-4"
            >
              <div>
                <h3 className="font-medium">{plan.activity}</h3>
                <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                  <span className="capitalize border rounded px-1.5 py-0.5">
                    {plan.category.replace("_", " ")}
                  </span>
                  <span className="capitalize border rounded px-1.5 py-0.5">
                    {plan.timeOfDay}
                  </span>
                  {plan.date && <span className="border rounded px-1.5 py-0.5">{plan.date}</span>}
                </div>
                {plan.notes && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {plan.notes}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(plan)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isDialogOpen && (
        <ManualPlanDialog
          tripId={tripId}
          existingPlan={editingPlan}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={() => {
            onManualPlansChanged();
            handleCloseDialog();
          }}
        />
      )}
    </section>
  );
}

function ManualPlanDialog({
  tripId,
  existingPlan,
  open,
  onOpenChange,
  onSuccess,
}: {
  tripId: string;
  existingPlan: ManualPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ManualPlanCreate>({
    category: existingPlan?.category || "",
    activity: existingPlan?.activity || "",
    timeOfDay: existingPlan?.timeOfDay || "",
    date: existingPlan?.date || "",
    address: existingPlan?.address || "",
    placeId: existingPlan?.placeId || "",
    notes: existingPlan?.notes || "",
  });
  const toast = useToast();

  const isFormValid =
    formData.category &&
    formData.activity.trim().length > 0 &&
    formData.timeOfDay;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);

    try {
      const payload: ManualPlanCreate = {
        ...formData,
        date: formData.date || null,
        address: formData.address || null,
        placeId: formData.placeId || null,
        notes: formData.notes || null,
      };

      if (existingPlan) {
        await updateManualPlan(tripId, existingPlan.id, payload);
        toast({ title: "Plan updated successfully" });
      } else {
        await createManualPlan(tripId, payload);
        toast({ title: "Plan added successfully" });
      }
      onSuccess();
    } catch (err: unknown) {
      toast({
        title: "Failed to save plan",
        description: getErrorMessage(err),
        kind: "error",
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {existingPlan ? "Edit Manual Plan" : "Add Manual Plan"}
            </DialogTitle>
            <DialogDescription>
              Specify a required activity for the AI itinerary.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.category}
                onChange={(event) => setFormData({ ...formData, category: event.target.value })}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="activity">Activity Name *</Label>
              <Input
                id="activity"
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                placeholder="e.g. Dinner at Marea"
                maxLength={160}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeOfDay">Time of Day *</Label>
              <select
                id="timeOfDay"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.timeOfDay}
                onChange={(event) => setFormData({ ...formData, timeOfDay: event.target.value })}
              >
                <option value="">Select time of day</option>
                {TIMES_OF_DAY.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date (Optional)</Label>
              <Input
                id="date"
                type="date"
                value={formData.date || ""}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special requirements or instructions..."
                maxLength={1000}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || isLoading}>
              {isLoading ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
