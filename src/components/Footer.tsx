import { Link } from "react-router-dom";
import { Shield, ExternalLink } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur-md mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MoonForge. Built for the degen community.
            </span>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link
              to="/disclaimer"
              className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Legal Disclaimer</span>
            </Link>
            <span className="text-sm text-destructive font-medium">
              Not Financial Advice
            </span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-center text-muted-foreground">
            High risk warning: Cryptocurrency trading involves substantial risk of loss. 
            Only invest what you can afford to lose completely.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;