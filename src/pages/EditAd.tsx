import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { LocationSelector } from '@/components/location/LocationSelector';
import { CategoryFields } from '@/components/ads/CategoryFields';
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

export default function EditAd() {
  const navigate = useNavigate();
  const { adId } = useParams();
  const { user, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [originalAd, setOriginalAd] = useState<any | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
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
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  const toggleArray = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user || !adId) return;
      setIsLoading(true);

      const [{ data: catData, error: catError }, { data: subData, error: subError }] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('subcategories').select('*'),
      ]);

      if (catError || subError) {
        console.error(catError || subError);
        toast.error('Could not load categories. Please try again.');
      } else {
        setCategories(catData || []);
        setSubcategories(subData || []);
      }

      const { data: ad, error: adError } = await supabase
        .from('ads')
        .select('*')
        .eq('id', adId)
        .eq('user_id', user.id)
        .single();

      if (adError || !ad) {
        console.error(adError);
        toast.error('Ad not found');
        navigate('/my-ads');
        return;
      }

      setOriginalAd(ad);
      setTitle(ad.title || '');
      setDescription(ad.description || '');
      setCategoryId(ad.category_id || '');
      setSubcategoryId(ad.subcategory_id || '');
      setPrice(ad.price != null ? String(ad.price) : '');
      setPriceType((ad.price_type as 'fixed' | 'negotiable' | 'free') || 'fixed');
      setCondition((ad.condition as 'new' | 'used') || 'used');
      setAdType((ad as any).ad_type || 'for_sale');
      setMrp((ad as any).mrp != null ? String((ad as any).mrp) : '');
      setDiscount((ad as any).discount != null ? String((ad as any).discount) : '');
      setFeatures(Array.isArray((ad as any).features) ? (ad as any).features : []);
      setDivision(ad.division || '');
      setDistrict(ad.district || '');
      setUpazila(ad.upazila || '');
      setArea(ad.area || '');
      setCustomFields(ad.custom_fields || {});

      if (ad.category_id && subData) {
        setFilteredSubcategories((subData as any[]).filter((s) => s.category_id === ad.category_id));
      }

      setIsLoading(false);
    };

    if (user && adId) {
      load();
    }
  }, [user, adId, navigate]);

  useEffect(() => {
    if (categoryId) {
      setFilteredSubcategories(subcategories.filter((s) => s.category_id === categoryId));
      setSubcategoryId('');
    }
  }, [categoryId, subcategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !originalAd) return;

    if (!title.trim()) {
      toast.error('Please add a title for your ad.');
      return;
    }
    if (!categoryId) {
      toast.error('Please select a category for your ad.');
      return;
    }
    if (!division || !district) {
      toast.error('Please select a location for your ad.');
      return;
    }

    setIsSubmitting(true);

    try {
      const priceValue =
        priceType === 'free' ? null : price.trim() === '' ? null : parseFloat(price) || null;

      const mrpValue = mrp.trim() === '' ? null : parseFloat(mrp) || null;
      const discountValue = discount.trim() === '' ? null : parseFloat(discount) || null;

      const oldValues = {
        title: originalAd.title,
        description: originalAd.description,
        category_id: originalAd.category_id,
        subcategory_id: originalAd.subcategory_id,
        price: originalAd.price,
        price_type: originalAd.price_type,
        condition: originalAd.condition,
        ad_type: (originalAd as any).ad_type ?? null,
        mrp: (originalAd as any).mrp ?? null,
        discount: (originalAd as any).discount ?? null,
        features: (originalAd as any).features ?? [],
        division: originalAd.division,
        district: originalAd.district,
        upazila: originalAd.upazila,
        area: originalAd.area,
        custom_fields: originalAd.custom_fields,
      };

      const newValues = {
        title,
        description,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        price: priceValue,
        price_type: priceType,
        condition,
        ad_type: adType || null,
        mrp: mrpValue,
        discount: discountValue,
        features,
        division,
        district,
        upazila: upazila || null,
        area,
        custom_fields: customFields,
      };

      const { error } = await supabase.from('ad_edit_requests').insert({
        ad_id: originalAd.id,
        user_id: user.id,
        old_values: oldValues,
        new_values: newValues,
      });

      if (error) {
        console.error(error);
        toast.error(error.message || 'Could not submit your changes for review. Please try again.');
      } else {
        toast.success('Your changes have been sent for review');
        navigate('/my-ads');
      }
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong while submitting your changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Edit your ad</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !originalAd ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short and clear title"
                  />
                </div>

                {/* Category */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
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
                    <Select
                      value={subcategoryId}
                      onValueChange={setSubcategoryId}
                      disabled={!categoryId || filteredSubcategories.length === 0}
                    >
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

                {/* Category-Specific Fields */}
                {categoryId && (
                  <CategoryFields
                    categoryId={categoryId}
                    values={customFields}
                    onChange={setCustomFields}
                  />
                )}

                {/* Ad type + condition */}
                <div className="grid gap-4 md:grid-cols-2">
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
                  </div>

                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <RadioGroup
                      value={condition}
                      onValueChange={(v) => setCondition(v as 'new' | 'used')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="edit-new" />
                        <Label htmlFor="edit-new">New</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="used" id="edit-used" />
                        <Label htmlFor="edit-used">Used</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-4">
                  <Label>Price Type</Label>
                  <RadioGroup
                    value={priceType}
                    onValueChange={(v) => setPriceType(v as 'fixed' | 'negotiable' | 'free')}
                    className="grid grid-cols-3 gap-2"
                  >
                    <Label className="flex cursor-pointer flex-col items-center space-y-2 rounded-lg border p-3 text-center">
                      <RadioGroupItem value="fixed" className="sr-only" />
                      <span className="font-medium">Fixed</span>
                      <span className="text-xs text-muted-foreground">
                        Exact price, no negotiation
                      </span>
                    </Label>
                    <Label className="flex cursor-pointer flex-col items-center space-y-2 rounded-lg border p-3 text-center">
                      <RadioGroupItem value="negotiable" className="sr-only" />
                      <span className="font-medium">Negotiable</span>
                      <span className="text-xs text-muted-foreground">Price open to offers</span>
                    </Label>
                    <Label className="flex cursor-pointer flex-col items-center space-y-2 rounded-lg border p-3 text-center">
                      <RadioGroupItem value="free" className="sr-only" />
                      <span className="font-medium">Free</span>
                      <span className="text-xs text-muted-foreground">
                        You’re giving this away
                      </span>
                    </Label>
                  </RadioGroup>

                  {priceType !== 'free' && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 5500"
                      />
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
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

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the condition, features and anything a buyer in Bangladesh should know."
                  />
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Location</Label>
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

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit changes for review
                </Button>

                <p className="mt-2 text-xs text-muted-foreground">
                  Your current ad will stay live with the old details until a moderator approves these changes.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
