import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroBanner } from '@/components/home/HeroBanner';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { AdSection } from '@/components/home/AdSection';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Skeleton } from '@/components/ui/skeleton';
import { DIVISIONS } from '@/lib/constants';
import { MapPin } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  ad_count?: number;
}

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

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredAds, setFeaturedAds] = useState<Ad[]>([]);
  const [recentAds, setRecentAds] = useState<Ad[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const topCategories = categories.slice(0, 12);
  const showAllCategoriesLink = categories.length > topCategories.length;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [categoriesRes, countsRes, featuredRes, recentRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('category_ad_counts').select('category_id, ad_count'),
        supabase
          .from('ads')
          .select('*, ad_images(image_url), categories(name, slug)')
          .eq('status', 'approved')
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('ads')
          .select('*, ad_images(image_url), categories(name, slug)')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (categoriesRes.data) {
        const countMap = new Map<string, number>();
        (countsRes.data || []).forEach((row: any) => {
          if (row?.category_id) {
            countMap.set(row.category_id, row.ad_count || 0);
          }
        });

        const merged = (categoriesRes.data as any[]).map((c) => ({
          ...c,
          ad_count: countMap.get(c.id) ?? 0,
        }));
        setCategories(merged);
      }
      if (featuredRes.data) setFeaturedAds(featuredRes.data as Ad[]);
      if (recentRes.data) setRecentAds(recentRes.data as Ad[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroBanner />

        {/* Quick Bangladesh location shortcuts */}
        <section className="border-b bg-background/80">
          <div className="container mx-auto px-4 py-4 md:py-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">
                {language === 'bn' ? 'বাংলাদেশের জনপ্রিয় এলাকাগুলো থেকে ব্রাউজ করুন' : 'Browse popular locations in Bangladesh'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn'
                  ? 'একটি বিভাগ নির্বাচন করে আপনার এলাকার বিজ্ঞাপন দেখুন।'
                  : 'Choose a division to see local listings near you.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIVISIONS.map((division) => (
                <Button
                  key={division}
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-full"
                  onClick={() => navigate(`/search?division=${encodeURIComponent(division)}`)}
                >
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs md:text-sm">{division}</span>
                </Button>
              ))}
            </div>
          </div>
        </section>
        
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="py-8">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            </div>
          ) : (
            <CategoryGrid
              categories={topCategories}
              showViewAllLink={showAllCategoriesLink}
              viewAllLink="/categories"
            />
          )}

          {isLoading ? (
            <div className="py-8">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <AdSection 
                title={t('featuredAds')} 
                ads={featuredAds} 
                favorites={favorites}
              />
              <AdSection 
                title={t('latestAds')} 
                ads={recentAds} 
                viewAllLink="/search"
                favorites={favorites}
              />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
