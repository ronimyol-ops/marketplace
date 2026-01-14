import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCw, Save, ThumbsDown, ThumbsUp } from 'lucide-react';
import {
  ADMIN_AD_REJECTION_REASONS,
  ADMIN_AD_TYPE_OPTIONS,
  ADMIN_AD_FEATURE_OPTIONS,
  ADMIN_AD_PRODUCT_TYPE_OPTIONS,
} from '@/constants/adminFeatureParity';
import { buildAdPublicPath } from '@/lib/adRoutes';
import { deriveLegacyPromotionFromProductTypes } from '@/lib/adPromotion';

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

export default function ReviewGeneral() {
  const { user, isAdmin, hasPermission } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const canAccess = isAdmin && hasPermission('review_ads');

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ad, setAd] = useState<AdRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [images, setImages] = useState<AdImage[]>([]);

  const [queueStats, setQueueStats] = useState<{ pending: number; reviewedToday: number } | null>(null);

  const [lookup, setLookup] = useState('');

  // Form state (keeps the UI responsive while editing)
  const [adForm, setAdForm] = useState<Partial<AdRow>>({});
  const [profileForm, setProfileForm] = useState<Partial<ProfileRow>>({});

  // Reject dialog state
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

  const loadStats = async () => {
    try {
      const [{ count: pendingCount }, { count: reviewedTodayCount }] = await Promise.all([
        supabase.from('ads').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('ads')
          .select('id', { count: 'exact', head: true })
          .eq('last_reviewed_by', user?.id ?? '')
          .gte('last_reviewed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);

      setQueueStats({ pending: pendingCount ?? 0, reviewedToday: reviewedTodayCount ?? 0 });
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    if (!user) return;
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

      let adQuery = supabase
        .from('ads')
        .select(
          'id,user_id,slug,title,description,status,category_id,subcategory_id,price,price_type,mrp,discount,division,district,area,ad_type,product_types,features,is_featured,promotion_type,promotion_expires_at,expires_at,needs_verification,is_unconfirmed,is_deactivated,is_archived,payment_status,rejection_reason,rejection_reasons,rejection_message,duplicate_of_ad_id,last_reviewed_by,last_reviewed_at'
        )
        .limit(1);

      if (isUuid) {
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

  const loadNextFromQueue = async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('ads')
        .select('id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      const nextId = (rows as any)?.[0]?.id as string | undefined;
      if (!nextId) {
        toast({ title: 'Queue empty', description: 'No pending ads found.' });
        return;
      }

      setParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('adId', nextId);
        p.delete('slug');
        return p;
      });

      await fetchAdByIdOrSlug(nextId);
      await loadStats();
    } catch (e: any) {
      toast({ title: 'Failed to load queue item', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Auto-load when query params are present
  useEffect(() => {
    const adId = params.get('adId');
    const slug = params.get('slug');
    if (!canAccess) return;
    if (adId) fetchAdByIdOrSlug(adId);
    else if (slug) fetchAdByIdOrSlug(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('adId'), params.get('slug'), canAccess]);

  const saveEdits = async () => {
    if (!ad) return;
    setSaving(true);
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
      await fetchAdByIdOrSlug(ad.id);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    if (!ad || !user) return;
    setSaving(true);
    try {
      await saveEdits();

      const { error } = await supabase
        .from('ads')
        .update({
          status: 'approved',
          needs_verification: false,
          last_reviewed_by: user.id,
          last_reviewed_at: new Date().toISOString(),
        })
        .eq('id', ad.id);

      if (error) throw error;

      toast({ title: 'Approved', description: 'Ad approved and removed from the queue.' });
      setRejectReasons([]);
      setRejectMessage('');
      setDuplicateSlugOrId('');
      await loadNextFromQueue();
    } catch (e: any) {
      toast({ title: 'Approve failed', description: e?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!ad || !user) return;
    setSaving(true);
    try {
      await saveEdits();

      // Optional duplicate mapping
      let duplicateOfId: string | null = null;
      const dup = duplicateSlugOrId.trim();
      if (dup) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dup);
        if (isUuid) {
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
          rejection_reason: primaryReason,
          rejection_reasons: rejectReasons,
          rejection_message: rejectMessage || null,
          duplicate_of_ad_id: duplicateOfId,
          last_reviewed_by: user.id,
          last_reviewed_at: new Date().toISOString(),
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

  const toggleArrayValue = (arr: string[] | undefined | null, value: string) => {
    const base = Array.isArray(arr) ? arr : [];
    return base.includes(value) ? base.filter((v) => v !== value) : [...base, value];
  };

  if (!canAccess) {
    return (
      <AdminLayout>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">General review</h1>
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
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">General review</h1>
            <p className="text-muted-foreground">
              Review the next pending ad, edit details, and approve or reject.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="Load by ad ID or slug"
                className="w-[260px]"
              />
              <Button
                variant="secondary"
                onClick={() => {
                  const q = lookup.trim();
                  if (!q) return;
                  setParams((prev) => {
                    const p = new URLSearchParams(prev);
                    // If it looks like a UUID we treat as adId, else slug
                    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
                    if (isUuid) {
                      p.set('adId', q);
                      p.delete('slug');
                    } else {
                      p.set('slug', q);
                      p.delete('adId');
                    }
                    return p;
                  });
                }}
              >
                Load
              </Button>
            </div>

            <Button onClick={loadNextFromQueue} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Next in queue
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current item</span>
                <div className="flex items-center gap-2">
                  {queueStats && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        Pending: <span className="font-medium text-foreground">{queueStats.pending}</span>
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>
                        Reviewed today: <span className="font-medium text-foreground">{queueStats.reviewedToday}</span>
                      </span>
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!ad ? (
                <div className="rounded-lg border p-6 text-center">
                  <p className="text-muted-foreground">No ad loaded. Use “Next in queue” or load by ID/slug.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline">Status: {ad.status}</Badge>
                    {ad.payment_status === 'pending' && <Badge variant="destructive">Pending payment</Badge>}
                    {(ad as any).is_unconfirmed && <Badge variant="secondary">Unconfirmed</Badge>}
                    {(ad as any).is_deactivated && <Badge variant="secondary">Deactivated</Badge>}
                    {(ad as any).is_archived && <Badge variant="secondary">Archived</Badge>}

                    <div className="ml-auto flex items-center gap-2">
                      {publicAdHref && (
                        <Button asChild variant="outline" size="sm">
                          <a href={publicAdHref} target="_blank" rel="noreferrer">
                            View public listing
                          </a>
                        </Button>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/users/${ad.user_id}`}>View user</Link>
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Seller / account */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Seller info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={(profileForm.full_name as string) ?? ''}
                              onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              value={(profileForm.email as string) ?? ''}
                              onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Primary phone</Label>
                            <Input
                              value={(profileForm.phone_number as string) ?? ''}
                              onChange={(e) => setProfileForm((f) => ({ ...f, phone_number: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Secondary phone</Label>
                            <Input
                              value={(profileForm.phone_number_secondary as string) ?? ''}
                              onChange={(e) => setProfileForm((f) => ({ ...f, phone_number_secondary: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Account type</Label>
                            <Select
                              value={(profileForm.seller_type as any) ?? 'private'}
                              onValueChange={(v) => setProfileForm((f) => ({ ...f, seller_type: v as any }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="private">Private</SelectItem>
                                <SelectItem value="business">Business</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Phone visibility</Label>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                              <div>
                                <div className="font-medium">Show phone on ads</div>
                                <div className="text-sm text-muted-foreground">Displayed on public ad pages.</div>
                              </div>
                              <Checkbox
                                checked={!!profileForm.show_phone_on_ads}
                                onCheckedChange={(v) => setProfileForm((f) => ({ ...f, show_phone_on_ads: Boolean(v) }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <div className="font-medium">Phone verified</div>
                            <div className="text-sm text-muted-foreground">For phone-number queries and trust signals.</div>
                          </div>
                          <Checkbox
                            checked={!!profileForm.phone_verified}
                            onCheckedChange={(v) => setProfileForm((f) => ({ ...f, phone_verified: Boolean(v) }))}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ad details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Ad details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={(adForm.title as string) ?? ''}
                            onChange={(e) => setAdForm((f) => ({ ...f, title: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={(adForm.description as string) ?? ''}
                            onChange={(e) => setAdForm((f) => ({ ...f, description: e.target.value }))}
                            rows={6}
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                              value={adForm.category_id ?? ad.category_id ?? 'none'}
                              onValueChange={(v) => {
                                setAdForm((f) => ({ ...f, category_id: v === 'none' ? null : v, subcategory_id: null }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No category</SelectItem>
                                {categories.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Item type (subcategory)</Label>
                            <Select
                              value={(adForm as any).subcategory_id ?? 'none'}
                              onValueChange={(v) => setAdForm((f) => ({ ...f, subcategory_id: v === 'none' ? null : v } as any))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No subcategory</SelectItem>
                                {subcategoriesForSelectedCategory.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Ad type</Label>
                            <Select
                              value={(adForm as any).ad_type ?? 'none'}
                              onValueChange={(v) => setAdForm((f) => ({ ...f, ad_type: v === 'none' ? '' : v } as any))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Not set</SelectItem>
                                {ADMIN_AD_TYPE_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Price type</Label>
                            <Select
                              value={adForm.price_type ?? ad.price_type ?? 'fixed'}
                              onValueChange={(v) => setAdForm((f) => ({ ...f, price_type: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed</SelectItem>
                                <SelectItem value="negotiable">Negotiable</SelectItem>
                                <SelectItem value="free">Free</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Price</Label>
                            <Input
                              type="number"
                              value={String(adForm.price ?? ad.price ?? 0)}
                              onChange={(e) => setAdForm((f) => ({ ...f, price: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>MRP (optional)</Label>
                            <Input
                              type="number"
                              value={(adForm as any).mrp ?? ''}
                              onChange={(e) => setAdForm((f) => ({ ...f, mrp: e.target.value === '' ? null : Number(e.target.value) } as any))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Discount (optional)</Label>
                            <Input
                              type="number"
                              value={(adForm as any).discount ?? ''}
                              onChange={(e) => setAdForm((f) => ({ ...f, discount: e.target.value === '' ? null : Number(e.target.value) } as any))}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Division</Label>
                            <Input
                              value={(adForm.division as string) ?? ''}
                              onChange={(e) => setAdForm((f) => ({ ...f, division: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>District</Label>
                            <Input
                              value={(adForm.district as string) ?? ''}
                              onChange={(e) => setAdForm((f) => ({ ...f, district: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Area</Label>
                            <Input
                              value={(adForm.area as string) ?? ''}
                              onChange={(e) => setAdForm((f) => ({ ...f, area: e.target.value }))}
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Product types</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {ADMIN_AD_PRODUCT_TYPE_OPTIONS.map((o) => (
                                <label key={o.value} className="flex items-center gap-2 text-sm">
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
                          </div>

                          <div className="space-y-2">
                            <Label>Features</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {ADMIN_AD_FEATURE_OPTIONS.map((o) => (
                                <label key={o.value} className="flex items-center gap-2 text-sm">
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Images */}
                  <Card>
                    <CardHeader>
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
                              <img src={img.image_url} alt="Ad" className="h-28 w-full object-cover transition-transform group-hover:scale-[1.03]" />
                            </a>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={saveEdits} disabled={!ad || saving}>
                          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          Save changes
                        </Button>

                        <Button onClick={approve} disabled={!ad || saving}>
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Approve
                        </Button>

                        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                          <DialogTrigger asChild>
                            <Button variant="destructive" disabled={!ad || saving}>
                              <ThumbsDown className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Reject ad</DialogTitle>
                              <DialogDescription>
                                Choose one or more reasons and optionally add a note for the user.
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
                                            prev.includes(r.value) ? prev.filter((x) => x !== r.value) : [...prev, r.value]
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
                              <Button variant="destructive" onClick={reject} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Confirm rejection
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <Button variant="secondary" onClick={loadNextFromQueue} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Skip / Next
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                This page is designed to mirror the *features* in the uploaded “General review” HTML, but with a different layout.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Edit seller details (name, email, phones, business/private, phone visibility).</li>
                <li>Edit listing details (title, description, category/item type, pricing fields, location).</li>
                <li>Select product types & features, then approve or reject with structured reasons.</li>
              </ul>
              <p>
                If you need additional queues (Fraud/Manager/etc.), you can duplicate this page and change the underlying query.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
