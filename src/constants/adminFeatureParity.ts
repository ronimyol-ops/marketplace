// Constants derived from the uploaded Bikroy admin HTML pages.
// These are feature flags / filter options, not UI design.
//
// Notes:
// - Some of the original HTML uses internal enum-like identifiers (e.g. AdState_*, Product_*).
// - In this codebase we use a few UI-only sentinel values (e.g. "all") because Radix Select
//   items cannot reliably use empty strings as values.

export const ADMIN_AD_STATE_OPTIONS = [
  { value: 'AdState_PUBLISHED', label: 'Published' },
  { value: 'AdState_REJECTED', label: 'Rejected' },
  { value: 'AdState_ENQUEUED', label: 'Enqueued' },
  { value: 'AdState_PENDING_VERIFICATION', label: 'Pending' },
  { value: 'AdState_UNCONFIRMED', label: 'Unconfirmed' },
  { value: 'AdState_ARCHIVED', label: 'Archived' },
  { value: 'AdState_DEACTIVATED', label: 'Deactivated' },
  { value: 'AdState_PENDING_PAYMENT', label: 'Pending Payment' },
] as const;

// Event types used in the admin search UI.
// These map to public.ad_audit_logs.action values (see supabase migrations).
export const ADMIN_AD_EVENT_TYPE_OPTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' },
  { value: 'promoted', label: 'Promoted' },
  { value: 'deactivated', label: 'Deactivated' },
] as const;

export const ADMIN_AD_TYPE_OPTIONS = [
  // NOTE: We store DB-friendly values (see supabase migration constraints)
  // but keep Bikroy-like labels.
  { value: 'for_rent', label: 'For rent' },
  { value: 'for_sale', label: 'For sale / Offered' },
  { value: 'to_buy', label: 'To buy / Wanted' },
  { value: 'to_rent', label: 'To rent' },
] as const;

export const ADMIN_PRODUCT_TYPE_OPTIONS = [
  { value: 'Product_BUMP_UP', label: 'Bump up' },
  { value: 'Product_TOP_AD', label: 'Top ad' },
  { value: 'Product_URGENT_AD', label: 'Urgent ad' },
  { value: 'Product_SPOTLIGHT', label: 'Spotlight' },
  { value: 'Product_FEATURED_AD', label: 'Featured ad' },
  { value: 'Product_URGENT_BUNDLE', label: 'Urgent Bundle' },
  { value: 'Product_MEMBERSHIP_PACKAGE', label: 'Membership Package' },
  { value: 'Product_EXTRA_IMAGES', label: 'Extra Images' },
] as const;

export const ADMIN_AD_FEATURE_OPTIONS = [
  { value: 'AdFeatures_NO_EXPIRATION', label: 'Auto-renew' },
  { value: 'AdFeatures_BUY_NOW', label: 'Doorstep Delivery' },
] as const;

// Rejection reasons (real values stored on ads.* columns)
export const ADMIN_AD_REJECTION_REASONS = [
  { value: 'ReferencedAdRejectionReason_DUPLICATE', label: 'Duplicate ad' },
  { value: 'IndividualAdRejectionReason_FRAUD', label: 'Fraud' },
  { value: 'IndividualAdRejectionReason_UNREALISTIC_OFFER', label: 'Unrealistic offer' },
  { value: 'ReferencedAdRejectionReason_REPOST', label: 'Reposted ad' },
  { value: 'IndividualAdRejectionReason_WRONG_CATEGORY', label: 'Wrong category' },
  { value: 'IndividualAdRejectionReason_BLACKLISTED_ACCOUNT', label: 'Blacklisted account' },
  { value: 'IndividualAdRejectionReason_MULTIPLE_ITEMS', label: 'Multiple items in same ad' },
  { value: 'IndividualAdRejectionReason_ILLEGAL', label: 'Illegal item or service' },
  { value: 'IndividualAdRejectionReason_OUTSIDE_MARKET', label: 'Item not located in market country' },
  { value: 'IndividualAdRejectionReason_SPAM', label: 'Spam' },
  { value: 'IndividualAdRejectionReason_TOO_VAGUE', label: 'Non-specific item or service' },
  { value: 'IndividualAdRejectionReason_MISSING_DETAILS', label: 'Missing details' },
  { value: 'IndividualAdRejectionReason_MARKETING', label: 'Marketing ad' },
  { value: 'IndividualAdRejectionReason_ACCOUNT_OVER_LIMIT', label: 'Account over the limit' },
  { value: 'IndividualAdRejectionReason_NOT_PAID', label: 'Not Paid' },
  { value: 'IndividualAdRejectionReason_FOLLOW_UP_NEEDED', label: 'Follow Up needed' },
  { value: 'IndividualAdRejectionReason_REPRODUCED_AD', label: 'Reproduced Ad' },
  { value: 'IndividualAdRejectionReason_AD_TYPE_FOR_SALE', label: 'Ad Type - For Sale' },
  { value: 'IndividualAdRejectionReason_AD_TYPE_FOR_RENT', label: 'Ad Type - For Rent' },
  { value: 'IndividualAdRejectionReason_AD_TYPE_TO_RENT', label: 'Ad Type - To Rent' },
  { value: 'IndividualAdRejectionReason_AD_TYPE_TO_BUY', label: 'Ad Type - To Buy' },
  { value: 'IndividualAdRejectionReason_FIRST_IMAGE_VIOLATION', label: '1st Image Violation' },
  { value: 'IndividualAdRejectionReason_IMAGE_DOWNLOADED', label: 'Downloaded Image' },
  { value: 'IndividualAdRejectionReason_IMAGE_INVALID', label: 'Invalid Image' },
  { value: 'IndividualAdRejectionReason_IMAGE_OTHER_REASON', label: 'Image - Other Reason' },
  { value: 'IndividualAdRejectionReason_REPLICA', label: 'Replica' },
  { value: 'OTHER', label: 'Other reason' },
] as const;

// Options list used in filters/selects (includes an "All" sentinel)
export const ADMIN_AD_REJECTION_REASON_OPTIONS = [
  { value: 'all', label: 'All rejection reasons' },
  ...ADMIN_AD_REJECTION_REASONS,
] as const;

// Aliases to keep naming consistent across pages.
export const ADMIN_AD_EVENT_OPTIONS = ADMIN_AD_EVENT_TYPE_OPTIONS;
export const ADMIN_AD_PRODUCT_TYPE_OPTIONS = ADMIN_PRODUCT_TYPE_OPTIONS;

export const ADMIN_USER_STATUS_OPTIONS = [
  { value: 'AccountFlags_VERIFIED', label: 'Verified' },
  { value: 'AccountFlags_UNVERIFIED', label: 'Verification Unsuccessful' },
  { value: 'AccountFlags_BLACKLISTED', label: 'Blacklisted' },
  { value: 'AccountFlags_ENQUEUED_VERIFICATION', label: 'Pending Verification' },
] as const;

export const ADMIN_USER_SORT_OPTIONS = [
  { value: 'FindAccountSort_LOGIN_EMAIL', label: 'Email' },
  { value: 'FindAccountSort_STATUS_CHANGE', label: 'Oldest status change' },
] as const;
