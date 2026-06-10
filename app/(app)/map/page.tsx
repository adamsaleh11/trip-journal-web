import { MapPinned } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";

export default function MapPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Map
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">Journal map</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Completed trips will become glowing waypoints once journal entries and
          Mapbox layers arrive in Phase 4.
        </p>
      </div>

      <EmptyState
        icon={MapPinned}
        title="Map layers are queued"
        description="The shell reserves this route now so navigation, permissions, and responsive layout stay stable."
        action={<Button disabled>Open map</Button>}
      />
    </div>
  );
}
