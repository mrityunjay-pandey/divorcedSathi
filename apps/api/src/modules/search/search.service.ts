import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { PreviousMarriageService, type PreviousMarriagePublicSummary } from "../family/previous-marriage.service";
import type { SearchProfilesQueryDto } from "./dto/search-profiles.dto";
import type { Prisma } from "@divorcedsathi/db";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Deliberately narrow: only what a matrimonial search card needs to display
 * (brief §20's "matrimonial cards", not a dating-app swipe stack). No
 * aboutMe, no income, no contact info, no lifestyle detail — those are
 * profile-detail-page concerns (and eventually gated by Module 13's privacy
 * settings), not search-result concerns. previousMarriage is the public
 * summary type from Module 5, which structurally cannot carry
 * marriedYear/endedYear/additionalInfo.
 */
export interface SearchResultProfile {
  profileId: string;
  firstName: string;
  age: number;
  city: string;
  state: string | null;
  country: string;
  education: string | null;
  profession: string | null;
  heightCm: number | null;
  religion: string | null;
  previousMarriage: PreviousMarriagePublicSummary | null;
}

export interface SearchResult {
  results: SearchResultProfile[];
  page: number;
  pageSize: number;
  total: number;
}

function ageToDateOfBirthRange(minAge?: number, maxAge?: number): { gte?: Date; lte?: Date } {
  const now = new Date();
  const range: { gte?: Date; lte?: Date } = {};
  // A minimum age of N excludes anyone born after (today - N years) —
  // i.e. dateOfBirth must be on or before that cutoff.
  if (minAge !== undefined) {
    range.lte = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
  }
  // A maximum age of N excludes anyone born before (today - N - 1 years),
  // giving an inclusive upper age bound.
  if (maxAge !== undefined) {
    range.gte = new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate());
  }
  return range;
}

function calculateAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dateOfBirth.getMonth() ||
    (now.getMonth() === dateOfBirth.getMonth() && now.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly previousMarriage: PreviousMarriageService,
  ) {}

  async search(currentUserId: string, query: SearchProfilesQueryDto): Promise<SearchResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const dobRange = ageToDateOfBirthRange(query.minAge, query.maxAge);

    const where: Prisma.UserWhereInput = {
      id: { not: currentUserId },
      status: "ACTIVE",
      ...(query.gender ? { gender: query.gender } : {}),
      ...(query.marriageStatus?.length ? { marriageStatus: { in: query.marriageStatus } } : {}),
      ...(dobRange.gte || dobRange.lte ? { dateOfBirth: dobRange } : {}),
      profile: {
        isNot: null,
        is: {
          ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
          ...(query.state ? { state: { equals: query.state, mode: "insensitive" } } : {}),
          ...(query.country ? { country: { equals: query.country, mode: "insensitive" } } : {}),
          ...(query.religion ? { religion: { equals: query.religion, mode: "insensitive" } } : {}),
          ...(query.community ? { community: { equals: query.community, mode: "insensitive" } } : {}),
          ...(query.education ? { education: { contains: query.education, mode: "insensitive" } } : {}),
          ...(query.profession ? { profession: { contains: query.profession, mode: "insensitive" } } : {}),
          ...(query.minHeightCm !== undefined || query.maxHeightCm !== undefined
            ? { heightCm: { gte: query.minHeightCm, lte: query.maxHeightCm } }
            : {}),
          ...(query.childrenCount?.length
            ? { familyDetails: { is: { childrenCount: { in: query.childrenCount } } } }
            : {}),
        },
      },
    };

    const [users, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        include: { profile: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.client.user.count({ where }),
    ]);

    const usersWithProfile = users.filter(
      (u): u is typeof u & { profile: NonNullable<typeof u.profile> } => !!u.profile,
    );

    const results = await Promise.all(
      usersWithProfile.map(async (u) => ({
        profileId: u.profile.id,
        firstName: u.firstName,
        age: calculateAge(u.dateOfBirth),
        city: u.profile.city,
        state: u.profile.state,
        country: u.profile.country,
        education: u.profile.education,
        profession: u.profile.profession,
        heightCm: u.profile.heightCm,
        religion: u.profile.religion,
        previousMarriage: await this.previousMarriage.getPublicSummaryByProfileId(u.profile.id),
      })),
    );

    return { results, page, pageSize, total };
  }
}
