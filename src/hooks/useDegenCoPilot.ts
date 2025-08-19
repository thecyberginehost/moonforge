import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CoPilotMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  promptType?: string;
}

export const useDegenCoPilot = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState(30);

  const sendMessage = useCallback(async (
    message: string,
    userId: string,
    options: {
      tokenName?: string;
      tokenSymbol?: string;
      sessionId?: string;
      promptType?: string;
    } = {}
  ) => {
    if (!message.trim() || isLoading) return null;

    if (creditsRemaining <= 0) {
      toast.error('Daily credit limit reached! Credits reset at midnight UTC.');
      return null;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('degen-copilot', {
        body: {
          message,
          userId,
          tokenName: options.tokenName,
          tokenSymbol: options.tokenSymbol,
          sessionId: options.sessionId || `session_${Date.now()}`,
          promptType: options.promptType || 'general'
        },
      });

      if (error) throw error;

      setCreditsRemaining(data.creditsRemaining);
      
      toast.success(`AI response generated! ${data.creditsRemaining} credits remaining`);
      
      return {
        response: data.response,
        creditsRemaining: data.creditsRemaining,
        promptType: data.promptType
      };
      
    } catch (error: any) {
      console.error('CoPilot error:', error);
      toast.error(error.message || 'Failed to get AI response');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, creditsRemaining]);

  const getViralPlan = useCallback(async (
    userId: string,
    tokenName: string,
    tokenSymbol: string
  ) => {
    return sendMessage(
      `Now that I've launched ${tokenName} (${tokenSymbol}), create a detailed viral marketing plan to get maximum exposure and community growth.`,
      userId,
      { tokenName, tokenSymbol, promptType: 'viral_plan' }
    );
  }, [sendMessage]);

  const getViralPost = useCallback(async (
    userId: string,
    tokenName: string,
    tokenSymbol: string
  ) => {
    return sendMessage(
      `Create a viral Twitter post for ${tokenName} (${tokenSymbol}) that will get maximum engagement and retweets.`,
      userId,
      { tokenName, tokenSymbol, promptType: 'viral_post' }
    );
  }, [sendMessage]);

  const getTrendAnalysis = useCallback(async (
    userId: string,
    tokenName?: string
  ) => {
    return sendMessage(
      `What are the current trending narratives in crypto that I can leverage for my token's marketing? ${tokenName ? `My token is ${tokenName}.` : ''}`,
      userId,
      { tokenName, promptType: 'trend_research' }
    );
  }, [sendMessage]);

  return {
    sendMessage,
    getViralPlan,
    getViralPost,
    getTrendAnalysis,
    isLoading,
    creditsRemaining,
    setCreditsRemaining
  };
};