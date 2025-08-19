
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CleanWalletButton } from "@/components/CleanWalletButton";
import { MoreDropdown } from "@/components/MoreDropdown";
import { useWallet } from "@solana/wallet-adapter-react";
import { useChatContext } from "@/contexts/ChatContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Home, 
  Menu, 
  X, 
  Bot,
  Coins,
  BarChart3,
  MessageSquare,
  User,
  MoreHorizontal
} from "lucide-react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { publicKey } = useWallet();
  const { isChatOpen, toggleChat } = useChatContext();
  const isMobile = useIsMobile();

  const mainNavItems = [
    { path: "/", label: "Launch", icon: Home },
    { path: "/tokens", label: "Tokens", icon: Coins },
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation - Hidden on mobile */}
      <nav className={`sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border ${isMobile ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <img 
                  src="https://s3.us-east-1.amazonaws.com/moonforge.io/moonforgelogo.png" 
                  alt="MoonForge Logo" 
                  className="w-8 h-8 group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                MoonForge
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              {mainNavItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {/* More Dropdown */}
              <MoreDropdown />
            </div>

            {/* Desktop Wallet & Chat */}
            <div className="hidden md:flex items-center space-x-4">
              {publicKey && (
                <Button
                  variant={isChatOpen ? "default" : "outline"}
                  size="sm"
                  onClick={toggleChat}
                  className="flex items-center space-x-2"
                >
                  <Bot className="w-4 h-4" />
                  <span>Degen Copilot</span>
                </Button>
              )}
              <CleanWalletButton />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Full Navigation Overlay */}
          {isOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-background border-t border-border">
                {/* Main nav items */}
                {mainNavItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                
                {/* Secondary nav items */}
                <div className="border-t border-border pt-2 mt-2">
                  <Link
                    to="/achievements"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive('/achievements')
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Achievements</span>
                  </Link>
                  <Link
                    to="/roadmap"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive('/roadmap')
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Roadmap</span>
                  </Link>
                  <Link
                    to="/boosts"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive('/boosts')
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Boosts</span>
                  </Link>
                  <Link
                    to="/leaderboard"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive('/leaderboard')
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Leaderboard</span>
                  </Link>
                </div>
                
                <div className="pt-4 space-y-2 border-t border-border">
                  {publicKey && (
                    <Button
                      variant={isChatOpen ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        toggleChat();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Degen Copilot</span>
                    </Button>
                  )}
                  <div className="w-full">
                    <CleanWalletButton />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border">
          <div className="flex items-center justify-around px-4 py-2 safe-area-pb">
            {mainNavItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors min-w-16 ${
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <IconComponent className="w-5 h-5 mb-1" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* More button for mobile */}
            <div className="flex flex-col items-center justify-center min-w-16">
              <MoreDropdown />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
