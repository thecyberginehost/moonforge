// FILE PATH: /src/services/aiService.ts
// Enhanced AI service combining your structure with additional features

export interface TokenSuggestion {
  name: string;
  symbol: string;
  description: string;
  theme: string;
  personality: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface GenerateTokenParams {
  prompt?: string;
  theme?: string;
  style?: 'meme' | 'serious' | 'degen' | 'creative';
  includeLinks?: boolean;
}

class AIService {
  private apiEndpoint: string;
  private cache: Map<string, TokenSuggestion>;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor() {
    // Use the edge function endpoint
    this.apiEndpoint = '/api/ai-generate';
    this.cache = new Map();
  }

  /**
   * Generate a token suggestion using AI with caching and rate limiting
   */
  async generateTokenSuggestion(params: GenerateTokenParams = {}): Promise<TokenSuggestion> {
    // Simple client-side rate limiting (1 request per 2 seconds)
    const now = Date.now();
    if (now - this.lastRequestTime < 2000) {
      console.log('Rate limited, returning cached or fallback suggestion');
      return this.getCachedOrFallback(params);
    }
    this.lastRequestTime = now;

    // Check cache first
    const cacheKey = JSON.stringify(params);
    if (this.cache.has(cacheKey)) {
      console.log('Returning cached suggestion');
      return this.cache.get(cacheKey)!;
    }

    try {
      this.requestCount++;
      console.log(`Making AI request #${this.requestCount}`);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: params.prompt || '',
          theme: params.theme || 'meme',
          style: params.style || 'degen',
        }),
      });

      if (!response.ok) {
        // If AI endpoint fails, try using Supabase Edge Function as backup
        return await this.trySupabaseBackup(params);
      }

      const suggestion = await response.json();
      
      // Enhance with additional fields if requested
      if (params.includeLinks) {
        suggestion.twitter = this.generateTwitterHandle(suggestion.symbol);
        suggestion.telegram = this.generateTelegramLink(suggestion.symbol);
        suggestion.website = this.generateWebsite(suggestion.symbol);
      }

      // Cache the result
      this.cache.set(cacheKey, suggestion);
      
      return suggestion;
    } catch (error) {
      console.error('AI generation failed:', error);
      return this.getCachedOrFallback(params);
    }
  }

  /**
   * Try Supabase Edge Function as backup (if you set it up)
   */
  private async trySupabaseBackup(params: GenerateTokenParams): Promise<TokenSuggestion> {
    try {
      // If you have a Supabase Edge Function set up
      const { data, error } = await window.supabase.functions.invoke('generate-token', {
        body: params
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase backup also failed:', error);
      return this.getCachedOrFallback(params);
    }
  }

  /**
   * Get cached suggestion or fallback
   */
  private getCachedOrFallback(params: GenerateTokenParams): TokenSuggestion {
    // Try to return any cached suggestion first
    if (this.cache.size > 0) {
      const cached = Array.from(this.cache.values());
      return cached[Math.floor(Math.random() * cached.length)];
    }
    
    // Otherwise return fallback
    return this.getFallbackSuggestion(params.style || 'degen');
  }

  /**
   * Generate multiple unique token suggestions
   */
  async generateBatch(count: number = 3, baseParams: GenerateTokenParams = {}): Promise<TokenSuggestion[]> {
    const suggestions: TokenSuggestion[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Add variation to avoid duplicates
      const params = {
        ...baseParams,
        prompt: baseParams.prompt ? `${baseParams.prompt} (variation ${i + 1})` : undefined
      };

      const suggestion = await this.generateTokenSuggestion(params);
      
      // Ensure uniqueness
      if (!usedNames.has(suggestion.name)) {
        suggestions.push(suggestion);
        usedNames.add(suggestion.name);
      } else {
        // If duplicate, try to modify it
        suggestion.name = `${suggestion.name} ${this.getRandomSuffix()}`;
        suggestion.symbol = `${suggestion.symbol}${i + 1}`;
        suggestions.push(suggestion);
      }

      // Small delay between requests
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return suggestions;
  }

  /**
   * Get trending themes based on time of day/season
   */
  getTrendingThemes(): string[] {
    const hour = new Date().getHours();
    const month = new Date().getMonth();

    const themes = ['meme', 'defi', 'gaming', 'ai', 'nft'];

    // Add time-based themes
    if (hour >= 0 && hour < 6) {
      themes.push('moon', 'night', 'vampire');
    } else if (hour >= 6 && hour < 12) {
      themes.push('coffee', 'sunrise', 'gm');
    } else if (hour >= 18) {
      themes.push('party', 'degen', 'casino');
    }

    // Add seasonal themes
    if (month === 11 || month === 0) {
      themes.push('christmas', 'santa', 'snow');
    } else if (month >= 5 && month <= 7) {
      themes.push('summer', 'beach', 'sun');
    } else if (month === 9) {
      themes.push('halloween', 'spooky', 'pumpkin');
    }

    return themes;
  }

  /**
   * Generate social media links
   */
  private generateTwitterHandle(symbol: string): string {
    return `https://twitter.com/${symbol.toLowerCase()}coin`;
  }

  private generateTelegramLink(symbol: string): string {
    return `https://t.me/${symbol.toLowerCase()}_official`;
  }

  private generateWebsite(symbol: string): string {
    return `https://${symbol.toLowerCase()}.moon`;
  }

  /**
   * Get random suffix for uniqueness
   */
  private getRandomSuffix(): string {
    const suffixes = ['Pro', 'Max', 'Plus', 'X', '2.0', 'Ultra', 'Prime', 'Elite'];
    return suffixes[Math.floor(Math.random() * suffixes.length)];
  }

  /**
   * Get fallback suggestions
   */
  private getFallbackSuggestion(style: string): TokenSuggestion {
    const fallbacks = {
      meme: [
        {
          name: 'Bonk Killer',
          symbol: 'BONKK',
          description: 'The ultimate Bonk killer has arrived on Solana!',
          theme: 'meme',
          personality: 'aggressive',
        },
        {
          name: 'Pepe Unchained',
          symbol: 'PEPEU',
          description: 'Pepe breaks free from Ethereum gas fees!',
          theme: 'meme',
          personality: 'rebellious',
        },
        {
          name: 'Wojak Wins',
          symbol: 'WOJAK',
          description: 'Finally, Wojak gets his win. We\'re all gonna make it!',
          theme: 'meme',
          personality: 'hopeful',
        },
      ],
      serious: [
        {
          name: 'Yield Protocol',
          symbol: 'YIELD',
          description: 'Automated yield farming across Solana DeFi',
          theme: 'defi',
          personality: 'professional',
        },
        {
          name: 'Oracle Network',
          symbol: 'ORCL',
          description: 'Decentralized price feeds for Solana',
          theme: 'infrastructure',
          personality: 'technical',
        },
      ],
      degen: [
        {
          name: 'APE IN NOW',
          symbol: 'APE',
          description: 'Don\'t think, just ape! YOLO into the next 100x!',
          theme: 'gambling',
          personality: 'reckless',
        },
        {
          name: 'Ponzi Scheme',
          symbol: 'PONZI',
          description: 'The most transparent ponzi on Solana - get in early!',
          theme: 'degen',
          personality: 'honest',
        },
        {
          name: 'Rug Pull Ready',
          symbol: 'RUGG',
          description: 'Pre-rugged for your convenience. Can only go up!',
          theme: 'degen',
          personality: 'sarcastic',
        },
      ],
      creative: [
        {
          name: 'Glitch in Matrix',
          symbol: 'GLITCH',
          description: 'Reality.exe has stopped working. Profit from the chaos!',
          theme: 'cyberpunk',
          personality: 'mysterious',
        },
        {
          name: 'Time Traveler',
          symbol: 'TIME',
          description: 'Bought Bitcoin in 2010. Now launching on Solana.',
          theme: 'scifi',
          personality: 'wise',
        },
      ],
    };

    const styleOptions = fallbacks[style as keyof typeof fallbacks] || fallbacks.degen;
    return styleOptions[Math.floor(Math.random() * styleOptions.length)];
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    this.requestCount = 0;
  }

  /**
   * Get statistics
   */
  getStats(): { requestCount: number; cacheSize: number } {
    return {
      requestCount: this.requestCount,
      cacheSize: this.cache.size,
    };
  }
}

// Create singleton instance
const aiService = new AIService();

// For debugging in development
if (import.meta.env.DEV) {
  (window as any).aiService = aiService;
}

export default aiService;