import { useState, useEffect, useRef } from "react";
import { X, MessageCircle, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDegenCoPilot, CoPilotMessage } from "@/hooks/useDegenCoPilot";
import { toast } from "sonner";

interface ChatbotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatbotSidebar = ({ isOpen, onClose }: ChatbotSidebarProps) => {
  const [messages, setMessages] = useState<CoPilotMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const { publicKey } = useWallet();
  const { sendMessage, isLoading, creditsRemaining } = useDegenCoPilot();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add welcome message when sidebar opens for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: CoPilotMessage = {
        id: "welcome",
        content: "👋 Hey there! I'm your Degen CoPilot - ready to help you create viral marketing strategies for your tokens! What can I help you with today?",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !publicKey || isLoading) return;

    const userMessage: CoPilotMessage = {
      id: `user_${Date.now()}`,
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage("");

    try {
      const response = await sendMessage(currentMessage, publicKey.toString());
      
      if (response) {
        const aiMessage: CoPilotMessage = {
          id: `ai_${Date.now()}`,
          content: response.response,
          isUser: false,
          timestamp: new Date(),
          promptType: response.promptType,
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    {
      id: "viral_plan",
      prompt: "Create a viral marketing plan for my token",
      icon: "🚀"
    },
    {
      id: "viral_post",
      prompt: "Generate a viral Twitter post",
      icon: "🔥"
    },
    {
      id: "trend_analysis",
      prompt: "What are the current crypto trends I can leverage?",
      icon: "📈"
    }
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  const clearChatHistory = () => {
    const welcomeMessage: CoPilotMessage = {
      id: "welcome",
      content: "👋 Hey there! I'm your Degen CoPilot - ready to help you create viral marketing strategies for your tokens! What can I help you with today?",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    toast.success("Chat history cleared!");
  };

  // Function to format text with basic markdown-like formatting
  const formatMessage = (content: string) => {
    // Replace **text** with bold styling
    const formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return formatted;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Degen CoPilot</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearChatHistory}
            title="Clear chat history"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Credits */}
      <div className="px-4 py-2 border-b border-border">
        <div className="text-xs text-muted-foreground">
          Credits remaining: <span className="font-medium text-primary">{creditsRemaining}</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  message.isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <div 
                  className="text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Quick prompts - show only when no messages except welcome */}
          {messages.length <= 1 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">Quick prompts:</p>
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt.id}
                  variant="outline"
                  size="sm"
                  className="w-full text-left justify-start h-auto p-3"
                  onClick={() => handleQuickPrompt(prompt.prompt)}
                >
                  <span className="mr-2">{prompt.icon}</span>
                  <span className="text-xs">{prompt.prompt}</span>
                </Button>
              ))}
            </div>
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about marketing your token..."
            className="flex-1"
            disabled={isLoading || !publicKey}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || !publicKey}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {creditsRemaining <= 5 && (
          <div className="mt-2 text-xs text-orange-500">
            ⚠️ Running low on credits! Only {creditsRemaining} left.
          </div>
        )}
        
        {!publicKey && (
          <div className="mt-2 text-xs text-muted-foreground">
            Connect your wallet to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotSidebar;