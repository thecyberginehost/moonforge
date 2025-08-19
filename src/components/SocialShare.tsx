import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Share2, Twitter, MessageCircle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface SocialShareProps {
  tokenName: string;
  tokenSymbol: string;
  marketCap?: number;
  change24h?: number;
}

const SocialShare = ({ tokenName, tokenSymbol, marketCap, change24h }: SocialShareProps) => {
  const [customMessage, setCustomMessage] = useState("");

  const shareUrl = `https://moonforge.com/token/${tokenSymbol.toLowerCase()}`;
  
  const defaultMessages = [
    `🚀 Just discovered ${tokenName} ($${tokenSymbol}) on @MoonForge! ${change24h ? `Up ${change24h}% in 24h!` : 'This could be the next moonshot!'} 🌙 #crypto #solana #moonforge`,
    `💎 ${tokenName} ($${tokenSymbol}) is pumping hard! ${marketCap ? `Market cap: $${marketCap.toLocaleString()}` : 'Still early!'} Found this gem on MoonForge 🔥 #DeFi #gems`,
    `🔥 ${tokenName} ($${tokenSymbol}) looking bullish! Thanks @MoonForge for the alpha 📈 Who else is aping in? #SolanaGems #crypto`,
    `⚡ New token alert: ${tokenName} ($${tokenSymbol}) just launched on MoonForge! Perfect entry point right now 🎯 #TokenLaunch #Solana`
  ];

  const handleTwitterShare = (message: string) => {
    const tweetText = encodeURIComponent(`${message}\n\n${shareUrl}`);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    toast.success("🐦 Opened Twitter to share!");
  };

  const handleTelegramShare = (message: string) => {
    const telegramText = encodeURIComponent(`${message}\n\n${shareUrl}`);
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${telegramText}`;
    window.open(telegramUrl, '_blank');
    toast.success("📱 Opened Telegram to share!");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("🔗 Link copied to clipboard!");
  };

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(`${message}\n\n${shareUrl}`);
    toast.success("📋 Message copied to clipboard!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Share & Earn Rewards
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Share this token and earn 0.001 SOL for each person who buys within 24h
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Share Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={() => handleTwitterShare(defaultMessages[0])}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            <Twitter className="w-4 h-4 mr-2" />
            Twitter
          </Button>
          <Button 
            onClick={() => handleTelegramShare(defaultMessages[0])}
            className="flex-1 bg-blue-400 hover:bg-blue-500"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Telegram
          </Button>
          <Button 
            onClick={handleCopyLink}
            variant="outline"
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
        </div>

        {/* Pre-made Messages */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Ready-to-share messages:</h3>
          {defaultMessages.map((message, index) => (
            <div key={index} className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm">{message}</p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleTwitterShare(message)}
                >
                  <Twitter className="w-3 h-3 mr-1" />
                  Tweet
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleTelegramShare(message)}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Send
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCopyMessage(message)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Message */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Create custom message:</h3>
          <Input
            placeholder="Write your own message about this token..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="min-h-[80px]"
          />
          {customMessage && (
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={() => handleTwitterShare(customMessage)}
              >
                <Twitter className="w-3 h-3 mr-1" />
                Tweet Custom
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => handleCopyMessage(customMessage)}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Custom
              </Button>
            </div>
          )}
        </div>

        {/* Referral Stats */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Your Referral Stats</h4>
              <p className="text-sm text-muted-foreground">Earn SOL for successful referrals</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">0.15 SOL</div>
              <div className="text-xs text-muted-foreground">Total earned</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3 text-center">
            <div>
              <div className="font-medium">47</div>
              <div className="text-xs text-muted-foreground">Clicks</div>
            </div>
            <div>
              <div className="font-medium">12</div>
              <div className="text-xs text-muted-foreground">Conversions</div>
            </div>
            <div>
              <div className="font-medium">25.5%</div>
              <div className="text-xs text-muted-foreground">Rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialShare;