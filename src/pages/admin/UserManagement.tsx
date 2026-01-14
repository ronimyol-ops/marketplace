import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { downloadCsv, type CsvColumn } from '@/lib/csv';
import { Ban, CheckCircle2, Download, Loader2, MoreHorizontal, Search, Trash2, Undo2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ADMIN_USER_SORT_OPTIONS, ADMIN_USER_STATUS_OPTIONS } from '@/constants/adminFeatureParity';

type VerificationStatus = 'verified' | 'verification_unsuccessful' | 'pending_verification' | null;

interface UserProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  phone_verified?: boolean | null;
  is_blocked?: boolean | null;
  verification_status?: VerificationStatus;
  is_deleted?: boolean | null;
  status_changed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const isLikelyPhoneQuery = (value: string) => {
  const v = value.trim();
  if (!v) return false;
  // Allow +, spaces and hyphens; require at least 7 digits.
  const digits = v.replace(/\D/g, '');
  return digits.length >= 7 && /^[+\d\s-]+$/.test(v);
};

const toStatusLabel = (p: UserProfileRow) => {
  if (p.is_deleted) return 'Deleted';
  if (p.is_blocked) return 'Blacklisted';
  switch (p.verification_status) {
    case 'verified':
      return 'Verified';
    case 'verification_unsuccessful':
      return 'Verification Unsuccessful';
    case 'pending_verification':
      return 'Pending Verification';
    default:
      return p.phone_verified ? 'Phone Verified' : '—';
  }
};

const toStatusBadgeVariant = (label: string) => {
  switch (label) {
    case 'Verified':
      return 'default' as const;
    case 'Pending Verification':
      return 'secondary' as const;
    case 'Verification Unsuccessful':
      return 'destructive' as const;
    case 'Blacklisted':
      return 'destructive' as const;
    case 'Deleted':
      return 'outline' as const;
    case 'Phone Verified':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
};

export default function UserManagement() {
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<string>('FindAccountSort_LOGIN_EMAIL');
  const [phoneStatus, setPhoneStatus] = useState<{ verified: boolean; unverified: boolean }>({
    verified: false,
    unverified: false,
  });

  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [rows, setRows] = useState<UserProfileRow[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCount = selectedIds.size;
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.user_id));

  const canView = hasPermission('manage_users');

  const statusKeys = useMemo(() => {
    const base = ADMIN_USER_STATUS_OPTIONS.map((s) => s.value);
    return [...base, 'inactive'];
  }, []);

  useEffect(() => {
    // Initialize state map once.
    setSelectedStatus((prev) => {
      if (Object.keys(prev).length) return prev;
      const init: Record<string, boolean> = {};
      statusKeys.forEach((k) => (init[k] = false));
      return init;
    });
  }, [statusKeys]);

  const phoneQuery = isLikelyPhoneQuery(search);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        rows.forEach((r) => next.add(r.user_id));
      } else {
        rows.forEach((r) => next.delete(r.user_id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const buildStatusOrFilter = () => {
    const active = Object.entries(selectedStatus)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (active.length === 0) return '';

    const parts: string[] = [];
    for (const key of active) {
      switch (key) {
        case 'AccountFlags_VERIFIED':
          parts.push('verification_status.eq.verified');
          break;
        case 'AccountFlags_UNVERIFIED':
          parts.push('verification_status.eq.verification_unsuccessful');
          break;
        case 'AccountFlags_ENQUEUED_VERIFICATION':
          parts.push('verification_status.eq.pending_verification');
          break;
        case 'AccountFlags_BLACKLISTED':
          parts.push('is_blocked.is.true');
          break;
        case 'inactive':
          parts.push('is_deleted.is.true');
          break;
        default:
          break;
      }
    }

    return parts.join(',');
  };

  const fetchUsers = async () => {
    if (!canView) return;

    setLoading(true);
    try {
      let q = supabase
        .from('profiles')
        .select(
          'user_id,full_name,email,phone_number,phone_verified,is_blocked,verification_status,is_deleted,status_changed_at,created_at,updated_at',
        ) as any;

      const searchValue = search.trim();
      if (searchValue) {
        if (searchValue.includes('@')) {
          q = q.ilike('email', `%${searchValue}%`);
        } else if (isLikelyPhoneQuery(searchValue)) {
          q = q.ilike('phone_number', `%${searchValue}%`);
        } else {
          // name/email/phone broad match
          q = q.or(
            `full_name.ilike.%${searchValue}%,email.ilike.%${searchValue}%,phone_number.ilike.%${searchValue}%`,
          );
        }
      }

      const statusOr = buildStatusOrFilter();
      if (statusOr) {
        q = q.or(statusOr);
      }

      // Phone status (only for phone-number queries)
      if (searchValue && isLikelyPhoneQuery(searchValue)) {
        const { verified, unverified } = phoneStatus;
        if (verified && !unverified) q = q.eq('phone_verified', true);
        if (!verified && unverified) q = q.eq('phone_verified', false);
      }

      if (sortBy === 'FindAccountSort_STATUS_CHANGE') {
        q = q.order('status_changed_at', { ascending: true });
      } else {
        q = q.order('email', { ascending: true });
      }

      q = q.limit(200);

      const { data, error } = await q;
      if (error) throw error;

      setRows((data ?? []) as UserProfileRow[]);
      // Keep selection limited to visible rows.
      setSelectedIds((prev) => {
        const visibleIds = new Set((data ?? []).map((r: any) => r.user_id));
        const next = new Set<string>();
        for (const id of prev) {
          if (visibleIds.has(id)) next.add(id);
        }
        return next;
      });
    } catch (e: any) {
      toast.error('Failed to load users', { description: e?.message ?? 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const applyProfilePatch = async (
    ids: string[],
    patch: Record<string, any>,
    opts?: { confirmText?: string; success?: string; error?: string },
  ) => {
    if (!ids.length) return;

    if (opts?.confirmText) {
      const ok = window.confirm(opts.confirmText);
      if (!ok) return;
    }

    setBulkLoading(true);
    try {
      const nextPatch = { ...patch };

      // Keep phone_verified_at consistent when toggling phone_verified.
      if (Object.prototype.hasOwnProperty.call(nextPatch, 'phone_verified')) {
        nextPatch.phone_verified_at = nextPatch.phone_verified ? new Date().toISOString() : null;
      }

      const { error } = await supabase.from('profiles').update(nextPatch).in('user_id', ids);
      if (error) throw error;

      toast.success(opts?.success ?? 'Updated');
      await fetchUsers();
      clearSelection();
    } catch (e: any) {
      toast.error(opts?.error ?? 'Update failed', { description: e?.message ?? 'Unknown error' });
    } finally {
      setBulkLoading(false);
    }
  };

  const exportCsv = () => {
    if (!rows.length) return;

    const columns: CsvColumn<UserProfileRow>[] = [
      { key: 'user_id', label: 'User ID' },
      { key: 'full_name', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone_number', label: 'Phone' },
      { key: 'phone_verified', label: 'Phone Verified' },
      { key: 'verification_status', label: 'Verification Status' },
      { key: 'is_blocked', label: 'Blacklisted' },
      { key: 'is_deleted', label: 'Deleted' },
      { key: 'status_changed_at', label: 'Status Changed At' },
      { key: 'created_at', label: 'Created At' },
      { key: 'updated_at', label: 'Updated At' },
      {
        key: 'status_label',
        label: 'Status Label',
        value: (p) => toStatusLabel(p),
      },
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`users-export-${stamp}.csv`, rows, columns);
  };

  if (!canView) {
    return (
      <AdminLayout>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Site users</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </AdminLayout>
    );
  }

  const bulkIds = Array.from(selectedIds);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Site users</h1>
            <p className="text-sm text-muted-foreground">Search and manage users (Bikroy-style parity).</p>
          </div>
          <Button onClick={fetchUsers} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Search for users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-3">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="eg. email, phone number" />
              <Button variant="secondary" onClick={fetchUsers} disabled={loading}>
                Apply
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="text-sm font-medium">Filter by status</div>
                <div className="space-y-2">
                  {ADMIN_USER_STATUS_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={opt.value}
                        checked={!!selectedStatus[opt.value]}
                        onCheckedChange={(v) => setSelectedStatus((s) => ({ ...s, [opt.value]: Boolean(v) }))}
                      />
                      <Label htmlFor={opt.value}>{opt.label}</Label>
                    </div>
                  ))}

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="inactive"
                      checked={!!selectedStatus['inactive']}
                      onCheckedChange={(v) => setSelectedStatus((s) => ({ ...s, inactive: Boolean(v) }))}
                    />
                    <Label htmlFor="inactive">Deleted</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Sort order</div>
                <RadioGroup value={sortBy} onValueChange={setSortBy} className="space-y-2">
                  {ADMIN_USER_SORT_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={opt.value} />
                      <Label htmlFor={opt.value}>{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Phone status</div>
                <p className="text-xs text-muted-foreground">(only for phone number queries)</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="phone-verified"
                      checked={phoneStatus.verified}
                      disabled={!phoneQuery}
                      onCheckedChange={(v) => setPhoneStatus((s) => ({ ...s, verified: Boolean(v) }))}
                    />
                    <Label htmlFor="phone-verified" className={!phoneQuery ? 'text-muted-foreground' : ''}>
                      Verified
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="phone-unverified"
                      checked={phoneStatus.unverified}
                      disabled={!phoneQuery}
                      onCheckedChange={(v) => setPhoneStatus((s) => ({ ...s, unverified: Boolean(v) }))}
                    />
                    <Label htmlFor="phone-unverified" className={!phoneQuery ? 'text-muted-foreground' : ''}>
                      Unverified
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Results</CardTitle>

            <div className="flex items-center gap-2">
              {rows.length > 0 ? (
                <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              ) : null}

              <span className="text-xs text-muted-foreground">
                {selectedCount ? `${selectedCount} selected` : 'Select users to manage'}
              </span>

              {selectedCount ? (
                <>
                  <Button size="sm" variant="outline" onClick={clearSelection} disabled={bulkLoading}>
                    Clear
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="secondary" className="gap-2" disabled={bulkLoading}>
                        <MoreHorizontal className="h-4 w-4" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(bulkIds, { is_blocked: true }, { success: 'Users blacklisted' });
                        }}
                        className="gap-2"
                      >
                        <Ban className="h-4 w-4" />
                        Blacklist
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(bulkIds, { is_blocked: false }, { success: 'Users un-blacklisted' });
                        }}
                        className="gap-2"
                      >
                        <Undo2 className="h-4 w-4" />
                        Remove blacklist
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(bulkIds, { phone_verified: true }, { success: 'Phone marked as verified' });
                        }}
                        className="gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark phone verified
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(bulkIds, { phone_verified: false }, { success: 'Phone marked as unverified' });
                        }}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Mark phone unverified
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(
                            bulkIds,
                            { verification_status: 'verified' },
                            { success: 'Verification status set: verified' },
                          );
                        }}
                        className="gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Set: Verified
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(
                            bulkIds,
                            { verification_status: 'verification_unsuccessful' },
                            { success: 'Verification status set: verification unsuccessful' },
                          );
                        }}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Set: Verification unsuccessful
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(
                            bulkIds,
                            { verification_status: 'pending_verification' },
                            { success: 'Verification status set: pending verification' },
                          );
                        }}
                        className="gap-2"
                      >
                        <Loader2 className="h-4 w-4" />
                        Set: Pending verification
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(bulkIds, { verification_status: null }, { success: 'Verification status cleared' });
                        }}
                        className="gap-2"
                      >
                        <Undo2 className="h-4 w-4" />
                        Clear verification status
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(bulkIds, { is_deleted: true }, { confirmText: 'Mark selected users as deleted?', success: 'Users deleted' });
                        }}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          applyProfilePatch(bulkIds, { is_deleted: false }, { success: 'Users restored' });
                        }}
                        className="gap-2"
                      >
                        <Undo2 className="h-4 w-4" />
                        Restore
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox checked={allVisibleSelected} onCheckedChange={(v) => toggleSelectAllVisible(v === true)} />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((p) => {
                      const statusLabel = toStatusLabel(p);
                      const rowId = p.user_id;

                      return (
                        <TableRow key={rowId}>
                          <TableCell className="w-[40px]">
                            <Checkbox checked={selectedIds.has(rowId)} onCheckedChange={() => toggleSelected(rowId)} />
                          </TableCell>
                          <TableCell className="font-medium">{p.full_name ?? '—'}</TableCell>
                          <TableCell>{p.email ?? '—'}</TableCell>
                          <TableCell>{p.phone_number ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={toStatusBadgeVariant(statusLabel)}>{statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-2">
                              <Button asChild variant="outline" size="sm">
                                <Link to={`/admin/users/${rowId}`}>Edit</Link>
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0" disabled={bulkLoading}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/admin/users/${rowId}`}>Open details</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      applyProfilePatch([rowId], { is_blocked: true }, { success: 'User blacklisted' });
                                    }}
                                    className="gap-2"
                                  >
                                    <Ban className="h-4 w-4" />
                                    Blacklist
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      applyProfilePatch([rowId], { is_blocked: false }, { success: 'Blacklist removed' });
                                    }}
                                    className="gap-2"
                                  >
                                    <Undo2 className="h-4 w-4" />
                                    Remove blacklist
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      applyProfilePatch([rowId], { phone_verified: true }, { success: 'Phone verified' });
                                    }}
                                    className="gap-2"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Mark phone verified
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      applyProfilePatch([rowId], { phone_verified: false }, { success: 'Phone unverified' });
                                    }}
                                    className="gap-2"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Mark phone unverified
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      applyProfilePatch([rowId], { is_deleted: true }, { confirmText: 'Mark this user as deleted?', success: 'User deleted' });
                                    }}
                                    className="gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      applyProfilePatch([rowId], { is_deleted: false }, { success: 'User restored' });
                                    }}
                                    className="gap-2"
                                  >
                                    <Undo2 className="h-4 w-4" />
                                    Restore
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
