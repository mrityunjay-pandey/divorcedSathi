/**
 * Given a field's chosen VisibilityLevel and the viewer's relationship to
 * the profile owner, decides whether the viewer may see that field.
 *
 * This is pure and framework-free specifically so it can be the single
 * source of truth every future read path (profile detail page, search
 * results, discovery cards) consults, rather than each one reimplementing
 * the same visibility ladder slightly differently. See Module 13 commit
 * notes for which read paths already consult it — as of this module, none
 * do yet; this is the resolver those integrations will call.
 */

export type ViewerRelation = "SELF" | "APPROVED" | "MATCH" | "REGISTERED" | "STRANGER";

export type VisibilityLevel = "EVERYONE" | "REGISTERED" | "MATCHES" | "APPROVED" | "NOBODY";

// Ladder from least to most restrictive access a relation grants. A viewer
// with a given relation can see anything at or below their own rung.
const RELATION_RANK: Record<ViewerRelation, number> = {
  SELF: 0, // handled as a special case below, not by rank comparison
  APPROVED: 1,
  MATCH: 2,
  REGISTERED: 3,
  STRANGER: 4,
};

const VISIBILITY_MIN_RANK: Record<VisibilityLevel, number> = {
  EVERYONE: 4, // even a stranger (rank 4) qualifies
  REGISTERED: 3,
  MATCHES: 2,
  APPROVED: 1,
  NOBODY: -1, // no rank qualifies; only the owner (SELF) can see it
};

export function canView(visibility: VisibilityLevel, viewerRelation: ViewerRelation): boolean {
  // The owner can always see their own data, regardless of the setting —
  // a privacy control restricts other people, never the owner themself.
  if (viewerRelation === "SELF") return true;
  return RELATION_RANK[viewerRelation] <= VISIBILITY_MIN_RANK[visibility];
}
