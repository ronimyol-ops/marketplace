import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, LayoutList, MessageCircle, Search, User, Plus } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AccountShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AccountShell({ title, description, actions, children }: AccountShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                {description && <p className="text-muted-foreground mt-1">{description}</p>}
              </div>
              {actions ? <div className="sm:pt-1">{actions}</div> : null}
            </div>

            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AccountNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('account-nav-unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const items = [
    { to: '/my-ads', label: 'My ads', icon: LayoutList },
    { to: '/favorites', label: 'Favorites', icon: Heart },
    { to: '/messages', label: 'Messages', icon: MessageCircle, badge: unreadCount },
    { to: '/saved-searches', label: 'Saved searches', icon: Search },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <Card className="lg:sticky lg:top-24">
      <CardContent className="p-3">
        <div className="mb-3">
          <Button asChild className="w-full gap-2">
            <Link to="/post-ad">
              <Plus className="h-4 w-4" />
              Post ad
            </Link>
          </Button>
        </div>

        <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors bg-background hover:bg-accent',
                  active && 'border-primary bg-accent'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                <span className="font-medium">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <Badge className="ml-auto h-5 px-2" variant="default">
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
}
