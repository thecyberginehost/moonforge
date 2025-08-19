import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Crown, TrendingUp, Target, Megaphone, Users, Clock, CheckCircle, Skull, FlameKindling } from "lucide-react";
import Navigation from "@/components/Navigation";

const Boosts = () => {
  const boostOptions = [
    {
      id: "basic",
      name: "Basic Boost",
      price: "0.2 SOL",
      icon: Zap,
      color: "blue",
      features: [
        "Featured in Trending for 12 hours"
      ],
      description: "Get your token featured in trending for half a day"
    },
    {
      id: "premium", 
      name: "Premium Boost",
      price: "0.5 SOL",
      icon: Crown,
      color: "purple",
      popular: true,
      features: [
        "Featured in Trending for 72 hours"
      ],
      description: "Get your token featured in trending for 3 days"
    },
    {
      id: "viral",
      name: "Viral Launch",
      price: "1.0 SOL", 
      icon: TrendingUp,
      color: "green",
      features: [
        "Featured in Trending for 1 week"
      ],
      description: "Get your token featured in trending for a full week"
    }
  ];

  const degenBoosts = [
    {
      id: "degen",
      name: "Degen Boost",
      price: "5.0 SOL",
      icon: Skull,
      color: "orange",
      features: [
        "Featured in Trending for 3 weeks",
        "Unlimited Degen Copilot daily credits"
      ],
      description: "For the dedicated degens - extended trending with unlimited AI credits"
    },
    {
      id: "legendary",
      name: "Legendary Degen Boost",
      price: "10.0 SOL",
      icon: FlameKindling,
      color: "red",
      features: [
        "Featured in Trending Top 10 for 1 month",
        "Unlimited Degen Copilot daily credits",
        "Featured as a recommended buy (advertised on site)"
      ],
      description: "The ultimate boost - top 10 trending plus site-wide advertising"
    }
  ];

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black mb-4 text-gradient">
              Token Boost Packages
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Supercharge your token launch with our promotional boost packages. 
              Get maximum exposure and increase your chances of going viral.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {boostOptions.map((boost) => {
              const IconComponent = boost.icon;
              return (
                <Card 
                  key={boost.id} 
                  className={`relative border-2 hover:scale-105 transition-all duration-300 ${
                    boost.popular 
                      ? 'border-primary shadow-lg shadow-primary/20' 
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  {boost.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full bg-${boost.color}-500/10 flex items-center justify-center mb-4`}>
                      <IconComponent className={`w-8 h-8 text-${boost.color}-500`} />
                    </div>
                    <CardTitle className="text-2xl">{boost.name}</CardTitle>
                    <div className="text-3xl font-bold text-primary">{boost.price}</div>
                    <p className="text-muted-foreground text-sm">{boost.description}</p>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {boost.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className={`w-full ${boost.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={boost.popular ? "default" : "outline"}
                    >
                      Select {boost.name}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Degen Boost Section */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black mb-4 text-gradient bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Degen Boosts
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                For the hardcore degens who want maximum exposure and unlimited AI power.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {degenBoosts.map((boost, index) => {
                const IconComponent = boost.icon;
                const isLegendary = boost.id === 'legendary';
                return (
                  <Card 
                    key={boost.id} 
                    className={`relative border-2 hover:scale-105 transition-all duration-300 ${
                      isLegendary 
                        ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-accent/10 shadow-lg shadow-primary/20' 
                        : 'border-accent/50 bg-gradient-to-br from-accent/10 to-muted/20 shadow-lg shadow-accent/20'
                    }`}
                  >
                    <CardHeader className="text-center">
                      <div className={`w-16 h-16 mx-auto rounded-full ${
                        isLegendary ? 'bg-primary/20' : 'bg-accent/20'
                      } flex items-center justify-center mb-4`}>
                        <IconComponent className={`w-8 h-8 ${
                          isLegendary ? 'text-primary' : 'text-accent'
                        }`} />
                      </div>
                      <CardTitle className="text-2xl">{boost.name}</CardTitle>
                      <div className={`text-3xl font-bold ${
                        isLegendary ? 'text-primary' : 'text-accent'
                      }`}>{boost.price}</div>
                      <p className="text-muted-foreground text-sm">{boost.description}</p>
                    </CardHeader>

                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {boost.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle className={`w-5 h-5 ${
                              isLegendary ? 'text-primary' : 'text-accent'
                            } flex-shrink-0 mt-0.5`} />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button 
                        className={`w-full font-semibold ${
                          isLegendary 
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                            : 'bg-accent hover:bg-accent/90 text-accent-foreground'
                        }`}
                      >
                        Select {boost.name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="mt-16 bg-muted/50 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-center">How Boost Packages Work</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-accent" />
                <h3 className="font-semibold mb-2">Trending Placement</h3>
                <p className="text-sm text-muted-foreground">
                  Your token gets featured in the trending section for the duration you select
                </p>
              </div>
              <div className="text-center">
                <Crown className="w-8 h-8 mx-auto mb-3 text-accent" />
                <h3 className="font-semibold mb-2">Top 10 Premium</h3>
                <p className="text-sm text-muted-foreground">
                  Legendary boosts get priority placement in the top 10 trending spots
                </p>
              </div>
              <div className="text-center">
                <Target className="w-8 h-8 mx-auto mb-3 text-accent" />
                <h3 className="font-semibold mb-2">AI Marketing Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Degen boosts include unlimited daily credits for our AI viral marketing assistant
                </p>
              </div>
              <div className="text-center">
                <Megaphone className="w-8 h-8 mx-auto mb-3 text-accent" />
                <h3 className="font-semibold mb-2">Site Recommendations</h3>
                <p className="text-sm text-muted-foreground">
                  Legendary boosts feature your token as a recommended buy across the platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Boosts;