"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { WizardProgress, type WizardStepDefinition } from "@/components/profile-wizard/WizardProgress";
import { BasicInfoStep } from "@/components/profile-wizard/BasicInfoStep";
import { AboutMeStep } from "@/components/profile-wizard/AboutMeStep";
import { PreviousMarriageStep } from "@/components/profile-wizard/PreviousMarriageStep";
import { FamilyStep } from "@/components/profile-wizard/FamilyStep";
import { LifestyleStep } from "@/components/profile-wizard/LifestyleStep";
import { PartnerPreferencesStep } from "@/components/profile-wizard/PartnerPreferencesStep";
import { PhotosStep } from "@/components/profile-wizard/PhotosStep";
import { ComingSoonStep } from "@/components/profile-wizard/ComingSoonStep";
import { api, ApiError } from "@/lib/api-client";
import type { FamilyDetails, Lifestyle, PartnerPreference, PreviousMarriage, Profile } from "@/types/profile";

const STEPS: WizardStepDefinition[] = [
  { key: "basic-info", label: "Basic Info" },
  { key: "about-me", label: "About Me" },
  { key: "previous-marriage", label: "Previous Marriage" },
  { key: "family", label: "Family & Children" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "education-career", label: "Education & Career" },
  { key: "partner-preferences", label: "Partner Preferences" },
  { key: "photos", label: "Photos" },
  { key: "privacy", label: "Privacy" },
  { key: "verification", label: "Verification" },
];

type LoadState = "loading" | "ready" | "unauthenticated" | "error";

export default function CreateProfilePage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lifestyle, setLifestyle] = useState<Lifestyle | null>(null);
  const [previousMarriage, setPreviousMarriage] = useState<PreviousMarriage | null>(null);
  const [familyDetails, setFamilyDetails] = useState<FamilyDetails | null>(null);
  const [partnerPreference, setPartnerPreference] = useState<PartnerPreference | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { profile: existingProfile } = await api.get<{ profile: Profile }>("/profiles/me");
        if (cancelled) return;
        setProfile(existingProfile);

        try {
          const { lifestyle: existingLifestyle } = await api.get<{ lifestyle: Lifestyle | null }>("/profiles/me/lifestyle");
          if (!cancelled) setLifestyle(existingLifestyle);
        } catch {
          // No lifestyle row yet is expected for a brand-new profile — not fatal.
        }

        try {
          const { previousMarriage: existing } = await api.get<{ previousMarriage: PreviousMarriage | null }>(
            "/profiles/me/previous-marriage",
          );
          if (!cancelled) setPreviousMarriage(existing);
        } catch {
          // Not fatal — no record yet.
        }

        try {
          const { familyDetails: existing } = await api.get<{ familyDetails: FamilyDetails | null }>("/profiles/me/family");
          if (!cancelled) setFamilyDetails(existing);
        } catch {
          // Not fatal — no record yet.
        }

        try {
          const { preferences: existing } = await api.get<{ preferences: PartnerPreference | null }>(
            "/profiles/me/partner-preferences",
          );
          if (!cancelled) setPartnerPreference(existing);
        } catch {
          // Not fatal — no record yet.
        }

        if (!cancelled) setLoadState("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "PROFILE_NOT_FOUND") {
          // Expected for first-time visitors — nothing to prefill, wizard starts empty.
          setLoadState("ready");
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          setLoadState("unauthenticated");
          return;
        }
        setLoadState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function goToNextStep() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  if (loadState === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </main>
    );
  }

  if (loadState === "unauthenticated") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <ErrorState
          title="Please log in to continue"
          description="You need an account to create a matrimonial profile."
          action={<Button onClick={() => router.push("/login")}>Go to login</Button>}
        />
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <ErrorState title="Couldn't load your profile" description="Please refresh and try again." />
      </main>
    );
  }

  const activeStep = STEPS[stepIndex]!;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-2xl">Create Your Profile</h1>
        <WizardProgress steps={STEPS} activeIndex={stepIndex} />
      </div>

      <Card>
        {activeStep.key === "basic-info" && (
          <BasicInfoStep
            hasExistingProfile={!!profile}
            initial={
              profile
                ? {
                    city: profile.city,
                    state: profile.state ?? "",
                    heightCm: profile.heightCm?.toString() ?? "",
                    motherTongue: profile.motherTongue ?? "",
                    religion: profile.religion ?? "",
                    community: profile.community ?? "",
                    education: profile.education ?? "",
                    profession: profile.profession ?? "",
                    employmentType: profile.employmentType ?? undefined,
                    incomeRange: profile.incomeRange ?? undefined,
                  }
                : undefined
            }
            onSaved={goToNextStep}
          />
        )}

        {activeStep.key === "about-me" && <AboutMeStep initial={profile?.aboutMe ?? undefined} onSaved={goToNextStep} />}

        {activeStep.key === "previous-marriage" && (
          <PreviousMarriageStep
            initial={
              previousMarriage
                ? {
                    marriedYear: previousMarriage.marriedYear?.toString() ?? "",
                    endedYear: previousMarriage.endedYear?.toString() ?? "",
                    divorceFinalized: previousMarriage.divorceFinalized,
                    additionalInfo: previousMarriage.additionalInfo ?? "",
                  }
                : undefined
            }
            onSaved={goToNextStep}
          />
        )}

        {activeStep.key === "family" && (
          <FamilyStep
            initial={
              familyDetails
                ? {
                    childrenCount: familyDetails.childrenCount,
                    childrenLivingArrangement: familyDetails.childrenLivingArrangement ?? undefined,
                  }
                : undefined
            }
            onSaved={goToNextStep}
          />
        )}

        {activeStep.key === "lifestyle" && (
          <LifestyleStep
            initial={
              lifestyle
                ? {
                    diet: lifestyle.diet ?? undefined,
                    smoking: lifestyle.smoking ?? undefined,
                    drinking: lifestyle.drinking ?? undefined,
                    fitnessRoutine: lifestyle.fitnessRoutine ?? "",
                    hobbies: lifestyle.hobbies ?? "",
                    pets: lifestyle.pets ?? "",
                    travelFrequency: lifestyle.travelFrequency ?? "",
                    sleepSchedule: lifestyle.sleepSchedule ?? "",
                    socialLifestyle: lifestyle.socialLifestyle ?? "",
                  }
                : undefined
            }
            onSaved={goToNextStep}
          />
        )}

        {activeStep.key === "partner-preferences" && (
          <PartnerPreferencesStep
            initial={
              partnerPreference
                ? {
                    ageMin: partnerPreference.ageMin?.toString() ?? "",
                    ageMax: partnerPreference.ageMax?.toString() ?? "",
                    preferredCities: partnerPreference.preferredCities.join(", "),
                    preferredStates: partnerPreference.preferredStates.join(", "),
                    willingToRelocate: partnerPreference.willingToRelocate ?? false,
                    preferredEducation: partnerPreference.preferredEducation.join(", "),
                    preferredProfessions: partnerPreference.preferredProfessions.join(", "),
                    minIncomeRange: partnerPreference.minIncomeRange ?? undefined,
                    previousMarriagePreferences: partnerPreference.previousMarriagePreferences,
                    openToAnyMarriageStatus: partnerPreference.openToAnyMarriageStatus,
                    childrenPreference: partnerPreference.childrenPreference,
                    otherPreferences: partnerPreference.otherPreferences ?? "",
                  }
                : undefined
            }
            onSaved={goToNextStep}
          />
        )}

        {activeStep.key === "photos" && <PhotosStep onSaved={goToNextStep} />}

        {!["basic-info", "about-me", "previous-marriage", "family", "lifestyle", "partner-preferences", "photos"].includes(
          activeStep.key,
        ) && <ComingSoonStep title={activeStep.label} onSkip={goToNextStep} />}
      </Card>
    </main>
  );
}
