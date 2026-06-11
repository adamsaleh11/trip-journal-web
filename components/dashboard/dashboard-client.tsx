"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Clock3,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildCloudTraceUrl,
  listEvalRuns,
  listRecentGenerations,
  listRecentWhims,
} from "@/lib/api/adminDashboard";
import type {
  EvalRun,
  EvalRunAggregates,
  RecentGenerationMetric,
  RecentWhimMetric,
} from "@/lib/api/adminTypes";
import { cn } from "@/lib/utils";

type SectionState<T> =
  | { status: "loading"; rows: T[]; error: null }
  | { status: "success"; rows: T[]; error: null }
  | { status: "error"; rows: T[]; error: string };

export type DashboardLoaders = {
  generations: () => Promise<RecentGenerationMetric[]>;
  whims: () => Promise<RecentWhimMetric[]>;
  evalRuns: () => Promise<EvalRun[]>;
};

const defaultLoaders: DashboardLoaders = {
  generations: listRecentGenerations,
  whims: listRecentWhims,
  evalRuns: listEvalRuns,
};

const scoreLabels: Array<{
  key: keyof EvalRunAggregates;
  label: string;
}> = [
  { key: "schemaValidity", label: "Schema validity" },
  { key: "groundedness", label: "Groundedness" },
  { key: "constraintAdherence", label: "Constraint adherence" },
  { key: "suggestedFlagHonesty", label: "Suggested flag honesty" },
];

export function DashboardClient({
  loaders = defaultLoaders,
}: {
  loaders?: DashboardLoaders;
}) {
  const generations = useSection(loaders.generations);
  const whims = useSection(loaders.whims);
  const evalRuns = useSection(loaders.evalRuns);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const maxLatencyMs = useMemo(() => {
    const latencies = [...generations.rows, ...whims.rows].map((row) => row.latencyMs);
    return Math.max(...latencies, 1);
  }, [generations.rows, whims.rows]);

  useEffect(() => {
    if (evalRuns.status !== "success") return;
    if (evalRuns.rows.length === 0) {
      setSelectedRunId(null);
      return;
    }

    setSelectedRunId((current) =>
      current && evalRuns.rows.some((run) => run.runId === current)
        ? current
        : evalRuns.rows[0].runId,
    );
  }, [evalRuns.rows, evalRuns.status]);

  const selectedRun =
    evalRuns.rows.find((run) => run.runId === selectedRunId) ?? evalRuns.rows[0] ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Dashboard
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-semibold">Observability</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Recent generation and whim execution metrics, eval score history, and trace links.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Shared latency scale</span>
            <span className="block">Minutes beside seconds, normalized per refresh.</span>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-2" aria-label="Execution metrics">
        <MetricSection
          title="Recent generations"
          description="Coordinator and category-agent itinerary runs."
          icon={Activity}
          kind="generation"
          state={generations}
          maxLatencyMs={maxLatencyMs}
          emptyTitle="No generations yet"
          emptyDescription="Run one from a trip to populate generation metrics."
          onRetry={generations.retry}
        />
        <MetricSection
          title="Recent whims"
          description="Single-shot Right Now requests tuned for seconds."
          icon={Clock3}
          kind="whim"
          state={whims}
          maxLatencyMs={maxLatencyMs}
          emptyTitle="No whims yet"
          emptyDescription="Try Right Now to populate whim metrics."
          onRetry={whims.retry}
        />
      </section>

      <EvalRunsSection
        state={evalRuns}
        selectedRun={selectedRun}
        onSelectRun={setSelectedRunId}
        onRetry={evalRuns.retry}
      />
    </div>
  );
}

function useSection<T>(loader: () => Promise<T[]>): SectionState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SectionState<T>>({
    status: "loading",
    rows: [],
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState((current) => ({ status: "loading", rows: current.rows, error: null }));

    loader()
      .then((rows) => {
        if (!active) return;
        setState({ status: "success", rows, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          rows: [],
          error: error instanceof Error ? error.message : "Unable to load this section.",
        });
      });

    return () => {
      active = false;
    };
  }, [attempt, loader]);

  return {
    ...state,
    retry: () => setAttempt((current) => current + 1),
  };
}

type MetricSectionProps =
  | {
      title: string;
      description: string;
      icon: typeof Activity;
      kind: "generation";
      state: SectionState<RecentGenerationMetric>;
      maxLatencyMs: number;
      emptyTitle: string;
      emptyDescription: string;
      onRetry: () => void;
    }
  | {
      title: string;
      description: string;
      icon: typeof Activity;
      kind: "whim";
      state: SectionState<RecentWhimMetric>;
      maxLatencyMs: number;
      emptyTitle: string;
      emptyDescription: string;
      onRetry: () => void;
    };

function MetricSection(props: MetricSectionProps) {
  const Icon = props.icon;

  return (
    <section className="rounded-lg border border-border bg-card/75 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{props.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
          </div>
        </div>
      </div>

      {props.state.status === "loading" ? <MetricSkeleton /> : null}
      {props.state.status === "error" ? (
        <SectionError message={props.state.error} onRetry={props.onRetry} />
      ) : null}
      {props.state.status === "success" && props.state.rows.length === 0 ? (
        <SectionEmpty title={props.emptyTitle} description={props.emptyDescription} />
      ) : null}
      {props.state.status === "success" && props.state.rows.length > 0 ? (
        props.kind === "generation" ? (
          <GenerationMetrics rows={props.state.rows} maxLatencyMs={props.maxLatencyMs} />
        ) : (
          <WhimMetrics rows={props.state.rows} maxLatencyMs={props.maxLatencyMs} />
        )
      ) : null}
    </section>
  );
}

function GenerationMetrics({
  rows,
  maxLatencyMs,
}: {
  rows: RecentGenerationMetric[];
  maxLatencyMs: number;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-md border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Trip</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Latency</th>
              <th className="px-3 py-3 font-medium">Tokens</th>
              <th className="px-3 py-3 font-medium">Cost</th>
              <th className="px-3 py-3 font-medium">Trace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={`${row.tripId}-${row.traceId}`} className="bg-card/30">
                <td className="px-3 py-3">
                  <span className="block max-w-[11rem] truncate font-medium">{row.tripName}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(row.startedAt)}</span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-3">
                  <LatencyCell latencyMs={row.latencyMs} maxLatencyMs={maxLatencyMs} />
                </td>
                <td className="px-3 py-3">
                  <MetricValue value={formatInteger(row.totalTokens)} label={`${formatNumber(row.tokensPerSecond)} tok/s`} />
                </td>
                <td className="px-3 py-3">
                  <MetricValue value={formatCost(row.estCostUsd)} label={row.billingTier} />
                </td>
                <td className="px-3 py-3">
                  <TraceLink traceId={row.traceId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <MetricCard
            key={`${row.tripId}-${row.traceId}`}
            title={row.tripName}
            status={row.status}
            startedAt={row.startedAt}
            latencyMs={row.latencyMs}
            totalTokens={row.totalTokens}
            tokensPerSecond={row.tokensPerSecond}
            estCostUsd={row.estCostUsd}
            billingTier={row.billingTier}
            traceId={row.traceId}
            maxLatencyMs={maxLatencyMs}
          />
        ))}
      </div>
    </>
  );
}

function WhimMetrics({
  rows,
  maxLatencyMs,
}: {
  rows: RecentWhimMetric[];
  maxLatencyMs: number;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-md border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Whim</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Latency</th>
              <th className="px-3 py-3 font-medium">Tokens</th>
              <th className="px-3 py-3 font-medium">Cost</th>
              <th className="px-3 py-3 font-medium">Trace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.whimId} className="bg-card/30">
                <td className="px-3 py-3">
                  <span className="block max-w-[12rem] truncate font-medium">{row.whimText}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status="complete" />
                </td>
                <td className="px-3 py-3">
                  <LatencyCell latencyMs={row.latencyMs} maxLatencyMs={maxLatencyMs} />
                </td>
                <td className="px-3 py-3">
                  <MetricValue value={formatInteger(row.totalTokens)} label={`${formatNumber(row.tokensPerSecond)} tok/s`} />
                </td>
                <td className="px-3 py-3">
                  <MetricValue value={formatCost(row.estCostUsd)} label={row.billingTier} />
                </td>
                <td className="px-3 py-3">
                  <TraceLink traceId={row.traceId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <MetricCard
            key={row.whimId}
            title={row.whimText}
            status="complete"
            startedAt={row.createdAt}
            latencyMs={row.latencyMs}
            totalTokens={row.totalTokens}
            tokensPerSecond={row.tokensPerSecond}
            estCostUsd={row.estCostUsd}
            billingTier={row.billingTier}
            traceId={row.traceId}
            maxLatencyMs={maxLatencyMs}
          />
        ))}
      </div>
    </>
  );
}

function MetricCard({
  title,
  status,
  startedAt,
  latencyMs,
  totalTokens,
  tokensPerSecond,
  estCostUsd,
  billingTier,
  traceId,
  maxLatencyMs,
}: {
  title: string;
  status: string;
  startedAt: string;
  latencyMs: number;
  totalTokens: number;
  tokensPerSecond: number;
  estCostUsd: number;
  billingTier: string;
  traceId: string;
  maxLatencyMs: number;
}) {
  return (
    <article className="rounded-md border border-border bg-background/35 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(startedAt)}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4">
        <LatencyCell latencyMs={latencyMs} maxLatencyMs={maxLatencyMs} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <MetricValue value={formatInteger(totalTokens)} label={`${formatNumber(tokensPerSecond)} tok/s`} />
        <MetricValue value={formatCost(estCostUsd)} label={billingTier} />
      </div>
      <div className="mt-4">
        <TraceLink traceId={traceId} />
      </div>
    </article>
  );
}

function EvalRunsSection({
  state,
  selectedRun,
  onSelectRun,
  onRetry,
}: {
  state: SectionState<EvalRun>;
  selectedRun: EvalRun | null;
  onSelectRun: (runId: string) => void;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card/75 p-4 shadow-sm" aria-label="Eval runs">
      <div className="mb-4 flex gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Eval runs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            FDE rubric history across schema validity, grounding, constraints, and provenance honesty.
          </p>
        </div>
      </div>

      {state.status === "loading" ? <EvalSkeleton /> : null}
      {state.status === "error" ? <SectionError message={state.error} onRetry={onRetry} /> : null}
      {state.status === "success" && state.rows.length === 0 ? (
        <SectionEmpty title="No eval runs yet" description="Run the eval suite to populate score history." />
      ) : null}
      {state.status === "success" && state.rows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-3">
            {state.rows.map((run) => (
              <button
                key={run.runId}
                type="button"
                className={cn(
                  "w-full rounded-md border border-border bg-background/35 p-3 text-left transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedRun?.runId === run.runId && "border-primary/70 bg-primary/8",
                )}
                onClick={() => onSelectRun(run.runId)}
                aria-pressed={selectedRun?.runId === run.runId}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{run.runId}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(run.timestamp)}</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {scoreLabels.map((score) => (
                    <ScoreBar
                      key={score.key}
                      label={score.label}
                      value={run.aggregates[score.key]}
                      compact
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>

          <aside className="rounded-md border border-border bg-background/35 p-4">
            {selectedRun ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{selectedRun.runId}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(selectedRun.timestamp)}</p>
                  </div>
                  <Badge variant="outline">{selectedRun.gitSha}</Badge>
                </div>
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">Model</span>{" "}
                  <span className="font-medium">{selectedRun.model}</span>
                </p>
                <div className="mt-4 space-y-4">
                  {scoreLabels.map((score) => (
                    <ScoreBar
                      key={score.key}
                      label={score.label}
                      value={selectedRun.aggregates[score.key]}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function LatencyCell({
  latencyMs,
  maxLatencyMs,
}: {
  latencyMs: number;
  maxLatencyMs: number;
}) {
  const percent = Math.max(4, Math.min(100, (latencyMs / maxLatencyMs) * 100));

  return (
    <div className="min-w-[8rem]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{formatLatency(latencyMs)}</span>
        <span className="text-xs text-muted-foreground">{formatNumber(latencyMs / 1000)}s</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function TraceLink({ traceId }: { traceId: string }) {
  if (!traceId) {
    return <span className="text-xs text-muted-foreground">No trace</span>;
  }

  return (
    <a
      href={buildCloudTraceUrl(traceId)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Open Cloud Trace ${traceId}`}
    >
      Trace
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const className =
    normalized === "complete" || normalized === "completed" || normalized === "success"
      ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
      : normalized === "failed" || normalized === "error"
        ? "border-destructive/40 bg-destructive/12 text-red-200"
        : normalized === "running" || normalized === "pending"
          ? "border-amber-300/40 bg-amber-300/12 text-amber-100"
          : "";

  return (
    <Badge variant="outline" className={cn("capitalize", className)}>
      {status}
    </Badge>
  );
}

function MetricValue({ value, label }: { value: string; label: string }) {
  return (
    <span className="block">
      <span className="block font-medium">{value}</span>
      <span className="block text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

function ScoreBar({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  const percent = Math.round(value * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>{label}</span>
        <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{percent}%</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-md border border-destructive/35 bg-destructive/10 p-4">
      <p className="font-medium text-red-100">Unable to load this section</p>
      <p className="mt-1 text-sm text-red-100/80">{message}</p>
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

function SectionEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background/35 p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading metrics">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function EvalSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label="Loading eval runs">
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

function formatLatency(latencyMs: number) {
  if (latencyMs >= 60_000) {
    return `${formatNumber(latencyMs / 60_000)} min`;
  }

  return `${formatNumber(latencyMs / 1000)} sec`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCost(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
