import { useState } from "react";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import TokenCreator from "@/components/TokenCreator";
import RecentLaunches from "@/components/RecentLaunches";
import Footer from "@/components/Footer";
import { WalletConfigUpdate } from "@/components/WalletConfigUpdate";
import { useChatContext } from "@/contexts/ChatContext";

const Index = () => {
  const { toggleChat } = useChatContext();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div>
        <HeroSection />
        <WalletConfigUpdate />
        <TokenCreator onChatToggle={toggleChat} />
        <RecentLaunches />
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
