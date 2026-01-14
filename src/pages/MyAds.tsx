import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AccountShell } from '@/components/account/AccountShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/constants';
import { formatDistanceToNow, isPast } from 'date-fns';
import { MapPin, Clock, Plus, Edit, Trash2, Eye, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { PromotionBadges, AdExpiryInfo } from '@/components/ads/PromotionBadges';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Ad {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  status: string;
  rejection_message: string | null;
  division: string;
  district: string;
  created_at: string;
  expires_at: string | null;
  renewed_at: string | null;
  promotion_type: 'featured' | 'top' | 'urgent' | null;
  promotion_expires_at: string | null;
  ad_images: { image_url: string }[];
}

export default function MyAds() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAds();
    }
  }, [user]);

  const fetchAds = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('ads')
      .select('*, ad_images(image_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setAds(data as Ad[] || []);
    setIsLoading(false);
  };

  const deleteAd = async (adId: string) => {
    const { error } = await supabase.from('ads').delete().eq('id', adId);
    
    if (error) {
      toast.error('Could not delete ad. Please try again.');
    } else {
      toast.success('Ad deleted successfully.');
      fetchAds();
    }
  };

  const markAsSold = async (adId: string) => {
    const { error } = await supabase
      .from('ads')
      .update({ status: 'sold' })
      .eq('id', adId);
    
    if (error) {
      toast.error('Could not update ad. Please try again.');
    } else {
      toast.success('Ad marked as sold');
      fetchAds();
    }
  };

  const renewAd = async (adId: string) => {
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
    
    const { error } = await supabase
      .from('ads')
      .update({ 
        expires_at: newExpiresAt.toISOString(),
        renewed_at: new Date().toISOString(),
      })
      .eq('id', adId);
    
    if (error) {
      toast.error('Could not renew ad. Please try again.');
    } else {
      toast.success('Ad renewed for 30 days!');
      fetchAds();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      sold: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'} className="capitalize">{status}</Badge>;
  };

  const filterAdsByStatus = (status: string | null) => {
    if (!status) return ads;
    if (status === 'expired') {
      return ads.filter(ad => ad.expires_at && isPast(new Date(ad.expires_at)) && ad.status === 'approved');
    }
    return ads.filter(ad => ad.status === status);
  };

  const expiredCount = ads.filter(ad => ad.expires_at && isPast(new Date(ad.expires_at)) && ad.status === 'approved').length;

  const AdList = ({ status }: { status: string | null }) => {
    const filteredAds = filterAdsByStatus(status);
    
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      );
    }

    if (filteredAds.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">You haven't posted any ads yet.</p>
          <Link to="/post-ad">
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Post an Ad
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredAds.map((ad) => (
          <Card key={ad.id}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={ad.ad_images?.[0]?.image_url || '/placeholder.svg'}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold truncate">{ad.title}</h3>
                    {getStatusBadge(ad.status)}
                  </div>
                  <p className="text-lg font-bold text-primary mt-1">
                    {formatPrice(ad.price, ad.price_type)}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ad.district}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {ad.status === 'rejected' && ad.rejection_message && (
                    <div className="mt-2 flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{ad.rejection_message}</span>
                    </div>
                  )}

                  {/* Promotion badges */}
                  {ad.promotion_type && (
                    <div className="mt-2">
                      <PromotionBadges 
                        promotionType={ad.promotion_type} 
                        promotionExpiresAt={ad.promotion_expires_at}
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Expiry info */}
                  {ad.expires_at && ad.status === 'approved' && (
                    <div className="mt-2">
                      <AdExpiryInfo 
                        expiresAt={ad.expires_at}
                        renewedAt={ad.renewed_at}
                        onRenew={() => renewAd(ad.id)}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Link to={`/ad/${ad.slug}-${ad.id}`}>
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                  </Link>
                  {(ad.status === 'approved' || ad.status === 'pending') && (
                    <Link to={`/my-ads/edit/${ad.id}`}>
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  {ad.status === 'approved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsSold(ad.id)}
                    >
                      Mark Sold
                    </Button>
                  )}
                  {ad.status === 'approved' && ad.expires_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => renewAd(ad.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Renew
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1">
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this ad?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your ad.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAd(ad.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  return (
    <AccountShell
      title="My ads"
      description="Manage, renew, and promote your listings"
      actions={
        <Link to="/post-ad">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Post new
          </Button>
        </Link>
      }
    >
      <Tabs defaultValue="all">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All ({ads.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({filterAdsByStatus('pending').length})</TabsTrigger>
            <TabsTrigger value="approved">Active ({filterAdsByStatus('approved').length - expiredCount})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({expiredCount})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({filterAdsByStatus('rejected').length})</TabsTrigger>
            <TabsTrigger value="sold">Sold ({filterAdsByStatus('sold').length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <AdList status={null} />
          </TabsContent>
          <TabsContent value="pending" className="mt-6">
            <AdList status="pending" />
          </TabsContent>
          <TabsContent value="approved" className="mt-6">
            <AdList status="approved" />
          </TabsContent>
          <TabsContent value="expired" className="mt-6">
            <AdList status="expired" />
          </TabsContent>
          <TabsContent value="rejected" className="mt-6">
            <AdList status="rejected" />
          </TabsContent>
          <TabsContent value="sold" className="mt-6">
            <AdList status="sold" />
          </TabsContent>
      </Tabs>
    </AccountShell>
  );
}
