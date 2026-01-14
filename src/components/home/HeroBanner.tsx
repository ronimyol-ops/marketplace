import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';

export function HeroBanner() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const popularTerms = language === 'bn' 
    ? ['আইফোন', 'গাড়ি', 'ফ্ল্যাট', 'ল্যাপটপ', 'বাইক']
    : ['iPhone', 'Car', 'Flat', 'Laptop', 'Bike'];

  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background py-16 md:py-24">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          {language === 'bn' ? (
            <>
              <span className="text-primary">বাংলাদেশে</span> যেকোনো কিছু কিনুন ও বিক্রি করুন
            </>
          ) : (
            <>
              Buy & Sell Anything in <span className="text-primary">Bangladesh</span>
            </>
          )}
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('heroSubtitle')}
        </p>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          <Button type="submit" size="lg" className="px-8">
            {t('search')}
          </Button>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/post-ad">
            <Button size="lg" className="gap-2">
              {t('startSelling')}
            </Button>
          </Link>
          <Link to="/categories">
            <Button size="lg" variant="outline" className="gap-2">
              {t('browseAds')}
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {language === 'bn' ? 'জনপ্রিয়:' : 'Popular:'}
          </span>
          {popularTerms.map((term) => (
            <button
              key={term}
              onClick={() => navigate(`/search?q=${term}`)}
              className="px-3 py-1 rounded-full bg-card border border-border hover:border-primary hover:text-primary transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
