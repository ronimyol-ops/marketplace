import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ExternalLink, Loader2, Save } from 'lucide-react';
import { buildAdPublicPath } from '@/lib/adRoutes';

type ProfileForm = {
  full_name: string;
  email: string;
  phone_number: string;
  phone_number_secondary: string;
  division: string;
  district: string;
  area: string;
  seller_type: 'private' | 'business';
  show_phone_on_ads: boolean;
  verification_status: '' | 'verified' | 'verification_unsuccessful' | 'pending_verification';
  is_deleted: boolean;
  phone_verified: boolean;
  is_blocked: boolean;
  status_changed_at?: string | null;
};


type UserAuditLog = {
  id: string;
  ad_id: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  created_at: string;
};


type UserAd = {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  views_count: number | null;
};

export default function UserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const { isAdmin, hasPermission } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [ads, setAds] = useState<UserAd[]>([]);
  const [auditLogs, setAuditLogs] = useState<UserAuditLog[]>([]);

  const load = async () => {
    if (!userId) return;
    setIsLoading(true);

    const [profileRes, roleRes, adsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id,user_id,full_name,email,phone_number,phone_number_secondary,division,district,area,seller_type,show_phone_on_ads,verification_status,is_deleted,status_changed_at,phone_verified,is_blocked,phone_verified_at',
        )
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role,is_active')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('ads')
        .select('id,title,slug,status,created_at,views_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (profileRes.error) {
      toast({
        title: 'Could not load user profile',
        description: profileRes.error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    setIsUserAdmin(!!roleRes.data);

    const p = profileRes.data;
    setProfileId(p?.id ?? null);

    setForm({
      full_name: p?.full_name ?? '',
      email: (p as any)?.email ?? '',
      phone_number: p?.phone_number ?? '',
      phone_number_secondary: (p as any)?.phone_number_secondary ?? '',
      division: p?.division ?? '',
      district: p?.district ?? '',
      area: p?.area ?? '',
      seller_type: ((p as any)?.seller_type as any) ?? 'private',
      show_phone_on_ads: (p as any)?.show_phone_on_ads ?? true,
      verification_status: (p as any)?.verification_status ?? '',
      is_deleted: !!(p as any)?.is_deleted,
      phone_verified: !!p?.phone_verified,
      is_blocked: !!p?.is_blocked,
      status_changed_at: (p as any)?.status_changed_at ?? null,
    });

    setAds((adsRes.data ?? []) as any);


    const recentAds = (adsRes.data ?? []) as any[];
    const adIds = recentAds.map((a) => a.id).filter(Boolean);

    if (adIds.length) {
      const auditRes = await supabase
        .from('ad_audit_logs')
        .select('id,ad_id,action,actor_id,actor_role,created_at')
        .in('ad_id', adIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditRes.error) {
        console.warn('Could not load audit logs', auditRes.error.message);
        setAuditLogs([]);
      } else {
        setAuditLogs((auditRes.data ?? []) as any);
      }
    } else {
      setAuditLogs([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin && hasPermission('manage_users')) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, userId]);

  const dirty = useMemo(() => {
    // Simple dirty check: if we haven't loaded form, we aren't dirty.
    return !!form;
  }, [form]);

  const save = async () => {
    if (!userId || !profileId || !form) return;
    setSaving(true);

    const payload: Record<string, any> = {
      full_name: form.full_name || null,
      email: form.email || null,
      phone_number: form.phone_number || null,
      phone_number_secondary: form.phone_number_secondary || null,
      division: form.division || null,
      district: form.district || null,
      area: form.area || null,
      seller_type: form.seller_type,
      show_phone_on_ads: form.show_phone_on_ads,
      verification_status: form.verification_status ? form.verification_status : null,
      is_deleted: form.is_deleted,
      deleted_at: form.is_deleted ? new Date().toISOString() : null,
      phone_verified: form.phone_verified,
      is_blocked: form.is_blocked,
      phone_verified_at: form.phone_verified ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Could not save user',
        description: error.message,
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    toast({ title: 'User updated' });
    setSaving(false);
    load();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  if (!hasPermission('manage_users')) {
    return (
      <AdminLayout>
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold mb-2">User details</h1>
          <p className="text-muted-foreground">You don&apos;t have permission to view user details.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/users" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to users
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">User details</h1>
          <p className="text-muted-foreground">Edit profile fields and review recent listings.</p>
        </div>

        <Button onClick={save} disabled={!dirty || saving || isLoading}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </div>

      {isLoading || !form ? (
        <div className="grid gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => (f ? { ...f, full_name: e.target.value } : f))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value } : f))}
                  placeholder="Used for admin search (auth email is separate)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone_number}
                  onChange={(e) => setForm((f) => (f ? { ...f, phone_number: e.target.value } : f))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone2">Secondary phone</Label>
                <Input
                  id="phone2"
                  value={form.phone_number_secondary}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, phone_number_secondary: e.target.value } : f))
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Seller type</Label>
                  <Select
                    value={form.seller_type}
                    onValueChange={(v) =>
                      setForm((f) => (f ? { ...f, seller_type: v as any } : f))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Verification status</Label>
                  <Select
                    value={form.verification_status || 'none'}
                    onValueChange={(v) =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              verification_status: v === 'none' ? '' : (v as any),
                            }
                          : f,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending_verification">Pending Verification</SelectItem>
                      <SelectItem value="verification_unsuccessful">Verification Unsuccessful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="division">Division</Label>
                  <Input
                    id="division"
                    value={form.division}
                    onChange={(e) => setForm((f) => (f ? { ...f, division: e.target.value } : f))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={form.district}
                    onChange={(e) => setForm((f) => (f ? { ...f, district: e.target.value } : f))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  value={form.area}
                  onChange={(e) => setForm((f) => (f ? { ...f, area: e.target.value } : f))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Phone verified</div>
                  <div className="text-sm text-muted-foreground">Controls auto-moderation rules and badges.</div>
                </div>
                <Checkbox
                  checked={form.phone_verified}
                  onCheckedChange={(v) => setForm((f) => (f ? { ...f, phone_verified: Boolean(v) } : f))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Show phone on ads</div>
                  <div className="text-sm text-muted-foreground">Controls whether the phone is shown publicly.</div>
                </div>
                <Checkbox
                  checked={form.show_phone_on_ads}
                  onCheckedChange={(v) =>
                    setForm((f) => (f ? { ...f, show_phone_on_ads: Boolean(v) } : f))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Blocked</div>
                  <div className="text-sm text-muted-foreground">Prevents posting and access where enforced.</div>
                </div>
                <Checkbox
                  checked={form.is_blocked}
                  onCheckedChange={(v) => setForm((f) => (f ? { ...f, is_blocked: Boolean(v) } : f))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Deleted</div>
                  <div className="text-sm text-muted-foreground">Soft-delete the account (admin only).</div>
                </div>
                <Checkbox
                  checked={form.is_deleted}
                  onCheckedChange={(v) => setForm((f) => (f ? { ...f, is_deleted: Boolean(v) } : f))}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {isUserAdmin ? <Badge variant="outline">Admin</Badge> : <Badge variant="outline">User</Badge>}
                {form.is_deleted ? (
                  <Badge variant="outline">Deleted</Badge>
                ) : form.is_blocked ? (
                  <Badge variant="destructive">Blacklisted</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
                {form.verification_status ? (
                  <Badge variant="outline">{form.verification_status.replace(/_/g, ' ')}</Badge>
                ) : null}
              </div>

              {form.status_changed_at ? (
                <div className="text-xs text-muted-foreground">
                  Last status change: {new Date(form.status_changed_at).toLocaleString()}
                </div>
              ) : null}

              <div className="text-xs text-muted-foreground">
                User ID: <span className="font-mono break-all">{userId}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent ads</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium">{ad.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ad.status}</Badge>
                      </TableCell>
                      <TableCell>{ad.views_count ?? 0}</TableCell>
                      <TableCell>{new Date(ad.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Link to={buildAdPublicPath({ id: ad.id, slug: ad.slug })}>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-4 w-4 mr-2" /> View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}

                  {ads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        This user hasn&apos;t posted any ads yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>


          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle>Activity log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => {
                    const ad = ads.find((a) => a.id === log.ad_id);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {ad ? (
                            <Link to={buildAdPublicPath({ id: ad.id, slug: ad.slug })} className="hover:underline">
                              {ad.title}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{log.ad_id.slice(0, 8)}…</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(log.actor_role ?? 'system') + (log.actor_id ? ` • ${log.actor_id.slice(0, 8)}…` : '')}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        No activity recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      )}
    </AdminLayout>
  );
}
