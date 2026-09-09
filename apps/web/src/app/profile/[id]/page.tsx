"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { api, ApiError } from "@/lib/api-client";
import type { PublicProfileView } from "@/types/profile";

const CHILDREN_LABELS: Record<string, string> = {
  NONE: "No children",
  ONE: "1 child",
  TWO: "2 children",
  THREE_OR_MORE: "3+ children",
};

const ARRANGEMENT_LABELS: Record<string, string> = {
  WITH_ME: "With them",
  WITH_OTHER_PARENT: "With the other parent",
  SHARED: "Shared arrangement",
  OTHER: "Other",
};

export default function ProfileDetailPage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { profile } = await api.get<{ profile: PublicProfileView }>(`/profile-view/${params.id}`);
        if (!cancelled) setProfile(profile);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load this profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <ErrorState title="Couldn't load this profile" description={error} />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </main>
    );
  }

  const isSelf = profile.viewerRelation === "SELF";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <Card>
        <CardHeader>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-2xl text-neutral-400">
            {profile.photoStorageKeys && profile.photoStorageKeys.length > 0 ? "📷" : profile.firstName[0]}
          </div>
          <CardTitle className="mt-3">
            {profile.firstName}, {profile.age}
          </CardTitle>
          <CardDescription>
            {[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {profile.previousMarriage && <Badge tone="neutral">Previously married</Badge>}
          {profile.previousMarriage?.divorceFinalized && <Badge tone="success">Divorce finalized</Badge>}
          {profile.viewerRelation === "MATCH" && <Badge tone="primary">Matched</Badge>}
        </CardContent>
      </Card>

      {!isSelf && (
        <div className="flex gap-2">
          <ProfileActionButtons targetUserId={profile.userId} />
        </div>
      )}

      {profile.aboutMe && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-700">{profile.aboutMe}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm text-neutral-700">
          {profile.education && <p>🎓 {profile.education}</p>}
          {profile.profession && <p>💼 {profile.profession}</p>}
          {profile.heightCm && <p>📏 {profile.heightCm} cm</p>}
          {profile.religion && <p>🙏 {profile.religion}</p>}
          {profile.incomeRange && <p>💰 {profile.incomeRange.replace(/_/g, " ")}</p>}
        </CardContent>
      </Card>

      {profile.familyDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Family</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-700">
            <p>{CHILDREN_LABELS[profile.familyDetails.childrenCount] ?? profile.familyDetails.childrenCount}</p>
            {profile.familyDetails.childrenLivingArrangement && (
              <p className="text-neutral-500">
                {ARRANGEMENT_LABELS[profile.familyDetails.childrenLivingArrangement] ?? profile.familyDetails.childrenLivingArrangement}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {profile.previousMarriageDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Marriage — Additional Details</CardTitle>
            <CardDescription>Visible to you because you're matched or viewing your own profile.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-neutral-700">
            {profile.previousMarriageDetails.marriedYear && profile.previousMarriageDetails.endedYear && (
              <p>
                Married {profile.previousMarriageDetails.marriedYear} – {profile.previousMarriageDetails.endedYear}
              </p>
            )}
            {profile.previousMarriageDetails.additionalInfo && <p className="mt-1">{profile.previousMarriageDetails.additionalInfo}</p>}
          </CardContent>
        </Card>
      )}

      {isSelf && (
        <p className="text-center text-xs text-neutral-400">
          This is your own profile — you always see everything, regardless of your privacy settings.
        </p>
      )}
    </main>
  );
}
