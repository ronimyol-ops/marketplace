import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AccountShell } from '@/components/account/AccountShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { Bell, BellOff, Search, Trash2, ExternalLink, MapPin, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function SavedSearches() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { savedSearches, isLoading, deleteSearch, toggleAlerts, markAsChecked } = useSavedSearches();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const buildSearchUrl = (search: typeof savedSearches[0]) => {
    const params = new URLSearchParams();
    if (search.search_query) params.set('q', search.search_query);
    if (search.category_id) params.set('category', search.category_id);
    if (search.division) params.set('division', search.division);
    if (search.district) params.set('district', search.district);
    if (search.min_price) params.set('minPrice', search.min_price.toString());
    if (search.max_price) params.set('maxPrice', search.max_price.toString());
    if (search.condition) params.set('condition', search.condition);
    return `/search?${params.toString()}`;
  };

  const handleViewResults = (search: typeof savedSearches[0]) => {
    markAsChecked(search.id);
    navigate(buildSearchUrl(search));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AccountShell
      title="Saved searches"
      description="Get alerts for new matching ads"
      actions={
        <Link to="/search">
          <Button variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            New search
          </Button>
        </Link>
      }
    >
      <div className="max-w-3xl w-full mx-auto">
        {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : savedSearches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No saved searches</h2>
                <p className="text-muted-foreground mb-4">
                  Save a search to get notified when new ads are posted.
                </p>
                <Link to="/search">
                  <Button>Start searching</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {savedSearches.map((search) => (
                <Card key={search.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold truncate">{search.name}</h3>
                          {search.new_results_count > 0 && (
                            <Badge variant="default" className="shrink-0">
                              {search.new_results_count} new
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
                          {search.search_query && (
                            <span className="flex items-center gap-1">
                              <Search className="h-3 w-3" />
                              "{search.search_query}"
                            </span>
                          )}
                          {search.division && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {search.district ? `${search.district}, ` : ''}{search.division}
                            </span>
                          )}
                          {(search.min_price || search.max_price) && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              ৳{search.min_price || 0} - ৳{search.max_price || '∞'}
                            </span>
                          )}
                          {search.condition && (
                            <Badge variant="secondary" className="capitalize text-xs">
                              {search.condition}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Created {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
                          </span>
                          {search.last_checked_at && (
                            <span>
                              Last checked {formatDistanceToNow(new Date(search.last_checked_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 items-end shrink-0">
                        <div className="flex items-center gap-2">
                          {search.alerts_enabled ? (
                            <Bell className="h-4 w-4 text-primary" />
                          ) : (
                            <BellOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Switch
                            checked={search.alerts_enabled}
                            onCheckedChange={(checked) => toggleAlerts(search.id, checked)}
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewResults(search)}
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Delete this saved search?')) {
                                deleteSearch(search.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </AccountShell>
  );
}
