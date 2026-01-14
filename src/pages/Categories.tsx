import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  Smartphone, Car, Home, Briefcase, Shirt, Wrench, Sofa, GraduationCap,
  LucideIcon, ChevronRight
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Smartphone,
  Car,
  Home,
  Briefcase,
  Shirt,
  Wrench,
  Sofa,
  GraduationCap,
};

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  ad_count?: number;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  ad_count?: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [catRes, subRes, catCountRes, subCountRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('subcategories').select('*').order('name'),
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
      const mergedCats = (catRes.data as any[]).map((c) => ({
        ...c,
        ad_count: catCountMap.get(c.id) ?? 0,
      }));
      setCategories(mergedCats);
    }
    if (subRes.data) {
      const mergedSubs = (subRes.data as any[]).map((s) => ({
        ...s,
        ad_count: subCountMap.get(s.id) ?? 0,
      }));
      setSubcategories(mergedSubs);
    }
    setIsLoading(false);
  };

  const getSubcategories = (categoryId: string) => {
    return subcategories.filter(s => s.category_id === categoryId);
  };

  const filteredCategories = categories.filter((category) => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return true;
    if (category.name.toLowerCase().includes(q)) return true;
    const subs = getSubcategories(category.id);
    return subs.some((s) => s.name.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">All Categories</h1>
          <div className="w-full sm:max-w-sm">
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search categories or subcategories"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>

        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {filterQuery.trim()
                ? 'No categories match your search. Try a different keyword.'
                : 'No categories are available yet. Please check back later.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => {
              const iconValue = (category.icon || '').trim();
              const IconComponent = iconValue ? iconMap[iconValue] : undefined;
              const isEmoji = !!iconValue && !/^[A-Za-z]/.test(iconValue);
              const subs = getSubcategories(category.id);
              
              return (
                <Card key={category.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <Link to={`/category/${category.slug}`} className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {IconComponent ? (
                          <IconComponent className="h-6 w-6 text-primary" />
                        ) : isEmoji ? (
                          <span className="text-2xl leading-none">{iconValue}</span>
                        ) : (
                          <Smartphone className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold hover:text-primary transition-colors">
                          {category.name}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {subs.length} subcategories
                        </p>
                      </div>
                      <Badge variant="secondary">{category.ad_count ?? 0} ads</Badge>
                    </Link>
                    
                    {subs.length > 0 && (
                      <div className="space-y-2 pl-6">
                        {subs.slice(0, 4).map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/category/${category.slug}?subcategory=${sub.id}`}
                            className="flex items-center justify-between gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <ChevronRight className="h-3 w-3" />
                              {sub.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{sub.ad_count ?? 0}</span>
                          </Link>
                        ))}
                        {subs.length > 4 && (
                          <Link
                            to={`/category/${category.slug}`}
                            className="text-sm text-primary hover:underline"
                          >
                            View all {subs.length} subcategories
                          </Link>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
