/**
 * Helpers for building and parsing public ad URLs.
 *
 * Public route: `/ad/:slug`
 * - Most pages link using: `${slug}-${uuid}`.
 * - UUIDs contain hyphens, so `split('-').pop()` is NOT safe.
 */

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

/**
 * Build a stable public URL for an ad.
 *
 * If a slug exists, we append the id to avoid collisions:
 *   /ad/<slug>-<uuid>
 *
 * If there is no slug, we fall back to:
 *   /ad/<uuid>
 */
export function buildAdPublicPath(input: { id: string; slug?: string | null }) {
  const id = (input.id ?? '').trim();
  const slug = (input.slug ?? '').trim();

  if (!id) return '/';

  if (!slug) return `/ad/${id}`;

  // If the slug already contains the id (or ends with it), don't double-append.
  if (slug === id) return `/ad/${id}`;
  if (slug.endsWith(id)) return `/ad/${slug}`;

  return `/ad/${slug}-${id}`;
}

/**
 * Parse the route param from `/ad/:slug` into either a UUID id, a plain slug,
 * or both.
 */
export function parseAdRouteParam(param?: string | null): { id?: string; slug?: string } {
  const raw = (param ?? '').trim();
  if (!raw) return {};

  // /ad/<uuid>
  if (isUuid(raw)) return { id: raw };

  // /ad/<slug>-<uuid>
  const uuidAtEnd = raw.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  );
  if (uuidAtEnd) {
    const id = uuidAtEnd[1];
    const prefix = raw.slice(0, raw.length - id.length);
    const slug = prefix.endsWith('-') ? prefix.slice(0, -1) : prefix;
    return { id, slug: slug || undefined };
  }

  // /ad/<slug>
  return { slug: raw };
}
