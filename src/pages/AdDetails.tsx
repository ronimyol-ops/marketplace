import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdImageGallery } from '@/components/ads/AdImageGallery';
import { CategoryFieldsDisplay } from '@/components/ads/CategoryFields';
import { TrustBadges, PhoneDisplay } from '@/components/trust/TrustBadges';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/constants';
import { parseAdRouteParam } from '@/lib/adRoutes';
import { adTypeLabel } from '@/lib/adType';
import { ADMIN_AD_FEATURE_OPTIONS } from '@/constants/adminFeatureParity';
import { toast } from 'sonner';

interface Ad {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  price_type: string;
  mrp?: number | null;
  discount?: number | null;
  condition: string;
  ad_type?: string | null;
  division: string;
  district: string;
  upazila: string | null;
  area: string | null;
  features?: string[] | null;
  product_types?: string[] | null;
  is_featured: boolean;
  promotion_type?: 'featured' | 'top' | 'urgent' | null;
  promotion_expires_at?: string | null;
  created_at: string;
  user_id: string;
  views_count?: number | null;
  custom_fields: Record<string, any> | null;
  ad_images: { id: string; image_url: string; sort_order: number }[];
  categories: { name: string; slug: string } | null;
  subcategories: { name: string; slug: string } | null;
}

interface Profile {
  full_name: string | null;
  phone_number: string | null;
  phone_number_secondary?: string | null;
  show_phone_on_ads?: boolean | null;
  avatar_url: string | null;
  phone_verified: boolean;
  created_at: string;
}

export default function AdDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [ad, setAd] = useState<Ad | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [sellerAdsCount, setSellerAdsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  const sellerAllowsPhone = (seller?.show_phone_on_ads ?? true) !== false;

  const featureBadges = useMemo(() => {
    const raw = Array.isArray(ad?.features) ? ad?.features : [];
    return raw
      .map((v) => ADMIN_AD_FEATURE_OPTIONS.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean);
  }, [ad?.features]);

  // `/ad/:slug` supports: <slug>-<uuid>, <uuid>, or <slug>
  const routeInfo = useMemo(() => parseAdRouteParam(slug), [slug]);
  const adLookupKey = useMemo(() => routeInfo.id || routeInfo.slug || '', [routeInfo.id, routeInfo.slug]);

  useEffect(() => {
    if (!adLookupKey) return;
    setIsLoading(true);
    fetchAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adLookupKey]);

  useEffect(() => {
    if (user && ad) {
      checkFavorite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ad?.id]);

  const fetchAd = async () => {
    try {
      // Fetch by UUID if present in the URL, otherwise fall back to slug.
      let query = supabase
        .from('ads')
        .select('*, ad_images(*), categories(name, slug), subcategories(name, slug)')
        .limit(1);

      if (routeInfo.id) {
        query = query.eq('id', routeInfo.id);
      } else if (routeInfo.slug) {
        query = query.eq('slug', routeInfo.slug).order('created_at', { ascending: false });
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) {
        setAd(null);
        setSeller(null);
        setSellerAdsCount(0);
        return;
      }

      setAd(data as Ad);

      // Fetch seller profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone_number, phone_number_secondary, show_phone_on_ads, avatar_url, phone_verified, created_at')
        .eq('user_id', data.user_id)
        .single();

      setSeller(profile as Profile);

      // Fetch seller's approved ad count
      const { count } = await supabase
        .from('ads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.user_id)
        .eq('status', 'approved');

      setSellerAdsCount(count || 0);

      // Increment view count (best-effort)
      await supabase
        .from('ads')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', data.id);
    } catch (error) {
      console.error('Error fetching ad:', error);
      toast.error('Could not load this ad. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!user || !ad) return;
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('ad_id', ad.id)
      .maybeSingle();
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please login to save favorites');
      navigate('/auth');
      return;
    }
    if (!ad) return;

    if (isFavorite) {
      await supabase.from('favorites').delete().eq('ad_id', ad.id).eq('user_id', user.id);
      setIsFavorite(false);
      toast.success('Removed from favorites');
    } else {
      await supabase.from('favorites').insert({ ad_id: ad.id, user_id: user.id });
      setIsFavorite(true);
      toast.success('Added to favorites');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      // @ts-expect-error - share exists in supported browsers
      if (navigator.share) {
        // @ts-expect-error - share exists in supported browsers
        await navigator.share({
          title: ad?.title || 'BazarBD',
          text: 'Check out this ad on BazarBD',
          url,
        });
        return;
      }
    } catch {
      // fall back to copy
    }

    await handleCopyLink();
  };

  const handleReport = async () => {
    if (!user) {
      toast.error('Please login to report an ad');
      navigate('/auth');
      return;
    }
    if (!reportReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    if (!ad) return;

    setIsReporting(true);
    try {
      await supabase.from('reports').insert({
        user_id: user.id,
        ad_id: ad.id,
        reason: reportReason,
      });
      toast.success('Report submitted. Thank you for helping keep BazarBD safe.');
      setReportReason('');
    } catch (error) {
      toast.error('Could not submit report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleMessageSeller = async () => {
    if (!ad) return;

    if (!user) {
      toast.error('Please login to message the seller');
      navigate('/auth');
      return;
    }

    if (user.id === ad.user_id) {
      toast('This is your own ad');
      return;
    }

    setIsStartingChat(true);
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('ad_id', ad.id)
        .eq('buyer_id', user.id)
        .eq('seller_id', ad.user_id)
        .maybeSingle();

      let conversationId = existing?.id;

      if (!conversationId) {
        const { data: created, error } = await supabase
          .from('conversations')
          .insert({
            ad_id: ad.id,
            buyer_id: user.id,
            seller_id: ad.user_id,
            last_message_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) throw error;
        conversationId = created.id;
      }

      navigate(`/messages?c=${encodeURIComponent(conversationId)}`);
    } catch (e) {
      console.error(e);
      toast.error('Could not start a conversation. Please try again.');
    } finally {
      setIsStartingChat(false);
    }
  };

  const images = useMemo(() => {
    return (ad?.ad_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  }, [ad?.ad_images]);

  const backTo = searchParams.get('back');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-5">
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-7 w-1/3" />
              <Skeleton className="aspect-[4/3] rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="lg:col-span-4 space-y-5">
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold">Ad not found</h1>
          <p className="text-muted-foreground mt-2">
            This ad might have been removed or is no longer available.
          </p>
          <Link to="/">
            <Button className="mt-4">Back to home</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-28 lg:pb-8">
        {/* Breadcrumb + back */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
              className="text-muted-foreground hover:text-foreground px-2"
            >
              ← Back
            </Button>

            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={toggleFavorite} className="gap-2">
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
                {isFavorite ? 'Saved' : 'Save'}
              </Button>
            </div>
          </div>

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {ad.categories && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={`/category/${ad.categories.slug}`}>{ad.categories.name}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[45ch] truncate">{ad.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Title + meta */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">{ad.title}</h1>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {adTypeLabel(ad.ad_type) ? (
                    <Badge variant="outline" className="whitespace-nowrap">
                      {adTypeLabel(ad.ad_type)}
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="capitalize whitespace-nowrap">
                    {ad.condition}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {ad.area ? `${ad.area}, ` : ''}
                    {ad.upazila ? `${ad.upazila}, ` : ''}
                    {ad.district}, {ad.division}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Posted {formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}</span>
                </span>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold tracking-tight text-primary">
                    {formatPrice(ad.price, ad.price_type)}
                  </p>
                  {(ad.mrp || ad.discount) ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {ad.mrp ? (
                        <span className="line-through">
                          {formatPrice(ad.mrp, 'fixed')}
                        </span>
                      ) : null}
                      {ad.discount ? (
                        <Badge variant="secondary" className="text-xs">
                          {ad.discount}% off
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {ad.subcategories?.name && (
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {ad.subcategories.name}
                    </Badge>
                  )}
                  {ad.is_featured && (
                    <Badge className="hidden sm:inline-flex">Featured</Badge>
                  )}
                  {featureBadges.slice(0, 2).map((label) => (
                    <Badge key={label} variant="outline" className="hidden sm:inline-flex">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Gallery */}
            <AdImageGallery title={ad.title} images={images} isFeatured={ad.is_featured} />

            {/* Details */}
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Details</h2>
                  <Badge variant="secondary" className="font-mono">
                    ID {ad.id.slice(0, 8)}
                  </Badge>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-medium">
                      {ad.categories?.name || '—'}
                      {ad.subcategories?.name ? ` / ${ad.subcategories.name}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Price type</p>
                    <p className="font-medium capitalize">{ad.price_type || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ad type</p>
                    <p className="font-medium">{adTypeLabel(ad.ad_type) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Condition</p>
                    <p className="font-medium capitalize">{ad.condition || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {ad.district}, {ad.division}
                    </p>
                  </div>
                  {(ad.mrp || ad.discount) ? (
                    <div>
                      <p className="text-xs text-muted-foreground">MRP / discount</p>
                      <p className="font-medium">
                        {ad.mrp ? formatPrice(ad.mrp, 'fixed') : '—'}
                        {ad.discount ? ` · ${ad.discount}% off` : ''}
                      </p>
                    </div>
                  ) : null}
                  {featureBadges.length ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Options</p>
                      <p className="font-medium">{featureBadges.join(', ')}</p>
                    </div>
                  ) : null}
                </div>

                {ad.custom_fields && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold mb-3">Category details</p>
                      <CategoryFieldsDisplay customFields={ad.custom_fields} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {ad.description || 'No description has been provided for this ad.'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Contact + actions */}
            <Card className="lg:sticky lg:top-24">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-3xl font-bold tracking-tight text-primary">
                    {formatPrice(ad.price, ad.price_type)}
                  </p>
                  {(ad.mrp || ad.discount) ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {ad.mrp ? <span className="line-through">{formatPrice(ad.mrp, 'fixed')}</span> : null}
                      {ad.discount ? (
                        <Badge variant="secondary" className="text-xs">
                          {ad.discount}% off
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="gap-2"
                    onClick={handleMessageSeller}
                    disabled={isStartingChat}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>

                  {seller?.phone_number && sellerAllowsPhone ? (
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={`tel:${seller.phone_number}`} onClick={() => setShowPhone(true)}>
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                    </Button>
                  ) : seller?.phone_number && !sellerAllowsPhone ? (
                    <Button variant="outline" className="gap-2" disabled>
                      <Phone className="h-4 w-4" />
                      Phone hidden
                    </Button>
                  ) : (
                    <Button variant="outline" className="gap-2" disabled>
                      <Phone className="h-4 w-4" />
                      No phone
                    </Button>
                  )}
                </div>

                {sellerAllowsPhone ? (
                  <div className="space-y-2">
                    {seller?.phone_number && (
                      <PhoneDisplay
                        phoneNumber={seller.phone_number}
                        isVerified={!!seller.phone_verified}
                        showFull={showPhone}
                        onReveal={() => setShowPhone(true)}
                      />
                    )}
                    {seller?.phone_number_secondary && (
                      <PhoneDisplay
                        phoneNumber={seller.phone_number_secondary}
                        isVerified={!!seller.phone_verified}
                        showFull={showPhone}
                        onReveal={() => setShowPhone(true)}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The seller chose to hide their phone number. Please use Message.
                  </p>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={toggleFavorite}>
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
                    {isFavorite ? 'Saved' : 'Save'}
                  </Button>

                  <Button variant="outline" size="icon" onClick={handleShare} aria-label="Share">
                    <Share2 className="h-4 w-4" />
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Report">
                        <Flag className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report this ad</DialogTitle>
                        <DialogDescription>
                          Please tell us why you're reporting this ad. Our moderators will review it.
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Describe the issue..."
                        rows={5}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={handleCopyLink}>
                          Copy link
                        </Button>
                        <Button onClick={handleReport} disabled={isReporting}>
                          {isReporting ? 'Submitting…' : 'Submit report'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Seller */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={seller?.avatar_url || undefined} />
                    <AvatarFallback>{seller?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{seller?.full_name || 'Anonymous'}</p>
                    <p className="text-sm text-muted-foreground">Seller</p>
                  </div>
                </div>

                <TrustBadges
                  phoneVerified={!!seller?.phone_verified}
                  memberSince={seller?.created_at}
                  totalAds={sellerAdsCount}
                  showAll
                  size="sm"
                />

                {user?.id === ad.user_id && (
                  <div className="text-sm text-muted-foreground bg-muted/50 border rounded-lg p-3">
                    You're viewing your own ad.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Safety tips */}
            <Card className="bg-primary/5">
              <CardContent className="p-4 text-sm">
                <h4 className="font-semibold mb-2">Safety tips</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Meet in a public place</li>
                  <li>• Check the item before paying</li>
                  <li>• Don't pay in advance</li>
                  <li>• Beware of unrealistic offers</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile action bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex gap-2">
          <Button className="flex-1 gap-2" onClick={handleMessageSeller} disabled={isStartingChat}>
            <MessageCircle className="h-4 w-4" />
            Message
          </Button>
          {seller?.phone_number && sellerAllowsPhone ? (
            <Button variant="outline" className="flex-1 gap-2" asChild>
              <a href={`tel:${seller.phone_number}`} onClick={() => setShowPhone(true)}>
                <Phone className="h-4 w-4" />
                Call
              </a>
            </Button>
          ) : seller?.phone_number && !sellerAllowsPhone ? (
            <Button variant="outline" className="flex-1" disabled>
              Phone hidden
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" disabled>
              No phone
            </Button>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
