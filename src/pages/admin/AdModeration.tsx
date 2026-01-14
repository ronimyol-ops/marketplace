import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import {
  Loader2,
  RefreshCw,
  Save,
  ThumbsDown,
  ThumbsUp,
  ShieldCheck,
  PencilLine,
  UserRound,
} from 'lucide-react';

import {
  ADMIN_AD_REJECTION_REASONS,
  ADMIN_AD_TYPE_OPTIONS,
  ADMIN_AD_FEATURE_OPTIONS,
  ADMIN_AD_PRODUCT_TYPE_OPTIONS,
} from '@/constants/adminFeatureParity';
import { buildAdPublicPath } from '@/lib/adRoutes';
import { deriveLegacyPromotionFromProductTypes } from '@/lib/adPromotion';

type ReviewQueue = 'general' | 'edited' | 'verification' | 'member';

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  phone_number_secondary?: string | null;
  seller_type?: 'private' | 'business' | null;
  show_phone_on_ads?: boolean | null;
  phone_verified?: boolean | null;
};

type AdRow = {
  id: string;
  user_id: string;
  slug: string | null;
  title: string;
  description: string;
  status: string;
  category_id: string | null;
  subcategory_id?: string | null;
  price: number;
  price_type: string;
  mrp?: number | null;
  discount?: number | null;
  division: string | null;
  district: string | null;
  area: string | null;
  ad_type?: string | null;
  product_types?: string[] | null;
  features?: string[] | null;
  is_featured?: boolean | null;
  promotion_type?: string | null;
  promotion_expires_at?: string | null;
  expires_at?: string | null;
  needs_verification?: boolean | null;
  first_time_poster?: boolean | null;
  is_unconfirmed?: boolean | null;
  is_deactivated?: boolean | null;
  is_archived?: boolean | null;
  payment_status?: string | null;
  rejection_reason?: string | null;
  rejection_reasons?: string[] | null;
  rejection_message?: string | null;
  duplicate_of_ad_id?: string | null;
  last_reviewed_by?: string | null;
  last_reviewed_at?: string | null;
};

type AdImage = { id: string; image_url: string; sort_order: number | null };

type EditRequestRow = {
  id: string;
  ad_id: string;
  status: 'pending' | 'approved' | 'rejected';
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  review_message: string | null;
  created_at: string;
};

const QUEUE_META: Record<ReviewQueue, { label: string; description: string }> = {
  general: {
    label: 'General',
    description: 'Review pending ads, edit details, and approve or reject.',
  },
  edited: {
    label: 'Edited',
    description: 'Review edit requests submitted by members for existing ads.',
  },
  verification: {
    label: 'Verify',
    description: 'Verify auto-approved ads that are awaiting manual verification.',
  },
  member: {
    label: 'Member',
    description: 'Review ads posted by first-time posters (member queue).',
  },
};

const REVIEW_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  category_id: 'Category',
  subcategory_id: 'Subcategory',
  price: 'Price',
  price_type: 'Price type',
  condition: 'Condition',
  ad_type: 'Ad type',
  mrp: 'MRP',
  discount: 'Discount',
  features: 'Features',
  product_types: 'Product types',
  division: 'Division',
  district: 'District',
  upazila: 'Upazila',
  area: 'Area',
  custom_fields: 'Extra details',
};

function asQueue(value: string | undefined | null): ReviewQueue {
  const v = (value || '').toLowerCase();
  if (v === 'general' || v === 'edited' || v === 'verification' || v === 'member') return v;
  return 'general';
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function extractUuidFromText(text: string): string | null {
  const m = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}

function toggleArrayValue(arr: string[] | undefined | null, value: string) {
  const base = Array.isArray(arr) ? arr : [];
  return base.includes(value) ? base.filter((v) => v !== value) : [...base, value];
}

export default function AdModeration() {
  const { user, isAdmin, hasPermission } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { queue: queueParam } = useParams();
  const queue = asQueue(queueParam);
  const meta = QUEUE_META[queue];

  const [params, setParams] = useSearchParams();

  const canAccess = isAdmin && hasPermission('review_ads');

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ad, setAd] = useState<AdRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [images, setImages] = useState<AdImage[]>([]);

  const [editRequest, setEditRequest] = useState<EditRequestRow | null>(null);
  const [editRejectOpen, setEditRejectOpen] = useState(false);
  const [editRejectMessage, setEditRejectMessage] = useState('');

  const [queueCounts, setQueueCounts] = useState<{ general: number; edited: number; verification: number; member: number } | null>(null);
  const [reviewedToday, setReviewedToday] = useState(0);

  const [lookup, setLookup] = useState('');

  // Form state (keeps UI responsive while editing)
  const [adForm, setAdForm] = useState<Partial<AdRow>>({});
  const [profileForm, setProfileForm] = useState<Partial<ProfileRow>>({});

  // Reject dialog state (ad-level)
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectMessage, setRejectMessage] = useState('');
  const [duplicateSlugOrId, setDuplicateSlugOrId] = useState('');

  const subcategoriesForSelectedCategory = useMemo(() => {
    const catId = adForm.category_id ?? ad?.category_id ?? null;
    if (!catId) return [];
    return subcategories.filter((s) => s.category_id === catId);
  }, [subcategories, adForm.category_id, ad?.category_id]);

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [images]);

  const publicAdHref = ad ? buildAdPublicPath({ id: ad.id, slug: ad.slug }) : undefined;

  useEffect(() => {
    if (!user) return;
    if (isAdmin === false) return;
    if (queueParam && queueParam !== queue) {
      // Unknown queue path -> normalize
      navigate('/admin/ads/general', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueParam, user?.id, isAdmin]);

  useEffect(() => {
    // preload categories/subcategories for the edit form
    const loadTaxonomy = async () => {
      const [{ data: cats }, { data: subs }] = await Promise.all([
        supabase.from('categories').select('id,name').order('name'),
        supabase.from('subcategories').select('id,name,category_id').order('name'),
      ]);
      setCategories((cats as any) ?? []);
      setSubcategories((subs as any) ?? []);
    };

    loadTaxonomy();
  }, []);

  const loadCountsAndReviewedToday = async () => {
    if (!user) return;
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    try {
      const [
        { count: generalCount },
        { count: memberCount },
        { count: verificationCount },
        { count: editedCount },
      ] = await Promise.all([
        supabase
          .from('ads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('first_time_poster', false),
        supabase
          .from('ads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('first_time_poster', true),
        supabase
          .from('ads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .eq('needs_verification', true),
        supabase
          .from('ad_edit_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

      setQueueCounts({
        general: generalCount ?? 0,
        member: memberCount ?? 0,
        verification: verificationCount ?? 0,
        edited: editedCount ?? 0,
      });

      if (queue === 'edited') {
        const { count } = await supabase
          .from('ad_edit_requests')
          .select('id', { count: 'exact', head: true })
          .eq('reviewed_by', user.id)
          .gte('reviewed_at', startOfToday);
        setReviewedToday(count ?? 0);
      } else {
        const { count } = await supabase
          .from('ads')
          .select('id', { count: 'exact', head: true })
          .eq('last_reviewed_by', user.id)
          .gte('last_reviewed_at', startOfToday);
        setReviewedToday(count ?? 0);
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    if (!user) return;
    loadCountsAndReviewedToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, queue]);

  const hydrateForms = (nextAd: AdRow, nextProfile: ProfileRow | null) => {
    setAdForm({
      id: nextAd.id,
      title: nextAd.title,
      description: nextAd.description,
      category_id: nextAd.category_id,
      subcategory_id: (nextAd as any).subcategory_id ?? null,
      price: nextAd.price,
      price_type: nextAd.price_type,
      mrp: (nextAd as any).mrp ?? null,
      discount: (nextAd as any).discount ?? null,
      division: nextAd.division ?? '',
      district: nextAd.district ?? '',
      area: nextAd.area ?? '',
      ad_type: (nextAd as any).ad_type ?? '',
      product_types: (nextAd as any).product_types ?? [],
      features: (nextAd as any).features ?? [],
    });

    if (nextProfile) {
      setProfileForm({
        user_id: nextProfile.user_id,
        full_name: nextProfile.full_name ?? '',
        email: nextProfile.email ?? '',
        phone_number: nextProfile.phone_number ?? '',
        phone_number_secondary: (nextProfile as any).phone_number_secondary ?? '',
        seller_type: ((nextProfile as any).seller_type ?? 'private') as any,
        show_phone_on_ads: (nextProfile as any).show_phone_on_ads ?? true,
        phone_verified: (nextProfile as any).phone_verified ?? false,
      });
    }
  };

  const fetchAdByIdOrSlug = async (idOrSlug: string) => {
    setLoading(true);
    try {
      // Try by UUID first
      const isId = isUuid(idOrSlug);

      let adQuery = supabase
        .from('ads')
        .select(
          'id,user_id,slug,title,description,status,category_id,subcategory_id,price,price_type,mrp,discount,division,district,area,ad_type,product_types,features,is_featured,promotion_type,promotion_expires_at,expires_at,needs_verification,first_time_poster,is_unconfirmed,is_deactivated,is_archived,payment_status,rejection_reason,rejection_reasons,rejection_message,duplicate_of_ad_id,last_reviewed_by,last_reviewed_at'
        )
        .limit(1);

      if (isId) {
        adQuery = adQuery.eq('id', idOrSlug);
      } else {
        adQuery = adQuery.eq('slug', idOrSlug);
      }

      const { data: adRows, error: adErr } = await adQuery;
      if (adErr) throw adErr;
      const nextAd = (adRows as any)?.[0] as AdRow | undefined;
      if (!nextAd) {
        toast({ title: 'Not found', description: 'No ad matched that ID/slug.' });
        return;
      }

      const [{ data: p }, { data: imgRows }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id,full_name,email,phone_number,phone_number_secondary,seller_type,show_phone_on_ads,phone_verified')
          .eq('user_id', nextAd.user_id)
          .maybeSingle(),
        supabase.from('ad_images').select('id,image_url,sort_order').eq('ad_id', nextAd.id),
      ]);

      setEditRequest(null);
      setAd(nextAd);
      setProfile((p as any) ?? null);
      setImages(((imgRows as any) ?? []) as AdImage[]);
      hydrateForms(nextAd, (p as any) ?? null);
    } catch (e: any) {
      toast({ title: 'Failed to load ad', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEditRequestByLookup = async (value: string) => {
    const raw = value.trim();
    if (!raw) return;

    // Accept pasted public URLs or "slug-<uuid>"... 
    const lastSegRaw = raw.split('/').filter(Boolean).pop() ?? raw;
    const lastSegment = lastSegRaw.split('?')[0].split('#')[0];
    const embeddedUuid = extractUuidFromText(lastSegment);
    const v = (embeddedUuid ?? lastSegment).trim();
    setLoading(true);

    try {
      // 1) If it looks like a UUID, try: (a) request ID, then (b) ad ID.
      if (isUuid(v)) {
        const { data: reqById } = await supabase
          .from('ad_edit_requests')
          .select('id,ad_id,status,old_values,new_values,review_message,created_at,ads ( id,user_id,slug,title,description,status,category_id,subcategory_id,price,price_type,mrp,discount,division,district,area,ad_type,product_types,features,is_featured,promotion_type,promotion_expires_at,expires_at,needs_verification,first_time_poster,is_unconfirmed,is_deactivated,is_archived,payment_status,rejection_reason,rejection_reasons,rejection_message,duplicate_of_ad_id,last_reviewed_by,last_reviewed_at )')
          .eq('id', v)
          .maybeSingle();

        if ((reqById as any)?.id) {
          const r = reqById as any;
          const nextAd = r.ads as AdRow;
          const [{ data: p }, { data: imgRows }] = await Promise.all([
            supabase
              .from('profiles')
              .select('user_id,full_name,email,phone_number,phone_number_secondary,seller_type,show_phone_on_ads,phone_verified')
              .eq('user_id', nextAd.user_id)
              .maybeSingle(),
            supabase.from('ad_images').select('id,image_url,sort_order').eq('ad_id', nextAd.id),
          ]);

          const req: EditRequestRow = {
            id: r.id,
            ad_id: r.ad_id,
            status: r.status,
            old_values: r.old_values || {},
            new_values: r.new_values || {},
            review_message: r.review_message || null,
            created_at: r.created_at,
          };
          setEditRequest(req);
          setAd(nextAd);
          setProfile((p as any) ?? null);
          setImages(((imgRows as any) ?? []) as AdImage[]);

          const mergedAd = { ...nextAd, ...(req.new_values || {}) } as AdRow;
          hydrateForms(mergedAd, (p as any) ?? null);
          return;
        }

        // Not a request id -> try as ad id (pending request)
        const { data: reqByAd, error: reqErr } = await supabase
          .from('ad_edit_requests')
          .select('id,ad_id,status,old_values,new_values,review_message,created_at,ads ( id,user_id,slug,title,description,status,category_id,subcategory_id,price,price_type,mrp,discount,division,district,area,ad_type,product_types,features,is_featured,promotion_type,promotion_expires_at,expires_at,needs_verification,first_time_poster,is_unconfirmed,is_deactivated,is_archived,payment_status,rejection_reason,rejection_reasons,rejection_message,duplicate_of_ad_id,last_reviewed_by,last_reviewed_at )')
          .eq('ad_id', v)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (reqErr) throw reqErr;
        if ((reqByAd as any)?.id) {
          // recurse via request id path to keep logic simple
          await fetchEditRequestByLookup((reqByAd as any).id);
          return;
        }

        toast({ title: 'Not found', description: 'No pending edit request matched that ID.' });
        return;
      }

      // 2) Otherwise treat as slug: load ad, then pending request for that ad.
      const { data: adRow, error: adErr } = await supabase
        .from('ads')
        .select('id')
        .eq('slug', v)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (adErr) throw adErr;
      const adId = (adRow as any)?.id as string | undefined;
      if (!adId) {
        toast({ title: 'Not found', description: 'No ad matched that slug.' });
        return;
      }

      const { data: reqBySlug } = await supabase
        .from('ad_edit_requests')
        .select('id')
        .eq('ad_id', adId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const reqId = (reqBySlug as any)?.id as string | undefined;
      if (!reqId) {
        toast({ title: 'Not found', description: 'No pending edit request found for that ad.' });
        return;
      }
      await fetchEditRequestByLookup(reqId);
    } catch (e: any) {
      toast({ title: 'Failed to load edit request', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadNextFromQueue = async () => {
    setLoading(true);
    try {
      if (queue === 'edited') {
        const { data: rows, error } = await supabase
          .from('ad_edit_requests')
          .select('id')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(1);
        if (error) throw error;
        const nextId = (rows as any)?.[0]?.id as string | undefined;
        if (!nextId) {
          toast({ title: 'Queue empty', description: 'No pending edit requests found.' });
          return;
        }

        setParams((prev) => {
          const p = new URLSearchParams(prev);
          p.set('editId', nextId);
          p.delete('adId');
          p.delete('slug');
          return p;
        });
        await fetchEditRequestByLookup(nextId);
      } else {
        let q = supabase.from('ads').select('id').order('created_at', { ascending: true }).limit(1);
        if (queue === 'verification') {
          q = q.eq('status', 'approved').eq('needs_verification', true);
        } else if (queue === 'member') {
          q = q.eq('status', 'pending').eq('first_time_poster', true);
        } else {
          // general
          q = q.eq('status', 'pending').eq('first_time_poster', false);
        }

        const { data: rows, error } = await q;
        if (error) throw error;
        const nextId = (rows as any)?.[0]?.id as string | undefined;
        if (!nextId) {
          toast({ title: 'Queue empty', description: 'No items found in this queue.' });
          return;
        }

        setParams((prev) => {
          const p = new URLSearchParams(prev);
          p.set('adId', nextId);
          p.delete('slug');
          p.delete('editId');
          return p;
        });
        await fetchAdByIdOrSlug(nextId);
      }
    } catch (e: any) {
      toast({ title: 'Failed to load queue item', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setLoading(false);
      await loadCountsAndReviewedToday();
    }
  };

  // Auto-load when query params are present
  useEffect(() => {
    if (!canAccess) return;
    const adId = params.get('adId');
    const slug = params.get('slug');
    const editId = params.get('editId');

    // Switching queues should clear the non-relevant selection to avoid confusion.
    if (queue !== 'edited') {
      setEditRequest(null);
      setEditRejectOpen(false);
      setEditRejectMessage('');
    }

    if (queue === 'edited') {
      if (editId) fetchEditRequestByLookup(editId);
      else if (adId) fetchEditRequestByLookup(adId);
      else if (slug) fetchEditRequestByLookup(slug);
    } else {
      if (adId) fetchAdByIdOrSlug(adId);
      else if (slug) fetchAdByIdOrSlug(slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, params.get('adId'), params.get('slug'), params.get('editId'), canAccess]);

  const saveEdits = async (manageSavingState: boolean = true) => {
    if (!ad) return;
    if (manageSavingState) setSaving(true);
    try {
      const profileUpdates: Record<string, any> = {
        full_name: (profileForm.full_name ?? '').trim() || null,
        email: (profileForm.email ?? '').trim() || null,
        phone_number: (profileForm.phone_number ?? '').trim() || null,
        phone_number_secondary: (profileForm.phone_number_secondary ?? '').trim() || null,
        seller_type: profileForm.seller_type ?? 'private',
        show_phone_on_ads: profileForm.show_phone_on_ads ?? true,
        phone_verified: profileForm.phone_verified ?? false,
      };

      const adUpdates: Record<string, any> = {
        title: (adForm.title ?? '').trim() || null,
        description: (adForm.description ?? '').trim() || null,
        category_id: adForm.category_id ?? null,
        subcategory_id: (adForm as any).subcategory_id ?? null,
        price: typeof adForm.price === 'number' ? adForm.price : Number(adForm.price ?? 0),
        price_type: adForm.price_type ?? 'fixed',
        mrp: (adForm as any).mrp === '' ? null : (adForm as any).mrp,
        discount: (adForm as any).discount === '' ? null : (adForm as any).discount,
        division: (adForm.division ?? '').trim() || null,
        district: (adForm.district ?? '').trim() || null,
        area: (adForm.area ?? '').trim() || null,
        ad_type: (adForm as any).ad_type || null,
        product_types: Array.isArray((adForm as any).product_types) ? (adForm as any).product_types : [],
        features: Array.isArray((adForm as any).features) ? (adForm as any).features : [],
      };

      // Auto-renew parity: if selected, remove expiration. If unselected and the ad
      // currently has no expiry, restore a 30-day expiry window.
      const nextFeatures = adUpdates.features as string[];
      if (nextFeatures.includes('AdFeatures_NO_EXPIRATION')) {
        adUpdates.expires_at = null;
      } else if ((ad as any).expires_at == null) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        adUpdates.expires_at = d.toISOString();
      }

      // Keep legacy promotion fields in sync with product_types so badges and sections work.
      const promo = deriveLegacyPromotionFromProductTypes(adUpdates.product_types);
      adUpdates.is_featured = promo.is_featured;
      adUpdates.promotion_type = promo.promotion_type;
      adUpdates.promotion_expires_at = promo.promotion_expires_at;

      const [{ error: pErr }, { error: aErr }] = await Promise.all([
        supabase.from('profiles').update(profileUpdates).eq('user_id', ad.user_id),
        supabase.from('ads').update(adUpdates).eq('id', ad.id),
      ]);

      if (pErr) throw pErr;
      if (aErr) throw aErr;

      toast({ title: 'Saved', description: 'Changes saved successfully.' });

      // Refresh the loaded item (so you see computed/derived columns refreshed)
      if (queue === 'edited' && editRequest) {
        await fetchEditRequestByLookup(editRequest.id);
      } else {
        await fetchAdByIdOrSlug(ad.id);
      }
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      if (manageSavingState) setSaving(false);
    }
  };

  const approveOrVerify = async () => {
    if (!ad || !user) return;
    if (queue === 'edited') return;
    setSaving(true);
    try {
      await saveEdits(false);

      const updatePayload: Record<string, any> = {
        last_reviewed_by: user.id,
        last_reviewed_at: new Date().toISOString(),
        review_source: 'admin',
      };

      if (queue === 'verification') {
        updatePayload.needs_verification = false;
        // Keep status as approved.
        updatePayload.status = 'approved';
      } else {
        // General + Member queues: approve + publish.
        updatePayload.status = 'approved';
        updatePayload.needs_verification = false;
      }

      const { error } = await supabase.from('ads').update(updatePayload).eq('id', ad.id);
      if (error) throw error;

      toast({
        title: queue === 'verification' ? 'Verified' : 'Approved',
        description: queue === 'verification' ? 'Ad verified and removed from the queue.' : 'Ad approved and removed from the queue.',
      });

      setRejectReasons([]);
      setRejectMessage('');
      setDuplicateSlugOrId('');
      await loadNextFromQueue();
    } catch (e: any) {
      toast({
        title: queue === 'verification' ? 'Verify failed' : 'Approve failed',
        description: e?.message ?? 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const rejectAd = async () => {
    if (!ad || !user) return;
    if (queue === 'edited') return;
    setSaving(true);
    try {
      await saveEdits(false);

      // Optional duplicate mapping
      let duplicateOfId: string | null = null;
      const dup = duplicateSlugOrId.trim();
      if (dup) {
        if (isUuid(dup)) {
          duplicateOfId = dup;
        } else {
          const { data: dupRow, error: dupErr } = await supabase
            .from('ads')
            .select('id')
            .eq('slug', dup)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (dupErr) throw dupErr;
          duplicateOfId = (dupRow as any)?.id ?? null;
          if (!duplicateOfId) {
            toast({
              title: 'Duplicate not found',
              description: 'We could not find an ad with that slug. Rejection will continue without linking a duplicate.',
            });
          }
        }

        if (duplicateOfId === ad.id) {
          duplicateOfId = null;
        }
      }

      const primaryReason = rejectReasons[0] ?? null;
      const { error } = await supabase
        .from('ads')
        .update({
          status: 'rejected',
          needs_verification: false,
          rejection_reason: primaryReason,
          rejection_reasons: rejectReasons,
          rejection_message: rejectMessage || null,
          duplicate_of_ad_id: duplicateOfId,
          last_reviewed_by: user.id,
          last_reviewed_at: new Date().toISOString(),
          review_source: 'admin',
        })
        .eq('id', ad.id);

      if (error) throw error;

      toast({ title: 'Rejected', description: 'Ad rejected and removed from the queue.' });
      setRejectOpen(false);
      setRejectReasons([]);
      setRejectMessage('');
      setDuplicateSlugOrId('');
      await loadNextFromQueue();
    } catch (e: any) {
      toast({ title: 'Reject failed', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const approveEditRequest = async () => {
    if (!ad || !user || !editRequest) return;
    setSaving(true);
    try {
      // Persist the on-screen form values to ads/profiles first.
      await saveEdits(false);

      const now = new Date().toISOString();
      const { error: reqErr } = await supabase
        .from('ad_edit_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: now,
          review_message: null,
        })
        .eq('id', editRequest.id);
      if (reqErr) throw reqErr;

      // Also update ad review metadata (helps audit/search).
      await supabase
        .from('ads')
        .update({ last_reviewed_by: user.id, last_reviewed_at: now, review_source: 'admin' })
        .eq('id', ad.id);

      toast({ title: 'Edit approved', description: 'The requested changes were approved.' });
      await loadNextFromQueue();
    } catch (e: any) {
      toast({ title: 'Approve failed', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const rejectEditRequest = async () => {
    if (!user || !editRequest) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('ad_edit_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: now,
          review_message: editRejectMessage || null,
        })
        .eq('id', editRequest.id);
      if (error) throw error;

      toast({ title: 'Edit rejected', description: 'The edit request was rejected.' });
      setEditRejectOpen(false);
      setEditRejectMessage('');
      await loadNextFromQueue();
    } catch (e: any) {
      toast({ title: 'Reject failed', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const changedEditFields = useMemo(() => {
    if (!editRequest) return [] as { key: string; oldValue: any; newValue: any }[];
    const oldV = editRequest.old_values || {};
    const newV = editRequest.new_values || {};
    const keys = Array.from(new Set([...Object.keys(oldV), ...Object.keys(newV)])).sort();
    return keys
      .filter((k) => JSON.stringify(oldV[k]) !== JSON.stringify(newV[k]))
      .map((k) => ({ key: k, oldValue: oldV[k], newValue: newV[k] }));
  }, [editRequest]);

  const queueTabs: { key: ReviewQueue; label: string; countKey: keyof NonNullable<typeof queueCounts> }[] = [
    { key: 'general', label: 'General', countKey: 'general' },
    { key: 'edited', label: 'Edited', countKey: 'edited' },
    { key: 'verification', label: 'Verify', countKey: 'verification' },
    { key: 'member', label: 'Member', countKey: 'member' },
  ];

  if (!canAccess) {
    return (
      <AdminLayout>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">Ad review</h1>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">You do not have permission to review ads.</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Queue navigation */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Ad review</h1>
            <p className="text-muted-foreground text-sm">{meta.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {queueTabs.map((t) => {
              const active = t.key === queue;
              const count = queueCounts ? queueCounts[t.countKey] : null;
              return (
                <Link key={t.key} to={`/admin/ads/${t.key}`} className="inline-flex">
                  <Button variant={active ? 'default' : 'outline'} size="sm" className="h-8 gap-2">
                    {t.key === 'general' ? <PencilLine className="h-4 w-4" /> : null}
                    {t.key === 'edited' ? <PencilLine className="h-4 w-4" /> : null}
                    {t.key === 'verification' ? <ShieldCheck className="h-4 w-4" /> : null}
                    {t.key === 'member' ? <UserRound className="h-4 w-4" /> : null}
                    <span>{t.label}</span>
                    {typeof count === 'number' ? (
                      <Badge variant={active ? 'secondary' : 'outline'} className="ml-1">
                        {count}
                      </Badge>
                    ) : null}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick stats + lookup */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">Queue: {meta.label}</Badge>
              <Badge variant="outline">Reviewed today: {reviewedToday}</Badge>
              {publicAdHref ? (
                <a
                  href={publicAdHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  Open public ad
                </a>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Input
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  placeholder={
                    queue === 'edited'
                      ? 'Load by edit request ID, ad ID, or slug'
                      : 'Load by ad ID, slug, or public URL'
                  }
                  className="w-[280px]"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const q = lookup.trim();
                    if (!q) return;

                    // Accept full public URLs and "slug-<uuid>" strings.
                    const lastSegRaw = q.split('/').filter(Boolean).pop() ?? q;
                    const lastSeg = lastSegRaw.split('?')[0].split('#')[0].trim();
                    const embeddedUuid = extractUuidFromText(lastSeg) || extractUuidFromText(q);
                    const effective = (embeddedUuid ?? lastSeg).trim();
                    const looksUuid = isUuid(effective);

                    setParams((prev) => {
                      const p = new URLSearchParams(prev);
                      p.delete('adId');
                      p.delete('slug');
                      p.delete('editId');
                      if (queue === 'edited') {
                        // For edited queue, accept request ID, ad ID, or slug.
                        if (looksUuid) p.set('editId', effective);
                        else p.set('slug', lastSeg);
                      } else {
                        if (looksUuid) p.set('adId', effective);
                        else p.set('slug', lastSeg);
                      }
                      return p;
                    });

                    if (queue === 'edited') {
                      await fetchEditRequestByLookup(looksUuid ? effective : lastSeg);
                    } else {
                      await fetchAdByIdOrSlug(looksUuid ? effective : lastSeg);
                    }
                  }}
                >
                  Load
                </Button>
              </div>

              <Button size="sm" onClick={loadNextFromQueue} disabled={loading} className="h-8">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Next in queue
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main review panel */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Review details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!ad ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No item loaded. Use <span className="font-medium">Next in queue</span> or load by ID/slug.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Edited queue: show request details */}
                {queue === 'edited' && editRequest ? (
                  <Card className="border-dashed">
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Edit request</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline">Request ID: {editRequest.id}</Badge>
                        <Badge variant="outline">Created: {new Date(editRequest.created_at).toLocaleString()}</Badge>
                        <Badge variant="outline">Status: {editRequest.status}</Badge>
                      </div>

                      {changedEditFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No changed fields were detected in this request.</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Changed fields</div>
                          <div className="grid gap-2">
                            {changedEditFields.slice(0, 12).map((c) => (
                              <div key={c.key} className="rounded-md border p-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">{REVIEW_FIELD_LABELS[c.key] ?? c.key}</span>
                                  <Badge variant="secondary">{c.key}</Badge>
                                </div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  <div>
                                    <div className="text-muted-foreground">Old</div>
                                    <div className="whitespace-pre-wrap break-words">{String(c.oldValue ?? '')}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">New</div>
                                    <div className="whitespace-pre-wrap break-words">{String(c.newValue ?? '')}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {changedEditFields.length > 12 ? (
                              <div className="text-xs text-muted-foreground">+ {changedEditFields.length - 12} more fields…</div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {/* Ad + member summary */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Ad</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">ID: {ad.id}</Badge>
                        {ad.slug ? <Badge variant="outline">Slug: {ad.slug}</Badge> : null}
                        <Badge variant="outline">Status: {ad.status}</Badge>
                        {ad.needs_verification ? <Badge>Needs verification</Badge> : null}
                        {ad.first_time_poster ? <Badge variant="secondary">First-time poster</Badge> : null}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Title</Label>
                        <Input value={adForm.title ?? ''} onChange={(e) => setAdForm((f) => ({ ...f, title: e.target.value }))} />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={adForm.description ?? ''}
                          onChange={(e) => setAdForm((f) => ({ ...f, description: e.target.value }))}
                          rows={6}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Member</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Full name</Label>
                        <Input
                          value={profileForm.full_name ?? ''}
                          onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Email</Label>
                        <Input
                          value={profileForm.email ?? ''}
                          onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          value={profileForm.phone_number ?? ''}
                          onChange={(e) => setProfileForm((f) => ({ ...f, phone_number: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Secondary phone</Label>
                        <Input
                          value={profileForm.phone_number_secondary ?? ''}
                          onChange={(e) => setProfileForm((f) => ({ ...f, phone_number_secondary: e.target.value }))}
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={Boolean(profileForm.show_phone_on_ads)}
                            onCheckedChange={(v) => setProfileForm((f) => ({ ...f, show_phone_on_ads: Boolean(v) }))}
                          />
                          Show phone on ads
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={Boolean(profileForm.phone_verified)}
                            onCheckedChange={(v) => setProfileForm((f) => ({ ...f, phone_verified: Boolean(v) }))}
                          />
                          Phone verified
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Structured fields */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Category & location</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={(adForm.category_id as any) ?? ''}
                            onValueChange={(v) => setAdForm((f) => ({ ...f, category_id: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Subcategory</Label>
                          <Select
                            value={((adForm as any).subcategory_id as any) ?? 'none'}
                            onValueChange={(v) => setAdForm((f) => ({ ...f, subcategory_id: v === 'none' ? null : v } as any))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select subcategory" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {subcategoriesForSelectedCategory.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Division</Label>
                          <Input
                            value={adForm.division ?? ''}
                            onChange={(e) => setAdForm((f) => ({ ...f, division: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">District</Label>
                          <Input
                            value={adForm.district ?? ''}
                            onChange={(e) => setAdForm((f) => ({ ...f, district: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Area</Label>
                          <Input
                            value={adForm.area ?? ''}
                            onChange={(e) => setAdForm((f) => ({ ...f, area: e.target.value }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Pricing & type</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Price</Label>
                          <Input
                            value={String(adForm.price ?? '')}
                            onChange={(e) => setAdForm((f) => ({ ...f, price: Number(e.target.value || 0) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Price type</Label>
                          <Select
                            value={(adForm.price_type as any) ?? 'fixed'}
                            onValueChange={(v) => setAdForm((f) => ({ ...f, price_type: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="negotiable">Negotiable</SelectItem>
                              <SelectItem value="free">Free</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Ad type</Label>
                          <Select
                            value={(adForm.ad_type as any) ?? ''}
                            onValueChange={(v) => setAdForm((f) => ({ ...f, ad_type: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {ADMIN_AD_TYPE_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs">MRP (optional)</Label>
                          <Input
                            value={String((adForm as any).mrp ?? '')}
                            onChange={(e) => setAdForm((f) => ({ ...f, mrp: e.target.value === '' ? null : Number(e.target.value) } as any))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Discount (optional)</Label>
                          <Input
                            value={String((adForm as any).discount ?? '')}
                            onChange={(e) => setAdForm((f) => ({ ...f, discount: e.target.value === '' ? null : Number(e.target.value) } as any))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Product types & features */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Product types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {ADMIN_AD_PRODUCT_TYPE_OPTIONS.map((o) => (
                          <label key={o.value} className="flex items-start gap-2 text-sm">
                            <Checkbox
                              checked={Array.isArray((adForm as any).product_types) && (adForm as any).product_types.includes(o.value)}
                              onCheckedChange={() =>
                                setAdForm((f) => ({
                                  ...f,
                                  product_types: toggleArrayValue((f as any).product_types, o.value),
                                }))
                              }
                            />
                            {o.label}
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {ADMIN_AD_FEATURE_OPTIONS.map((o) => (
                          <label key={o.value} className="flex items-start gap-2 text-sm">
                            <Checkbox
                              checked={Array.isArray((adForm as any).features) && (adForm as any).features.includes(o.value)}
                              onCheckedChange={() =>
                                setAdForm((f) => ({
                                  ...f,
                                  features: toggleArrayValue((f as any).features, o.value),
                                }))
                              }
                            />
                            {o.label}
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Images */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sortedImages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No images uploaded.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {sortedImages.map((img) => (
                          <a
                            key={img.id}
                            href={img.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative overflow-hidden rounded-md border"
                          >
                            <img
                              src={img.image_url}
                              alt="Ad"
                              className="h-28 w-full object-cover transition-transform group-hover:scale-[1.03]"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={saveEdits} disabled={!ad || saving} className="h-8">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save changes
                      </Button>

                      {queue !== 'edited' ? (
                        <>
                          <Button size="sm" onClick={approveOrVerify} disabled={!ad || saving} className="h-8">
                            {queue === 'verification' ? <ShieldCheck className="h-4 w-4 mr-2" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                            {queue === 'verification' ? 'Verify' : 'Approve'}
                          </Button>

                          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={!ad || saving}
                                className="h-8"
                              >
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Reject ad</DialogTitle>
                                <DialogDescription>
                                  Choose one or more reasons and optionally add a note for the member.
                                </DialogDescription>
                              </DialogHeader>

                              <div className="grid gap-4">
                                <div className="space-y-2">
                                  <Label>Rejection reasons</Label>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {ADMIN_AD_REJECTION_REASONS.map((r) => (
                                      <label key={r.value} className="flex items-start gap-2 text-sm">
                                        <Checkbox
                                          checked={rejectReasons.includes(r.value)}
                                          onCheckedChange={() =>
                                            setRejectReasons((prev) =>
                                              prev.includes(r.value)
                                                ? prev.filter((x) => x !== r.value)
                                                : [...prev, r.value]
                                            )
                                          }
                                        />
                                        <span className="leading-5">{r.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Message (optional)</Label>
                                  <Textarea value={rejectMessage} onChange={(e) => setRejectMessage(e.target.value)} rows={4} />
                                </div>

                                <div className="space-y-2">
                                  <Label>Duplicate of (optional)</Label>
                                  <Input
                                    value={duplicateSlugOrId}
                                    onChange={(e) => setDuplicateSlugOrId(e.target.value)}
                                    placeholder="Enter original ad ID/slug"
                                  />
                                </div>
                              </div>

                              <DialogFooter>
                                <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={saving}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={rejectAd} disabled={saving}>
                                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                  Confirm rejection
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      ) : (
                        <>
                          <Button size="sm" onClick={approveEditRequest} disabled={!editRequest || saving} className="h-8">
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            Approve changes
                          </Button>

                          <Dialog open={editRejectOpen} onOpenChange={setEditRejectOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={!editRequest || saving}
                                className="h-8"
                              >
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Reject changes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                              <DialogHeader>
                                <DialogTitle>Reject edit request</DialogTitle>
                                <DialogDescription>
                                  Add an optional message for the member about why the edit was rejected.
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-2">
                                <Label>Message (optional)</Label>
                                <Textarea value={editRejectMessage} onChange={(e) => setEditRejectMessage(e.target.value)} rows={4} />
                              </div>

                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditRejectOpen(false)} disabled={saving}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={rejectEditRequest} disabled={saving}>
                                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                  Confirm rejection
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </div>

                    <Button variant="secondary" size="sm" onClick={loadNextFromQueue} disabled={loading} className="h-8">
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Skip / Next
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
