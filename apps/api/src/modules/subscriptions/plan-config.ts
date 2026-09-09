/**
 * Single source of truth for plan pricing and free-tier limits, so the
 * subscription upgrade flow and any feature that checks "is this gated"
 * (e.g. InterestsService's daily send limit) agree with each other.
 */
export const PREMIUM_PLAN_PRICE_MINOR_UNITS = 99900; // ₹999.00, in paise
export const PREMIUM_PLAN_CURRENCY = "INR";
export const PREMIUM_PLAN_PERIOD_DAYS = 30;

/**
 * Brief §32: "Unlimited interests" is a named Premium feature, which only
 * means something if Free has a concrete limit. 5/day is a placeholder
 * figure — the actual number is a product decision, not an engineering
 * one — but the enforcement mechanism (this constant, consulted from
 * InterestsService) is real, not a stub.
 */
export const FREE_PLAN_DAILY_INTEREST_LIMIT = 5;
