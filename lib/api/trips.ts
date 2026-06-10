import { apiFetch, publicApiFetch } from "@/lib/api/client";
import type {
  CompletionEntry,
  InviteAccepted,
  InviteCreated,
  InvitePreview,
  Member,
  Participant,
  ParticipantCreate,
  ParticipantUpdate,
  PreferenceCategory,
  MemberPreferences,
  GroupPreferencesEntry,
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

export function listParticipants(tripId: string) {
  return apiFetch<Participant[]>(`/trips/${tripId}/participants`);
}

export function createParticipant(tripId: string, payload: ParticipantCreate) {
  return apiFetch<Participant>(`/trips/${tripId}/participants`, {
    method: "POST",
    body: payload,
  });
}

export function updateParticipant(
  tripId: string,
  participantId: string,
  payload: ParticipantUpdate,
) {
  return apiFetch<Participant>(`/trips/${tripId}/participants/${participantId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function getPreferenceStatus(tripId: string) {
  return apiFetch<CompletionEntry[]>(`/trips/${tripId}/preferences/status`);
}

export function getGroupPreferences(tripId: string) {
  return apiFetch<GroupPreferencesEntry[]>(`/trips/${tripId}/preferences`);
}

export function getParticipantPreferences(tripId: string, participantId: string) {
  return apiFetch<MemberPreferences>(`/trips/${tripId}/preferences/participants/${participantId}`);
}

export function updateParticipantCategoryPreference<T extends PreferenceCategory>(
  tripId: string,
  participantId: string,
  category: T,
  payload: NonNullable<MemberPreferences[T]>
) {
  return apiFetch<MemberPreferences>(
    `/trips/${tripId}/preferences/participants/${participantId}/${category}`,
    {
      method: "PUT",
      body: payload,
    }
  );
}

export function createInvite(
  tripId: string,
  payload: { email: string; participantId?: string },
) {
  return apiFetch<InviteCreated>(`/trips/${tripId}/invites`, {
    method: "POST",
    body: payload,
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
