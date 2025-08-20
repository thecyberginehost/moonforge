import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Sparkles, RefreshCw, Crown } from 'lucide-react';
import aiService from '@/services/aiService';
import { toast } from 'sonner';

interface AISuggestionsProps {
  onNameSelect: (name: string) => void;
  onSymbolSelect: (symbol: string) => void;
  onTokenSelect?: (name: string, symbol: string) => void;
  onDescriptionSelect?: (description: string) => void;
  currentName: string;
  currentSymbol: string;
  isPremium?: boolean;
}

interface TokenSuggestion {
  name: string;
  symbol: string;
  description: string;
  theme: string;
  personality: string;
}

const AISuggestions = ({ 
  onNameSelect, 
  onSymbolSelect, 
  onTokenSelect, 
  onDescriptionSelect, 
  currentName, 
  currentSymbol, 
  isPremium = false 
}: AISuggestionsProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [suggestions, setSuggestions] = useState<TokenSuggestion[]>([]);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [customTheme, setCustomTheme] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'meme' | 'serious' | 'degen' | 'creative'>('degen');

  const themes = ['moon', 'pepe', 'doge', 'rocket', 'ai', 'gaming', 'defi'];
  const styles: Array<'meme' | 'serious' | 'degen' | 'creative'> = ['meme', 'serious', 'degen', 'creative'];

  const generateSuggestions = async (theme?: string) => {
    if (!isPremium) {
      toast.info('💰 Premium AI Generation - 0.01 SOL', {
        description: 'This will charge 0.01 SOL for AI-powered suggestions'
      });
    }

    setIsGenerating(true);
    try {
      // Generate multiple suggestions with the selected theme and style
      const suggestionPromises = [];
      const count = isPremium ? 5 : 3; // More suggestions for premium users
      
      for (let i = 0; i < count; i++) {
        suggestionPromises.push(
          aiService.generateTokenSuggestion({
            theme: theme || customTheme || 'random',
            style: selectedStyle,
            prompt: customTheme || undefined
          })
        );
      }

      const generatedSuggestions = await Promise.all(suggestionPromises);
      
      // Filter out duplicates by name
      const uniqueSuggestions = generatedSuggestions.filter(
        (suggestion, index, self) =>
          index === self.findIndex((s) => s.name === suggestion.name)
      );

      setSuggestions(uniqueSuggestions);
      
      if (uniqueSuggestions.length > 0) {
        toast.success(`Generated ${uniqueSuggestions.length} unique suggestions!`);
      } else {
        toast.error('Failed to generate unique suggestions. Please try again.');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate suggestions');
      
      // Provide fallback suggestions
      const fallbackSuggestion = await aiService.generateTokenSuggestion({
        theme: theme || 'meme',
        style: selectedStyle
      });
      setSuggestions([fallbackSuggestion]);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDescription = async () => {
    if (!currentName || !currentSymbol) {
      toast.error('Please enter a token name and symbol first');
      return;
    }

    if (!isPremium) {
      toast.info('💰 Premium AI Generation - 0.01 SOL', {
        description: 'This will charge 0.01 SOL for AI-powered description'
      });
    }

    setIsGeneratingDescription(true);
    try {
      // Generate a full suggestion based on current name/symbol
      const suggestion = await aiService.generateTokenSuggestion({
        prompt: `Create a description for a token called ${currentName} with symbol ${currentSymbol}`,
        style: selectedStyle
      });
      
      if (onDescriptionSelect && suggestion.description) {
        onDescriptionSelect(suggestion.description);
        toast.success('AI description generated!');
      }
    } catch (error) {
      console.error('Description generation error:', error);
      toast.error('Failed to generate description');
      
      // Provide a fallback description
      const fallbackDescription = `${currentName} ($${currentSymbol}) is the next revolutionary token on Solana. Join the community and ride the wave to the moon! 🚀`;
      if (onDescriptionSelect) {
        onDescriptionSelect(fallbackDescription);
      }
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const selectSuggestion = (suggestion: TokenSuggestion) => {
    if (onTokenSelect) {
      onTokenSelect(suggestion.name, suggestion.symbol);
    } else {
      onNameSelect(suggestion.name);
      onSymbolSelect(suggestion.symbol);
    }
    if (onDescriptionSelect && suggestion.description) {
      onDescriptionSelect(suggestion.description);
    }
    toast.success('Token details applied!');
  };

  return (
    <Card className="border-accent/20 bg-card/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-accent" size={16} />
            <span className="text-sm font-medium">AI Token Generator</span>
          </div>
          {isPremium && (
            <div className="flex items-center gap-1 text-xs bg-gradient-electric text-black px-2 py-1 rounded-full">
              <Crown size={12} />
              Unlimited
            </div>
          )}
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Generation Style:</p>
          <div className="flex gap-2 flex-wrap">
            {styles.map((style) => (
              <Button
                key={style}
                variant={selectedStyle === style ? "electric" : "outline"}
                size="sm"
                onClick={() => setSelectedStyle(style)}
                disabled={isGenerating}
                className="text-xs"
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Theme Selection */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Quick Themes:</p>
          <div className="flex gap-2 flex-wrap">
            {themes.map((theme) => (
              <Button
                key={theme}
                variant={selectedTheme === theme ? "electric" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedTheme(theme);
                  setCustomTheme('');
                  generateSuggestions(theme);
                }}
                disabled={isGenerating}
              >
                {theme}
              </Button>
            ))}
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Custom Theme:</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. cyberpunk, space, animals..."
                value={customTheme}
                onChange={(e) => {
                  setCustomTheme(e.target.value);
                  setSelectedTheme('');
                }}
                className="flex-1 text-sm"
                disabled={isGenerating}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateSuggestions(customTheme)}
                disabled={isGenerating || !customTheme.trim()}
              >
                Generate
              </Button>
            </div>
          </div>
        </div>

        {/* Token Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Generated Tokens:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={`${suggestion.name}-${index}`} 
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-accent/20"
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{suggestion.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">${suggestion.symbol}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {suggestion.description}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-accent/10 rounded-full">
                          {suggestion.theme}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-primary/10 rounded-full">
                          {suggestion.personality}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSuggestion(suggestion);
                      }}
                      className="text-xs"
                    >
                      Use This
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Buttons */}
        <div className="space-y-2">
          <Button
            onClick={() => generateSuggestions()}
            disabled={isGenerating}
            className="w-full"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2" size={16} />
                Generate Token Ideas
                {!isPremium && <span className="ml-1 text-xs opacity-70">(0.01 SOL)</span>}
              </>
            )}
          </Button>

          {onDescriptionSelect && currentName && currentSymbol && (
            <Button
              onClick={generateDescription}
              disabled={isGeneratingDescription || !currentName || !currentSymbol}
              className="w-full"
              variant="outline"
            >
              {isGeneratingDescription ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={16} />
                  Generating Description...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={16} />
                  Generate Description for {currentName}
                  {!isPremium && <span className="ml-1 text-xs opacity-70">(0.01 SOL)</span>}
                </>
              )}
            </Button>
          )}

          {suggestions.length > 0 && (
            <Button
              onClick={() => setSuggestions([])}
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
            >
              Clear Suggestions
            </Button>
          )}
        </div>

        {/* AI Stats (for debugging, remove in production) */}
        {import.meta.env.DEV && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p>AI Stats: {aiService.getStats ? `${aiService.getStats().requestCount} requests, ${aiService.getStats().cacheSize} cached` : 'N/A'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AISuggestions;