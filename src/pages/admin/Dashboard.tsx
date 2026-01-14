import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Users,
  FileCheck,
  FileClock,
  FileX,
  AlertTriangle,
  Search,
  Mail,
  UserCog
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  pendingAds: number;
  approvedAds: number;
  rejectedAds: number;
  pendingReports: number;
}

export default function AdminDashboard() {
  const { user, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const fetchStats = async () => {
    setIsLoading(true);

    const [usersRes, pendingRes, approvedRes, rejectedRes, reportsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      pendingAds: pendingRes.count || 0,
      approvedAds: approvedRes.count || 0,
      rejectedAds: rejectedRes.count || 0,
      pendingReports: reportsRes.count || 0,
    });

    setIsLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total users', value: stats?.totalUsers, icon: Users },
    { title: 'Pending ads', value: stats?.pendingAds, icon: FileClock },
    { title: 'Approved ads', value: stats?.approvedAds, icon: FileCheck },
    { title: 'Rejected ads', value: stats?.rejectedAds, icon: FileX },
    { title: 'Pending reports', value: stats?.pendingReports, icon: AlertTriangle },
  ];

  const quickLinks = [
    {
      title: 'Search Ads',
      description: 'Find any listing by slug, title, phone, or email.',
      href: '/admin/search/ads',
      icon: Search,
      show: hasPermission('search_ads'),
    },
    {
      title: 'Search Emails',
      description: 'Audit and track email events and states.',
      href: '/admin/search/emails',
      icon: Mail,
      show: hasPermission('search_emails'),
    },
    {
      title: 'Admin Users',
      description: 'Manage admin access, status, and permissions.',
      href: '/admin/admins',
      icon: UserCog,
      show: hasPermission('manage_admins'),
    },
  ].filter((l) => l.show);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and shortcuts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-10">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))
          : statCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value ?? 0}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      {quickLinks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Card className="hover:bg-accent transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <link.icon className="h-5 w-5" />
                      <CardTitle className="text-base">{link.title}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
