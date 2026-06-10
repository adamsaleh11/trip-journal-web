import { apiFetch } from "@/lib/api/client";
import type { WhimCreate, WhimCreated } from "@/lib/api/types";

export function createWhim(payload: WhimCreate) {
  return apiFetch<WhimCreated>("/whims", {
    method: "POST",
    body: payload,
  });
}
