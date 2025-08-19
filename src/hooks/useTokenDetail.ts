
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Token } from './useTokens';

export const useTokenDetail = (identifier: string | undefined) => {
  return useQuery({
    queryKey: ['token', identifier],
    queryFn: async (): Promise<Token | null> => {
      if (!identifier) return null;

      let query = supabase.from('tokens').select('*');
      
      // Check if identifier is a UUID (token ID) or mint address/symbol
      if (identifier.includes('-') && identifier.length === 36) {
        // Likely a UUID
        query = query.eq('id', identifier);
      } else {
        // Check by mint_address, symbol, or name
        query = query.or(`mint_address.eq.${identifier},symbol.ilike.${identifier},name.ilike.%${identifier}%`);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!identifier,
  });
};
