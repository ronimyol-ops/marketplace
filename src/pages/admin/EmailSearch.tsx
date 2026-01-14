import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, RefreshCcw, Search, CheckCircle2, XCircle, Send } from 'lucide-react';

type AdminOption = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type EmailEvent = {
  id: string;
  email_id: string;
  actor_id: string | null;
  event_type: string;
  created_at: string;
};

type EmailItem = {
  id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  template: string | null;
  body_preview: string | null;
  current_state: string;
  created_at: string;
  email_events?: EmailEvent[];
};

type EmailStateFilter = {
  approved: boolean;
  enqueued: boolean;
  rejected: boolean;
};

type EventType = 'all' | 'created' | 'approved' | 'rejected' | 'sent';

export default function EmailSearch() {
  const { user, isAdmin, hasPermission } = useAuth();
  const { toast } = useToast();

  const [admins, setAdmins] = useState<AdminOption[]>([]);

  const [query, setQuery] = useState('');
  const [states, setStates] = useState<EmailStateFilter>({ approved: true, enqueued: true, rejected: true });
  const [eventType, setEventType] = useState<EventType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [adminUserId, setAdminUserId] = useState<string>('all');

  const [results, setResults] = useState<EmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);


const [actionLoading, setActionLoading] = useState(false);
const [rejectMode, setRejectMode] = useState(false);
const [rejectNote, setRejectNote] = useState('');

// Admin helper: log an email item so you can test search & event history.
const [newRecipientEmail, setNewRecipientEmail] = useState('');
const [newRecipientPhone, setNewRecipientPhone] = useState('');
const [newSubject, setNewSubject] = useState('');
const [newTemplate, setNewTemplate] = useState('');
const [newBodyPreview, setNewBodyPreview] = useState('');
const [createLoading, setCreateLoading] = useState(false);

  const selectedStates = useMemo(() => {
    const s: string[] = [];
    if (states.approved) s.push('approved');
    if (states.enqueued) s.push('enqueued');
    if (states.rejected) s.push('rejected');
    return s;
  }, [states]);

  const loadAdmins = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .eq('is_active', true);

    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      setAdmins([]);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id,full_name,email')
      .in('user_id', ids);

    const options: AdminOption[] = (profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email ?? null,
    }));

    options.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
    setAdmins(options);
  };

  useEffect(() => {
    if (isAdmin && hasPermission('search_emails')) {
      loadAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const runSearch = async () => {
    setIsLoading(true);

    const q = query.trim();

    // 1) Filter by events first (event type / date range / admin actor)
    const hasEventFilters = eventType !== 'all' || !!dateFrom || !!dateTo || adminUserId !== 'all';
    let emailIdsByEvent: string[] | null = null;

    if (hasEventFilters) {
      let evQuery = supabase.from('email_events').select('email_id');

      if (eventType !== 'all') {
        evQuery = evQuery.eq('event_type', eventType);
      }

      if (adminUserId !== 'all') {
        evQuery = evQuery.eq('actor_id', adminUserId);
      }

      if (dateFrom) {
        evQuery = evQuery.gte('created_at', new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        evQuery = evQuery.lte('created_at', end.toISOString());
      }

      const { data: ev, error: evError } = await evQuery.limit(2000);

      if (evError) {
        toast({ title: 'Could not apply event filters', description: evError.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      emailIdsByEvent = Array.from(new Set((ev ?? []).map((r: any) => r.email_id)));
      if (emailIdsByEvent.length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }
    }

    // 2) Main email items query
    let itemsQuery = supabase
      .from('email_items')
      .select('id,recipient_email,recipient_phone,subject,template,body_preview,current_state,created_at,email_events(id,email_id,actor_id,event_type,created_at)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (selectedStates.length > 0 && selectedStates.length < 3) {
      itemsQuery = itemsQuery.in('current_state', selectedStates);
    }

    if (emailIdsByEvent && emailIdsByEvent.length > 0) {
      itemsQuery = itemsQuery.in('id', emailIdsByEvent);
    }

    if (q) {
      itemsQuery = itemsQuery.or(`recipient_email.ilike.%${q}%,recipient_phone.ilike.%${q}%`);
    }

    const { data, error } = await itemsQuery;

    if (error) {
      toast({ title: 'Search failed', description: error.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    setResults((data ?? []) as any);
    setIsLoading(false);
  };

  const openDetails = (item: EmailItem) => {
    setSelectedEmail(item);
    setRejectMode(false);
    setRejectNote('');
    setDetailsOpen(true);
  };


const refreshSelectedEmail = async (emailId: string) => {
  const { data, error } = await supabase
    .from('email_items')
    .select(
      'id,recipient_email,recipient_phone,subject,template,body_preview,current_state,created_at,email_events(id,email_id,actor_id,event_type,created_at)',
    )
    .eq('id', emailId)
    .maybeSingle();

  if (error) throw error;
  setSelectedEmail((data ?? null) as any);
};

const logEmailItem = async () => {
  const recipientEmail = newRecipientEmail.trim() || null;
  const recipientPhone = newRecipientPhone.trim() || null;

  if (!recipientEmail && !recipientPhone) {
    toast({ title: 'Recipient required', description: 'Provide an email or phone number.', variant: 'destructive' });
    return;
  }

  if (!newSubject.trim()) {
    toast({ title: 'Subject required', description: 'Please enter a subject.', variant: 'destructive' });
    return;
  }

  setCreateLoading(true);
  try {
    const { data: created, error } = await supabase
      .from('email_items')
      .insert({
        recipient_email: recipientEmail,
        recipient_phone: recipientPhone,
        subject: newSubject.trim(),
        template: newTemplate.trim() || null,
        body_preview: newBodyPreview.trim() || null,
        current_state: 'enqueued',
      })
      .select('id')
      .single();

    if (error || !created) throw error;

    await supabase.from('email_events').insert({
      email_id: created.id,
      actor_id: user?.id ?? null,
      event_type: 'created',
      metadata: { source: 'admin_ui' },
    });

    toast({ title: 'Email item logged', description: 'A new email item was created in state: enqueued.' });

    // reset form
    setNewRecipientEmail('');
    setNewRecipientPhone('');
    setNewSubject('');
    setNewTemplate('');
    setNewBodyPreview('');

    await runSearch();
  } catch (e: any) {
    toast({ title: 'Failed to log email item', description: e?.message ?? 'Unknown error', variant: 'destructive' });
  } finally {
    setCreateLoading(false);
  }
};

const applyEmailAction = async (emailId: string, action: 'approve' | 'reject' | 'sent', note?: string) => {
  setActionLoading(true);
  try {
    if (action === 'approve') {
      const { error } = await supabase.from('email_items').update({ current_state: 'approved' }).eq('id', emailId);
      if (error) throw error;

      const { error: evError } = await supabase.from('email_events').insert({
        email_id: emailId,
        actor_id: user?.id ?? null,
        event_type: 'approved',
        metadata: null,
      });
      if (evError) throw evError;
    }

    if (action === 'reject') {
      const { error } = await supabase.from('email_items').update({ current_state: 'rejected' }).eq('id', emailId);
      if (error) throw error;

      const { error: evError } = await supabase.from('email_events').insert({
        email_id: emailId,
        actor_id: user?.id ?? null,
        event_type: 'rejected',
        metadata: note ? { note } : null,
      });
      if (evError) throw evError;
    }

    if (action === 'sent') {
      const { error: evError } = await supabase.from('email_events').insert({
        email_id: emailId,
        actor_id: user?.id ?? null,
        event_type: 'sent',
        metadata: null,
      });
      if (evError) throw evError;
    }

    toast({ title: 'Updated', description: 'Email item updated successfully.' });

    await runSearch();
    await refreshSelectedEmail(emailId);
    setRejectMode(false);
    setRejectNote('');
  } catch (e: any) {
    toast({ title: 'Action failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
  } finally {
    setActionLoading(false);
  }
};

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  if (!hasPermission('search_emails')) {
    return (
      <AdminLayout>
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold mb-2">Email Search</h1>
          <p className="text-muted-foreground">You don&apos;t have permission to search emails.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Email Search</h1>
        <p className="text-muted-foreground">
          Search and audit email items by state, event date, and admin actor (UI built from scratch).
        </p>
      </div>


<Card className="mb-6">
  <CardHeader className="pb-2">
    <CardTitle className="text-base">Log an email item</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="newRecipientEmail">Recipient email</Label>
        <Input
          id="newRecipientEmail"
          value={newRecipientEmail}
          onChange={(e) => setNewRecipientEmail(e.target.value)}
          placeholder="buyer@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newRecipientPhone">Recipient phone</Label>
        <Input
          id="newRecipientPhone"
          value={newRecipientPhone}
          onChange={(e) => setNewRecipientPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="newSubject">Subject</Label>
        <Input
          id="newSubject"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="Welcome to BazarBD"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newTemplate">Template (optional)</Label>
        <Input
          id="newTemplate"
          value={newTemplate}
          onChange={(e) => setNewTemplate(e.target.value)}
          placeholder="welcome_email"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="newBodyPreview">Body preview (optional)</Label>
        <Textarea
          id="newBodyPreview"
          value={newBodyPreview}
          onChange={(e) => setNewBodyPreview(e.target.value)}
          placeholder="This is a short preview stored for audit/search…"
          rows={3}
        />
      </div>
    </div>

    <div className="flex items-center gap-2">
      <Button onClick={logEmailItem} disabled={createLoading}>
        {createLoading ? 'Creating…' : 'Create email item'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Creates an <span className="font-mono">email_items</span> row + a <span className="font-mono">created</span> event so it appears in search.
      </p>
    </div>
  </CardContent>
</Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <Input
                id="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Email or phone…"
              />
            </div>

            <div className="space-y-2">
              <Label>Admin user</Label>
              <Select value={adminUserId} onValueChange={setAdminUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="All admins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All admins</SelectItem>
                  {admins.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {(a.full_name || a.email || a.user_id).toString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Current state</Label>
              <div className="flex flex-wrap gap-4">
                {([
                  { key: 'approved', label: 'Approved' },
                  { key: 'enqueued', label: 'Enqueued' },
                  { key: 'rejected', label: 'Rejected' },
                ] as const).map((s) => (
                  <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={(states as any)[s.key]}
                      onCheckedChange={(v) => setStates((prev) => ({ ...prev, [s.key]: Boolean(v) }))}
                    />
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Event type</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Event date range applies to the selected event type.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Event date</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">From</Label>
                  <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dateTo" className="text-xs text-muted-foreground">To</Label>
                  <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={runSearch} disabled={isLoading}>
              {isLoading ? 'Searching…' : 'Search'}
            </Button>
            <Button variant="outline" onClick={loadAdmins}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh admins
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setStates({ approved: true, enqueued: true, rejected: true });
                setEventType('all');
                setDateFrom('');
                setDateTo('');
                setAdminUserId('all');
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Last event</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((item) => {
                  const events = (item.email_events ?? []).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const last = events[0];
                  const recipient = item.recipient_email || item.recipient_phone || '—';

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{recipient}</TableCell>
                      <TableCell>{item.subject ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.current_state}</Badge>
                      </TableCell>
                      <TableCell>
                        {last ? (
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">{last.event_type}</div>
                            <div className="text-xs text-muted-foreground">{new Date(last.created_at).toLocaleString()}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openDetails(item)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email item details</DialogTitle>
          </DialogHeader>

          {selectedEmail ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Recipient email</div>
                  <div className="font-medium">{selectedEmail.recipient_email ?? '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Recipient phone</div>
                  <div className="font-medium">{selectedEmail.recipient_phone ?? '—'}</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">State</div>
                  <Badge variant="outline">{selectedEmail.current_state}</Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{new Date(selectedEmail.created_at).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Subject</div>
                <div className="font-medium">{selectedEmail.subject ?? '—'}</div>
              </div>

              {selectedEmail.template ? (
                <div>
                  <div className="text-sm text-muted-foreground">Template</div>
                  <div className="font-mono text-sm">{selectedEmail.template}</div>
                </div>
              ) : null}

              {selectedEmail.body_preview ? (
                <div>
                  <div className="text-sm text-muted-foreground">Preview</div>
                  <div className="rounded-lg border p-3 text-sm whitespace-pre-wrap">{selectedEmail.body_preview}</div>
                </div>
              ) : null}

{rejectMode ? (
  <div className="rounded-lg border p-3 space-y-2">
    <Label htmlFor="rejectNote">Rejection note (optional)</Label>
    <Textarea
      id="rejectNote"
      value={rejectNote}
      onChange={(e) => setRejectNote(e.target.value)}
      placeholder="Why was this email rejected?"
      rows={3}
    />
  </div>
) : null}


              <div>
                <div className="text-sm font-medium mb-2">Event history</div>
                <div className="space-y-2">
                  {(selectedEmail.email_events ?? [])
                    .slice()
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <div className="font-medium">{ev.event_type}</div>
                          <div className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</div>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {ev.actor_id ? ev.actor_id.slice(0, 8) + '…' : 'system'}
                        </div>
                      </div>
                    ))}

                  {(selectedEmail.email_events ?? []).length === 0 && (
                    <div className="text-sm text-muted-foreground">No events recorded.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            {selectedEmail ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => applyEmailAction(selectedEmail.id, 'sent')}
                  disabled={actionLoading}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Mark sent
                </Button>

                {selectedEmail.current_state !== 'approved' ? (
                  <Button
                    onClick={() => applyEmailAction(selectedEmail.id, 'approve')}
                    disabled={actionLoading}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                ) : null}

                {selectedEmail.current_state !== 'rejected' ? (
                  rejectMode ? (
                    <Button
                      variant="destructive"
                      onClick={() => applyEmailAction(selectedEmail.id, 'reject', rejectNote)}
                      disabled={actionLoading}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Confirm reject
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => setRejectMode(true)}
                      disabled={actionLoading}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  )
                ) : null}

                {rejectMode ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectMode(false);
                      setRejectNote('');
                    }}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                ) : null}

                <Button variant="outline" onClick={() => setDetailsOpen(false)} disabled={actionLoading}>
                  Close
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
