import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CategoryFreshness } from "./generation-preflight";
import type { PreferenceCategory } from "@/lib/api/types";

/**
 * Find the newest active or successful generation doc for a trip.
 *
 * Failed historical docs are deliberately ignored on boot so a reload does not
 * look like the app started generating by itself after an old failed run.
 */
export async function fetchLatestGenerationId(tripId: string): Promise<string | null> {
  const snapshot = await getDocs(
    query(
      collection(db, "trips", tripId, "generations"),
      orderBy("startedAt", "desc"),
    ),
  );
  const activeOrComplete = snapshot.docs.find((docSnap) => {
    const status = docSnap.data().status;
    return status === "running" || status === "complete";
  });
  return activeOrComplete?.id ?? null;
}

/**
 * Read each category's results doc once to estimate which categories the
 * coordinator will reuse vs re-run. Advisory only — the backend decides.
 */
export async function fetchCategoryFreshness(tripId: string): Promise<CategoryFreshness> {
  const snapshot = await getDocs(collection(db, "trips", tripId, "categoryResults"));
  const freshness: CategoryFreshness = {};
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as { stale?: boolean; status?: string };
    freshness[docSnap.id as PreferenceCategory] = {
      exists: data.status === "complete",
      stale: Boolean(data.stale),
    };
  });
  return freshness;
}
