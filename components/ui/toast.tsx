"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = {
  id: number;
  title: string;
  description?: string;
  kind: ToastKind;
};

type ToastContextValue = {
  toast: (toast: Omit<Toast, "id" | "kind"> & { kind?: ToastKind }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback<ToastContextValue["toast"]>((nextToast) => {
    const id = Date.now();
    setToasts((current) => [
      ...current,
      { id, kind: nextToast.kind ?? "info", ...nextToast },
    ]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-md border bg-card px-4 py-3 shadow-xl",
              item.kind === "success" && "border-emerald-400/35",
              item.kind === "error" && "border-destructive/45",
              item.kind === "info" && "border-border",
            )}
          >
            <p className="text-sm font-medium">{item.title}</p>
            {item.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return value.toast;
}
