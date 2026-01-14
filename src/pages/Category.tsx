import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdCard } from '@/components/ads/AdCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { Filter, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ActiveFilterChips, ActiveFilterChip } from '@/components/common/ActiveFilterChips';
import { PaginationControls } from '@/components/common/PaginationControls';

interface Ad {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  condition: string;
  division: string;
  district: string;
  is_featured: boolean;
  created_at: string;
  ad_images: { image_url: string }[];
  categories: { name: string; slug: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subcategoryCounts, setSubcategoryCounts] = useState<Record<string, number>>({});
  const [ads, setAds] = useState<Ad[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 12;

  // Filters
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [division, setDivision] = useState(searchParams.get('division') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [subcategoryId, setSubcategoryId] = useState(searchParams.get('subcategory') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'recent');

  useEffect(() => {
    fetchCategory();
  }, [slug]);

  // Keep local filter state in sync with the URL (e.g., back/forward navigation)
  useEffect(() => {
    setKeyword(searchParams.get('q') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setCondition(searchParams.get('condition') || '');
    setDivision(searchParams.get('division') || '');
    setDistrict(searchParams.get('district') || '');
    setSubcategoryId(searchParams.get('subcategory') || '');
    setSort(searchParams.get('sort') || 'recent');
    setPage(1);
  }, [searchParams]);

  // Only re-fetch when the *applied* filters (URL) change or when paging changes.
  // The filter panel keeps its own local state so users can adjust multiple values before hitting "Apply".
  useEffect(() => {
    if (category) {
      fetchAds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, page, searchParams]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchCategory = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (data) {
      setCategory(data);
      
      const { data: subs } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', data.id)
        .order('name');
      
      setSubcategories(subs || []);

      // Fetch lightweight count badges for subcategories (optional UI enhancement)
      if (subs && subs.length > 0) {
        const { data: countRows } = await supabase
          .from('subcategory_ad_counts')
          .select('subcategory_id, ad_count')
          .in('subcategory_id', subs.map((s: any) => s.id));

        const map: Record<string, number> = {};
        (countRows || []).forEach((r: any) => {
          if (r?.subcategory_id) map[r.subcategory_id] = r.ad_count || 0;
        });
        setSubcategoryCounts(map);
      } else {
        setSubcategoryCounts({});
      }
    }
  };

  const fetchAds = async () => {
    if (!category) return;
    
    setIsLoading(true);
    
    let query = supabase
      .from('ads')
      .select('*, ad_images(image_url), categories(name, slug)', { count: 'exact' })
      .eq('status', 'approved')
      .eq('category_id', category.id);

    if (keyword) query = query.ilike('title', `%${keyword}%`);
    if (subcategoryId) query = query.eq('subcategory_id', subcategoryId);
    if (condition === 'new' || condition === 'used') query = query.eq('condition', condition);
    if (division) query = query.eq('division', division);
    if (district) query = query.eq('district', district);
    if (minPrice) query = query.gte('price', parseFloat(minPrice));
    if (maxPrice) query = query.lte('price', parseFloat(maxPrice));

    // Always prioritize promoted/featured items, then apply the chosen sort.
    query = query.order('is_featured', { ascending: false });

    switch (sort) {
      case 'price_low':
        query = query.order('price', { ascending: true }).order('created_at', { ascending: false });
        break;
      case 'price_high':
        query = query.order('price', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range((page - 1) * perPage, page * perPage - 1);

    const { data, count } = await query;
    
    setAds(data as Ad[] || []);
    setTotalCount(count || 0);
    setIsLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('ad_id')
      .eq('user_id', user.id);
    if (data) {
      setFavorites(data.map(f => f.ad_id));
    }
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (condition) params.set('condition', condition);
    if (division) params.set('division', division);
    if (district) params.set('district', district);
    if (subcategoryId) params.set('subcategory', subcategoryId);
    if (sort && sort !== 'recent') params.set('sort', sort);
    setSearchParams(params);
    setPage(1);
  };

  const clearFilters = () => {
    setKeyword('');
    setMinPrice('');
    setMaxPrice('');
    setCondition('');
    setDivision('');
    setDistrict('');
    setSubcategoryId('');
    setSort('recent');
    setSearchParams({});
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / perPage);

  const startResult = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const endResult = totalCount === 0 ? 0 : (page - 1) * perPage + ads.length;

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams);
    if (!value) params.delete(key);
    else params.set(key, value);
    setSearchParams(params);
  };

  const removeParams = (keys: string[]) => {
    const params = new URLSearchParams(searchParams);
    keys.forEach((k) => params.delete(k));
    setSearchParams(params);
  };

  const appliedChips: ActiveFilterChip[] = (() => {
    const chips: ActiveFilterChip[] = [];

    const q = searchParams.get('q') || '';
    const min = searchParams.get('minPrice') || '';
    const max = searchParams.get('maxPrice') || '';
    const cond = searchParams.get('condition') || '';
    const div = searchParams.get('division') || '';
    const dist = searchParams.get('district') || '';
    const sub = searchParams.get('subcategory') || '';
    const sortParam = searchParams.get('sort') || '';

    if (q) {
      chips.push({
        key: 'q',
        label: `Keyword: ${q}`,
        onRemove: () => removeParams(['q']),
      });
    }

    if (sub) {
      const subName = subcategories.find((s) => s.id === sub)?.name || 'Subcategory';
      chips.push({
        key: 'subcategory',
        label: `Subcategory: ${subName}`,
        onRemove: () => removeParams(['subcategory']),
      });
    }

    if (cond) {
      chips.push({
        key: 'condition',
        label: `Condition: ${cond === 'new' ? 'New' : 'Used'}`,
        onRemove: () => removeParams(['condition']),
      });
    }

    if (min) {
      chips.push({
        key: 'minPrice',
        label: `Min ৳${min}`,
        onRemove: () => removeParams(['minPrice']),
      });
    }

    if (max) {
      chips.push({
        key: 'maxPrice',
        label: `Max ৳${max}`,
        onRemove: () => removeParams(['maxPrice']),
      });
    }

    if (div) {
      chips.push({
        key: 'division',
        label: `Division: ${div}`,
        onRemove: () => removeParams(['division', 'district']),
      });
    }

    if (dist) {
      chips.push({
        key: 'district',
        label: `District: ${dist}`,
        onRemove: () => removeParams(['district']),
      });
    }

    if (sortParam) {
      const sortLabel =
        sortParam === 'price_low'
          ? 'Price: Low to High'
          : sortParam === 'price_high'
            ? 'Price: High to Low'
            : sortParam === 'oldest'
              ? 'Oldest first'
              : 'Newest first';
      chips.push({
        key: 'sort',
        label: `Sort: ${sortLabel}`,
        onRemove: () => removeParams(['sort']),
      });
    }

    return chips;
  })();

  const FilterPanel = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Keyword</Label>
        <Input
          placeholder="Search within this category"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* Sort is already shown in the header on sm+; this shows it inside the filters drawer on xs */}
      <div className="space-y-2 sm:hidden">
        <Label>Sort</Label>
        <Select
          value={sort}
          onValueChange={(v) => {
            setSort(v);
            if (v === 'recent') updateParam('sort');
            else updateParam('sort', v);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Newest first</SelectItem>
            <SelectItem value="price_low">Price: Low to High</SelectItem>
            <SelectItem value="price_high">Price: High to Low</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {subcategories.length > 0 && (
        <div className="space-y-2">
          <Label>Subcategory</Label>
          <Select
            value={subcategoryId || 'all'}
            onValueChange={(v) => setSubcategoryId(v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All subcategories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {subcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name}{' '}
                  {subcategoryCounts[sub.id] !== undefined ? `(${subcategoryCounts[sub.id]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Condition</Label>
        <Select value={condition || "all"} onValueChange={(v) => setCondition(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Any condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="used">Used</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Price Range (৳)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Division</Label>
        <Select
          value={division || 'all'}
          onValueChange={(v) => {
            setDivision(v === 'all' ? '' : v);
            setDistrict('');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            {DIVISIONS.map((div) => (
              <SelectItem key={div} value={div}>{div}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {division && (
        <div className="space-y-2">
          <Label>District</Label>
          <Select
            value={district || 'all'}
            onValueChange={(v) => setDistrict(v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any district" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {(DISTRICTS[division] || []).map((dist) => (
                <SelectItem key={dist} value={dist}>{dist}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={applyFilters} className="flex-1">Apply</Button>
        <Button onClick={clearFilters} variant="outline">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex flex-wrap gap-2">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/categories" className="hover:text-primary">Categories</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{category?.name || 'Category'}</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{category?.name || 'Category'}</h1>
            <p className="text-muted-foreground">
              {totalCount === 0
                ? '0 ads found'
                : `Showing ${startResult}–${endResult} of ${totalCount} ads`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="hidden sm:block">
              <Select
                value={sort}
                onValueChange={(v) => {
                  setSort(v);
                  if (v === 'recent') updateParam('sort');
                  else updateParam('sort', v);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Newest first</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterPanel />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active filter chips */}
        {appliedChips.length > 0 && (
          <div className="mb-6">
            <ActiveFilterChips chips={appliedChips} onClearAll={clearFilters} />
          </div>
        )}

        {/* Quick subcategory chips */}
        {subcategories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={!subcategoryId ? 'default' : 'outline'}
              onClick={() => updateParam('subcategory')}
            >
              All
            </Button>
            {subcategories.map((sub) => (
              <Button
                key={sub.id}
                size="sm"
                variant={subcategoryId === sub.id ? 'default' : 'outline'}
                onClick={() => updateParam('subcategory', sub.id)}
              >
                <span>{sub.name}</span>
                {subcategoryCounts[sub.id] !== undefined && (
                  <span className="ml-1 text-xs opacity-80">({subcategoryCounts[sub.id]})</span>
                )}
              </Button>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-4">Filters</h3>
              <FilterPanel />
            </div>
          </aside>

          {/* Ads Grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">There are no ads in this category yet.</p>
                <Button onClick={clearFilters} variant="outline" className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {ads.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      isFavorite={favorites.includes(ad.id)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <PaginationControls
                  className="mt-8"
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(next) => {
                    const clamped = Math.min(Math.max(next, 1), totalPages);
                    setPage(clamped);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
