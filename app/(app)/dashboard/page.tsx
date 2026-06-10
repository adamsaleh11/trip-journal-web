import { Activity } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Dashboard
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Observability</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Generation metrics, whim latency, cost, and eval scores will appear here
          in Phase 4.
        </p>
      </div>

      <EmptyState
        icon={Activity}
        title="No runs to inspect"
        description="The dashboard route is protected and styled now; metric cards wire in when generation and eval docs exist."
        action={<Button disabled>View runs</Button>}
      />
    </div>
  );
}
