import type { AppPermission } from '@/hooks/useAuth';

export const APP_PERMISSIONS: { value: AppPermission; label: string; description: string }[] = [
  // --- Permissions mirrored from the uploaded admin HTML (Bikroy-like) ---
  {
    value: 'create_ads',
    label: 'Create ads',
    description: 'Create ads from the admin panel.',
  },
  {
    value: 'manage_admins',
    label: 'Manage admins',
    description: 'Create, activate/deactivate, and assign permissions to admin users.',
  },
  {
    value: 'manage_blacklists',
    label: 'Manage blacklists',
    description: 'Manage blacklists/blocked entities (users, phones, patterns, etc.).',
  },
  {
    value: 'manage_site_users',
    label: 'Manage site users',
    description: 'Administrative controls for site users (status, verification, deletion).',
  },
  {
    value: 'review_items',
    label: 'Review items',
    description: 'Review and moderate items/listings via queues.',
  },
  {
    value: 'search_archived_ads',
    label: 'Search for archived ads',
    description: 'Search archived/expired listings.',
  },
  {
    value: 'search_emails',
    label: 'Search for emails',
    description: 'Search email items and filter by event date, state, and admin actor.',
  },
  {
    value: 'search_pending_ads',
    label: 'Search for pending ads',
    description: 'Search pending listings awaiting review/verification.',
  },
  {
    value: 'search_enqueued_ads',
    label: 'Search for enqueued ads',
    description: 'Search enqueued listings waiting in review queues.',
  },
  {
    value: 'search_published_rejected_ads',
    label: 'Search for published and rejected ads',
    description: 'Search listings that are published/approved or rejected.',
  },
  {
    value: 'set_target_response_time',
    label: 'Set target response time',
    description: 'Configure operational targets for response/review times.',
  },
  {
    value: 'edit_ads_outside_review_flow',
    label: 'Edit ads outside of review flow',
    description: 'Edit listings without taking them through standard review queues.',
  },
  {
    value: 'manage_shops',
    label: 'Manage shops',
    description: 'Manage shop profiles and related moderation controls.',
  },
  {
    value: 'search_site_users',
    label: 'Search site users',
    description: 'Search and filter users with advanced options.',
  },
  {
    value: 'manage_doorstep_delivery_orders',
    label: 'Manage Doorstep Delivery orders',
    description: 'Manage delivery orders and related operational workflows.',
  },
  {
    value: 'view_transactions',
    label: 'View Transactions',
    description: 'View financial transactions and related logs.',
  },
  {
    value: 'manage_skin_banners',
    label: 'Manage skin banners',
    description: 'Manage marketing skins/banners displayed on the site.',
  },
  {
    value: 'manage_listing_fee_paid_button',
    label: 'Manage listing fee paid button',
    description: 'Tools related to listing fee verification/paid state.',
  },
  {
    value: 'view_ads_outside_review_flow',
    label: 'View ads outside of review flow',
    description: 'View listings that are not currently in review flow.',
  },
  {
    value: 'manage_memberships',
    label: 'Manage memberships',
    description: 'Manage membership products and subscriptions.',
  },
  {
    value: 'manage_skip_manual_ad_review',
    label: 'Manage skip manual ad review',
    description: 'Control skip/manual-review behavior and exemptions.',
  },
  {
    value: 'manage_deal_of_the_day_dsd',
    label: 'Manage deal of the day (DSD)',
    description: 'Configure deal-of-the-day campaigns.',
  },
  {
    value: 'manage_featured_shop_dsd',
    label: 'Manage featured shop (DSD)',
    description: 'Configure featured shop campaigns.',
  },
  {
    value: 'reindex_account_ads',
    label: 'Reindex account ads',
    description: 'Reindex ads for an account (search/aggregation maintenance).',
  },

  // --- Existing BazarBD permissions (kept) ---
  {
    value: 'manage_users',
    label: 'Manage users',
    description: 'View and manage site users, including blocking and verification flags.',
  },
  {
    value: 'review_ads',
    label: 'Review ads',
    description: 'Approve, reject, and moderate listings.',
  },
  {
    value: 'search_ads',
    label: 'Search ads',
    description: 'Find listings across all states using filters and audit events.',
  },
  {
    value: 'manage_categories',
    label: 'Manage categories',
    description: 'Create and maintain categories, subcategories, and fields.',
  },
  {
    value: 'manage_reports',
    label: 'Manage reports',
    description: 'Handle user reports and mark them resolved.',
  },
  {
    value: 'manage_moderation_settings',
    label: 'System moderation settings',
    description: 'Tune automated moderation rules and thresholds.',
  },
];

export const permissionLabel = (permission: AppPermission) =>
  APP_PERMISSIONS.find((p) => p.value === permission)?.label ?? permission;
