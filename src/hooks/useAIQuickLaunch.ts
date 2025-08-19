
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrendData {
  trendingTokens: string[];
  viralMemes: string[];
  narrativeThemes: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  topCategories: string[];
}

export interface QuickLaunchResult {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  category: string;
  reasoning: string;
}

export const useAIQuickLaunch = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const generateTrendBasedToken = async (): Promise<QuickLaunchResult | null> => {
    setIsGenerating(true);
    
    try {
      // Step 1: Research current trends
      setCurrentStep('Researching current crypto trends...');
      const { data: trendData, error: trendError } = await supabase.functions.invoke('research-crypto-trends');
      
      if (trendError) {
        console.error('Trend research failed:', trendError);
        // Continue with fallback data
      }

      // Step 2: Generate token concept based on trends
      setCurrentStep('Generating viral token concept...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Show loading state

      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('generate-ai-content', {
        body: {
          type: 'trend-based-token',
          prompt: 'Generate trending token',
          trendData: trendData || {
            trendingTokens: ['AI agents', 'Meme coins', 'Gaming'],
            viralMemes: ['Pepe', 'Doge', 'Space themes'],
            sentiment: 'bullish',
            topCategories: ['animals', 'space', 'tech']
          }
        },
      });

      if (tokenError) {
        throw new Error(tokenError.message || 'Failed to generate token concept');
      }

      setCurrentStep('Finalizing token details...');
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('🚀 Trend-based token generated successfully!');
      
      return {
        name: tokenData.name,
        symbol: tokenData.symbol,
        description: tokenData.description,
        imageUrl: tokenData.imageUrl,
        category: tokenData.category,
        reasoning: tokenData.reasoning
      };

    } catch (error: any) {
      console.error('Quick launch generation error:', error);
      toast.error(error?.message || 'Failed to generate trend-based token');
      return null;
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  };

  const regenerateComponent = async (component: 'name' | 'symbol' | 'image', currentData: Partial<QuickLaunchResult>): Promise<Partial<QuickLaunchResult> | null> => {
    setIsGenerating(true);
    
    try {
      if (component === 'image') {
        setCurrentStep('Regenerating logo image...');
        
        const { data, error } = await supabase.functions.invoke('generate-ai-content', {
          body: {
            type: 'image',
            prompt: `${currentData.name} ${currentData.symbol} crypto token logo, modern and professional design`
          },
        });

        if (error) throw error;
        
        return { imageUrl: data.imageUrl };
        
      } else if (component === 'name' || component === 'symbol') {
        setCurrentStep(`Regenerating ${component}...`);
        
        const { data, error } = await supabase.functions.invoke('generate-ai-content', {
          body: {
            type: 'suggestions',
            prompt: component === 'name' ? 'creative meme cryptocurrency' : `Generate ticker symbols for token named: ${currentData.name}`,
            context: 'trending viral token concept'
          },
        });

        if (error) throw error;
        
        if (component === 'name') {
          return { 
            name: data.names?.[0] || 'TrendCoin',
            symbol: data.symbols?.[0] || 'TREND'
          };
        } else {
          return { symbol: data.symbols?.[0] || 'TREND' };
        }
      }
      
      return null;
    } catch (error: any) {
      console.error(`Failed to regenerate ${component}:`, error);
      toast.error(`Failed to regenerate ${component}`);
      return null;
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  };

  return {
    generateTrendBasedToken,
    regenerateComponent,
    isGenerating,
    currentStep
  };
};
