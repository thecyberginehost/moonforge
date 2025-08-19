// FILE PATH: src/App.tsx
// ACTION: REPLACE the existing file completely
// FIXES: Incomplete className ternary operator on line ~32

import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletContextProvider } from "@/contexts/WalletContext";
import { ChatProvider, useChatContext } from "@/contexts/ChatContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProductionMonitor } from "@/components/ProductionMonitor";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TokenSuccess from "./pages/TokenSuccess";
import TokenDetail from "./pages/TokenDetail";
import Disclaimer from "./pages/Disclaimer";
import Boosts from "./pages/Boosts";
import CreatorDashboard from "@/components/CreatorDashboard";
import TokenList from "@/pages/TokenList";
import Leaderboard from "@/components/Leaderboard";
import Achievements from "./pages/Achievements";
import Roadmap from "./pages/Roadmap";
import { Forums } from "./pages/Forums";
import { Profile } from "./pages/Profile";
import ChatbotSidebar from "@/components/ChatbotSidebar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

const AppContent = () => {
  const { isChatOpen, setIsChatOpen } = useChatContext();

  return (
    <div className="relative">
      {/* Main content with dynamic margin when chat is open - FIXED */}
      <div 
        className={`transition-all duration-300 ${
          isChatOpen ? 'mr-96' : 'mr-0'
        }`}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/token-created/:tokenId" element={<TokenSuccess />} />
          <Route path="/token/:tokenId" element={<TokenDetail />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/boosts" element={<Boosts />} />
          <Route path="/dashboard" element={<CreatorDashboard />} />
          <Route path="/tokens" element={<TokenList />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/forums/*" element={<Forums />} />
          <Route path="/profile/:walletAddress?" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {/* Chatbot Sidebar */}
      <ChatbotSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      <Toaster />
      <Sonner />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WalletContextProvider>
            <BrowserRouter>
              <ChatProvider>
                <AppContent />
                <ProductionMonitor />
              </ChatProvider>
            </BrowserRouter>
          </WalletContextProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;