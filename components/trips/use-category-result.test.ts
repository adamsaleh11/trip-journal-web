import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getDoc, onSnapshot } from "firebase/firestore";
import { useCategoryResult } from "./use-category-result";
import type { CategoryResult } from "@/lib/api/types";

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((..._args: unknown[]) => ({ path: _args.join("/") })),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

const sampleResult: CategoryResult = {
  status: "complete",
  candidates: [],
  sourceParticipantIds: [],
  metrics: {},
  traceId: "t",
  updatedAt: "2026-06-10T00:00:00Z",
  stale: false,
};

function docSnap(exists: boolean, data?: CategoryResult) {
  return { exists: () => exists, data: () => data };
}

beforeEach(() => {
  vi.mocked(getDoc).mockReset();
  vi.mocked(onSnapshot).mockReset();
  vi.mocked(onSnapshot).mockReturnValue(() => undefined);
});

describe("useCategoryResult", () => {
  it("does not open a listener when no result exists yet (lazy)", async () => {
    vi.mocked(getDoc).mockResolvedValue(docSnap(false) as never);

    const { result } = renderHook(() => useCategoryResult("trip-1", "food_drink"));

    await waitFor(() => expect(getDoc).toHaveBeenCalledTimes(1));
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it("upgrades to a live listener when a result already exists", async () => {
    vi.mocked(getDoc).mockResolvedValue(docSnap(true, sampleResult) as never);

    const { result } = renderHook(() => useCategoryResult("trip-1", "food_drink"));

    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));
    expect(result.current.result?.status).toBe("complete");
  });

  it("goLive() starts a listener and streams snapshot updates", async () => {
    vi.mocked(getDoc).mockResolvedValue(docSnap(false) as never);
    let emit: ((snap: unknown) => void) | undefined;
    vi.mocked(onSnapshot).mockImplementation((_ref, next) => {
      emit = next as (snap: unknown) => void;
      return () => undefined;
    });

    const { result } = renderHook(() => useCategoryResult("trip-1", "food_drink"));
    await waitFor(() => expect(getDoc).toHaveBeenCalled());

    result.current.goLive();
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));

    emit?.(docSnap(true, { ...sampleResult, status: "running" }));
    await waitFor(() => expect(result.current.result?.status).toBe("running"));
  });

  it("detaches the listener on unmount", async () => {
    vi.mocked(getDoc).mockResolvedValue(docSnap(true, sampleResult) as never);
    const unsub = vi.fn();
    vi.mocked(onSnapshot).mockReturnValue(unsub);

    const { unmount } = renderHook(() => useCategoryResult("trip-1", "food_drink"));
    await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("reports a contract divergence for malformed live result docs", async () => {
    vi.mocked(getDoc).mockResolvedValue(
      docSnap(true, { ...sampleResult, candidates: [{ name: "No place id" }] } as never) as never,
    );

    const { result } = renderHook(() => useCategoryResult("trip-1", "food_drink"));

    await waitFor(() => {
      expect(result.current.result).toBeNull();
      expect(result.current.error).toMatch(/Contract divergence/);
      expect(result.current.error).toMatch(/placeId/);
    });
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});
