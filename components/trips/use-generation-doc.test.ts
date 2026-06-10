import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { onSnapshot } from "firebase/firestore";
import {
  useGenerationDoc,
  STALE_AFTER_MS,
  DETACH_AFTER_MS,
} from "./use-generation-doc";
import {
  mockRunningGeneration,
  mockCompleteGeneration,
} from "@/lib/fixtures/generation";

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  onSnapshot: vi.fn(),
}));

function snap(exists: boolean, data?: unknown) {
  return { exists: () => exists, data: () => data };
}

beforeEach(() => {
  vi.mocked(onSnapshot).mockReset();
});

describe("useGenerationDoc", () => {
  it("does not subscribe when generationId is null", () => {
    renderHook(() => useGenerationDoc("trip-1", null));
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("streams the generation doc from snapshots", async () => {
    let emit: ((s: unknown) => void) | undefined;
    vi.mocked(onSnapshot).mockImplementation((_ref, next) => {
      emit = next as (s: unknown) => void;
      return () => undefined;
    });

    const { result } = renderHook(() => useGenerationDoc("trip-1", "gen-1"));
    act(() => emit?.(snap(true, mockRunningGeneration)));

    await waitFor(() => expect(result.current.doc?.status).toBe("running"));
  });

  describe("with fake timers", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("flags stale after 5 minutes without an update while running", () => {
      let emit: ((s: unknown) => void) | undefined;
      vi.mocked(onSnapshot).mockImplementation((_ref, next) => {
        emit = next as (s: unknown) => void;
        return () => undefined;
      });

      const { result } = renderHook(() => useGenerationDoc("trip-1", "gen-1"));
      act(() => emit?.(snap(true, mockRunningGeneration)));
      expect(result.current.isStale).toBe(false);

      act(() => {
        vi.advanceTimersByTime(STALE_AFTER_MS + 1);
      });
      expect(result.current.isStale).toBe(true);
    });

    it("detaches the listener ~5s after completion", () => {
      const unsub = vi.fn();
      let emit: ((s: unknown) => void) | undefined;
      vi.mocked(onSnapshot).mockImplementation((_ref, next) => {
        emit = next as (s: unknown) => void;
        return unsub;
      });

      renderHook(() => useGenerationDoc("trip-1", "gen-1"));
      act(() => emit?.(snap(true, mockCompleteGeneration)));

      expect(unsub).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(DETACH_AFTER_MS + 1);
      });
      expect(unsub).toHaveBeenCalledTimes(1);
    });
  });

  it("reports a contract divergence instead of rendering an invalid complete doc", async () => {
    let emit: ((s: unknown) => void) | undefined;
    vi.mocked(onSnapshot).mockImplementation((_ref, next) => {
      emit = next as (s: unknown) => void;
      return () => undefined;
    });

    const invalidGeneration = {
      ...mockCompleteGeneration,
      itinerary: {
        days: [
          {
            blocks: [
              {
                timeOfDay: "morning",
                stops: [
                  {
                    name: "Bad Transport Cafe",
                    transport: "Walk · 8 min",
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const { result } = renderHook(() => useGenerationDoc("trip-1", "gen-1"));
    act(() => emit?.(snap(true, invalidGeneration)));

    await waitFor(() => {
      expect(result.current.doc).toBeNull();
      expect(result.current.error).toMatch(/Contract divergence/);
      expect(result.current.error).toMatch(/blocks\[0\]\.name/);
    });
  });
});
