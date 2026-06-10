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

export type WhimLocation =
  | {
      lat: number;
      lng: number;
    }
  | {
      city: string;
    };

export type WhimCreate = {
  whimText: string;
  location: WhimLocation;
  tripId?: string;
  excludePlaceIds?: string[];
};

export type WhimSuggestion = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  whyThis: string;
  openNow: boolean | "Not available";
  mapsUri: string;
  travelersTip?: string | null;
};

export type WhimCreated = {
  whimId: string;
  suggestion: WhimSuggestion;
};

export type Budget = "$" | "$$" | "$$$";

export type BasePreferenceCategory = {
  schemaVersion: 1;
  freeText: string;
};

export type FoodDrinkPreference = BasePreferenceCategory & {
  dietaryRestrictions: ("vegetarian" | "vegan" | "halal" | "kosher" | "gluten_free" | "none")[];
  cuisineInterests: string[];
  mealBudget: Budget | null;
  drinkInterests: ("local_drinks" | "cocktails" | "coffee" | "none")[];
  sportsBarInterest: boolean;
};

export type OutdoorsScenicPreference = BasePreferenceCategory & {
  activityLevel: "chill" | "moderate" | "strenuous" | null;
  interests: ("hikes" | "beaches" | "viewpoints" | "sunsets" | "water_activities" | "parks")[];
  photoSpotsPriority: boolean;
};

export type NightlifePreference = BasePreferenceCategory & {
  vibe: ("clubs" | "bars" | "live_music" | "street_parties" | "chill_drinks" | "none")[];
  frequency: "none" | "once_or_twice" | "most_nights" | null;
  budget: Budget | null;
};

export type CultureLocalPreference = BasePreferenceCategory & {
  interests: ("markets" | "museums" | "landmarks" | "neighborhoods" | "local_events" | "side_quests")[];
  guidedTours: "yes" | "no" | "maybe" | null;
};

export type LogisticsPreference = BasePreferenceCategory & {
  pace: "relaxed" | "balanced" | "packed" | null;
  wakeTime: "early" | "mid" | "late" | null;
  transport: ("walk" | "transit" | "rideshare" | "rental_car")[];
  dailyBudget: Budget | null;
  mobilityNotes: string;
};

export type MemberPreferences = {
  food_drink: FoodDrinkPreference | null;
  outdoors_scenic: OutdoorsScenicPreference | null;
  nightlife: NightlifePreference | null;
  culture_local: CultureLocalPreference | null;
  logistics: LogisticsPreference | null;
};

export type GroupPreferencesEntry = {
  participantId: string;
  displayName: string;
  claimedByUid?: string | null;
  preferences: MemberPreferences;
};

export type StopTransport = {
  mode?: string | null;
  durationText?: string | null;
};

export type ItineraryStop = {
  id?: string;
  placeId?: string | null;
  name: string;
  address?: string | null;
  category?: PreferenceCategory | string | null;
  time?: string | null;
  transport?: StopTransport | null;
  whyItFits?: string | null;
  suggested?: boolean;
  source?: "manual_plan" | "participant_preference" | "ai_suggestion";
  manualPlanId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type ItineraryBlock = {
  name: "morning" | "afternoon" | "evening" | string;
  title?: string | null;
  stops: ItineraryStop[];
};

export type ItineraryDay = {
  date?: string | null;
  title?: string | null;
  blocks: ItineraryBlock[];
};

export type TripItinerary = {
  days: ItineraryDay[];
  manualPlanWarnings?: { manualPlanId: string; activity: string; reason: string }[];
};

export type ManualPlan = {
  id: string;
  category: PreferenceCategory | string;
  activity: string;
  timeOfDay: "morning" | "afternoon" | "evening" | string;
  date?: string | null;
  address?: string | null;
  placeId?: string | null;
  notes?: string | null;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
};

export type ManualPlanCreate = Omit<
  ManualPlan,
  "id" | "createdByUid" | "createdAt" | "updatedAt"
>;

export type ManualPlanUpdate = Partial<ManualPlanCreate>;

export type JournalEntry = {
  id: string;
  tripId?: string;
  stopId?: string | null;
  placeId?: string | null;
  rating?: number | null;
  note?: string | null;
  shared?: boolean;
  createdAt?: string;
};

export type CategoryResult = {
  status: "running" | "complete" | "error";
  candidates: {
    placeId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    whyItFits: string;
    timeOfDayFit?: string;
    priceLevel?: string;
    suggested: boolean;
    travelersTip?: string;
  }[];
  sourceParticipantIds: string[];
  metrics: Record<string, unknown>;
  traceId: string;
  updatedAt: string;
  preferencesVersion?: string | null;
  stale: boolean;
  fallback?: boolean;
  fallbackReason?: "missing" | "stale" | "agent_error" | null;
  error?: string;
};

export type GenerationDoc = {
  status: "running" | "complete" | "error";
  phase: "collecting_preferences" | "researching" | "building_itinerary" | "done";
  agentStatuses: {
    food_drink: "pending" | "running" | "done" | "skipped_fresh" | "fallback" | "error";
    outdoors_scenic: "pending" | "running" | "done" | "skipped_fresh" | "fallback" | "error";
    nightlife: "pending" | "running" | "done" | "skipped_fresh" | "fallback" | "error";
    culture_local: "pending" | "running" | "done" | "skipped_fresh" | "fallback" | "error";
    logistics: "pending" | "running" | "done" | "skipped_fresh" | "fallback" | "error";
    coordinator: "pending" | "running" | "done" | "error";
  };
  requestedBy: string;
  startedAt: string;
  traceId: string;
  itinerary?: TripItinerary;
  metrics?: {
    totalTokens: number;
    promptTokens: number;
    outputTokens: number;
    latencyMs: number;
    estCostUsd: number;
    llmCalls: number;
    toolCalls: number;
    tokensPerSecond: number;
    billingTier: "free" | "vertex";
  };
  error?: string;
};
