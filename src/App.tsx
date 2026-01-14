import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/hooks/useLanguage';

import Index from './pages/Index';
import Auth from './pages/Auth';
import PostAd from './pages/PostAd';
import AdDetails from './pages/AdDetails';
import Category from './pages/Category';
import Search from './pages/Search';
import MyAds from './pages/MyAds';
import EditAd from './pages/EditAd';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Categories from './pages/Categories';
import NotFound from './pages/NotFound';
import Messages from './pages/Messages';
import SavedSearches from './pages/SavedSearches';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdModeration from './pages/admin/AdModeration';
import CategoryManagement from './pages/admin/CategoryManagement';
import ModerationSettings from './pages/admin/ModerationSettings';
import UserManagement from './pages/admin/UserManagement';
import UserDetails from './pages/admin/UserDetails';
import ReportManagement from './pages/admin/ReportManagement';
import AdminUsers from './pages/admin/AdminUsers';
import AdSearch from './pages/admin/AdSearch';
import EmailSearch from './pages/admin/EmailSearch';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/post-ad" element={<PostAd />} />
                <Route path="/ad/:slug" element={<AdDetails />} />
                <Route path="/category/:slug" element={<Category />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/search" element={<Search />} />
                <Route path="/my-ads" element={<MyAds />} />
                <Route path="/my-ads/edit/:adId" element={<EditAd />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/saved-searches" element={<SavedSearches />} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/ads" element={<AdModeration />} />
                <Route path="/admin/ads/:queue" element={<AdModeration />} />
                <Route path="/admin/search/ads" element={<AdSearch />} />
                <Route path="/admin/search/emails" element={<EmailSearch />} />
                <Route path="/admin/review/:queue" element={<AdModeration />} />
                <Route path="/admin/moderation-settings" element={<ModerationSettings />} />
                <Route path="/admin/categories" element={<CategoryManagement />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/users/:userId" element={<UserDetails />} />
                <Route path="/admin/admins" element={<AdminUsers />} />
                <Route path="/admin/reports" element={<ReportManagement />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
