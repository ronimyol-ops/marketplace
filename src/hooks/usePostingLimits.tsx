import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PostingLimit {
  max_free_ads_per_month: number;
  cooldown_minutes: number;
  requires_approval: boolean;
  requires_payment: boolean;
}

interface UserAdCount {
  ad_count: number;
  last_posted_at: string | null;
}

export function usePostingLimits(categoryId: string | null) {
  const { user } = useAuth();
  const [limit, setLimit] = useState<PostingLimit | null>(null);
  const [userCount, setUserCount] = useState<UserAdCount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canPost, setCanPost] = useState(true);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId || !user) {
      setIsLoading(false);
      return;
    }

    fetchLimits();
  }, [categoryId, user]);

  const fetchLimits = async () => {
    if (!categoryId || !user) return;

    setIsLoading(true);
    const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [limitRes, countRes] = await Promise.all([
      supabase
        .from('ad_posting_limits')
        .select('*')
        .eq('category_id', categoryId)
        .single(),
      supabase
        .from('user_ad_counts')
        .select('*')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .eq('month_year', monthYear)
        .single(),
    ]);

    const fetchedLimit = limitRes.data as PostingLimit | null;
    const fetchedCount = countRes.data as UserAdCount | null;

    setLimit(fetchedLimit);
    setUserCount(fetchedCount);

    // Check if user can post
    let allowed = true;
    let blockReason: string | null = null;

    if (fetchedLimit) {
      // Check monthly limit
      if (fetchedCount && fetchedCount.ad_count >= fetchedLimit.max_free_ads_per_month) {
        allowed = false;
        blockReason = `You've reached the limit of ${fetchedLimit.max_free_ads_per_month} free ads this month for this category.`;
      }

      // Check cooldown
      if (fetchedCount?.last_posted_at) {
        const lastPosted = new Date(fetchedCount.last_posted_at);
        const cooldownEnd = new Date(lastPosted.getTime() + fetchedLimit.cooldown_minutes * 60 * 1000);
        if (new Date() < cooldownEnd) {
          const minutesLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / 60000);
          allowed = false;
          blockReason = `Please wait ${minutesLeft} minutes before posting another ad in this category.`;
        }
      }

      // Check if requires payment
      if (fetchedLimit.requires_payment) {
        blockReason = 'This category requires a paid posting. Upgrade to post here.';
        allowed = false;
      }
    }

    setCanPost(allowed);
    setReason(blockReason);
    setIsLoading(false);
  };

  const incrementCount = async () => {
    if (!categoryId || !user) return;

    const monthYear = new Date().toISOString().slice(0, 7);

    await supabase
      .from('user_ad_counts')
      .upsert({
        user_id: user.id,
        category_id: categoryId,
        month_year: monthYear,
        ad_count: (userCount?.ad_count || 0) + 1,
        last_posted_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,category_id,month_year',
      });
  };

  return {
    limit,
    userCount,
    isLoading,
    canPost,
    reason,
    requiresApproval: limit?.requires_approval || false,
    incrementCount,
  };
}
