import { apiFetch, publicApiFetch } from "@/lib/api/client";
import type {
  CompletionEntry,
  InviteAccepted,
  InviteCreated,
  InvitePreview,
  Member,
  Trip,
  TripCreate,
} from "@/lib/api/types";

export function listTrips() {
  return apiFetch<Trip[]>("/trips");
}

export function createTrip(payload: TripCreate) {
  return apiFetch<Trip>("/trips", {
    method: "POST",
    body: payload,
  });
}

export function getTrip(tripId: string) {
  return apiFetch<Trip>(`/trips/${tripId}`);
}

export function listMembers(tripId: string) {
  return apiFetch<Member[]>(`/trips/${tripId}/members`);
}

export function getPreferenceStatus(tripId: string) {
  return apiFetch<CompletionEntry[]>(`/trips/${tripId}/preferences/status`);
}

export function createInvite(tripId: string, email: string) {
  return apiFetch<InviteCreated>(`/trips/${tripId}/invites`, {
    method: "POST",
    body: { email },
  });
}

export function getInvitePreview(token: string) {
  return publicApiFetch<InvitePreview>(`/invites/${token}`);
}

export function acceptInvite(token: string) {
  return apiFetch<InviteAccepted>(`/invites/${token}/accept`, {
    method: "POST",
  });
}
