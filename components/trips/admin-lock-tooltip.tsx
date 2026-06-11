"use client";

import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AdminLockTooltipProps = {
  locked: boolean;
  children: ReactNode;
  message?: string;
};

/**
 * Wraps a disabled action button so non-admins still get a hover/focus hint.
 * Disabled buttons swallow pointer events, so the span carries the trigger.
 */
export function AdminLockTooltip({
  locked,
  children,
  message = "Ask the trip admin to generate.",
}: AdminLockTooltipProps) {
  if (!locked) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex cursor-not-allowed">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{message}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
