import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Smartphone,
  Car,
  Home,
  Briefcase,
  Shirt,
  Wrench,
  Sofa,
  GraduationCap,
  LucideIcon,
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

interface CategoryGridProps {
  categories: Category[];
  /** Show a "View all" link/button when there are more categories than what you render on the homepage */
  showViewAllLink?: boolean;
  viewAllLink?: string;
}

export function CategoryGrid({
  categories,
  showViewAllLink = false,
  viewAllLink = '/categories',
}: CategoryGridProps) {
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Browse Categories</h2>
        <Link
          to={viewAllLink}
          className="text-sm text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {categories.map((category) => {
          const iconValue = (category.icon || '').trim();
          const Lucide = iconValue ? iconMap[iconValue] : undefined;
          const isEmoji = !!iconValue && !/^[A-Za-z]/.test(iconValue);

          return (
            <Link key={category.id} to={`/category/${category.slug}`}>
              <Card className="group hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    {Lucide ? (
                      <Lucide className="h-6 w-6 text-primary" />
                    ) : isEmoji ? (
                      <span className="text-2xl leading-none">{iconValue}</span>
                    ) : (
                      <Smartphone className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {category.name}
                  </span>
                  {category.ad_count !== undefined && (
                    <span className="text-xs text-muted-foreground mt-1">
                      {category.ad_count} ads
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {showViewAllLink && (
          <Link to={viewAllLink} className="col-span-2 sm:col-span-1">
            <Card className="group hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <span className="text-xl font-semibold text-primary">+</span>
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  View all categories
                </span>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </section>
  );
}
