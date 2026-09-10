import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useSettingsStore } from '../store/useSettingsStore';

export const useCredits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const byokKey = useSettingsStore((s) => s.byokKey);
  const key = ['credits', user?.id];

  const { data, isLoading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase
        .from('user_credits')
        .select('credits_balance')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.credits_balance ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const balance = data ?? 0;
  const setBalance = (value: number | null | undefined) => {
    if (typeof value === 'number') queryClient.setQueryData(key, value);
  };

  return {
    balance,
    isLoading,
    byok: Boolean(byokKey),
    canAfford: (credits: number) => Boolean(byokKey) || balance >= credits,
    setBalance,
    refresh: refetch,
  };
};
