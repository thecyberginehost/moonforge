
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AISuggestions {
  names: string[];
  symbols: string[];
}

export const useAIServices = () => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const generateImage = async (prompt: string): Promise<string | null> => {
    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-content', {
        body: {
          type: 'image',
          prompt,
        },
      });

      if (error) throw error;
      
      if (data?.imageUrl) {
        toast.success('AI image generated successfully!');
        return data.imageUrl;
      }
      
      throw new Error('No image URL returned');
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast.error(error?.message || 'Failed to generate image');
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateSuggestions = async (prompt: string, context?: string): Promise<AISuggestions | null> => {
    setIsGeneratingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-content', {
        body: {
          type: 'suggestions',
          prompt,
          context,
        },
      });

      if (error) throw error;
      
      if (data?.names && data?.symbols) {
        toast.success('AI suggestions generated!');
        return {
          names: data.names,
          symbols: data.symbols,
        };
      }
      
      throw new Error('Invalid suggestions format');
    } catch (error: any) {
      console.error('Suggestions generation error:', error);
      toast.error(error?.message || 'Failed to generate suggestions');
      return null;
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const researchTrends = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('research-crypto-trends');
      
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error('Trend research error:', error);
      // Return fallback data instead of throwing
      return {
        trendingTokens: ['AI agents', 'Gaming tokens', 'Meme coins'],
        viralMemes: ['Pepe variations', 'Doge derivatives', 'Space themes'],
        narrativeThemes: ['Artificial Intelligence', 'Gaming & Metaverse', 'Meme Culture'],
        sentiment: 'bullish',
        topCategories: ['animals', 'space', 'technology']
      };
    }
  };

  const generateTrendBasedToken = async (trendData?: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-content', {
        body: {
          type: 'trend-based-token',
          prompt: 'Generate trending token concept',
          trendData,
        },
      });

      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error('Trend-based token generation error:', error);
      toast.error(error?.message || 'Failed to generate trend-based token');
      return null;
    }
  };

  return {
    generateImage,
    generateSuggestions,
    researchTrends,
    generateTrendBasedToken,
    isGeneratingImage,
    isGeneratingSuggestions,
  };
};
