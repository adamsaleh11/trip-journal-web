"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PreferenceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isDirty: boolean;
  children: React.ReactNode;
}

export function PreferenceDrawer({
  open,
  onOpenChange,
  title,
  isDirty,
  children,
}: PreferenceDrawerProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isDirty) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to discard them?"
        )
      ) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md pb-24">
        <SheetHeader className="mb-6">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

const WISH_PLACEHOLDERS = [
  "hikes with nice sunsets",
  "best gelato spots",
  "a bar to watch the game",
  "crazy street parties",
  "small side quests",
];

export function WishlistField({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
}) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % WISH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-8">
      <label className="text-sm font-medium mb-2 block">
        Any specific wishes?
      </label>
      <textarea
        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={`e.g. ${WISH_PLACEHOLDERS[placeholderIndex]}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
      />
    </div>
  );
}
