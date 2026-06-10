export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "validation_error"
  | "not_found"
  | "conflict"
  | "internal_error"
  | "unknown_error";

export type ApiErrorDetail = {
  loc?: Array<string | number>;
  msg: string;
  type?: string;
};

export type ApiErrorBody = {
  error?: {
    code?: ApiErrorCode | string;
    message?: string;
    details?: ApiErrorDetail[];
  };
  detail?: string | ApiErrorDetail[];
  message?: string;
};

export type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500 | number;

export type CurrentUser = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  memberTripIds?: string[];
};

export type TripStatus = "planning" | "generated" | "completed";
export type MemberRole = "admin" | "member";
export type InviteStatus = "pending" | "accepted";

export type Destination = {
  text: string;
  lat: number;
  lng: number;
  placeId?: string | null;
};

export type Trip = {
  id: string;
  name: string;
  destination: Destination;
  startDate: string;
  endDate: string;
  lodgingArea?: string | null;
  status: TripStatus;
  adminUid: string;
  createdAt: string;
};

export type TripCreate = {
  name: string;
  destination: Destination;
  startDate: string;
  endDate: string;
  lodgingArea?: string | null;
};

export type Member = {
  uid: string;
  displayName?: string | null;
  role: MemberRole;
  joinedAt: string;
};

export type Participant = {
  id: string;
  displayName: string;
  email?: string | null;
  notes?: string | null;
  claimedByUid?: string | null;
};

export type ParticipantCreate = {
  displayName: string;
  email?: string | null;
  notes?: string | null;
};

export type ParticipantUpdate = Partial<ParticipantCreate>;

export type PreferenceCategory =
  | "food_drink"
  | "outdoors_scenic"
  | "nightlife"
  | "culture_local"
  | "logistics";

export type CompletionEntry = {
  participantId: string;
  displayName?: string | null;
  claimedByUid?: string | null;
  filled: Record<PreferenceCategory, boolean>;
};

export type InviteCreated = {
  inviteUrl: string;
  emailSent: boolean;
};

export type InvitePreview = {
  tripName: string;
  destinationText: string;
  inviterName: string;
  status: InviteStatus;
};

export type InviteAccepted = {
  tripId: string;
  participantId: string;
};
