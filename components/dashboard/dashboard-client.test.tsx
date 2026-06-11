import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardClient, type DashboardLoaders } from "./dashboard-client";
import { buildCloudTraceUrl } from "@/lib/api/adminDashboard";

const generationRows = [
  {
    tripId: "trip-1",
    tripName: "Paris spring break",
    status: "completed",
    latencyMs: 180_000,
    totalTokens: 84_000,
    tokensPerSecond: 466.7,
    estCostUsd: 0.3821,
    billingTier: "pro",
    traceId: "trace-generation-1",
    startedAt: "2026-06-10T15:12:20.000Z",
  },
];

const whimRows = [
  {
    whimId: "whim-1",
    whimText: "late-night crepes",
    latencyMs: 4_500,
    totalTokens: 2_100,
    tokensPerSecond: 466.7,
    estCostUsd: 0.0084,
    billingTier: "standard",
    traceId: "trace-whim-1",
    createdAt: "2026-06-10T16:02:04.000Z",
  },
];

const evalRows = [
  {
    runId: "eval-new",
    timestamp: "2026-06-10T15:40:00.000Z",
    model: "gemini-2.5-pro",
    gitSha: "abc1234",
    aggregates: {
      schemaValidity: 0.98,
      groundedness: 0.92,
      constraintAdherence: 0.89,
      suggestedFlagHonesty: 0.94,
    },
  },
  {
    runId: "eval-old",
    timestamp: "2026-06-09T21:00:00.000Z",
    model: "gemini-2.5-flash",
    gitSha: "def5678",
    aggregates: {
      schemaValidity: 0.91,
      groundedness: 0.84,
      constraintAdherence: 0.8,
      suggestedFlagHonesty: 0.87,
    },
  },
];

function loaders(overrides: Partial<DashboardLoaders> = {}): DashboardLoaders {
  return {
    generations: vi.fn().mockResolvedValue(generationRows),
    whims: vi.fn().mockResolvedValue(whimRows),
    evalRuns: vi.fn().mockResolvedValue(evalRows),
    ...overrides,
  };
}

describe("DashboardClient", () => {
  it("renders generation, whim, eval, and Cloud Trace data from loaders", async () => {
    render(<DashboardClient loaders={loaders()} />);

    expect(await screen.findAllByText("Paris spring break")).not.toHaveLength(0);
    expect(screen.getAllByText("late-night crepes")).not.toHaveLength(0);
    expect(screen.getAllByText("eval-new")).not.toHaveLength(0);
    expect(screen.getByText("gemini-2.5-pro")).toBeInTheDocument();
    expect(screen.getAllByText("$0.3821")).not.toHaveLength(0);
    expect(screen.getAllByText("3 min").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4.5 sec").length).toBeGreaterThan(0);

    const generationTrace = screen.getAllByRole("link", {
      name: "Open Cloud Trace trace-generation-1",
    })[0];
    expect(generationTrace).toHaveAttribute(
      "href",
      "https://console.cloud.google.com/traces/list?project=trip-agent-498919&tid=trace-generation-1",
    );
  });

  it("shows section loading states", () => {
    render(
      <DashboardClient
        loaders={loaders({
          generations: vi.fn(() => new Promise<typeof generationRows>(() => undefined)),
          whims: vi.fn(() => new Promise<typeof whimRows>(() => undefined)),
          evalRuns: vi.fn(() => new Promise<typeof evalRows>(() => undefined)),
        })}
      />,
    );

    expect(screen.getAllByLabelText("Loading metrics")).toHaveLength(2);
    expect(screen.getByLabelText("Loading eval runs")).toBeInTheDocument();
  });

  it("shows empty states for each section", async () => {
    render(
      <DashboardClient
        loaders={loaders({
          generations: vi.fn().mockResolvedValue([]),
          whims: vi.fn().mockResolvedValue([]),
          evalRuns: vi.fn().mockResolvedValue([]),
        })}
      />,
    );

    expect(await screen.findByText("No generations yet")).toBeInTheDocument();
    expect(screen.getByText("No whims yet")).toBeInTheDocument();
    expect(screen.getByText("No eval runs yet")).toBeInTheDocument();
  });

  it("keeps section failures isolated and retries the failed loader", async () => {
    const generationLoader = vi
      .fn()
      .mockRejectedValueOnce(new Error("generation endpoint down"))
      .mockResolvedValueOnce(generationRows);
    const testLoaders = loaders({ generations: generationLoader });

    render(<DashboardClient loaders={testLoaders} />);

    expect(await screen.findByText("generation endpoint down")).toBeInTheDocument();
    expect(screen.getAllByText("late-night crepes")).not.toHaveLength(0);

    const errorPanel = screen.getByText("generation endpoint down").closest("div");
    expect(errorPanel).not.toBeNull();

    await userEvent.click(within(errorPanel as HTMLElement).getByRole("button", { name: /Retry/ }));

    expect(await screen.findAllByText("Paris spring break")).not.toHaveLength(0);
    expect(generationLoader).toHaveBeenCalledTimes(2);
  });

  it("updates eval run detail when a run is selected", async () => {
    render(<DashboardClient loaders={loaders()} />);

    expect(await screen.findByText("abc1234")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /eval-old/ }));

    expect(screen.getByText("def5678")).toBeInTheDocument();
    expect(screen.getByText("gemini-2.5-flash")).toBeInTheDocument();
  });
});

describe("buildCloudTraceUrl", () => {
  it("builds the project-scoped Cloud Trace URL", () => {
    expect(buildCloudTraceUrl("trace-123")).toBe(
      "https://console.cloud.google.com/traces/list?project=trip-agent-498919&tid=trace-123",
    );
  });
});
