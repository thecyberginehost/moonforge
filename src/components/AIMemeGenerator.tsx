
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Sparkles, Image, RefreshCw, Crown, Eye } from 'lucide-react';
import { useAIServices } from '@/hooks/useAIServices';
import ImageViewer from './ImageViewer';

interface AIMemeGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
  externalPrompt?: string;
  onPromptChange?: (prompt: string) => void;
  isPremium?: boolean;
}

const AIMemeGenerator = ({ onImageGenerated, externalPrompt = '', onPromptChange, isPremium = false }: AIMemeGeneratorProps) => {
  const [internalPrompt, setInternalPrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [lastUsedPrompt, setLastUsedPrompt] = useState('');
  const { generateImage, isGeneratingImage } = useAIServices();

  // Use external prompt if provided, otherwise use internal state
  const prompt = externalPrompt || internalPrompt;

  const handlePromptChange = (newPrompt: string) => {
    if (onPromptChange) {
      onPromptChange(newPrompt);
    } else {
      setInternalPrompt(newPrompt);
    }
  };

  const handleGenerate = async () => {
    const imageUrl = await generateImage(prompt);
    if (imageUrl) {
      setLastUsedPrompt(prompt); // Save the prompt before clearing
      setGeneratedImageUrl(imageUrl);
      onImageGenerated(imageUrl);
      handlePromptChange('');
    }
  };

  const handleImageClick = () => {
    if (generatedImageUrl) {
      setImageViewerOpen(true);
    }
  };

  const handleImageUpdate = (newImageUrl: string) => {
    setGeneratedImageUrl(newImageUrl);
    onImageGenerated(newImageUrl);
  };

  const handleRegenerate = async () => {
    if (lastUsedPrompt) {
      const imageUrl = await generateImage(lastUsedPrompt);
      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        onImageGenerated(imageUrl);
      }
    }
  };

  const quickPrompts = [
    '🐕 Shiba Inu with sunglasses',
    '🐸 Pepe the frog smiling',
    '🚀 Rocket to the moon',
    '💎 Diamond hands',
    '🔥 Fire doge meme'
  ];

  return (
    <>
      <Card className="border-accent/20 bg-card/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="text-accent" size={16} />
              <span className="text-sm font-medium">AI Meme Generator</span>
            </div>
            {isPremium && (
              <div className="flex items-center gap-1 text-xs bg-gradient-electric text-black px-2 py-1 rounded-full">
                <Crown size={12} />
                Unlimited
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Describe your meme (e.g., 'doge with laser eyes')"
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              className="bg-input border-border"
            />
            
            <Button
              onClick={handleGenerate}
              disabled={isGeneratingImage || !prompt.trim()}
              className="w-full"
              variant="outline"
            >
              {isGeneratingImage ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={16} />
                  Forging Meme...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={16} />
                  Generate Meme
                  {!isPremium && <span className="ml-1 text-xs">(0.02 SOL)</span>}
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Quick Ideas:</p>
            <div className="flex flex-wrap gap-1">
              {quickPrompts.map((quickPrompt) => (
                <Button
                  key={quickPrompt}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handlePromptChange(quickPrompt)}
                >
                  {quickPrompt}
                </Button>
              ))}
            </div>
          </div>

          {/* Generated Image Preview */}
          {generatedImageUrl && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Generated Image:</p>
              <div className="relative group cursor-pointer" onClick={handleImageClick}>
                <img 
                  src={generatedImageUrl} 
                  alt="Generated meme" 
                  className="w-full max-h-48 object-contain rounded border hover:opacity-80 transition-opacity bg-white"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded flex items-center justify-center pointer-events-none">
                  <div className="bg-black/70 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                onClick={handleImageClick}
              >
                <Eye className="w-3 h-3 mr-1" />
                Click to expand and edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {generatedImageUrl && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          imageUrl={generatedImageUrl}
          onImageUpdate={handleImageUpdate}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  );
};

export default AIMemeGenerator;
