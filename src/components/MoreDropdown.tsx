
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal,
  Award,
  MapPin,
  Zap,
  Trophy,
  Wallet,
  MessageSquare
} from "lucide-react";
import { MobileWalletButton } from "@/components/MobileWalletButton";
import { useIsMobile } from "@/hooks/use-mobile";

export const MoreDropdown = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const secondaryItems = [
    { path: "/forums", label: "Forums", icon: MessageSquare },
    { path: "/achievements", label: "Achievements", icon: Award },
    { path: "/roadmap", label: "Roadmap", icon: MapPin },
    { path: "/boosts", label: "Boosts", icon: Zap },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const isActive = (path: string) => location.pathname === path;
  const hasActiveItem = secondaryItems.some(item => isActive(item.path));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={hasActiveItem ? "default" : "ghost"} 
          className="flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium min-w-16 h-auto md:flex-row md:space-x-2 md:h-9 md:px-3 md:text-sm"
        >
          <MoreHorizontal className="w-5 h-5 mb-1 md:w-4 md:h-4 md:mb-0" />
          <span>More</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background border border-border">
        {secondaryItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <DropdownMenuItem key={item.path} asChild>
              <Link
                to={item.path}
                className={`flex items-center space-x-2 w-full px-2 py-2 text-sm cursor-pointer ${
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
        
        {/* Wallet connection for mobile only */}
        {isMobile && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <div className="w-full p-1">
                <MobileWalletButton />
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
