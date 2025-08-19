
import { Button } from "./ui/button";
import { Rocket, TrendingUp, Flame, Sparkles } from "lucide-react";
import FloatingTokens from "./FloatingTokens";
import heroImage from "@/assets/hero-bg.jpg";
import { useHeroStats } from "@/hooks/useHeroStats";

const HeroSection = () => {
  const { data: stats } = useHeroStats();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />
      
      {/* Floating tokens animation */}
      <FloatingTokens />
      
      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6">
        {/* Hero headline */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="text-accent animate-pulse" size={24} />
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-gradient leading-tight">
              MoonForge
            </h1>
            <Sparkles className="text-accent animate-pulse" size={24} />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-black mb-4 text-gradient">
            Where AI Meets Moonshots
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
            Forge viral tokens with AI power on Solana
          </p>
        </div>
        
        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto px-4">
          The first AI-powered token launcher. Generate memes, optimize timing, 
          and watch your creation moon. 🚀
        </p>

        {/* Live stats */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-12 px-4">
          <div className="text-center min-w-[100px]">
            <div className="text-2xl sm:text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <Rocket className="text-accent h-5 w-5 sm:h-6 sm:w-6" />
              {stats?.tokensForged?.toLocaleString() || 0}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">Total Tokens Created</div>
          </div>
          <div className="text-center min-w-[100px]">
            <div className="text-2xl sm:text-3xl font-bold text-secondary flex items-center justify-center gap-2">
              <Sparkles className="text-accent h-5 w-5 sm:h-6 sm:w-6" />
              {stats?.aiMemesGenerated?.toLocaleString() || 0}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">AI One-Click Tokens</div>
          </div>
          <div className="text-center min-w-[100px]">
            <div className="text-2xl sm:text-3xl font-bold text-accent flex items-center justify-center gap-2">
              <Sparkles className="text-accent h-5 w-5 sm:h-6 sm:w-6" />
              {stats?.aiMemesGenerated?.toLocaleString() || 0}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">AI Memes Generated</div>
          </div>
          <div className="text-center min-w-[100px]">
            <div className="text-2xl sm:text-3xl font-bold text-accent flex items-center justify-center gap-2">
              <TrendingUp className="text-accent h-5 w-5 sm:h-6 sm:w-6" />
              ${stats?.volume24h ? (stats.volume24h / 1000000).toFixed(1) : '0.0'}M
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">Volume 24h</div>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          variant="pump" 
          size="xl" 
          className="mb-8 animate-pump w-full sm:w-auto px-8 py-4 text-lg"
          onClick={() => document.getElementById('token-creator')?.scrollIntoView({ behavior: 'smooth' })}
        >
          🔥 Forge My Token
        </Button>

        {/* Sub text */}
        <p className="text-sm text-muted-foreground">
          Powered by AI. Forged for the moon. Built for degens.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
