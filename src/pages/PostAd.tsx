import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, ImageIcon, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PostAdStepper, type PostAdStep } from '@/components/ads/post-ad/PostAdStepper';
import { LocationSelector } from '@/components/location/LocationSelector';
import { CategoryFields } from '@/components/ads/CategoryFields';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice, generateSlug } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ADMIN_AD_TYPE_OPTIONS, ADMIN_AD_FEATURE_OPTIONS } from '@/constants/adminFeatureParity';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

export default function PostAd() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [profileStatus, setProfileStatus] = useState<{ is_blocked: boolean | null; is_deleted: boolean | null } | null>(
    null,
  );
  const [profileStatusLoading, setProfileStatusLoading] = useState(false);

  const isRestricted = !!profileStatus?.is_blocked || !!profileStatus?.is_deleted;


  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);

  const [stepIndex, setStepIndex] = useState(0);

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable' | 'free'>('fixed');
  const [condition, setCondition] = useState<'new' | 'used'>('used');
  const [adType, setAdType] = useState<string>('for_sale');
  const [mrp, setMrp] = useState('');
  const [discount, setDiscount] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [area, setArea] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string | boolean | number>>({});

  const toggleArray = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const steps: PostAdStep[] = useMemo(
    () => [
      { key: 'photos', title: 'Photos', description: 'Add up to 5 photos' },
      { key: 'details', title: 'Details', description: 'Title, category, description' },
      { key: 'pricing', title: 'Pricing', description: 'Fixed, negotiable, or free' },
      { key: 'location', title: 'Location', description: 'Where is the item?' },
    ],
    []
  );

  const progress = useMemo(() => {
    if (steps.length <= 1) return 0;
    return Math.round((stepIndex / (steps.length - 1)) * 100);
  }, [stepIndex, steps.length]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfileStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categoryId) {
      setFilteredSubcategories(subcategories.filter((s) => s.category_id === categoryId));
      setSubcategoryId('');
    } else {
      setFilteredSubcategories([]);
      setSubcategoryId('');
    }
  }, [categoryId, subcategories]);

  const fetchCategories = async () => {
    const [catRes, subRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('subcategories').select('*'),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data);
  };


  const fetchProfileStatus = async () => {
    if (!user) return;
    setProfileStatusLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_blocked,is_deleted')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfileStatus(data ?? null);
    } catch (e: any) {
      // Fail open in UI; DB policies should still protect inserts.
      console.warn('Could not load profile status', e?.message ?? e);
      setProfileStatus(null);
    } finally {
      setProfileStatusLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const newImages = [...images, ...files].slice(0, 5);
    setImages(newImages);

    const newPreviews = newImages.map((file) => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const nextImages = [...images];
    const nextPreviews = [...imagePreviews];

    const [moved] = nextImages.splice(from, 1);
    const [movedPrev] = nextPreviews.splice(from, 1);

    nextImages.splice(to, 0, moved);
    nextPreviews.splice(to, 0, movedPrev);

    setImages(nextImages);
    setImagePreviews(nextPreviews);
  };

  const uploadImages = async (adId: string) => {
    const uploadedUrls: string[] = [];

    for (const image of images) {
      const fileName = `${adId}/${Date.now()}-${image.name}`;
      const { error } = await supabase.storage
        .from('ad-images')
        .upload(fileName, image);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('ad-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login to post an ad');
      return;
    }


    if (profileStatusLoading) {
      toast.error('Please wait a moment and try again.');
      return;
    }

    if (profileStatus?.is_deleted) {
      toast.error('Your account is deleted. Please contact support.');
      return;
    }

    if (profileStatus?.is_blocked) {
      toast.error('Your account is currently restricted and cannot post ads.');
      return;
    }

    if (!title.trim() || !categoryId || !division || !district) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setIsLoading(true);

    try {
      const slug = generateSlug(title);
      const priceValue = priceType === 'free' ? null : parseFloat(price) || null;
      const mrpValue = mrp.trim() === '' ? null : parseFloat(mrp) || null;
      const discountValue = discount.trim() === '' ? null : parseFloat(discount) || null;

      const insertPayload: Record<string, any> = {
        user_id: user.id,
        title: title.trim(),
        slug,
        description: description.trim() || null,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        price: priceValue,
        price_type: priceType,
        condition,
        division,
        district,
        upazila: upazila || null,
        area,
        custom_fields: customFields,
        // Phase-2 parity fields (Bikroy-like)
        ad_type: adType || null,
        mrp: mrpValue,
        discount: discountValue,
        features,
        product_types: [],
      };

      // If Auto-renew (no expiration) is selected, explicitly remove expiry.
      if (features.includes('AdFeatures_NO_EXPIRATION')) {
        insertPayload.expires_at = null;
      }

      // Try inserting with the extended schema; if the project hasn't applied
      // the Phase-2 migration yet, fall back to a minimal insert.
      let { data: ad, error: adError } = await supabase.from('ads').insert(insertPayload).select().single();
      if (adError && /column .* does not exist/i.test(adError.message)) {
        const fallbackPayload = {
          user_id: user.id,
          title: title.trim(),
          slug,
          description: description.trim() || null,
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          price: priceValue,
          price_type: priceType,
          condition,
          division,
          district,
          upazila: upazila || null,
          area,
          custom_fields: customFields,
        };
        ({ data: ad, error: adError } = await supabase.from('ads').insert(fallbackPayload).select().single());
      }

      if (adError) throw adError;

      const imageUrls = await uploadImages(ad.id);

      const imageInserts = imageUrls.map((url, index) => ({
        ad_id: ad.id,
        image_url: url,
        sort_order: index,
      }));

      await supabase.from('ad_images').insert(imageInserts);

      toast.success('Your ad was posted successfully and will be visible after admin approval.');
      navigate('/my-ads');
    } catch (error: any) {
      console.error('Error posting ad:', error);
      toast.error(error.message || 'Could not post your ad. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canContinue = useMemo(() => {
    if (isRestricted) return false;
    if (stepIndex === 0) return images.length > 0;
    if (stepIndex === 1) return !!title.trim() && !!categoryId;
    if (stepIndex === 2) {
      if (priceType === 'free') return true;
      // Optional price; allow empty. If provided, validate non-negative.
      if (!price.trim()) return true;
      return Number(price) >= 0;
    }
    if (stepIndex === 3) return !!division && !!district;
    return false;
    }, [stepIndex, images.length, title, categoryId, priceType, price, division, district, isRestricted]);

  const nextStep = () => {
    if (!canContinue) {
      toast.error('Please complete the required fields for this step');
      return;
    }
    setStepIndex((s) => Math.min(s + 1, steps.length - 1));
  };

  const prevStep = () => {
    setStepIndex((s) => Math.max(s - 1, 0));
  };

  const selectedCategory = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId]);
  const selectedSubcategory = useMemo(
    () => filteredSubcategories.find((s) => s.id === subcategoryId),
    [filteredSubcategories, subcategoryId]
  );

  const previewPrice = useMemo(() => {
    const parsed = priceType === 'free' ? null : parseFloat(price) || null;
    return formatPrice(parsed, priceType);
  }, [price, priceType]);

  const completionChecks = useMemo(
    () => [
      { label: 'At least 1 photo', ok: images.length > 0 },
      { label: 'Title', ok: !!title.trim() },
      { label: 'Category', ok: !!categoryId },
      { label: 'Location', ok: !!division && !!district },
    ],
    [images.length, title, categoryId, division, district]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">

{isRestricted ? (
  <Card className="mb-6 border-destructive/50 bg-destructive/5">
    <CardContent className="py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
        <div>
          <p className="font-semibold">Account restricted</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your account is currently {profileStatus?.is_deleted ? 'deleted' : 'blacklisted'} and cannot post new ads.
            Please contact support if you believe this is a mistake.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
) : null}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Form */}
          <div className="lg:col-span-8">
            <Card>
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-2xl">Post an ad</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    A clear title and good photos help your ad sell faster.
                  </p>
                </div>

                <div className="space-y-3">
                  <PostAdStepper steps={steps} currentIndex={stepIndex} />
                  <Progress value={progress} />
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Step 1: Photos */}
                  {stepIndex === 0 && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-semibold">Add photos</h2>
                        <p className="text-sm text-muted-foreground">First photo becomes the cover. You can reorder them.</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-muted/20">
                            <img src={preview} alt="" className="w-full h-full object-cover" />

                            {/* Reorder */}
                            <div className="absolute left-1 top-1 flex gap-1">
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 bg-background/80 hover:bg-background"
                                onClick={() => moveImage(index, index - 1)}
                                disabled={index === 0}
                                aria-label="Move photo left"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 bg-background/80 hover:bg-background"
                                onClick={() => moveImage(index, index + 1)}
                                disabled={index === imagePreviews.length - 1}
                                aria-label="Move photo right"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Remove */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute right-1 top-1 h-7 w-7"
                              onClick={() => removeImage(index)}
                              aria-label="Remove photo"
                            >
                              <X className="h-4 w-4" />
                            </Button>

                            {index === 0 && (
                              <div className="absolute bottom-1 left-1 text-xs bg-background/90 border px-2 py-0.5 rounded">
                                Cover
                              </div>
                            )}
                          </div>
                        ))}

                        {images.length < 5 && (
                          <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground mt-1">Add</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {images.length === 0 && (
                        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                          Add at least one photo to continue.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Details */}
                  {stepIndex === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold">Ad details</h2>
                        <p className="text-sm text-muted-foreground">Be specific. Mention brand, model, and condition.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="What are you selling or offering?"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Ad type</Label>
                        <Select value={adType} onValueChange={setAdType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ad type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ADMIN_AD_TYPE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choose whether you are selling, renting, or looking for an item.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category <span className="text-destructive">*</span></Label>
                          <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Subcategory</Label>
                          <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subcategory" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredSubcategories.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  {sub.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Category-specific fields */}
                      {categoryId && (
                        <CategoryFields categoryId={categoryId} values={customFields} onChange={setCustomFields} />
                      )}

                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <RadioGroup
                          value={condition}
                          onValueChange={(v) => setCondition(v as typeof condition)}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="new" id="new" />
                            <Label htmlFor="new">New</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="used" id="used" />
                            <Label htmlFor="used">Used</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe your item in detail..."
                          rows={6}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 3: Pricing */}
                  {stepIndex === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold">Pricing</h2>
                        <p className="text-sm text-muted-foreground">Choose a price type. You can also leave price empty if needed.</p>
                      </div>

                      <div className="space-y-4">
                        <Label>Price type</Label>
                        <RadioGroup
                          value={priceType}
                          onValueChange={(v) => setPriceType(v as typeof priceType)}
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fixed" id="fixed" />
                            <Label htmlFor="fixed">Fixed</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="negotiable" id="negotiable" />
                            <Label htmlFor="negotiable">Negotiable</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="free" id="free" />
                            <Label htmlFor="free">Free</Label>
                          </div>
                        </RadioGroup>

                        {priceType !== 'free' && (
                          <div className="space-y-2">
                            <Label htmlFor="price">Price (৳)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
                              <Input
                                id="price"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0"
                                className="pl-8"
                                min={0}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Tip: if the price is negotiable, set your expected price and mark it negotiable.
                            </p>
                          </div>
                        )}

                        <Separator />

                        <div className="space-y-2">
                          <Label>Optional pricing details</Label>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="mrp">MRP (optional)</Label>
                              <Input
                                id="mrp"
                                type="number"
                                min={0}
                                value={mrp}
                                onChange={(e) => setMrp(e.target.value)}
                                placeholder="e.g. 15000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="discount">Discount % (optional)</Label>
                              <Input
                                id="discount"
                                type="number"
                                min={0}
                                max={100}
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                                placeholder="e.g. 10"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            These fields are optional, but help buyers understand the value.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Delivery & listing options (optional)</Label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {ADMIN_AD_FEATURE_OPTIONS.map((o) => (
                              <label key={o.value} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={features.includes(o.value)}
                                  onCheckedChange={() => setFeatures((prev) => toggleArray(prev, o.value))}
                                />
                                {o.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Location */}
                  {stepIndex === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold">Location & review</h2>
                        <p className="text-sm text-muted-foreground">Buyers nearby will find your ad more easily.</p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Location <span className="text-destructive">*</span></Label>
                        <LocationSelector
                          division={division}
                          district={district}
                          upazila={upazila}
                          area={area}
                          onDivisionChange={setDivision}
                          onDistrictChange={setDistrict}
                          onUpazilaChange={setUpazila}
                          onAreaChange={setArea}
                          required
                        />
                      </div>

                      <Separator />

                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="font-semibold">Quick review</p>
                        <div className="mt-3 grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Title</p>
                            <p className="font-medium">{title.trim() || '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Price</p>
                            <p className="font-medium">{previewPrice}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Category</p>
                            <p className="font-medium">
                              {selectedCategory?.name || '—'}
                              {selectedSubcategory?.name ? ` / ${selectedSubcategory.name}` : ''}
                            </p>
                          </div>
                        <div>
                          <p className="text-muted-foreground">Ad type</p>
                          <p className="font-medium">
                            {ADMIN_AD_TYPE_OPTIONS.find((o) => o.value === adType)?.label || '—'}
                          </p>
                        </div>
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium">
                              {area ? `${area}, ` : ''}
                              {upazila ? `${upazila}, ` : ''}
                              {district ? `${district}, ` : ''}
                              {division || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="outline" onClick={prevStep} disabled={stepIndex === 0 || isLoading}>
                      Back
                    </Button>

                    {stepIndex < steps.length - 1 ? (
                      <Button type="button" onClick={nextStep} disabled={!canContinue || isLoading || isRestricted}>
                        Next
                      </Button>
                    ) : (
                      <Button type="submit" disabled={!canContinue || isLoading || isRestricted} className="min-w-[160px]">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Publish ad
                      </Button>
                    )}
                  </div>

                  {!canContinue && (
                    <p className="text-xs text-muted-foreground">
                      Complete required fields to continue.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle className="text-lg">Live preview</CardTitle>
                <p className="text-sm text-muted-foreground">How your ad will look to buyers.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border overflow-hidden bg-muted/30">
                  <div className="relative aspect-[4/3]">
                    {imagePreviews[0] ? (
                      <img src={imagePreviews[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 mx-auto" />
                          <p className="text-sm mt-2">Add a cover photo</p>
                        </div>
                      </div>
                    )}
                    {images.length > 0 && (
                      <div className="absolute bottom-2 left-2 text-xs bg-background/90 border px-2 py-0.5 rounded">
                        {images.length} photo{images.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className={cn('font-semibold leading-tight', !title.trim() && 'text-muted-foreground')}>
                    {title.trim() || 'Your title will appear here'}
                  </p>
                  <p className="text-xl font-bold text-primary mt-1">{previewPrice}</p>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <p>
                      {selectedCategory?.name || 'Select a category'}
                      {selectedSubcategory?.name ? ` / ${selectedSubcategory.name}` : ''}
                    </p>
                    <p>
                      {area ? `${area}, ` : ''}
                      {upazila ? `${upazila}, ` : ''}
                      {district ? `${district}, ` : ''}
                      {division || 'Select location'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Ready checklist</p>
                  <div className="space-y-2">
                    {completionChecks.map((c) => (
                      <div key={c.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{c.label}</span>
                        <CheckCircle2 className={cn('h-4 w-4', c.ok ? 'text-emerald-500' : 'text-muted-foreground/40')} />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hidden lg:block">
              <CardContent className="p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-2">Posting tips</p>
                <ul className="space-y-1">
                  <li>• Use bright photos from multiple angles.</li>
                  <li>• Add model/brand and important details in the title.</li>
                  <li>• Mention any defects honestly to avoid disputes.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
