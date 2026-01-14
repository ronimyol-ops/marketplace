import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  search_query: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  division: string | null;
  district: string | null;
  min_price: number | null;
  max_price: number | null;
  condition: string | null;
  alerts_enabled: boolean;
  last_checked_at: string | null;
  new_results_count: number;
  created_at: string;
}

export interface SearchCriteria {
  query?: string;
  categoryId?: string;
  subcategoryId?: string;
  division?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
}

export function useSavedSearches() {
  const { user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    } else {
      setSavedSearches([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchSavedSearches = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved searches:', error);
    } else {
      setSavedSearches(data || []);
    }
    setIsLoading(false);
  };

  const saveSearch = async (name: string, criteria: SearchCriteria) => {
    if (!user) {
      toast.error('Please login to save searches');
      return false;
    }

    const { error } = await supabase.from('saved_searches').insert({
      user_id: user.id,
      name,
      search_query: criteria.query || null,
      category_id: criteria.categoryId || null,
      subcategory_id: criteria.subcategoryId || null,
      division: criteria.division || null,
      district: criteria.district || null,
      min_price: criteria.minPrice || null,
      max_price: criteria.maxPrice || null,
      condition: criteria.condition || null,
    });

    if (error) {
      toast.error('Could not save search. Please try again.');
      return false;
    }

    toast.success('Search saved successfully.');
    fetchSavedSearches();
    return true;
  };

  const deleteSearch = async (id: string) => {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Could not delete search. Please try again.');
      return false;
    }

    toast.success('Search deleted');
    setSavedSearches(prev => prev.filter(s => s.id !== id));
    return true;
  };

  const toggleAlerts = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from('saved_searches')
      .update({ alerts_enabled: enabled })
      .eq('id', id);

    if (error) {
      toast.error('Could not update alerts. Please try again.');
      return false;
    }

    toast.success(enabled ? 'Alerts enabled' : 'Alerts disabled');
    setSavedSearches(prev => 
      prev.map(s => s.id === id ? { ...s, alerts_enabled: enabled } : s)
    );
    return true;
  };

  const markAsChecked = async (id: string) => {
    await supabase
      .from('saved_searches')
      .update({ 
        last_checked_at: new Date().toISOString(),
        new_results_count: 0
      })
      .eq('id', id);

    setSavedSearches(prev => 
      prev.map(s => s.id === id ? { ...s, new_results_count: 0, last_checked_at: new Date().toISOString() } : s)
    );
  };

  return {
    savedSearches,
    isLoading,
    saveSearch,
    deleteSearch,
    toggleAlerts,
    markAsChecked,
    refetch: fetchSavedSearches,
  };
}
