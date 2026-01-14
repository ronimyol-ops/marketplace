import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdCard } from '@/components/ads/AdCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SaveSearchDialog } from '@/components/search/SaveSearchDialog';
import { Bookmark, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
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

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  ad_count?: number;
}

interface SubcategoryOption {
  id: string;
  name: string;
  category_id: string;
  ad_count?: number;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  // Header search input (keeps UX consistent: the search bar reflects the current URL)
  const [headerQuery, setHeaderQuery] = useState(query);

  // Filters (kept in local state for responsive inputs, synced to URL)
  const [categorySlug, setCategorySlug] = useState(searchParams.get('category') || '');
  const [subcategoryId, setSubcategoryId] = useState(searchParams.get('subcategory') || '');
  const [division, setDivision] = useState(searchParams.get('division') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'recent');

  const { user } = useAuth();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);

  const [ads, setAds] = useState<Ad[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 12;

  const selectedCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug) || null,
    [categories, categorySlug]
  );
  const selectedCategoryId = selectedCategory?.id || '';

  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories.filter((s) => s.category_id === selectedCategoryId);
  }, [subcategories, selectedCategoryId]);

  const districts = division ? (DISTRICTS[division] || []) : [];

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') params.delete(key);
      else params.set(key, value);
    }
    setSearchParams(params);
  };

  const removeParams = (keys: string[]) => {
    const params = new URLSearchParams(searchParams);
    keys.forEach((k) => params.delete(k));
    setSearchParams(params);
  };

  // Keep local filter state in sync with the URL (e.g., back/forward navigation)
  useEffect(() => {
    setHeaderQuery(query);
    setCategorySlug(searchParams.get('category') || '');
    setSubcategoryId(searchParams.get('subcategory') || '');
    setDivision(searchParams.get('division') || '');
    setDistrict(searchParams.get('district') || '');
    setCondition(searchParams.get('condition') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setSort(searchParams.get('sort') || 'recent');
    setPage(1);
  }, [searchParams, query]);

  // Fetch categories/subcategories for filters
  useEffect(() => {
    const fetchTaxonomy = async () => {
      const [catRes, subRes, catCountRes, subCountRes] = await Promise.all([
        supabase.from('categories').select('id, name, slug, sort_order').order('sort_order'),
        supabase.from('subcategories').select('id, name, category_id').order('name'),
        supabase.from('category_ad_counts').select('category_id, ad_count'),
        supabase.from('subcategory_ad_counts').select('subcategory_id, ad_count'),
      ]);

      const catCountMap = new Map<string, number>();
      (catCountRes.data || []).forEach((row: any) => {
        if (row?.category_id) catCountMap.set(row.category_id, row.ad_count || 0);
      });
      const subCountMap = new Map<string, number>();
      (subCountRes.data || []).forEach((row: any) => {
        if (row?.subcategory_id) subCountMap.set(row.subcategory_id, row.ad_count || 0);
      });

      if (catRes.data) {
        const merged = (catRes.data as any[]).map((c) => ({
          ...c,
          ad_count: catCountMap.get(c.id) ?? 0,
        }));
        setCategories(merged as CategoryOption[]);
      }
      if (subRes.data) {
        const merged = (subRes.data as any[]).map((s) => ({
          ...s,
          ad_count: subCountMap.get(s.id) ?? 0,
        }));
        setSubcategories(merged as SubcategoryOption[]);
      }
    };

    fetchTaxonomy();
  }, []);

  useEffect(() => {
    fetchAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query,
    page,
    minPrice,
    maxPrice,
    condition,
    division,
    district,
    selectedCategoryId,
    subcategoryId,
    sort,
  ]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchAds = async () => {
    setIsLoading(true);

    let dbQuery = supabase
      .from('ads')
      .select('*, ad_images(image_url), categories(name, slug)', { count: 'exact' })
      .eq('status', 'approved');

    if (query) {
      dbQuery = dbQuery.ilike('title', `%${query}%`);
    }

    if (selectedCategoryId) {
      dbQuery = dbQuery.eq('category_id', selectedCategoryId);
    }

    if (subcategoryId) {
      dbQuery = dbQuery.eq('subcategory_id', subcategoryId);
    }

    if (condition === 'new' || condition === 'used') {
      dbQuery = dbQuery.eq('condition', condition);
    }

    if (division) {
      dbQuery = dbQuery.eq('division', division);
    }

    if (district) {
      dbQuery = dbQuery.eq('district', district);
    }

    if (minPrice) {
      dbQuery = dbQuery.gte('price', parseFloat(minPrice));
    }

    if (maxPrice) {
      dbQuery = dbQuery.lte('price', parseFloat(maxPrice));
    }

    // Always prioritize promoted/featured items, then apply the chosen sort.
    dbQuery = dbQuery.order('is_featured', { ascending: false });

    switch (sort) {
      case 'price_low':
        dbQuery = dbQuery.order('price', { ascending: true }).order('created_at', { ascending: false });
        break;
      case 'price_high':
        dbQuery = dbQuery.order('price', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'oldest':
        dbQuery = dbQuery.order('created_at', { ascending: true });
        break;
      case 'recent':
      default:
        dbQuery = dbQuery.order('created_at', { ascending: false });
        break;
    }

    dbQuery = dbQuery.range((page - 1) * perPage, page * perPage - 1);

    const { data, count } = await dbQuery;

    setAds((data as Ad[]) || []);
    setTotalCount(count || 0);
    setIsLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase.from('favorites').select('ad_id').eq('user_id', user.id);
    if (data) {
      setFavorites(data.map((f) => f.ad_id));
    }
  };

  const clearFilters = () => {
    setCategorySlug('');
    setSubcategoryId('');
    setDivision('');
    setDistrict('');
    setCondition('');
    setMinPrice('');
    setMaxPrice('');
    setSort('recent');
    setPage(1);

    updateParams({
      category: undefined,
      subcategory: undefined,
      division: undefined,
      district: undefined,
      condition: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: undefined,
    });
  };

  const totalPages = Math.ceil(totalCount / perPage);
  const startResult = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const endResult = totalCount === 0 ? 0 : (page - 1) * perPage + ads.length;

  const currentSearchCriteria = {
    query: query || undefined,
    categoryId: selectedCategoryId || undefined,
    subcategoryId: subcategoryId || undefined,
    division: division || undefined,
    district: district || undefined,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    condition: condition || undefined,
  };

  const hasActiveFilters = Boolean(
    categorySlug ||
      subcategoryId ||
      division ||
      district ||
      condition ||
      minPrice ||
      maxPrice ||
      sort !== 'recent'
  );

  const appliedChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];

    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || '';
    const sub = searchParams.get('subcategory') || '';
    const div = searchParams.get('division') || '';
    const dist = searchParams.get('district') || '';
    const cond = searchParams.get('condition') || '';
    const min = searchParams.get('minPrice') || '';
    const max = searchParams.get('maxPrice') || '';
    const sortParam = searchParams.get('sort') || '';

    if (q) {
      chips.push({
        key: 'q',
        label: `Keyword: ${q}`,
        onRemove: () => removeParams(['q']),
      });
    }

    if (cat) {
      const catName = categories.find((c) => c.slug === cat)?.name || cat;
      chips.push({
        key: 'category',
        label: `Category: ${catName}`,
        onRemove: () => removeParams(['category', 'subcategory']),
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
  }, [searchParams, categories, subcategories]);

  const FilterPanel = () => (
    <div className="space-y-4">
      {/* Sort is shown in the header on sm+; this shows it inside the filters drawer on xs */}
      <div className="space-y-2 sm:hidden">
        <Label>Sort</Label>
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value);
            setPage(1);
            updateParams({ sort: value === 'recent' ? undefined : value });
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

      <div className="space-y-1">
        <Label>Category</Label>
        <Select
          value={categorySlug || 'all'}
          onValueChange={(value) => {
            const next = value === 'all' ? '' : value;
            setCategorySlug(next);
            setSubcategoryId('');
            setPage(1);
            updateParams({ category: next || undefined, subcategory: undefined });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}{' '}
                {cat.ad_count !== undefined ? `(${cat.ad_count})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Subcategory</Label>
        <Select
          value={subcategoryId || 'all'}
          onValueChange={(value) => {
            const next = value === 'all' ? '' : value;
            setSubcategoryId(next);
            setPage(1);
            updateParams({ subcategory: next || undefined });
          }}
          disabled={!selectedCategoryId}
        >
          <SelectTrigger>
            <SelectValue placeholder={selectedCategoryId ? 'Any subcategory' : 'Select category first'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            {availableSubcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.name}{' '}
                {sub.ad_count !== undefined ? `(${sub.ad_count})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Division</Label>
        <Select
          value={division || 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              setDivision('');
              setDistrict('');
              updateParams({ division: undefined, district: undefined });
            } else {
              setDivision(value);
              setDistrict('');
              updateParams({ division: value, district: undefined });
            }
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            {DIVISIONS.map((div) => (
              <SelectItem key={div} value={div}>
                {div}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>District</Label>
        <Select
          value={district || 'all'}
          onValueChange={(value) => {
            const next = value === 'all' ? '' : value;
            setDistrict(next);
            setPage(1);
            updateParams({ district: next || undefined });
          }}
          disabled={!division}
        >
          <SelectTrigger>
            <SelectValue placeholder={division ? 'Any district' : 'Select division first'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            {districts.map((dist) => (
              <SelectItem key={dist} value={dist}>
                {dist}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Condition</Label>
        <Select
          value={condition || 'all'}
          onValueChange={(value) => {
            const next = value === 'all' ? '' : value;
            setCondition(next);
            setPage(1);
            updateParams({ condition: next || undefined });
          }}
        >
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

      <div className="space-y-1">
        <Label>Min price (৳)</Label>
        <Input
          type="number"
          value={minPrice}
          onChange={(e) => {
            const next = e.target.value;
            setMinPrice(next);
            setPage(1);
            updateParams({ minPrice: next || undefined });
          }}
          placeholder="Any"
        />
      </div>

      <div className="space-y-1">
        <Label>Max price (৳)</Label>
        <Input
          type="number"
          value={maxPrice}
          onChange={(e) => {
            const next = e.target.value;
            setMaxPrice(next);
            setPage(1);
            updateParams({ maxPrice: next || undefined });
          }}
          placeholder="Any"
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        searchQuery={headerQuery}
        onSearchChange={(next) => setHeaderQuery(next)}
        onSearch={() => {
          const trimmed = headerQuery.trim();
          updateParams({ q: trimmed || undefined });
          setPage(1);
        }}
      />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6 space-y-4 bg-card border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {query ? `Search results for "${query}"` : 'All Ads'}
              </h1>
              <p className="text-muted-foreground">
                {totalCount === 0
                  ? '0 ads found'
                  : `Showing ${startResult}–${endResult} of ${totalCount} ads`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user && <SaveSearchDialog criteria={currentSearchCriteria} />}
              <Link to="/saved-searches">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  My Saved Searches
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Sort (sm+) */}
            <div className="hidden sm:block">
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(value);
                  setPage(1);
                  updateParams({ sort: value === 'recent' ? undefined : value });
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

            {/* Mobile Filters */}
            <Sheet>
            <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" className="gap-2" aria-label="Open filters">
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

          {/* Active filter chips */}
          {appliedChips.length > 0 && (
            <ActiveFilterChips chips={appliedChips} onClearAll={clearFilters} clearLabel="Clear filters" />
          )}
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Desktop filters */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-4">Filters</h3>
              <FilterPanel />
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">No ads match your search yet.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                  <Link to="/post-ad">
                    <Button>Post an ad</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ads.map((ad) => (
                    <AdCard key={ad.id} ad={ad} isFavorite={favorites.includes(ad.id)} />
                  ))}
                </div>

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
