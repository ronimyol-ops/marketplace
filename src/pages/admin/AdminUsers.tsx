import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth, type AppPermission } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { APP_PERMISSIONS, permissionLabel } from '@/constants/adminPermissions';
import { Search, Shield, UserPlus2, RefreshCcw } from 'lucide-react';

type AdminRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  is_active: boolean;
  created_at: string | null;
  permissions: AppPermission[];
};

export default function AdminUsers() {
  const { isAdmin, hasPermission } = useAuth();
  const { toast } = useToast();

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<{ active: boolean; inactive: boolean }>({
    active: true,
    inactive: false,
  });
  const [permissionFilter, setPermissionFilter] = useState<string>('all');

  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteLoading, setPromoteLoading] = useState(false);

  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminRow | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<AppPermission>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchAdmins = async () => {
    setIsLoading(true);

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id,is_active')
      .eq('role', 'admin');

    if (rolesError) {
      toast({
        title: 'Could not load admin users',
        description: rolesError.message,
        variant: 'destructive',
      });
      setAdmins([]);
      setIsLoading(false);
      return;
    }

    const adminUserIds = (roles ?? []).map((r) => r.user_id);

    if (adminUserIds.length === 0) {
      setAdmins([]);
      setIsLoading(false);
      return;
    }

    const [{ data: profiles }, { data: perms }] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id,full_name,email,phone_number,created_at')
        .in('user_id', adminUserIds),
      supabase
        .from('user_permissions')
        .select('user_id,permission')
        .in('user_id', adminUserIds),
    ]);

    const permMap = new Map<string, AppPermission[]>();
    (perms ?? []).forEach((p) => {
      const list = permMap.get(p.user_id) ?? [];
      list.push(p.permission as AppPermission);
      permMap.set(p.user_id, list);
    });

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const rows: AdminRow[] = (roles ?? []).map((r) => {
      const profile = profileMap.get(r.user_id);
      return {
        user_id: r.user_id,
        full_name: profile?.full_name ?? null,
        email: (profile as any)?.email ?? null,
        phone_number: profile?.phone_number ?? null,
        is_active: r.is_active ?? true,
        created_at: profile?.created_at ?? null,
        permissions: permMap.get(r.user_id) ?? [],
      };
    });

    rows.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));

    setAdmins(rows);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin && hasPermission('manage_admins')) {
      fetchAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return admins.filter((a) => {
      const matchesSearch =
        !q ||
        (a.full_name ?? '').toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q) ||
        (a.phone_number ?? '').includes(q);

      const matchesStatus =
        (statusFilter.active && a.is_active) ||
        (statusFilter.inactive && !a.is_active) ||
        (!statusFilter.active && !statusFilter.inactive);

      const matchesPermission =
        permissionFilter === 'all' || a.permissions.includes(permissionFilter as AppPermission);

      return matchesSearch && matchesStatus && matchesPermission;
    });
  }, [admins, searchQuery, statusFilter, permissionFilter]);

  const openPermissions = (admin: AdminRow) => {
    setEditingAdmin(admin);
    setSelectedPerms(new Set(admin.permissions));
    setPermDialogOpen(true);
  };

  const savePermissions = async () => {
    if (!editingAdmin) return;
    setSavingPerms(true);

    const current = new Set(editingAdmin.permissions);
    const desired = selectedPerms;

    const toAdd = Array.from(desired).filter((p) => !current.has(p));
    const toRemove = Array.from(current).filter((p) => !desired.has(p));

    const ops: Promise<any>[] = [];

    if (toAdd.length > 0) {
      ops.push(
        supabase.from('user_permissions').insert(
          toAdd.map((permission) => ({
            user_id: editingAdmin.user_id,
            permission,
          }))
        )
      );
    }

    if (toRemove.length > 0) {
      ops.push(
        supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', editingAdmin.user_id)
          .in('permission', toRemove)
      );
    }

    const results = await Promise.all(ops);
    const error = results.find((r) => r?.error)?.error;

    if (error) {
      toast({
        title: 'Failed to update permissions',
        description: error.message,
        variant: 'destructive',
      });
      setSavingPerms(false);
      return;
    }

    toast({ title: 'Permissions updated' });
    setPermDialogOpen(false);
    setEditingAdmin(null);
    setSavingPerms(false);
    fetchAdmins();
  };

  const toggleAdminStatus = async (admin: AdminRow) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: !admin.is_active })
      .eq('user_id', admin.user_id)
      .eq('role', 'admin');

    if (error) {
      toast({
        title: 'Could not update admin status',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: admin.is_active ? 'Admin deactivated' : 'Admin activated' });
    fetchAdmins();
  };

  const promoteToAdmin = async () => {
    const email = promoteEmail.trim().toLowerCase();
    if (!email) return;

    setPromoteLoading(true);

    // Find profile by email (stored on public.profiles)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id,full_name,email')
      .ilike('email', email)
      .maybeSingle();

    if (profileError) {
      toast({
        title: 'Could not find user',
        description: profileError.message,
        variant: 'destructive',
      });
      setPromoteLoading(false);
      return;
    }

    if (!profile?.user_id) {
      toast({
        title: 'User not found',
        description: 'No user profile matched that email.',
        variant: 'destructive',
      });
      setPromoteLoading(false);
      return;
    }

    const { error: upsertError } = await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: profile.user_id,
          role: 'admin',
          is_active: true,
        },
        { onConflict: 'user_id,role' }
      );

    if (upsertError) {
      toast({
        title: 'Could not promote user',
        description: upsertError.message,
        variant: 'destructive',
      });
      setPromoteLoading(false);
      return;
    }

    // Give a safe default: all current permissions
    const { error: permsError } = await supabase
      .from('user_permissions')
      .insert(APP_PERMISSIONS.map((p) => ({ user_id: profile.user_id, permission: p.value })))
      .select();

    // Ignore duplicate insert errors (supabase returns errors for duplicates depending on settings)
    if (permsError && !String(permsError.message).toLowerCase().includes('duplicate')) {
      toast({
        title: 'Admin promoted but permissions not fully applied',
        description: permsError.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'User promoted to admin' });
    }

    setPromoteEmail('');
    setPromoteLoading(false);
    fetchAdmins();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  if (!hasPermission('manage_admins')) {
    return (
      <AdminLayout>
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold mb-2">Admin Users</h1>
          <p className="text-muted-foreground">You don&apos;t have permission to manage admin users.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Admin Users</h1>
        <p className="text-muted-foreground">
          Manage admin access, permissions, and activation status (design intentionally different from any third-party UI).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus2 className="h-5 w-5" />
              <CardTitle>Promote to admin</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="promoteEmail">User email</Label>
            <Input
              id="promoteEmail"
              placeholder="someone@example.com"
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={promoteToAdmin}
              disabled={promoteLoading || !promoteEmail.trim()}
            >
              {promoteLoading ? 'Promoting…' : 'Promote'}
            </Button>
            <p className="text-xs text-muted-foreground">
              This promotes an existing user (found by email stored in profiles) and grants a default permission set.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin directory
                </CardTitle>
                <p className="text-sm text-muted-foreground">Search, filter, and edit permissions</p>
              </div>
              <Button variant="outline" onClick={fetchAdmins}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminSearch">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminSearch"
                    placeholder="Name, email, phone…"
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter by permission</Label>
                <Select value={permissionFilter} onValueChange={setPermissionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All permissions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All permissions</SelectItem>
                    {APP_PERMISSIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="statusActive"
                  checked={statusFilter.active}
                  onCheckedChange={(v) => setStatusFilter((s) => ({ ...s, active: Boolean(v) }))}
                />
                <Label htmlFor="statusActive" className="cursor-pointer">
                  Active
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="statusInactive"
                  checked={statusFilter.inactive}
                  onCheckedChange={(v) => setStatusFilter((s) => ({ ...s, inactive: Boolean(v) }))}
                />
                <Label htmlFor="statusInactive" className="cursor-pointer">
                  Inactive
                </Label>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{filteredAdmins.length}</span> of {admins.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.user_id}>
                    <TableCell className="font-medium">
                      {admin.full_name || <span className="text-muted-foreground">(no name)</span>}
                    </TableCell>
                    <TableCell>{admin.email ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {admin.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(admin.permissions ?? []).slice(0, 2).map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {permissionLabel(p)}
                          </Badge>
                        ))}
                        {(admin.permissions ?? []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(admin.permissions ?? []).length - 2}
                          </Badge>
                        )}
                        {(admin.permissions ?? []).length === 0 && (
                          <span className="text-sm text-muted-foreground">No permissions set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openPermissions(admin)}>
                        Permissions
                      </Button>
                      <Button
                        size="sm"
                        variant={admin.is_active ? 'destructive' : 'default'}
                        onClick={() => toggleAdminStatus(admin)}
                      >
                        {admin.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredAdmins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      No admins match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit permissions{editingAdmin?.full_name ? ` — ${editingAdmin.full_name}` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            {APP_PERMISSIONS.map((perm) => {
              const checked = selectedPerms.has(perm.value);
              return (
                <label
                  key={perm.value}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const next = new Set(selectedPerms);
                      if (v) next.add(perm.value);
                      else next.delete(perm.value);
                      setSelectedPerms(next);
                    }}
                  />
                  <div className="space-y-1">
                    <div className="font-medium leading-none">{perm.label}</div>
                    <div className="text-sm text-muted-foreground">{perm.description}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogOpen(false)} disabled={savingPerms}>
              Cancel
            </Button>
            <Button onClick={savePermissions} disabled={savingPerms}>
              {savingPerms ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
