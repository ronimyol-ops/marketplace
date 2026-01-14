import { Link, useLocation } from 'react-router-dom';
import type { ComponentType, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth, type AppPermission } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Users,
  Flag,
  LogOut,
  Home,
  ShieldCheck,
  UserCog,
  Search,
  Mail
} from 'lucide-react';

type NavItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission?: AppPermission;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { title: 'Ad review', href: '/admin/ads', icon: FileText, permission: 'review_ads' },
      { title: 'System moderation', href: '/admin/moderation-settings', icon: ShieldCheck, permission: 'manage_moderation_settings' },
    ],
  },
  {
    label: 'Search',
    items: [
      { title: 'Ad Search', href: '/admin/search/ads', icon: Search, permission: 'search_ads' },
      { title: 'Email Search', href: '/admin/search/emails', icon: Mail, permission: 'search_emails' },
    ],
  },
  {
    label: 'Management',
    items: [
      { title: 'Categories', href: '/admin/categories', icon: FolderTree, permission: 'manage_categories' },
      { title: 'Users', href: '/admin/users', icon: Users, permission: 'manage_users' },
      { title: 'Admin Users', href: '/admin/admins', icon: UserCog, permission: 'manage_admins' },
      { title: 'Reports', href: '/admin/reports', icon: Flag, permission: 'manage_reports' },
    ],
  },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut, hasPermission } = useAuth();
  const location = useLocation();

  const isItemActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="admin-compact h-screen bg-background overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 bg-card border-r p-3 flex flex-col">
          <div className="mb-4">
            <Link to="/" className="text-lg font-semibold text-primary leading-none">
              BazarBD
            </Link>
            <p className="text-[11px] text-muted-foreground mt-1">Admin Console</p>
          </div>

          <nav className="space-y-5 flex-1">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter((item) => !item.permission || hasPermission(item.permission));
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label} className="space-y-2">
                  <div className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const active = isItemActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-accent'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="pt-3 border-t space-y-1.5">
            <Link to="/">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
                <Home className="h-4 w-4" />
                Back to Site
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive h-8"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}