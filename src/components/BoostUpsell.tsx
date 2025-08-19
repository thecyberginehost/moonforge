import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Crown, TrendingUp, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Link } from "react-router-dom";

interface BoostUpsellProps {
  isAIQuickLaunch?: boolean;
}

const BoostUpsell = ({ isAIQuickLaunch = false }: BoostUpsellProps) => {
  const [showAllOptions, setShowAllOptions] = useState(false);

  const boostOptions = [
    {
      id: "basic",
      name: "Basic Boost",
      price: "0.2 SOL",
      icon: Zap,
      color: "blue",
      description: "Featured in Trending for 12 hours",
      isRecommended: !isAIQuickLaunch
    },
    {
      id: "premium", 
      name: "Premium Boost",
      price: "0.5 SOL",
      icon: Crown,
      color: "purple",
      description: "Featured in Trending for 72 hours",
      isRecommended: isAIQuickLaunch
    },
    {
      id: "viral",
      name: "Viral Launch",
      price: "1.0 SOL", 
      icon: TrendingUp,
      color: "green",
      description: "Featured in Trending for 1 week"
    },
    {
      id: "degen",
      name: "Degen Boost",
      price: "5.0 SOL",
      icon: Star,
      color: "orange",
      description: "Featured for 3 weeks + unlimited AI credits"
    },
    {
      id: "legendary",
      name: "Legendary Degen Boost",
      price: "10.0 SOL",
      icon: Crown,
      color: "red", 
      description: "Top 10 for 1 month + unlimited AI + advertising"
    }
  ];

  const recommendedOption = boostOptions.find(option => option.isRecommended);
  const otherOptions = boostOptions.filter(option => !option.isRecommended);

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <h3 className="font-semibold text-sm">Boost Your Launch</h3>
          </div>
          <Link to="/boosts">
            <Button variant="ghost" size="sm" className="text-xs h-auto p-1 text-primary hover:text-primary/80">
              View all boosts
            </Button>
          </Link>
        </div>

        {/* Recommended Option */}
        {recommendedOption && (
          <div className="bg-background/50 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <recommendedOption.icon className={`w-4 h-4 text-${recommendedOption.color}-500`} />
                <span className="font-medium text-sm">{recommendedOption.name}</span>
                <Badge variant="secondary" className="text-xs py-0">Recommended</Badge>
              </div>
              <span className="font-bold text-sm text-primary">{recommendedOption.price}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{recommendedOption.description}</p>
            <Button size="sm" className="w-full text-xs h-7">
              Add {recommendedOption.name}
            </Button>
          </div>
        )}

        {/* Expand Options Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAllOptions(!showAllOptions)}
          className="w-full text-xs h-7 text-muted-foreground hover:text-foreground"
        >
          {showAllOptions ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Hide options
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              More boost options
            </>
          )}
        </Button>

        {/* Other Options */}
        {showAllOptions && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            {otherOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <div key={option.id} className="flex items-center justify-between p-2 rounded border border-border/30 hover:bg-background/30">
                  <div className="flex items-center gap-2">
                    <IconComponent className={`w-3 h-3 text-${option.color}-500`} />
                    <div>
                      <span className="text-xs font-medium">{option.name}</span>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">{option.price}</div>
                    <Button variant="outline" size="sm" className="text-xs h-6 px-2 mt-1">
                      Add
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground/60 text-center">
          💡 Boosted tokens get 3x more visibility and engagement
        </p>
      </CardContent>
    </Card>
  );
};

export default BoostUpsell;
