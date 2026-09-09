export interface Profile {
  id: string;
  userId: string;
  heightCm: number | null;
  city: string;
  state: string | null;
  country: string;
  motherTongue: string | null;
  religion: string | null;
  community: string | null;
  education: string | null;
  profession: string | null;
  employmentType: EmploymentType | null;
  incomeRange: IncomeRange | null;
  aboutMe: string | null;
}

export type EmploymentType = "SALARIED" | "SELF_EMPLOYED" | "BUSINESS_OWNER" | "NOT_WORKING" | "PREFER_NOT_TO_SAY";
export type IncomeRange = "UNDER_5L" | "L5_TO_10L" | "L10_TO_20L" | "L20_TO_50L" | "ABOVE_50L" | "PREFER_NOT_TO_SAY";
export type Diet = "VEGETARIAN" | "NON_VEGETARIAN" | "VEGAN" | "EGGETARIAN" | "PREFER_NOT_TO_SAY";
export type HabitFrequency = "NEVER" | "OCCASIONALLY" | "REGULARLY" | "PREFER_NOT_TO_SAY";

export interface Lifestyle {
  id: string;
  profileId: string;
  diet: Diet | null;
  smoking: HabitFrequency | null;
  drinking: HabitFrequency | null;
  fitnessRoutine: string | null;
  hobbies: string | null;
  pets: string | null;
  travelFrequency: string | null;
  sleepSchedule: string | null;
  socialLifestyle: string | null;
}

export interface PreviousMarriage {
  id: string;
  profileId: string;
  marriedYear: number | null;
  endedYear: number | null;
  divorceFinalized: boolean;
  additionalInfo: string | null;
}

export type ChildrenCount = "NONE" | "ONE" | "TWO" | "THREE_OR_MORE";
export type LivingArrangement = "WITH_ME" | "WITH_OTHER_PARENT" | "SHARED" | "OTHER";

export interface FamilyDetails {
  id: string;
  profileId: string;
  childrenCount: ChildrenCount;
  childrenLivingArrangement: LivingArrangement | null;
}

export type ChildrenPreference = "NO_CHILDREN" | "HAS_CHILDREN" | "OPEN_TO_EITHER";

export interface PartnerPreference {
  id: string;
  profileId: string;
  ageMin: number | null;
  ageMax: number | null;
  preferredCities: string[];
  preferredStates: string[];
  preferredCountries: string[];
  willingToRelocate: boolean | null;
  preferredEducation: string[];
  preferredProfessions: string[];
  minIncomeRange: IncomeRange | null;
  previousMarriagePreferences: ("DIVORCED" | "WIDOWED" | "SEPARATED" | "ANNULLED")[];
  openToAnyMarriageStatus: boolean;
  childrenPreference: ChildrenPreference;
  lifestylePreferences: string | null;
  otherPreferences: string | null;
}

export const EMPLOYMENT_TYPE_OPTIONS: { label: string; value: EmploymentType }[] = [
  { label: "Salaried", value: "SALARIED" },
  { label: "Self-employed", value: "SELF_EMPLOYED" },
  { label: "Business owner", value: "BUSINESS_OWNER" },
  { label: "Not currently working", value: "NOT_WORKING" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

export const INCOME_RANGE_OPTIONS: { label: string; value: IncomeRange }[] = [
  { label: "Under ₹5L / year", value: "UNDER_5L" },
  { label: "₹5L – ₹10L / year", value: "L5_TO_10L" },
  { label: "₹10L – ₹20L / year", value: "L10_TO_20L" },
  { label: "₹20L – ₹50L / year", value: "L20_TO_50L" },
  { label: "Above ₹50L / year", value: "ABOVE_50L" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

export const DIET_OPTIONS: { label: string; value: Diet }[] = [
  { label: "Vegetarian", value: "VEGETARIAN" },
  { label: "Non-vegetarian", value: "NON_VEGETARIAN" },
  { label: "Vegan", value: "VEGAN" },
  { label: "Eggetarian", value: "EGGETARIAN" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

export const HABIT_FREQUENCY_OPTIONS: { label: string; value: HabitFrequency }[] = [
  { label: "Never", value: "NEVER" },
  { label: "Occasionally", value: "OCCASIONALLY" },
  { label: "Regularly", value: "REGULARLY" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

export const CHILDREN_PREFERENCE_OPTIONS: { label: string; value: ChildrenPreference }[] = [
  { label: "Prefer a partner without children", value: "NO_CHILDREN" },
  { label: "Comfortable with a partner who has children", value: "HAS_CHILDREN" },
  { label: "Open to either", value: "OPEN_TO_EITHER" },
];

export const MARRIAGE_STATUS_OPTIONS: { label: string; value: "DIVORCED" | "WIDOWED" | "SEPARATED" | "ANNULLED" }[] = [
  { label: "Divorced", value: "DIVORCED" },
  { label: "Widowed", value: "WIDOWED" },
  { label: "Separated", value: "SEPARATED" },
  { label: "Annulled marriage", value: "ANNULLED" },
];

export interface SearchResultProfile {
  profileId: string;
  userId: string;
  firstName: string;
  age: number;
  city: string;
  state: string | null;
  country: string;
  education: string | null;
  profession: string | null;
  heightCm: number | null;
  religion: string | null;
  previousMarriage: { previouslyMarried: true; divorceFinalized: boolean } | null;
}

export interface SearchResult {
  results: SearchResultProfile[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CompatibilityScore {
  total: number;
  breakdown: {
    location: number;
    age: number;
    childrenFamily: number;
    marriagePreference: number;
    educationCareer: number;
  };
  basis: string;
}

export interface DiscoveryCard {
  profileId: string;
  userId: string;
  firstName: string;
  age: number;
  city: string;
  state: string | null;
  profession: string | null;
  education: string | null;
  previousMarriage: { previouslyMarried: true; divorceFinalized: boolean } | null;
  compatibility: CompatibilityScore | null;
}

export interface DiscoveryDashboard {
  recommended: DiscoveryCard[];
  newProfiles: DiscoveryCard[];
}

export type InterestStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface Interest {
  id: string;
  senderId: string;
  recipientId: string;
  status: InterestStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface MatchSummary {
  matchId: string;
  conversationId: string | null;
  otherUser: { userId: string; firstName: string };
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export type NotificationType =
  | "INTEREST_RECEIVED"
  | "INTEREST_ACCEPTED"
  | "NEW_MESSAGE"
  | "PROFILE_VIEWED"
  | "PHOTO_REQUEST"
  | "VERIFICATION_COMPLETED"
  | "SUBSCRIPTION_ACTIVATED"
  | "SECURITY_ALERT";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export type IdentityStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface VerificationBadges {
  mobileVerified: boolean;
  emailVerified: boolean;
  identityVerified: boolean;
  identityStatus: IdentityStatus;
}

export type VisibilityLevel = "EVERYONE" | "REGISTERED" | "MATCHES" | "APPROVED" | "NOBODY";

export interface PrivacySettings {
  profileId: string;
  incomeVisibility: VisibilityLevel;
  contactVisibility: VisibilityLevel;
  divorceDetailsVisibility: VisibilityLevel;
  childrenDetailsVisibility: VisibilityLevel;
  photoVisibility: VisibilityLevel;
  requirePhotoRequestApproval: boolean;
  showLastActiveStatus: boolean;
  showOnlineStatus: boolean;
}

export const VISIBILITY_OPTIONS: { label: string; value: VisibilityLevel }[] = [
  { label: "Everyone", value: "EVERYONE" },
  { label: "Registered users", value: "REGISTERED" },
  { label: "My matches", value: "MATCHES" },
  { label: "Only people I approve", value: "APPROVED" },
  { label: "Nobody", value: "NOBODY" },
];

export type ReportReason =
  | "FAKE_PROFILE"
  | "SCAM"
  | "HARASSMENT"
  | "ABUSE"
  | "INAPPROPRIATE_CONTENT"
  | "MISREPRESENTATION"
  | "SOLICITATION"
  | "FINANCIAL_SCAM"
  | "OTHER";

export const REPORT_REASON_OPTIONS: { label: string; value: ReportReason }[] = [
  { label: "Fake profile", value: "FAKE_PROFILE" },
  { label: "Scam", value: "SCAM" },
  { label: "Harassment", value: "HARASSMENT" },
  { label: "Abuse", value: "ABUSE" },
  { label: "Inappropriate content", value: "INAPPROPRIATE_CONTENT" },
  { label: "Misrepresentation", value: "MISREPRESENTATION" },
  { label: "Solicitation", value: "SOLICITATION" },
  { label: "Financial scam", value: "FINANCIAL_SCAM" },
  { label: "Other", value: "OTHER" },
];

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  newRegistrations7d: number;
  verifiedUsers: number;
  suspendedAccounts: number;
  pendingVerifications: number;
  pendingReports: number;
  interestsSent: number;
  connections: number;
}

export interface AdminUserSummary {
  id: string;
  firstName: string;
  email: string | null;
  mobileNumber: string | null;
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
  role: "USER" | "MODERATOR" | "ADMIN";
}
