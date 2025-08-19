import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const DisclaimerBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenDisclaimer = localStorage.getItem("moonforge-disclaimer-seen");
    if (!hasSeenDisclaimer) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("moonforge-disclaimer-seen", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/10 mx-4 mt-4">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-destructive">Not Financial Advice</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-auto p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-foreground">
              MoonForge does not provide financial advice. All trading involves substantial risk of loss. 
              You are fully responsible for your own investment decisions.{" "}
              <Link 
                to="/disclaimer" 
                className="text-primary hover:underline font-medium"
              >
                Read full disclaimer
              </Link>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DisclaimerBanner;