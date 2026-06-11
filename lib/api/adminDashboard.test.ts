import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));
vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn() }));

describe("admin dashboard API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("fetches recent generations from the live admin endpoint", async () => {
    const { apiFetch } = await import("@/lib/api/client");
    vi.mocked(apiFetch).mockResolvedValueOnce([]);
    const { listRecentGenerations } = await import("./adminDashboard");

    await expect(listRecentGenerations()).resolves.toEqual([]);

    expect(apiFetch).toHaveBeenCalledWith("/admin/generations/recent");
  });

  it("fetches recent whims from the live admin endpoint", async () => {
    const { apiFetch } = await import("@/lib/api/client");
    vi.mocked(apiFetch).mockResolvedValueOnce([]);
    const { listRecentWhims } = await import("./adminDashboard");

    await expect(listRecentWhims()).resolves.toEqual([]);

    expect(apiFetch).toHaveBeenCalledWith("/admin/whims/recent");
  });

  it("fetches eval runs from the live admin endpoint", async () => {
    const { apiFetch } = await import("@/lib/api/client");
    vi.mocked(apiFetch).mockResolvedValueOnce([]);
    const { listEvalRuns } = await import("./adminDashboard");

    await expect(listEvalRuns()).resolves.toEqual([]);

    expect(apiFetch).toHaveBeenCalledWith("/admin/eval-runs");
  });

  it("builds the project-scoped Cloud Trace URL", async () => {
    const { buildCloudTraceUrl } = await import("./adminDashboard");

    expect(buildCloudTraceUrl("trace-123")).toBe(
      "https://console.cloud.google.com/traces/list?project=trip-agent-498919&tid=trace-123",
    );
  });
});
