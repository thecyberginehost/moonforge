import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TradeActivity {
  user_wallet: string;
  token_id: string;
  activity_type: 'buy' | 'sell';
  amount_sol: number;
  token_amount: number;
  token_price: number;
  market_cap_at_time?: number;
  profit_loss?: number;
  profit_percentage?: number;
  time_since_launch_minutes?: number;
}

export const useTradingActivity = () => {
  const queryClient = useQueryClient();

  const recordActivity = useMutation({
    mutationFn: async (activity: TradeActivity) => {
      // Calculate time since launch if token data is available
      const { data: tokenData } = await supabase
        .from('tokens')
        .select('created_at, market_cap')
        .eq('id', activity.token_id)
        .single();

      if (tokenData) {
        const timeSinceLaunch = Date.now() - new Date(tokenData.created_at).getTime();
        activity.time_since_launch_minutes = Math.floor(timeSinceLaunch / (1000 * 60));
        activity.market_cap_at_time = tokenData.market_cap;
      }

      // Record the activity
      const { error } = await supabase
        .from('trading_activities')
        .insert(activity);

      if (error) throw error;

      // Update user portfolio
      await updatePortfolio(activity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-activities'] });
      queryClient.invalidateQueries({ queryKey: ['user-portfolio'] });
    },
  });

  const updatePortfolio = async (activity: TradeActivity) => {
    if (activity.activity_type === 'buy') {
      // Update portfolio on buy
      const { error } = await supabase
        .from('user_portfolios')
        .upsert({
          user_wallet: activity.user_wallet,
          token_id: activity.token_id,
          token_amount: activity.token_amount,
          total_invested: activity.amount_sol,
          average_buy_price: activity.token_price,
          last_activity_at: new Date().toISOString(),
        }, {
          onConflict: 'user_wallet,token_id',
          ignoreDuplicates: false,
        });

      if (error) throw error;
    } else {
      // Handle sell - calculate profit/loss and update portfolio
      const { data: portfolio } = await supabase
        .from('user_portfolios')
        .select('*')
        .eq('user_wallet', activity.user_wallet)
        .eq('token_id', activity.token_id)
        .single();

      if (portfolio) {
        const sellValue = activity.amount_sol;
        const costBasis = (activity.token_amount / portfolio.token_amount) * portfolio.total_invested;
        const profitLoss = sellValue - costBasis;
        const profitPercentage = (profitLoss / costBasis) * 100;

        // Update activity with profit/loss
        await supabase
          .from('trading_activities')
          .update({
            profit_loss: profitLoss,
            profit_percentage: profitPercentage,
          })
          .eq('user_wallet', activity.user_wallet)
          .eq('token_id', activity.token_id)
          .eq('activity_type', 'sell')
          .order('created_at', { ascending: false })
          .limit(1);

        // Update portfolio
        const newTokenAmount = portfolio.token_amount - activity.token_amount;
        const newTotalInvested = portfolio.total_invested - costBasis;

        if (newTokenAmount <= 0) {
          // Sold all tokens, remove from portfolio
          await supabase
            .from('user_portfolios')
            .delete()
            .eq('user_wallet', activity.user_wallet)
            .eq('token_id', activity.token_id);
        } else {
          // Update remaining position
          await supabase
            .from('user_portfolios')
            .update({
              token_amount: newTokenAmount,
              total_invested: newTotalInvested,
              last_activity_at: new Date().toISOString(),
            })
            .eq('user_wallet', activity.user_wallet)
            .eq('token_id', activity.token_id);
        }
      }
    }
  };

  return {
    recordActivity: recordActivity.mutate,
    isRecording: recordActivity.isPending,
  };
};