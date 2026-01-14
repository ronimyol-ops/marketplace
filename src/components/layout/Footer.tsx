import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';

export function Footer() {
  const { t, language } = useLanguage();
  
  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">BazarBD</h3>
            <p className="text-sm opacity-80">
              {language === 'bn' 
                ? 'বাংলাদেশের বিশ্বস্ত ক্রয়-বিক্রয় প্ল্যাটফর্ম। ইলেকট্রনিক্স থেকে সম্পত্তি, সব কিছু এখানে পাবেন।'
                : "Bangladesh's trusted marketplace for buying and selling anything. From electronics to property, find it all here."
              }
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{t('popularCategories')}</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/category/electronics" className="hover:opacity-100">
                {language === 'bn' ? 'ইলেকট্রনিক্স' : 'Electronics'}
              </Link></li>
              <li><Link to="/category/vehicles" className="hover:opacity-100">
                {language === 'bn' ? 'যানবাহন' : 'Vehicles'}
              </Link></li>
              <li><Link to="/category/property" className="hover:opacity-100">
                {language === 'bn' ? 'সম্পত্তি' : 'Property'}
              </Link></li>
              <li><Link to="/category/jobs" className="hover:opacity-100">
                {language === 'bn' ? 'চাকরি' : 'Jobs'}
              </Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">
              {language === 'bn' ? 'দ্রুত লিংক' : 'Quick Links'}
            </h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/auth" className="hover:opacity-100">{t('login')}</Link></li>
              <li><Link to="/post-ad" className="hover:opacity-100">{t('postAd')}</Link></li>
              <li><Link to="/my-ads" className="hover:opacity-100">{t('myAds')}</Link></li>
              <li><Link to="/favorites" className="hover:opacity-100">{t('favorites')}</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">
              {language === 'bn' ? 'সাহায্য' : 'Support'}
            </h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><span>{t('helpCenter')}</span></li>
              <li><span>{t('safetyTips')}</span></li>
              <li><span>{t('contactUs')}</span></li>
              <li><span>{t('termsOfService')}</span></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-secondary-foreground/20 mt-8 pt-8 text-center text-sm opacity-60">
          <p>
            {language === 'bn' 
              ? '© ২০২৪ বাজারবিডি। সর্বস্বত্ব সংরক্ষিত। বাংলাদেশে ❤️ দিয়ে তৈরি'
              : '© 2024 BazarBD. All rights reserved. Made with ❤️ in Bangladesh'
            }
          </p>
        </div>
      </div>
    </footer>
  );
}
