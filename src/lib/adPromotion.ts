export type LegacyPromotionType = 'featured' | 'top' | 'urgent' | null;

/**
 * Bikroy-like product types are stored in `ads.product_types` as plain strings.
 * Some parts of the current UI (home cards, My Ads) still rely on the legacy
 * `is_featured`, `promotion_type` and `promotion_expires_at` fields.
 *
 * This helper keeps those legacy fields in sync so:
 * - Featured/Top/Urgent badges show correctly
 * - The "Featured ads" section can still use `is_featured`
 */
export function deriveLegacyPromotionFromProductTypes(
  productTypes: unknown,
  now: Date = new Date()
): {
  is_featured: boolean;
  promotion_type: LegacyPromotionType;
  promotion_expires_at: string | null;
} {
  const list = Array.isArray(productTypes) ? (productTypes as string[]).filter(Boolean) : [];
  const set = new Set(list);

  // Prefer stronger signals first
  const hasUrgent = set.has('Product_URGENT_AD') || set.has('Product_URGENT_BUNDLE');
  const hasTop = set.has('Product_TOP_AD');
  const hasFeatured = set.has('Product_FEATURED_AD') || set.has('Product_SPOTLIGHT');

  let promotion_type: LegacyPromotionType = null;
  if (hasUrgent) promotion_type = 'urgent';
  else if (hasTop) promotion_type = 'top';
  else if (hasFeatured) promotion_type = 'featured';

  // is_featured is used as a "Featured ads" signal, not as a generic promotion.
  const is_featured = hasFeatured || promotion_type === 'featured';

  let promotion_expires_at: string | null = null;
  if (promotion_type) {
    // Keep it simple: give each promotion a default active window.
    // You can later replace this with a purchased duration model.
    const days = promotion_type === 'urgent' ? 3 : 7;
    const expiry = new Date(now.getTime());
    expiry.setDate(expiry.getDate() + days);
    promotion_expires_at = expiry.toISOString();
  }

  return { is_featured, promotion_type, promotion_expires_at };
}
