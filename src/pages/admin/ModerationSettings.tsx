import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Shield, Save } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface AutoModerationSettings {
  id: string;
  is_enabled: boolean;
  auto_approve_first_time_posters: boolean;
  require_phone_verification: boolean;
  min_description_length: number;
  blocked_keywords: string[] | null;
}

export default function ModerationSettings() {
  const { user, isAdmin, isLoading: authLoading, hasPermission } = useAuth();
  const canManage = !!isAdmin && hasPermission('manage_moderation_settings');
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AutoModerationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [blockedKeywordsInput, setBlockedKeywordsInput] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
      return;
    }
    if (canManage) {
      fetchSettings();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, authLoading, canManage]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('auto_moderation_settings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Could not load moderation settings. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      let row = data?.[0] as AutoModerationSettings | undefined;

      if (!row) {
        const { data: inserted, error: insertError } = await supabase
          .from('auto_moderation_settings')
          .insert({})
          .select('*')
          .single();

        if (insertError || !inserted) {
          console.error(insertError);
          toast({
            title: 'Error',
            description: 'Could not initialize moderation settings. Please try again.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        row = inserted as AutoModerationSettings;
      }

      setSettings(row);
      setBlockedKeywordsInput((row.blocked_keywords || []).join(', '));
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Could not load moderation settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const blockedKeywords = blockedKeywordsInput
        .split(',')
        .map((kw) => kw.trim())
        .filter((kw) => kw.length > 0);

      const { error } = await supabase
        .from('auto_moderation_settings')
        .update({
          is_enabled: settings.is_enabled,
          auto_approve_first_time_posters: settings.auto_approve_first_time_posters,
          require_phone_verification: settings.require_phone_verification,
          min_description_length: settings.min_description_length,
          blocked_keywords: blockedKeywords,
        })
        .eq('id', settings.id);

      if (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Could not save moderation settings. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Settings saved',
        description: 'System moderation rules updated successfully.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Could not save moderation settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  if (isAdmin && !canManage) {
    return (
      <AdminLayout>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Moderation settings</h1>
          <p className="text-sm text-muted-foreground">You don't have permission to manage moderation settings.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Moderation</h1>
          <p className="text-muted-foreground">
            Configure how the system automatically reviews and approves ads for the Bangladesh marketplace.
          </p>
        </div>
      </div>

      {isLoading || !settings ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Core rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="font-medium">Enable system moderation</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the system can auto-approve safe ads and send them to the verification queue.
                  </p>
                </div>
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => (prev ? { ...prev, is_enabled: checked } : prev))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="font-medium">Require phone verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Only auto-approve ads from members with a verified Bangladeshi phone number.
                  </p>
                </div>
                <Switch
                  checked={settings.require_phone_verification}
                  onCheckedChange={(checked) =>
                    setSettings((prev) =>
                      prev ? { ...prev, require_phone_verification: checked } : prev
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="font-medium">Auto-approve first-time posters</Label>
                  <p className="text-sm text-muted-foreground">
                    If safe, first ads from new members can be auto-approved and then verified by a moderator.
                  </p>
                </div>
                <Switch
                  checked={settings.auto_approve_first_time_posters}
                  onCheckedChange={(checked) =>
                    setSettings((prev) =>
                      prev ? { ...prev, auto_approve_first_time_posters: checked } : prev
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-description">Minimum description length</Label>
                <Input
                  id="min-description"
                  type="number"
                  min={0}
                  value={settings.min_description_length}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            min_description_length: Number.isNaN(value) ? 0 : value,
                          }
                        : prev
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Ads with descriptions shorter than this will not be auto-approved by the system.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blocked keywords</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blocked-keywords">Words & phrases</Label>
                <Textarea
                  id="blocked-keywords"
                  rows={6}
                  value={blockedKeywordsInput}
                  onChange={(e) => setBlockedKeywordsInput(e.target.value)}
                  placeholder="Example: scam, casino, betting, জুয়া, অবৈধ"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of English and Bangla words. If any of these appear in the title or
                  description, the system will not auto-approve that ad.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
