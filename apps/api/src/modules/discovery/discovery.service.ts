import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { PreviousMarriageService, type PreviousMarriagePublicSummary } from "../family/previous-marriage.service";
import { computeCompatibility, type CompatibilityScore } from "./compatibility";
import type { Prisma } from "@divorcedsathi/db";

const RECOMMENDED_LIMIT = 10;
const NEW_PROFILES_LIMIT = 10;
// How many active candidates to score before taking the top N. Scoring is
// cheap (pure function, no DB calls per candidate), so this just bounds
// the DB read; it is not a pagination page size.
const CANDIDATE_POOL_SIZE = 200;

export interface DiscoveryCard {
  profileId: string;
  firstName: string;
  age: number;
  city: string;
  state: string | null;
  profession: string | null;
  education: string | null;
  previousMarriage: PreviousMarriagePublicSummary | null;
  compatibility: CompatibilityScore | null;
}

export interface DiscoveryDashboard {
  recommended: DiscoveryCard[];
  newProfiles: DiscoveryCard[];
}

function calculateAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const hadBirthday =
    now.getMonth() > dateOfBirth.getMonth() || (now.getMonth() === dateOfBirth.getMonth() && now.getDate() >= dateOfBirth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly previousMarriage: PreviousMarriageService,
  ) {}

  async getDashboard(userId: string): Promise<DiscoveryDashboard> {
    const [recommended, newProfiles] = await Promise.all([
      this.getRecommended(userId),
      this.getNewProfiles(userId),
    ]);
    return { recommended, newProfiles };
  }

  /**
   * Scored against the viewer's own PartnerPreference. If they haven't set
   * one yet, every candidate scores 100 (no preference = nothing to
   * mismatch, per compatibility.ts) — so this degrades to "newest active
   * profiles" rather than erroring, matching brief §48's "don't overwhelm
   * users" ethos (preferences are optional, not a gate).
   */
  private async getRecommended(userId: string): Promise<DiscoveryCard[]> {
    const viewerPreference = await this.prisma.client.partnerPreference.findFirst({
      where: { profile: { userId } },
    });

    const where: Prisma.UserWhereInput = {
      id: { not: userId },
      status: "ACTIVE",
      profile: { isNot: null },
    };

    const candidates = await this.prisma.client.user.findMany({
      where,
      include: { profile: { include: { familyDetails: true } } },
      take: CANDIDATE_POOL_SIZE,
      orderBy: { createdAt: "desc" },
    });

    const scored = await Promise.all(
      candidates
        .filter((c): c is typeof c & { profile: NonNullable<typeof c.profile> } => !!c.profile)
        .map(async (c) => {
          const compatibility = viewerPreference
            ? computeCompatibility(
                {
                  age: calculateAge(c.dateOfBirth),
                  city: c.profile.city,
                  state: c.profile.state,
                  country: c.profile.country,
                  education: c.profile.education,
                  profession: c.profile.profession,
                  marriageStatus: c.marriageStatus,
                  childrenCount: c.profile.familyDetails?.childrenCount ?? null,
                },
                viewerPreference,
              )
            : null;

          const card: DiscoveryCard = {
            profileId: c.profile.id,
            firstName: c.firstName,
            age: calculateAge(c.dateOfBirth),
            city: c.profile.city,
            state: c.profile.state,
            profession: c.profile.profession,
            education: c.profile.education,
            previousMarriage: await this.previousMarriage.getPublicSummaryByProfileId(c.profile.id),
            compatibility,
          };
          return card;
        }),
    );

    return scored
      .sort((a, b) => (b.compatibility?.total ?? 0) - (a.compatibility?.total ?? 0))
      .slice(0, RECOMMENDED_LIMIT);
  }

  /** Newest active profiles, unscored — the "New Matches" section (brief §20). */
  private async getNewProfiles(userId: string): Promise<DiscoveryCard[]> {
    const candidates = await this.prisma.client.user.findMany({
      where: { id: { not: userId }, status: "ACTIVE", profile: { isNot: null } },
      include: { profile: true },
      orderBy: { createdAt: "desc" },
      take: NEW_PROFILES_LIMIT,
    });

    return Promise.all(
      candidates
        .filter((c): c is typeof c & { profile: NonNullable<typeof c.profile> } => !!c.profile)
        .map(async (c) => ({
          profileId: c.profile.id,
          firstName: c.firstName,
          age: calculateAge(c.dateOfBirth),
          city: c.profile.city,
          state: c.profile.state,
          profession: c.profile.profession,
          education: c.profile.education,
          previousMarriage: await this.previousMarriage.getPublicSummaryByProfileId(c.profile.id),
          compatibility: null,
        })),
    );
  }
}
