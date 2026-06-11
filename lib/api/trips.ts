import { apiFetch, publicApiFetch } from "@/lib/api/client";
import type {
  CompletionEntry,
  InviteAccepted,
  InviteCreated,
  InvitePreview,
  Member,
  ManualPlan,
  ManualPlanCreate,
  ManualPlanUpdate,
  Participant,
  ParticipantCreate,
  ParticipantUpdate,
  PreferenceCategory,
  GenerationQuota,
  MemberPreferences,
  ModelProvider,
  GroupPreferencesEntry,
  JournalEntry,
  JournalContributionUpdate,
  Trip,
  TripCreate,
  TripItinerary,
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

export function removeParticipant(tripId: string, participantId: string) {
  return apiFetch<void>(`/trips/${tripId}/participants/${participantId}`, {
    method: "DELETE",
  });
}

export function getPreferenceStatus(tripId: string) {
  return apiFetch<CompletionEntry[]>(`/trips/${tripId}/preferences/status`);
}

export function getGroupPreferences(tripId: string) {
  return apiFetch<GroupPreferencesEntry[]>(`/trips/${tripId}/preferences`);
}

export function getTripItinerary(tripId: string) {
  return apiFetch<TripItinerary>(`/trips/${tripId}/itinerary`);
}

export function listManualPlans(tripId: string) {
  return apiFetch<ManualPlan[]>(`/trips/${tripId}/manual-plans`);
}

export function createManualPlan(tripId: string, payload: ManualPlanCreate) {
  return apiFetch<ManualPlan>(`/trips/${tripId}/manual-plans`, {
    method: "POST",
    body: payload,
  });
}

export function updateManualPlan(tripId: string, planId: string, payload: ManualPlanUpdate) {
  return apiFetch<ManualPlan>(`/trips/${tripId}/manual-plans/${planId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteManualPlan(tripId: string, planId: string) {
  return apiFetch<void>(`/trips/${tripId}/manual-plans/${planId}`, {
    method: "DELETE",
  });
}

export function generateCategory(tripId: string, category: PreferenceCategory) {
  return apiFetch<{ category: string }>(`/trips/${tripId}/categories/${category}/generate`, {
    method: "POST",
  });
}

export function getGenerationQuota(tripId: string) {
  return apiFetch<GenerationQuota>(`/trips/${tripId}/generation-quota`);
}

export function generateItinerary(tripId: string, provider?: ModelProvider) {
  return apiFetch<{ generationId: string }>(`/trips/${tripId}/generate`, {
    method: "POST",
    body: provider ? { provider } : {},
  });
}

export function completeTrip(tripId: string) {
  return apiFetch<Trip>(`/trips/${tripId}/complete`, {
    method: "POST",
  });
}

export function listJournalEntries(tripId: string) {
  return apiFetch<JournalEntry[]>(`/trips/${tripId}/journal`);
}

export function updateJournalEntry(
  tripId: string,
  placeId: string,
  payload: JournalContributionUpdate,
) {
  return apiFetch<JournalEntry>(
    `/trips/${tripId}/journal/${encodeURIComponent(placeId)}`,
    {
      method: "PUT",
      body: payload,
    },
  );
}

export function saveWhimToJournal(tripId: string, whimId: string) {
  return apiFetch<JournalEntry>(`/trips/${tripId}/journal/from-whim/${whimId}`, {
    method: "POST",
  });
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
