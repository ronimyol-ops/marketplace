import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, User, Heart, Menu, X, LogOut, Settings, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearch?: () => void;
}

export function Header({ searchQuery = '', onSearchChange, onSearch }: HeaderProps) {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const [unreadCount, setUnreadCount] = useState(0);

  const effectiveQuery = onSearchChange ? searchQuery : internalQuery;

  useEffect(() => {
    // If the parent controls the query, trust it.
    if (onSearchChange) return;
    setInternalQuery(searchQuery);
  }, [searchQuery, onSearchChange]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Subscribe to new messages
      const channel = supabase
        .channel('unread-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch();
      setIsOpen(false);
      return;
    }

    const q = effectiveQuery.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    setIsOpen(false);
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <Link 
        to="/" 
        className="text-foreground/80 hover:text-primary transition-colors"
        onClick={() => mobile && setIsOpen(false)}
      >
        {t('home')}
      </Link>
      <Link 
        to="/categories" 
        className="text-foreground/80 hover:text-primary transition-colors"
        onClick={() => mobile && setIsOpen(false)}
      >
        {t('categories')}
      </Link>
      {user && (
        <>
          <Link 
            to="/favorites" 
            className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1"
            onClick={() => mobile && setIsOpen(false)}
          >
            <Heart className="h-4 w-4" />
            {t('favorites')}
          </Link>
          <Link 
            to="/messages" 
            className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1 relative"
            onClick={() => mobile && setIsOpen(false)}
          >
            <MessageCircle className="h-4 w-4" />
            {t('messages')}
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Link>
        </>
      )}
      {isAdmin && (
        <Link 
          to="/admin" 
          className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1"
          onClick={() => mobile && setIsOpen(false)}
        >
          <Settings className="h-4 w-4" />
          Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground font-bold text-xl px-3 py-1 rounded-lg">
              BazarBD
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={effectiveQuery}
                onChange={(e) => {
                  const next = e.target.value;
                  if (onSearchChange) onSearchChange(next);
                  else setInternalQuery(next);
                }}
                className="pr-10"
              />
              <Button 
                type="submit" 
                size="icon" 
                variant="ghost" 
                className="absolute right-0 top-0 h-full"
                aria-label={t('search')}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <NavLinks />
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            
            {user ? (
              <>
                <Link to="/post-ad">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('postAd')}</span>
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('profile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-ads" className="flex items-center gap-2">
                        {t('myAds')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-destructive">
                      <LogOut className="h-4 w-4" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('login')}</span>
                </Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-6 mt-8">
                  <form onSubmit={handleSearch} className="relative">
                    <Input
                      type="text"
                      placeholder={t('searchPlaceholder')}
                      value={effectiveQuery}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (onSearchChange) onSearchChange(next);
                        else setInternalQuery(next);
                      }}
                      className="pr-10"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      variant="ghost" 
                      className="absolute right-0 top-0 h-full"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </form>
                  <nav className="flex flex-col gap-4">
                    <NavLinks mobile />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
