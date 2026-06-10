"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PreferenceDrawer, WishlistField } from "./preference-drawer";
import {
  foodDrinkSchema,
  outdoorsScenicSchema,
  nightlifeSchema,
  cultureLocalSchema,
  logisticsSchema,
  FoodDrinkFormValues,
  OutdoorsScenicFormValues,
  NightlifeFormValues,
  CultureLocalFormValues,
  LogisticsFormValues,
} from "./category-schemas";

function ReadOnlyBanner() {
  return (
    <div className="bg-muted text-muted-foreground text-sm p-3 rounded-md mb-6">
      You can only edit your own preferences.
    </div>
  );
}

function MultiSelectChips({
  options,
  value = [],
  onChange,
  readOnly,
}: {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (val: string[]) => void;
  readOnly?: boolean;
}) {
  const handleToggle = (optValue: string) => {
    if (readOnly) return;
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleToggle(opt.value)}
            disabled={readOnly}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-foreground border-input hover:bg-muted"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SingleSelect({
  options,
  value,
  onChange,
  readOnly,
}: {
  options: { label: string; value: string }[];
  value: string | null;
  onChange: (val: string) => void;
  readOnly?: boolean;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value || ""}
      onValueChange={(val) => {
        if (val) onChange(val);
      }}
      disabled={readOnly}
      className="justify-start flex-wrap"
    >
      {options.map((opt) => (
        <ToggleGroupItem key={opt.value} value={opt.value}>
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// ----------------------------------------------------------------------
// 1. Food & Drink Form
// ----------------------------------------------------------------------

export function FoodDrinkForm({
  open,
  onOpenChange,
  defaultValues,
  onSave,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FoodDrinkFormValues> | null;
  onSave: (values: FoodDrinkFormValues) => Promise<void>;
  readOnly?: boolean;
}) {
  const form = useForm<FoodDrinkFormValues>({
    resolver: zodResolver(foodDrinkSchema),
    defaultValues: defaultValues || {
      schemaVersion: 1,
      freeText: "",
      dietaryRestrictions: [],
      cuisineInterests: [],
      mealBudget: null,
      drinkInterests: [],
      sportsBarInterest: false,
    },
  });

  const onSubmit = async (data: FoodDrinkFormValues) => {
    await onSave(data);
    form.reset(data);
    onOpenChange(false);
  };

  return (
    <PreferenceDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Food & Drink"
      isDirty={form.formState.isDirty}
    >
      {readOnly && <ReadOnlyBanner />}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Controller
          control={form.control}
          name="freeText"
          render={({ field }) => (
            <WishlistField
              value={field.value}
              onChange={field.onChange}
              readOnly={readOnly}
            />
          )}
        />

        <div>
          <label className="text-sm font-medium mb-2 block">
            Dietary Restrictions
          </label>
          <Controller
            control={form.control}
            name="dietaryRestrictions"
            render={({ field }) => (
              <MultiSelectChips
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Vegetarian", value: "vegetarian" },
                  { label: "Vegan", value: "vegan" },
                  { label: "Halal", value: "halal" },
                  { label: "Kosher", value: "kosher" },
                  { label: "Gluten Free", value: "gluten_free" },
                  { label: "None", value: "none" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Drink Interests
          </label>
          <Controller
            control={form.control}
            name="drinkInterests"
            render={({ field }) => (
              <MultiSelectChips
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Local Drinks", value: "local_drinks" },
                  { label: "Cocktails", value: "cocktails" },
                  { label: "Coffee", value: "coffee" },
                  { label: "None", value: "none" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Meal Budget</label>
          <Controller
            control={form.control}
            name="mealBudget"
            render={({ field }) => (
              <SingleSelect
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "$ (Budget)", value: "$" },
                  { label: "$$ (Mid-range)", value: "$$" },
                  { label: "$$$ (Splurge)", value: "$$$" },
                ]}
              />
            )}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="text-sm font-medium">Sports Bar Interest</label>
          <Controller
            control={form.control}
            name="sportsBarInterest"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={readOnly}
              />
            )}
          />
        </div>

        {!readOnly && (
          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        )}
      </form>
    </PreferenceDrawer>
  );
}

// ----------------------------------------------------------------------
// 2. Outdoors & Scenic Form
// ----------------------------------------------------------------------

export function OutdoorsScenicForm({
  open,
  onOpenChange,
  defaultValues,
  onSave,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<OutdoorsScenicFormValues> | null;
  onSave: (values: OutdoorsScenicFormValues) => Promise<void>;
  readOnly?: boolean;
}) {
  const form = useForm<OutdoorsScenicFormValues>({
    resolver: zodResolver(outdoorsScenicSchema),
    defaultValues: defaultValues || {
      schemaVersion: 1,
      freeText: "",
      activityLevel: null,
      interests: [],
      photoSpotsPriority: false,
    },
  });

  const onSubmit = async (data: OutdoorsScenicFormValues) => {
    await onSave(data);
    form.reset(data);
    onOpenChange(false);
  };

  return (
    <PreferenceDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Outdoors & Scenic"
      isDirty={form.formState.isDirty}
    >
      {readOnly && <ReadOnlyBanner />}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Controller
          control={form.control}
          name="freeText"
          render={({ field }) => (
            <WishlistField
              value={field.value}
              onChange={field.onChange}
              readOnly={readOnly}
            />
          )}
        />

        <div>
          <label className="text-sm font-medium mb-2 block">Interests</label>
          <Controller
            control={form.control}
            name="interests"
            render={({ field }) => (
              <MultiSelectChips
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Hikes", value: "hikes" },
                  { label: "Beaches", value: "beaches" },
                  { label: "Viewpoints", value: "viewpoints" },
                  { label: "Sunsets", value: "sunsets" },
                  { label: "Water Activities", value: "water_activities" },
                  { label: "Parks", value: "parks" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Activity Level</label>
          <Controller
            control={form.control}
            name="activityLevel"
            render={({ field }) => (
              <SingleSelect
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Chill", value: "chill" },
                  { label: "Moderate", value: "moderate" },
                  { label: "Strenuous", value: "strenuous" },
                ]}
              />
            )}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="text-sm font-medium">Photo Spots Priority</label>
          <Controller
            control={form.control}
            name="photoSpotsPriority"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={readOnly}
              />
            )}
          />
        </div>

        {!readOnly && (
          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        )}
      </form>
    </PreferenceDrawer>
  );
}

// ----------------------------------------------------------------------
// 3. Nightlife Form
// ----------------------------------------------------------------------

export function NightlifeForm({
  open,
  onOpenChange,
  defaultValues,
  onSave,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<NightlifeFormValues> | null;
  onSave: (values: NightlifeFormValues) => Promise<void>;
  readOnly?: boolean;
}) {
  const form = useForm<NightlifeFormValues>({
    resolver: zodResolver(nightlifeSchema),
    defaultValues: defaultValues || {
      schemaVersion: 1,
      freeText: "",
      vibe: [],
      frequency: null,
      budget: null,
    },
  });

  const onSubmit = async (data: NightlifeFormValues) => {
    await onSave(data);
    form.reset(data);
    onOpenChange(false);
  };

  return (
    <PreferenceDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Nightlife"
      isDirty={form.formState.isDirty}
    >
      {readOnly && <ReadOnlyBanner />}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Controller
          control={form.control}
          name="freeText"
          render={({ field }) => (
            <WishlistField
              value={field.value}
              onChange={field.onChange}
              readOnly={readOnly}
            />
          )}
        />

        <div>
          <label className="text-sm font-medium mb-2 block">Vibe</label>
          <Controller
            control={form.control}
            name="vibe"
            render={({ field }) => (
              <MultiSelectChips
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Clubs", value: "clubs" },
                  { label: "Bars", value: "bars" },
                  { label: "Live Music", value: "live_music" },
                  { label: "Street Parties", value: "street_parties" },
                  { label: "Chill Drinks", value: "chill_drinks" },
                  { label: "None", value: "none" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Frequency</label>
          <Controller
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <SingleSelect
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "None", value: "none" },
                  { label: "1-2 Times", value: "once_or_twice" },
                  { label: "Most Nights", value: "most_nights" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Budget</label>
          <Controller
            control={form.control}
            name="budget"
            render={({ field }) => (
              <SingleSelect
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "$", value: "$" },
                  { label: "$$", value: "$$" },
                  { label: "$$$", value: "$$$" },
                ]}
              />
            )}
          />
        </div>

        {!readOnly && (
          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        )}
      </form>
    </PreferenceDrawer>
  );
}

// ----------------------------------------------------------------------
// 4. Culture & Local Form
// ----------------------------------------------------------------------

export function CultureLocalForm({
  open,
  onOpenChange,
  defaultValues,
  onSave,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<CultureLocalFormValues> | null;
  onSave: (values: CultureLocalFormValues) => Promise<void>;
  readOnly?: boolean;
}) {
  const form = useForm<CultureLocalFormValues>({
    resolver: zodResolver(cultureLocalSchema),
    defaultValues: defaultValues || {
      schemaVersion: 1,
      freeText: "",
      interests: [],
      guidedTours: null,
    },
  });

  const onSubmit = async (data: CultureLocalFormValues) => {
    await onSave(data);
    form.reset(data);
    onOpenChange(false);
  };

  return (
    <PreferenceDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Culture & Local"
      isDirty={form.formState.isDirty}
    >
      {readOnly && <ReadOnlyBanner />}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Controller
          control={form.control}
          name="freeText"
          render={({ field }) => (
            <WishlistField
              value={field.value}
              onChange={field.onChange}
              readOnly={readOnly}
            />
          )}
        />

        <div>
          <label className="text-sm font-medium mb-2 block">Interests</label>
          <Controller
            control={form.control}
            name="interests"
            render={({ field }) => (
              <MultiSelectChips
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Markets", value: "markets" },
                  { label: "Museums", value: "museums" },
                  { label: "Landmarks", value: "landmarks" },
                  { label: "Neighborhoods", value: "neighborhoods" },
                  { label: "Local Events", value: "local_events" },
                  { label: "Side Quests", value: "side_quests" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Guided Tours</label>
          <Controller
            control={form.control}
            name="guidedTours"
            render={({ field }) => (
              <SingleSelect
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Yes", value: "yes" },
                  { label: "No", value: "no" },
                  { label: "Maybe", value: "maybe" },
                ]}
              />
            )}
          />
        </div>

        {!readOnly && (
          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        )}
      </form>
    </PreferenceDrawer>
  );
}

// ----------------------------------------------------------------------
// 5. Logistics Form
// ----------------------------------------------------------------------

export function LogisticsForm({
  open,
  onOpenChange,
  defaultValues,
  onSave,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<LogisticsFormValues> | null;
  onSave: (values: LogisticsFormValues) => Promise<void>;
  readOnly?: boolean;
}) {
  const form = useForm<LogisticsFormValues>({
    resolver: zodResolver(logisticsSchema),
    defaultValues: defaultValues || {
      schemaVersion: 1,
      freeText: "",
      pace: null,
      wakeTime: null,
      transport: [],
      dailyBudget: null,
      mobilityNotes: "",
    },
  });

  const onSubmit = async (data: LogisticsFormValues) => {
    await onSave(data);
    form.reset(data);
    onOpenChange(false);
  };

  return (
    <PreferenceDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Logistics"
      isDirty={form.formState.isDirty}
    >
      {readOnly && <ReadOnlyBanner />}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Controller
          control={form.control}
          name="freeText"
          render={({ field }) => (
            <WishlistField
              value={field.value}
              onChange={field.onChange}
              readOnly={readOnly}
            />
          )}
        />

        <div>
          <label className="text-sm font-medium mb-2 block">Pace</label>
          <Controller
            control={form.control}
            name="pace"
            render={({ field }) => (
              <SingleSelect
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Relaxed", value: "relaxed" },
                  { label: "Balanced", value: "balanced" },
                  { label: "Packed", value: "packed" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Wake Time</label>
          <Controller
            control={form.control}
            name="wakeTime"
            render={({ field }) => (
              <SingleSelect
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Early", value: "early" },
                  { label: "Mid", value: "mid" },
                  { label: "Late", value: "late" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Transport</label>
          <Controller
            control={form.control}
            name="transport"
            render={({ field }) => (
              <MultiSelectChips
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Walk", value: "walk" },
                  { label: "Transit", value: "transit" },
                  { label: "Rideshare", value: "rideshare" },
                  { label: "Rental Car", value: "rental_car" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Daily Budget</label>
          <Controller
            control={form.control}
            name="dailyBudget"
            render={({ field }) => (
              <SingleSelect
                readOnly={readOnly}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "$", value: "$" },
                  { label: "$$", value: "$$" },
                  { label: "$$$", value: "$$$" },
                ]}
              />
            )}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Mobility Notes</label>
          <Controller
            control={form.control}
            name="mobilityNotes"
            render={({ field }) => (
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Any mobility constraints or notes?"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={readOnly}
              />
            )}
          />
        </div>

        {!readOnly && (
          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        )}
      </form>
    </PreferenceDrawer>
  );
}
