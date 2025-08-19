
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { AlertTriangle, Sparkles, TrendingUp, Zap, RefreshCw, Wallet, Loader2 } from 'lucide-react';
import { useAIQuickLaunch, QuickLaunchResult } from '@/hooks/useAIQuickLaunch';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SubtleDisclaimer from './SubtleDisclaimer';
import BoostUpsell from './BoostUpsell';

interface AIQuickLaunchModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (tokenData: QuickLaunchResult & { initialBuyIn?: string }) => void;
}

const AIQuickLaunchModal = ({ open, onClose, onConfirm }: AIQuickLaunchModalProps) => {
  const { walletAddress } = useWalletAuth();
  const [step, setStep] = useState<'confirm' | 'generating' | 'preview'>('confirm');
  const [understood, setUnderstood] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<QuickLaunchResult | null>(null);
  const [initialBuyIn, setInitialBuyIn] = useState("0");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [suggestedAmount, setSuggestedAmount] = useState("0");
  
  const { generateTrendBasedToken, regenerateComponent, isGenerating, currentStep } = useAIQuickLaunch();
  const { toast } = useToast();

  // Function to fetch SOL balance using Alchemy RPC
  const fetchWalletBalance = async () => {
    if (!walletAddress) return;
    
    setIsLoadingBalance(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-wallet-balance', {
        body: { walletAddress }
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch wallet balance');
      }

      setWalletBalance(data.balance);
      setSuggestedAmount(data.suggestedBuyIn.toString());
      setInitialBuyIn(data.suggestedBuyIn.toString());
      
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      toast({
        title: "Balance Check Failed",
        description: "Unable to fetch wallet balance. Using defaults.",
        variant: "destructive"
      });
      // Fallback to a reasonable default
      setSuggestedAmount("0.1");
      setInitialBuyIn("0.1");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Smart suggestion algorithm based on wallet balance
  const calculateSuggestedBuyIn = (balance: number): number => {
    // Always leave at least 0.005 SOL for transactions and fees
    const availableBalance = Math.max(0, balance - 0.005);
    
    if (availableBalance < 0.05) {
      return 0.05; // Minimum suggested amount
    } else if (availableBalance < 0.5) {
      return Math.max(0.05, Math.round((availableBalance * 0.3) * 100) / 100); // 30% of available
    } else if (availableBalance < 2) {
      return Math.round((availableBalance * 0.25) * 100) / 100; // 25% of available
    } else if (availableBalance < 10) {
      return Math.round((availableBalance * 0.15) * 100) / 100; // 15% of available
    } else {
      return Math.round((availableBalance * 0.1) * 100) / 100; // 10% of available, max reasonable amount
    }
  };

  const handleGenerate = async () => {
    setStep('generating');
    const result = await generateTrendBasedToken();
    
    if (result) {
      setGeneratedToken(result);
      // Fetch wallet balance when we get to preview step
      await fetchWalletBalance();
      setStep('preview');
    } else {
      setStep('confirm');
    }
  };

  const handleRegenerateComponent = async (component: 'name' | 'symbol' | 'image') => {
    if (!generatedToken) return;
    
    const result = await regenerateComponent(component, generatedToken);
    if (result) {
      setGeneratedToken(prev => prev ? { ...prev, ...result } : null);
    }
  };

  const handleConfirm = () => {
    if (generatedToken) {
      onConfirm({ ...generatedToken, initialBuyIn });
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setUnderstood(false);
    setAgreedToTerms(false);
    setGeneratedToken(null);
    setInitialBuyIn("0");
    setWalletBalance(null);
    setSuggestedAmount("0");
    onClose();
  };

  if (step === 'generating') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent animate-spin" />
              AI Quick Launch
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                <TrendingUp className="absolute inset-0 m-auto h-6 w-6 text-accent" />
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">{currentStep || 'Initializing AI systems...'}</p>
                <p className="text-sm text-muted-foreground">
                  This may take up to 30 seconds
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'preview' && generatedToken) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Generated Token Preview
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Token Preview Card - More Compact */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-start gap-3">
                {generatedToken.imageUrl && (
                  <div className="relative group flex-shrink-0">
                    <img 
                      src={generatedToken.imageUrl} 
                      alt="Token logo" 
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-border"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-background border opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRegenerateComponent('image')}
                      disabled={isGenerating}
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                )}
                
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 group">
                    <h3 className="font-bold text-base sm:text-lg truncate">{generatedToken.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => handleRegenerateComponent('name')}
                      disabled={isGenerating}
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 group">
                    <span className="text-xs sm:text-sm font-mono bg-muted px-2 py-0.5 rounded">
                      ${generatedToken.symbol}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => handleRegenerateComponent('symbol')}
                      disabled={isGenerating}
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {generatedToken.description}
                  </p>
                </div>
              </div>
              
              <div className="bg-muted/50 p-2.5 rounded text-xs">
                <p className="font-medium mb-1">💡 Why this could go viral:</p>
                <p className="text-muted-foreground line-clamp-2">{generatedToken.reasoning}</p>
              </div>
            </div>

            {/* Initial Buy-In Section - More Compact */}
            <div className="border rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  💰 Initial Buy-In
                </Label>
                {isLoadingBalance ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </div>
                ) : walletBalance !== null ? (
                  <div className="text-xs text-muted-foreground">
                    {walletBalance.toFixed(3)} SOL
                  </div>
                ) : null}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Auto-purchase your token at launch (optional)
              </p>
              
              {walletBalance !== null && suggestedAmount !== "0" && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                  <p className="text-xs text-blue-600 font-medium">
                    💡 Suggested: {suggestedAmount} SOL
                  </p>
                </div>
              )}
              
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={initialBuyIn}
                    onChange={(e) => setInitialBuyIn(e.target.value)}
                    className="text-sm pr-12"
                    min="0"
                    step="0.01"
                    max={walletBalance ? (walletBalance - 0.005).toString() : undefined}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    SOL
                  </span>
                </div>
                
                <div className="flex gap-2 text-xs">
                  {suggestedAmount !== "0" && initialBuyIn !== suggestedAmount && (
                    <button
                      type="button"
                      onClick={() => setInitialBuyIn(suggestedAmount)}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      Use suggested
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setInitialBuyIn("0")}
                    className="text-gray-600 hover:text-gray-700 underline"
                  >
                    Skip
                  </button>
                </div>
                
                {parseFloat(initialBuyIn) > 0 && (
                  <p className="text-xs text-green-600">
                    ✓ ~${((parseFloat(initialBuyIn) || 0) * 150).toFixed(2)} worth at launch
                  </p>
                )}
                
                {walletBalance !== null && parseFloat(initialBuyIn) > (walletBalance - 0.005) && (
                  <p className="text-xs text-red-600">
                    ⚠️ Exceeds available balance
                  </p>
                )}
              </div>
            </div>

            {/* Boost Upsell - Compact */}
            <div className="border rounded-lg p-3">
              <BoostUpsell isAIQuickLaunch={true} />
            </div>

            {/* Final Warning - Compact */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-orange-500 text-sm">Final Confirmation</p>
                  <p className="text-xs text-muted-foreground">
                    Total cost: {(0.02 + (parseFloat(initialBuyIn) || 0)).toFixed(3)} SOL. 
                    <strong className="text-foreground"> Details cannot be changed after creation.</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle Disclaimer */}
            <SubtleDisclaimer />
          </div>

          {/* Fixed Footer with Buttons */}
          <div className="flex-shrink-0 border-t pt-4 mt-2">
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm} 
                className="flex-1 gap-2" 
                variant="neon"
                disabled={walletBalance !== null && parseFloat(initialBuyIn) > 0 && parseFloat(initialBuyIn) > (walletBalance - 0.005)}
              >
                <Wallet className="h-4 w-4" />
                Launch ({(0.02 + (parseFloat(initialBuyIn) || 0)).toFixed(3)} SOL)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Quick Launch
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Feature Explanation */}
          <div className="space-y-4">
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                AI Trend Research
              </h4>
              <p className="text-sm text-muted-foreground">
                Our AI will research current crypto trends, viral memes, and market sentiment to create a token concept positioned for maximum viral potential.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">This will automatically generate:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Token name based on trending themes
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Ticker symbol optimized for virality
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Professional logo image
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  Compelling description
                </li>
              </ul>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-orange-500">Important Notice</p>
                <p className="text-sm text-muted-foreground">
                  After payment and token creation, the name, ticker symbol, and logo image 
                  <strong className="text-foreground"> cannot be changed</strong>. 
                  You'll have a chance to preview and approve before final creation.
                </p>
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="understood" 
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(!!checked)}
              />
              <label htmlFor="understood" className="text-sm leading-relaxed">
                I understand that AI will generate all token details automatically based on current trends
              </label>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
              />
              <label htmlFor="terms" className="text-sm leading-relaxed">
                I agree that token details cannot be changed after creation and payment
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={!understood || !agreedToTerms}
              className="flex-1 gap-2"
              variant="neon"
            >
              <Sparkles className="h-4 w-4" />
              Generate Token
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIQuickLaunchModal;
