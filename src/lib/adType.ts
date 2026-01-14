import { ADMIN_AD_TYPE_OPTIONS } from '@/constants/adminFeatureParity';

/**
 * Small helper used across public/admin pages to display a friendly label for
 * the stored `ads.ad_type` value.
 */
export function adTypeLabel(adType?: string | null): string | null {
  if (!adType) return null;
  return ADMIN_AD_TYPE_OPTIONS.find((o) => o.value === adType)?.label ?? adType;
}
