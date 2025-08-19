import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Copy, ExternalLink, Twitter, Send, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const TokenSuccess = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  
  // Fetch token data from database
  const { data: token, isLoading } = useQuery({
    queryKey: ['token', tokenId],
    queryFn: async () => {
      if (!tokenId) return null;
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tokenId,
  });

  useEffect(() => {
    // If no token ID, redirect to home
    if (!tokenId) {
      navigate('/');
    }
  }, [tokenId, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!token) {
    navigate('/');
    return null;
  }

  const handleCopyAddress = async () => {
    if (token.mint_address) {
      await navigator.clipboard.writeText(token.mint_address);
      setCopied(true);
      toast.success('Token address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const text = `🚀 Just launched ${token.name} ($${token.symbol}) on the blockchain! Check it out!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500 animate-scale-in" />
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-4 border-green-500/20 animate-ping" />
            </div>
            
            <h1 className="text-3xl font-bold mb-2 text-foreground">
              🎉 Congratulations!
            </h1>
            <h2 className="text-xl text-muted-foreground">
              Your token has been created successfully!
            </h2>
          </div>

          {/* Token Details Card */}
          <Card className="mb-8 border-2 border-green-500/20 bg-green-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-6">
                {token.image_url && (
                  <img 
                    src={token.image_url} 
                    alt={`${token.name} logo`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-border"
                  />
                )}
                <div className="space-y-2 flex-1">
                  <h3 className="text-2xl font-bold text-foreground">{token.name}</h3>
                  <span className="text-lg font-mono bg-muted px-3 py-1 rounded">
                    ${token.symbol}
                  </span>
                </div>
              </div>

              {token.mint_address && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Token Address</label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 text-sm font-mono text-foreground truncate">
                      {token.mint_address}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="shrink-0"
                    >
                      <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`} />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Token view button */}
              <div className="mt-4">
                <Button
                  onClick={() => navigate(`/token/${tokenId}`)}
                  className="w-full gap-2"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Token Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-foreground">🚀 What's Next?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-accent">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Share with your community</p>
                    <p className="text-sm text-muted-foreground">Spread the word on social media to build momentum</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-accent">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Monitor performance</p>
                    <p className="text-sm text-muted-foreground">Track your token's progress on the leaderboard</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-accent">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Build your community</p>
                    <p className="text-sm text-muted-foreground">Engage with holders and create valuable content</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            
            <Button
              onClick={handleShare}
              className="flex-1 gap-2"
              variant="neon"
            >
              <Twitter className="h-4 w-4" />
              Share on Twitter
            </Button>
            
            <Button
              onClick={() => navigate('/leaderboard')}
              className="flex-1 gap-2"
              variant="default"
            >
              <ExternalLink className="h-4 w-4" />
              View Leaderboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenSuccess;