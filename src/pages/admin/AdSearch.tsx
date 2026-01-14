import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { buildAdPublicPath } from '@/lib/adRoutes';
import { downloadCsv, type CsvColumn } from '@/lib/csv';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ADMIN_AD_EVENT_TYPE_OPTIONS,
  ADMIN_AD_FEATURE_OPTIONS,
  ADMIN_AD_PRODUCT_TYPE_OPTIONS,
  ADMIN_AD_REJECTION_REASON_OPTIONS,
  ADMIN_AD_REJECTION_REASONS,
  ADMIN_AD_STATE_OPTIONS,
  ADMIN_AD_TYPE_OPTIONS,
} from '@/constants/adminFeatureParity';
import {
  ExternalLink,
  Download,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Ban,
  Archive,
} from 'lucide-react';

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };

type AdminUserOption = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type AdRow = {
  id: string;
  slug: string | null;
  title: string;
  status: string;
  created_at: string;
  price: number | null;
  price_type: string | null;
  user_id: string;
  category_id: string | null;
  subcategory_id?: string | null;
  division?: string | null;
  district?: string | null;
  area?: string | null;
  needs_verification?: boolean | null;
  expires_at?: string | null;
  last_reviewed_by?: string | null;
  last_reviewed_at?: string | null;

  // Phase-2/admin parity fields (some may be null until migrations are applied)
  ad_type?: string | null;
  product_types?: string[] | null;
  features?: string[] | null;
  rejection_reason?: string | null;
  is_unconfirmed?: boolean | null;
  is_deactivated?: boolean | null;
  is_archived?: boolean | null;
  payment_status?: string | null;
  is_featured?: boolean | null;
  promotion_type?: string | null;
};

function isLikelyEmail(q: string) {
  return q.includes('@') && q.includes('.');
}

function isLikelyPhone(q: string) {
  // Avoid misclassifying ad slugs/URLs (which often contain letters + UUIDs) as phone numbers.
  // Treat as phone only when the query is mostly numeric (+, spaces, dashes, parentheses are OK).
  if (/[a-z]/i.test(q)) return false;
  const digits = q.replace(/\D/g, '');
  return digits.length >= 7;
}

function extractUuidFromText(text: string): string | null {
  const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return match?.[0] ?? null;
}

function buildFuzzyPhonePattern(digits: string): string {
  // Example: 01712345678 -> %017%123%456%78%
  // This helps match numbers stored with spaces/dashes.
  const cleaned = digits.replace(/\D/g, '');
  if (!cleaned) return '%';
  const chunks: string[] = [];
  for (let i = 0; i < cleaned.length; i += 3) {
    chunks.push(cleaned.slice(i, i + 3));
  }
  return `%${chunks.join('%')}%`;
}

function isUuid(q: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function coerceArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return [];
}

function deriveAdState(ad: AdRow): string {
  const payment = (ad.payment_status ?? '') as string;
  if (payment === 'pending') return 'AdState_PENDING_PAYMENT';
  if (ad.is_deactivated) return 'AdState_DEACTIVATED';

  const now = Date.now();
  const expired = ad.expires_at ? new Date(ad.expires_at).getTime() < now : false;
  if (ad.is_archived || expired || ad.status === 'sold') return 'AdState_ARCHIVED';

  if (ad.is_unconfirmed) return 'AdState_UNCONFIRMED';

  if (ad.status === 'rejected') return 'AdState_REJECTED';
  if (ad.status === 'pending') return 'AdState_ENQUEUED';
  if (ad.status === 'approved' && ad.needs_verification) return 'AdState_PENDING_VERIFICATION';
  return 'AdState_PUBLISHED';
}

function deriveProductTypes(ad: AdRow): string[] {
  const fromColumn = coerceArray((ad as any).product_types);
  const derived: string[] = [...fromColumn];

  // Back-compat: map existing promotion fields
  if ((ad as any).is_featured) derived.push('Product_FEATURED_AD');
  const pt = (ad as any).promotion_type as string | null;
  if (pt) {
    const map: Record<string, string> = {
      bump_up: 'Product_BUMP_UP',
      top_ad: 'Product_TOP_AD',
      top: 'Product_TOP_AD',
      urgent: 'Product_URGENT_AD',
      spotlight: 'Product_SPOTLIGHT',
      featured: 'Product_FEATURED_AD',
      urgent_bundle: 'Product_URGENT_BUNDLE',
      membership: 'Product_MEMBERSHIP_PACKAGE',
      extra_images: 'Product_EXTRA_IMAGES',
    };
    if (map[pt]) derived.push(map[pt]);
  }
  return uniq(derived);
}

function deriveFeatures(ad: AdRow): string[] {
  const fromColumn = coerceArray((ad as any).features);
  return uniq(fromColumn);
}

export default function AdSearch() {
  const { isAdmin, hasPermission, user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedAdTypes, setSelectedAdTypes] = useState<string[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [eventType, setEventType] = useState('all');
  const [eventFrom, setEventFrom] = useState('');
  const [eventTo, setEventTo] = useState('');
  const [categoryValue, setCategoryValue] = useState('all');
  const [locationValue, setLocationValue] = useState('all');
  const [rejectionReason, setRejectionReason] = useState('all');
  const [adminUserId, setAdminUserId] = useState('all');

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AdRow[]>([]);


const exportCsv = () => {
  if (!results.length) return;

  const columns: CsvColumn<AdRow>[] = [
    { key: 'id', label: 'Ad ID' },
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created At' },
    { key: 'user_id', label: 'User ID' },
    { key: 'price', label: 'Price' },
    { key: 'price_type', label: 'Price Type' },
    { key: 'category_id', label: 'Category ID' },
    { key: 'subcategory_id', label: 'Subcategory ID' },
    { key: 'division', label: 'Division' },
    { key: 'district', label: 'District' },
    { key: 'area', label: 'Area' },
    { key: 'last_reviewed_by', label: 'Last Reviewed By' },
    { key: 'last_reviewed_at', label: 'Last Reviewed At' },
    {
      key: 'derived_state',
      label: 'Derived State',
      value: (ad) => deriveAdState(ad),
    },
    {
      key: 'product_types',
      label: 'Product Types',
      value: (ad) => deriveProductTypes(ad).join('|'),
    },
    {
      key: 'features',
      label: 'Features',
      value: (ad) => deriveFeatures(ad).join('|'),
    },
    {
      key: 'public_url',
      label: 'Public URL',
      value: (ad) => buildAdPublicPath({ id: ad.id, slug: ad.slug }),
    },
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsv(`ads-export-${stamp}.csv`, results, columns);
};

  const canModerate = isAdmin && hasPermission('review_ads');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCount = selectedIds.size;
  const allVisibleSelected = results.length > 0 && results.every((r) => selectedIds.has(r.id));

  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const [bulkRejectReasons, setBulkRejectReasons] = useState<string[]>([]);
  const [bulkRejectMessage, setBulkRejectMessage] = useState('');

  const canAccess = isAdmin && hasPermission('search_ads');

  const categoryOptions = useMemo(() => {
    const cats = [...categories].sort((a, b) => a.name.localeCompare(b.name));
    const subsByCat = subcategories.reduce<Record<string, Subcategory[]>>((acc, s) => {
      acc[s.category_id] = acc[s.category_id] || [];
      acc[s.category_id].push(s);
      return acc;
    }, {});
    for (const k of Object.keys(subsByCat)) {
      subsByCat[k].sort((a, b) => a.name.localeCompare(b.name));
    }

    const opts: { value: string; label: string }[] = [{ value: 'all', label: 'All categories' }];
    for (const c of cats) {
      opts.push({ value: `cat:${c.id}`, label: c.name });
      for (const s of subsByCat[c.id] || []) {
        opts.push({ value: `sub:${s.id}`, label: `↳ ${s.name}` });
      }
    }
    return opts;
  }, [categories, subcategories]);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [{ data: cats, error: catsErr }, { data: subs, error: subsErr }] = await Promise.all([
          supabase.from('categories').select('id,name').order('name'),
          supabase.from('subcategories').select('id,name,category_id').order('name'),
        ]);
        if (catsErr) throw catsErr;
        if (subsErr) throw subsErr;
        if (!cancelled) {
          setCategories((cats as any) ?? []);
          setSubcategories((subs as any) ?? []);
        }

        // Admin users list (for reviewer filter)
        const { data: admins, error: adminErr } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');
        if (adminErr) throw adminErr;
        const adminIds = (admins || []).map((r) => r.user_id);
        if (adminIds.length) {
          const { data: adminProfiles, error: apErr } = await supabase
            .from('profiles')
            .select('user_id,full_name,email')
            .in('user_id', adminIds);
          if (apErr) throw apErr;
          if (!cancelled) setAdminUsers((adminProfiles as any) ?? []);
        } else {
          if (!cancelled) setAdminUsers([]);
        }

        // Location values (derived from existing ads to keep the list relevant)
        const { data: locRows, error: locErr } = await supabase
          .from('ads')
          .select('division,district,area')
          .order('created_at', { ascending: false })
          .limit(1500);
        if (locErr) throw locErr;
        const locs = new Set<string>();
        for (const r of (locRows as any) || []) {
          for (const key of ['division', 'district', 'area'] as const) {
            const v = (r?.[key] as string | null | undefined) ?? '';
            const trimmed = v.trim();
            if (trimmed) locs.add(trimmed);
          }
        }
        const sorted = Array.from(locs).sort((a, b) => a.localeCompare(b));
        if (!cancelled) setLocationOptions(sorted);
      } catch (e: any) {
        console.error(e);
        toast({ title: 'Failed to load filters', description: e?.message ?? 'Unknown error', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const toggle = (arr: string[], value: string) => {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedStates([]);
    setSelectedAdTypes([]);
    setSelectedProductTypes([]);
    setSelectedFeatures([]);
    setEventType('all');
    setEventFrom('');
    setEventTo('');
    setCategoryValue('all');
    setLocationValue('all');
    setRejectionReason('all');
    setAdminUserId('all');
    setResults([]);
    setSelectedIds(new Set());
    setBulkRejectReasons([]);
    setBulkRejectMessage('');
  };

  const runSearch = async () => {
    if (!canAccess) return;
    setLoading(true);
    setResults([]);
    setSelectedIds(new Set());

    try {
      const q = search.trim();

      // If an ad UUID is embedded in the query (e.g. user pasted the public URL slug-<uuid>),
      // treat it as an ID search.
      const embeddedUuid = q ? extractUuidFromText(q) : null;

      // 1) Event filter (audit log) -> narrow to ad ids
      let eventAdIds: string[] | null = null;
      const hasEventFilters = eventType !== 'all' || adminUserId !== 'all' || Boolean(eventFrom) || Boolean(eventTo);

      if (hasEventFilters) {
        let logQuery = supabase
          .from('ad_audit_logs')
          .select('ad_id,action,created_at,actor_id')
          .order('created_at', { ascending: false });

        if (eventFrom) logQuery = logQuery.gte('created_at', new Date(eventFrom).toISOString());
        if (eventTo) {
          const endDate = new Date(eventTo);
          endDate.setHours(23, 59, 59, 999);
          logQuery = logQuery.lte('created_at', endDate.toISOString());
        }

        if (adminUserId !== 'all') logQuery = logQuery.eq('actor_id', adminUserId);

        if (eventType !== 'all') {
          if (eventType === 'created') {
            logQuery = logQuery.eq('action', 'created');
          } else if (eventType === 'approved') {
            logQuery = logQuery.ilike('action', '%to_approved');
          } else if (eventType === 'rejected') {
            logQuery = logQuery.ilike('action', '%to_rejected');
          } else if (eventType === 'promoted') {
            logQuery = logQuery.eq('action', 'promoted');
          } else if (eventType === 'deactivated') {
            logQuery = logQuery.eq('action', 'deactivated');
          }
        }

        const { data: logs, error: logErr } = await logQuery.limit(2500);
        if (logErr) throw logErr;

        const ids = uniq(((logs as any) || []).map((l: any) => l.ad_id).filter(Boolean));
        eventAdIds = ids;

        if (!ids.length) {
          setResults([]);
          return;
        }
      }

      // 2) Resolve search query to user ids (when searching by email/phone)
      let userIdsFromSearch: string[] | null = null;
      if (q && !embeddedUuid) {
        if (isLikelyEmail(q)) {
          const { data: users, error } = await supabase
            .from('profiles')
            .select('user_id')
            .ilike('email', `%${q}%`)
            .limit(250);
          if (error) throw error;
          const ids = uniq(((users as any) || []).map((u: any) => u.user_id).filter(Boolean));
          userIdsFromSearch = ids;
        } else if (isLikelyPhone(q)) {
          const digits = q.replace(/\D/g, '');
          const fuzzy = buildFuzzyPhonePattern(digits);
          const patterns = uniq([
            `%${q}%`,
            digits ? `%${digits}%` : '',
            fuzzy,
          ].filter(Boolean));

          const ors = patterns
            .flatMap((p) => [
              `phone_number.ilike.${p}`,
              `phone_number_secondary.ilike.${p}`,
            ])
            .join(',');

          const { data: users, error } = await supabase
            .from('profiles')
            .select('user_id,phone_number,phone_number_secondary')
            .or(ors)
            .limit(250);
          if (error) throw error;
          const ids = uniq(((users as any) || []).map((u: any) => u.user_id).filter(Boolean));
          userIdsFromSearch = ids;
        }
      }

      // If the query looks like an email/phone and we couldn't resolve it to any user,
      // return an empty result set (instead of falling back to slug/title search).
      if (q && userIdsFromSearch && userIdsFromSearch.length === 0) {
        setResults([]);
        return;
      }

      // 3) Ads query
      let adQuery = supabase
        .from('ads')
        .select(
          [
            'id',
            'slug',
            'title',
            'status',
            'created_at',
            'price',
            'price_type',
            'user_id',
            'category_id',
            'subcategory_id',
            'division',
            'district',
            'area',
            'needs_verification',
            'expires_at',
            'last_reviewed_by',
            'last_reviewed_at',
            'ad_type',
            'product_types',
            'features',
            'rejection_reason',
            'is_unconfirmed',
            'is_deactivated',
            'is_archived',
            'payment_status',
            'is_featured',
            'promotion_type',
          ].join(',')
        )
        .order('created_at', { ascending: false })
        .limit(250);

      if (eventAdIds) adQuery = adQuery.in('id', eventAdIds);

      // Search: slug/id/title (fallback to user_id filter when email/phone)
      if (q) {
        if (embeddedUuid) {
          adQuery = adQuery.eq('id', embeddedUuid);
        } else if (isUuid(q)) {
          adQuery = adQuery.eq('id', q);
        } else if (userIdsFromSearch && userIdsFromSearch.length) {
          adQuery = adQuery.in('user_id', userIdsFromSearch);
        } else {
          // slug or title (or a full URL pasted in)
          const escaped = q.replace(/,/g, ' ').trim();
          const lastSegRaw = escaped.split('/').filter(Boolean).pop() ?? escaped;
          const lastSegment = lastSegRaw.split('?')[0].split('#')[0];
          // Prefer searching the last URL segment against slug.
          adQuery = adQuery.or(`slug.ilike.%${lastSegment}%,title.ilike.%${escaped}%`);
        }
      }

      // Category/subcategory
      if (categoryValue !== 'all') {
        if (categoryValue.startsWith('cat:')) {
          adQuery = adQuery.eq('category_id', categoryValue.replace('cat:', ''));
        } else if (categoryValue.startsWith('sub:')) {
          adQuery = adQuery.eq('subcategory_id', categoryValue.replace('sub:', ''));
        }
      }

      // Location
      if (locationValue !== 'all') {
        const esc = locationValue.replace(/,/g, ' ');
        adQuery = adQuery.or(`division.ilike.%${esc}%,district.ilike.%${esc}%,area.ilike.%${esc}%`);
      }

      // Rejection reason
      if (rejectionReason !== 'all') {
        adQuery = adQuery.eq('rejection_reason', rejectionReason);
      }


      // Broad server-side status filter (fine-grained mapping is applied client-side)
      if (selectedStates.length) {
        const s = new Set<string>();
        for (const st of selectedStates) {
          if (st === 'AdState_REJECTED') s.add('rejected');
          if (st === 'AdState_ENQUEUED') s.add('pending');
          if (st === 'AdState_PENDING_VERIFICATION') s.add('approved');
          if (st === 'AdState_PUBLISHED') s.add('approved');
          if (st === 'AdState_ARCHIVED') {
            s.add('approved');
            s.add('sold');
          }
          if (st === 'AdState_DEACTIVATED') s.add('approved');
          if (st === 'AdState_PENDING_PAYMENT') s.add('approved');
          if (st === 'AdState_UNCONFIRMED') {
            s.add('pending');
            s.add('approved');
          }
        }
        const arr = Array.from(s);
        if (arr.length) adQuery = adQuery.in('status', arr as any);
      }

      const { data: rows, error } = await adQuery;
      if (error) throw error;

      let list: AdRow[] = ((rows as any) || []) as AdRow[];

      // Client-side filters to mirror the HTML checkboxes more closely
      if (selectedStates.length) {
        list = list.filter((ad) => selectedStates.includes(deriveAdState(ad)));
      }

      if (selectedAdTypes.length) {
        list = list.filter((ad) => {
          const v = (ad.ad_type ?? '') as string;
          return v ? selectedAdTypes.includes(v) : false;
        });
      }

      if (selectedProductTypes.length) {
        list = list.filter((ad) => {
          const derived = deriveProductTypes(ad);
          return derived.some((p) => selectedProductTypes.includes(p));
        });
      }

      if (selectedFeatures.length) {
        list = list.filter((ad) => {
          const derived = deriveFeatures(ad);
          return derived.some((f) => selectedFeatures.includes(f));
        });
      }

      setResults(list);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Search failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };



  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds(() => {
      if (!checked) return new Set();
      return new Set(results.map((r) => r.id));
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkApprove = async () => {
    if (!user) return;
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    setBulkActionLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('ads')
        .update({
          status: 'approved',
          needs_verification: false,
          is_deactivated: false,
          is_archived: false,
          rejection_reason: null,
          rejection_reasons: [],
          rejection_message: null,
          duplicate_of_ad_id: null,
          last_reviewed_by: user.id,
          last_reviewed_at: now,
        })
        .in('id', ids);

      if (error) throw error;

      toast({ title: 'Approved', description: `${ids.length} ad(s) approved.` });
      clearSelection();
      setApproveDialogOpen(false);
      await runSearch();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Approve failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDeactivate = async () => {
    if (!user) return;
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    setBulkActionLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('ads')
        .update({
          is_deactivated: true,
          last_reviewed_by: user.id,
          last_reviewed_at: now,
        })
        .in('id', ids);

      if (error) throw error;

      toast({ title: 'Deactivated', description: `${ids.length} ad(s) deactivated.` });
      clearSelection();
      setDeactivateDialogOpen(false);
      await runSearch();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Deactivate failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkArchive = async () => {
    if (!user) return;
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    setBulkActionLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('ads')
        .update({
          is_archived: true,
          last_reviewed_by: user.id,
          last_reviewed_at: now,
        })
        .in('id', ids);

      if (error) throw error;

      toast({ title: 'Archived', description: `${ids.length} ad(s) archived.` });
      clearSelection();
      setArchiveDialogOpen(false);
      await runSearch();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Archive failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkReject = async () => {
    if (!user) return;
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (!bulkRejectReasons.length) {
      toast({
        title: 'Select at least one reason',
        description: 'Rejection requires a reason.',
        variant: 'destructive',
      });
      return;
    }

    setBulkActionLoading(true);
    try {
      const now = new Date().toISOString();
      const primaryReason = bulkRejectReasons[0] ?? null;

      const { error } = await supabase
        .from('ads')
        .update({
          status: 'rejected',
          needs_verification: false,
          rejection_reason: primaryReason,
          rejection_reasons: bulkRejectReasons,
          rejection_message: bulkRejectMessage || null,
          last_reviewed_by: user.id,
          last_reviewed_at: now,
        })
        .in('id', ids);

      if (error) throw error;

      toast({ title: 'Rejected', description: `${ids.length} ad(s) rejected.` });
      clearSelection();
      setRejectDialogOpen(false);
      setBulkRejectReasons([]);
      setBulkRejectMessage('');
      await runSearch();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Reject failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
    }
  };
  if (!canAccess) {
    return (
      <AdminLayout>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">Search for ads</h1>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">You do not have permission to search ads.</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Approve selected ads</DialogTitle>
              <DialogDescription>
                This will approve and publish the selected listings.
                {selectedCount ? ` ${selectedCount} ad(s) selected.` : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={bulkActionLoading}>
                Cancel
              </Button>
              <Button onClick={bulkApprove} disabled={bulkActionLoading || !selectedCount} className="gap-2">
                {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) {
            setBulkRejectReasons([]);
            setBulkRejectMessage('');
          }
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Reject selected ads</DialogTitle>
              <DialogDescription>
                Choose at least one rejection reason. The same reasons/message will be applied to all selected ads.
                {selectedCount ? ` ${selectedCount} ad(s) selected.` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reasons</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ADMIN_AD_REJECTION_REASONS.map((r) => (
                    <label key={r.value} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={bulkRejectReasons.includes(r.value)}
                        onCheckedChange={() => setBulkRejectReasons((prev) => toggle(prev, r.value))}
                      />
                      <span className="leading-5">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  value={bulkRejectMessage}
                  onChange={(e) => setBulkRejectMessage(e.target.value)}
                  placeholder="Optional note shown to the seller (keep it short and clear)."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={bulkActionLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={bulkReject}
                disabled={bulkActionLoading || !selectedCount || !bulkRejectReasons.length}
                className="gap-2"
              >
                {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Deactivate selected ads</DialogTitle>
              <DialogDescription>
                Deactivated listings are hidden from public view, but remain in the database.
                {selectedCount ? ` ${selectedCount} ad(s) selected.` : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)} disabled={bulkActionLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={bulkDeactivate}
                disabled={bulkActionLoading || !selectedCount}
                className="gap-2"
              >
                {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Archive selected ads</DialogTitle>
              <DialogDescription>
                Archived listings are treated as unavailable.
                {selectedCount ? ` ${selectedCount} ad(s) selected.` : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setArchiveDialogOpen(false)} disabled={bulkActionLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={bulkArchive}
                disabled={bulkActionLoading || !selectedCount}
                className="gap-2"
              >
                {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                Archive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Search for ads</h1>
          <p className="text-sm text-muted-foreground">
            Find listings by slug/title, user email/phone, states, events, and more.
          </p>
        </div>
        <Button variant="outline" onClick={resetFilters} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Search & filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="search">Search for an Ad</Label>
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="eg. ad slug, email, phone no"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              {loadingOptions ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={categoryValue} onValueChange={setCategoryValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {categoryOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Location</Label>
              {loadingOptions ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={locationValue} onValueChange={setLocationValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    <SelectItem value="all">All locations</SelectItem>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Rejection reason</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="All rejection reasons" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {ADMIN_AD_REJECTION_REASON_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Admin user</Label>
              {loadingOptions ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={adminUserId} onValueChange={setAdminUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All admins" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    <SelectItem value="all">All admins</SelectItem>
                    {adminUsers
                      .slice()
                      .sort((a, b) => (a.full_name ?? a.email ?? '').localeCompare(b.full_name ?? b.email ?? ''))
                      .map((a) => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          {a.full_name || a.email || a.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Event type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {ADMIN_AD_EVENT_TYPE_OPTIONS.map((ev) => (
                    <SelectItem key={ev.value} value={ev.value}>
                      {ev.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Event date from</Label>
              <Input type="date" value={eventFrom} onChange={(e) => setEventFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Event date to</Label>
              <Input type="date" value={eventTo} onChange={(e) => setEventTo(e.target.value)} />
            </div>
            <div className="lg:col-span-2 flex items-end">
              <Button onClick={runSearch} className="gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Filter by status</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ADMIN_AD_STATE_OPTIONS.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedStates.includes(s.value)}
                      onCheckedChange={() => setSelectedStates((prev) => toggle(prev, s.value))}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Ad type</div>
              <div className="grid gap-2">
                {ADMIN_AD_TYPE_OPTIONS.map((t) => (
                  <label key={t.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedAdTypes.includes(t.value)}
                      onCheckedChange={() => setSelectedAdTypes((prev) => toggle(prev, t.value))}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Features</div>
              <div className="grid gap-2">
                {ADMIN_AD_FEATURE_OPTIONS.map((f) => (
                  <label key={f.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedFeatures.includes(f.value)}
                      onCheckedChange={() => setSelectedFeatures((prev) => toggle(prev, f.value))}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Product type</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {ADMIN_AD_PRODUCT_TYPE_OPTIONS.map((p) => (
                <label key={p.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedProductTypes.includes(p.value)}
                    onCheckedChange={() => setSelectedProductTypes((prev) => toggle(prev, p.value))}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Results</CardTitle>

          <div className="flex items-center gap-2">
            {results.length > 0 ? (
              <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            ) : null}

            {canModerate && results.length > 0 ? (
              <>
                <span className="text-xs text-muted-foreground">
                  {selectedCount ? `${selectedCount} selected` : 'Select ads to manage'}
                </span>

                {selectedCount ? (
                  <>
                    <Button size="sm" variant="outline" onClick={clearSelection} disabled={bulkActionLoading}>
                      Clear
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="secondary" className="gap-2" disabled={bulkActionLoading}>
                          <MoreHorizontal className="h-4 w-4" />
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setApproveDialogOpen(true);
                          }}
                          className="gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setRejectDialogOpen(true);
                          }}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setDeactivateDialogOpen(true);
                          }}
                          className="gap-2"
                        >
                          <Ban className="h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setArchiveDialogOpen(true);
                          }}
                          className="gap-2"
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No results. Adjust filters and search again.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canModerate ? (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(v) => toggleSelectAllVisible(v === true)}
                      />
                    </TableHead>
                  ) : null}
                  <TableHead>Ad</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((ad) => {
                  const state = deriveAdState(ad);
                  const stateLabel = ADMIN_AD_STATE_OPTIONS.find((s) => s.value === state)?.label ?? state;
                  const cat = categories.find((c) => c.id === ad.category_id)?.name;
                  const sub = subcategories.find((s) => s.id === (ad as any).subcategory_id)?.name;
                  const location = [ad.area, ad.district, ad.division].filter(Boolean).join(', ');
                  const priceLabel =
                    ad.price == null
                      ? '—'
                      : ad.price_type === 'free'
                        ? 'Free'
                        : `${ad.price.toLocaleString()} BDT`;
                  return (
                    <TableRow key={ad.id}>
                      {canModerate ? (
                        <TableCell className="w-[40px]">
                          <Checkbox checked={selectedIds.has(ad.id)} onCheckedChange={() => toggleSelected(ad.id)} />
                        </TableCell>
                      ) : null}
                      <TableCell className="min-w-[260px]">
                        <div className="space-y-1">
                          <div className="font-medium leading-tight">{ad.title}</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-mono">{ad.slug || ad.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stateLabel}</Badge>
                      </TableCell>
                      <TableCell>{sub ? `${cat} / ${sub}` : cat || '—'}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{location || '—'}</TableCell>
                      <TableCell>{priceLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(ad.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canModerate ? (
                            <Button asChild size="sm" variant="secondary" className="gap-2">
                              <Link to={`/admin/ads/general?adId=${ad.id}`}>
                                Review
                              </Link>
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              window.open(
                                buildAdPublicPath({ id: ad.id, slug: ad.slug }),
                                '_blank',
                                'noopener,noreferrer',
                              );
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}
