import { Coins, Rocket, TrendingUp, Zap } from "lucide-react";

const FloatingTokens = () => {
  const tokens = [
    { icon: Coins, delay: "0s", position: "top-20 left-10" },
    { icon: Rocket, delay: "1s", position: "top-32 right-20" },
    { icon: TrendingUp, delay: "2s", position: "top-64 left-1/4" },
    { icon: Zap, delay: "3s", position: "top-48 right-1/3" },
    { icon: Coins, delay: "4s", position: "top-80 right-10" },
    { icon: Rocket, delay: "5s", position: "top-96 left-1/3" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {tokens.map((token, index) => {
        const Icon = token.icon;
        return (
          <div
            key={index}
            className={`absolute ${token.position} text-primary/30 animate-float`}
            style={{ 
              animationDelay: token.delay,
              animationDuration: `${6 + index}s` 
            }}
          >
            <Icon size={32 + (index % 3) * 16} />
          </div>
        );
      })}
    </div>
  );
};

export default FloatingTokens;