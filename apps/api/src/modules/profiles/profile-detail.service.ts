import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.module";
import { AppException } from "@/common/errors/app-exception";
import { ErrorCode } from "@/common/errors/error-codes";
import { BlockService } from "../safety/block.service";
import { PreviousMarriageService, type PreviousMarriagePublicSummary } from "../family/previous-marriage.service";
import { canView, type ViewerRelation } from "../privacy/visibility";
import type { ChildrenCount, IncomeRange, LivingArrangement } from "@divorcedsathi/db";

export interface PublicProfileView {
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
  aboutMe: string | null;
  /** null when hidden by the owner's privacy setting for this viewer, not when simply unset. */
  incomeRange: IncomeRange | null;
  previousMarriage: PreviousMarriagePublicSummary | null;
  previousMarriageDetails: { marriedYear: number | null; endedYear: number | null; additionalInfo: string | null } | null;
  familyDetails: { childrenCount: ChildrenCount; childrenLivingArrangement: LivingArrangement | null } | null;
  photoStorageKeys: string[] | null;
  viewerRelation: ViewerRelation;
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
export class ProfileDetailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlockService,
    private readonly previousMarriage: PreviousMarriageService,
  ) {}

  /**
   * The privacy-enforcement point Module 13's canView() was built for but
   * never had a caller until now. Every gated field is looked up through
   * canView(visibility, viewerRelation) — there is no field here that
   * bypasses it by accident, because the object is only ever built by
   * this one method.
   */
  async getPublicProfile(viewerId: string, profileId: string): Promise<PublicProfileView> {
    const profile = await this.prisma.client.profile.findUnique({
      where: { id: profileId },
      include: { user: true, lifestyle: true, previousMarriage: true, familyDetails: true, privacySetting: true, photos: true },
    });

    if (!profile) {
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Profile not found.", HttpStatus.NOT_FOUND);
    }

    if (await this.blocks.isBlockedEitherDirection(viewerId, profile.userId)) {
      // Same rationale as InterestsService: a blocked profile looks
      // exactly like a nonexistent one, never a distinguishable "blocked" state.
      throw new AppException(ErrorCode.PROFILE_NOT_FOUND, "Profile not found.", HttpStatus.NOT_FOUND);
    }

    const viewerRelation = await this.resolveViewerRelation(viewerId, profile.userId);

    const privacy = profile.privacySetting;
    // Defaults mirror PrivacyService's own DEFAULTS (Module 13) for a
    // profile that has never visited Settings → Privacy — the same
    // "no row yet" state means "using the defaults", not "nothing is visible".
    const incomeVisibility = privacy?.incomeVisibility ?? "MATCHES";
    const divorceDetailsVisibility = privacy?.divorceDetailsVisibility ?? "MATCHES";
    const childrenDetailsVisibility = privacy?.childrenDetailsVisibility ?? "REGISTERED";
    const photoVisibility = privacy?.photoVisibility ?? "REGISTERED";

    const previousMarriageSummary = await this.previousMarriage.getPublicSummaryByProfileId(profileId);

    return {
      profileId: profile.id,
      userId: profile.userId,
      firstName: profile.user.firstName,
      age: calculateAge(profile.user.dateOfBirth),
      city: profile.city,
      state: profile.state,
      country: profile.country,
      education: profile.education,
      profession: profile.profession,
      heightCm: profile.heightCm,
      religion: profile.religion,
      aboutMe: profile.aboutMe,
      incomeRange: canView(incomeVisibility, viewerRelation) ? profile.incomeRange : null,
      previousMarriage: previousMarriageSummary,
      previousMarriageDetails:
        profile.previousMarriage && canView(divorceDetailsVisibility, viewerRelation)
          ? {
              marriedYear: profile.previousMarriage.marriedYear,
              endedYear: profile.previousMarriage.endedYear,
              additionalInfo: profile.previousMarriage.additionalInfo,
            }
          : null,
      familyDetails:
        profile.familyDetails && canView(childrenDetailsVisibility, viewerRelation)
          ? {
              childrenCount: profile.familyDetails.childrenCount,
              childrenLivingArrangement: profile.familyDetails.childrenLivingArrangement,
            }
          : null,
      photoStorageKeys: canView(photoVisibility, viewerRelation) ? profile.photos.map((p) => p.storageKey) : null,
      viewerRelation,
    };
  }

  private async resolveViewerRelation(viewerId: string, ownerId: string): Promise<ViewerRelation> {
    if (viewerId === ownerId) return "SELF";

    const [a, b] = [viewerId, ownerId].sort();
    const match = await this.prisma.client.match.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
    if (match) return "MATCH";

    // "APPROVED" (an explicit per-viewer allow-list) has no corresponding
    // feature yet — brief §17 describes it as a visibility option, but
    // nothing lets an owner actually approve individual viewers. Every
    // authenticated non-match viewer is treated as REGISTERED, which is
    // the correct, safe default until that feature exists: it can only
    // ever be equally or MORE restrictive than a real APPROVED check
    // would be, never less.
    return "REGISTERED";
  }
}
