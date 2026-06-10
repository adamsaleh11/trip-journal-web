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
