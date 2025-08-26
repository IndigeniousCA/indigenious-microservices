'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  Sparkles, 
  Users, 
  FileText, 
  TrendingUp,
  Heart,
  Lightbulb,
  MessageSquare,
  Mic,
  MicOff
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  data?: any;
  actionButtons?: ActionButton[];
}

interface ActionButton {
  label: string;
  action: string;
  primary?: boolean;
}

interface ConversationalBusinessAssistantProps {
  className?: string;
  minimized?: boolean;
  onToggle?: () => void;
}

export default function ConversationalBusinessAssistant({ 
  className, 
  minimized = false,
  onToggle 
}: ConversationalBusinessAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Tansi! I'm your business companion. I can help you find opportunities, connect with partners, optimize your profile, or answer any questions about growing your business. What would you like to explore today?",
      timestamp: new Date(),
      suggestions: [
        "Find me construction RFQs under $100k",
        "Who should I partner with for IT projects?",
        "How can I improve my win rate?",
        "Show me my growth opportunities"
      ]
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [context, setContext] = useState<unknown>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick action suggestions that appear based on context
  const contextualSuggestions = [
    "Find new opportunities",
    "Check my performance",
    "Connect with partners",
    "Get pricing insights",
    "Review my proposals",
    "Plan my growth"
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content?: string) => {
    const messageContent = content || inputMessage.trim();
    if (!messageContent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const response = await processAIQuery(messageContent, context);
    
    setMessages(prev => [...prev, response]);
    setIsTyping(false);
    setContext((prev: any) => ({ ...prev, ...response.data?.context }));
  };

  const processAIQuery = async (query: string, currentContext: any): Promise<Message> => {
    // This would integrate with the AI Network Orchestrator
    // For now, using intelligent pattern matching
    
    const lowerQuery = query.toLowerCase();
    
    // Opportunity finding
    if (lowerQuery.includes('find') && (lowerQuery.includes('rfq') || lowerQuery.includes('opportunity'))) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I found 7 RFQs that match your criteria! Based on your past success in construction, these have high win probability:",
        timestamp: new Date(),
        data: {
          opportunities: [
            { title: "Road Maintenance - Highway 7", value: "$85,000", match: "94%" },
            { title: "Community Center Renovation", value: "$120,000", match: "87%" },
            { title: "Winter Road Preparation", value: "$65,000", match: "91%" }
          ]
        },
        actionButtons: [
          { label: "View Details", action: "view_opportunities", primary: true },
          { label: "Get Bid Help", action: "bid_assistance" },
          { label: "Find Partners", action: "find_partners" }
        ],
        suggestions: [
          "Help me write a bid for the highest match",
          "Who are my competitors for these projects?",
          "What certifications would help me win more?"
        ]
      };
    }
    
    // Partner finding
    if (lowerQuery.includes('partner') || lowerQuery.includes('collaborate')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Based on your capabilities and upcoming RFQs, here are ideal partnership matches:",
        timestamp: new Date(),
        data: {
          partners: [
            { name: "Northern Tech Solutions", synergy: "95%", reason: "Complementary IT/Construction skills" },
            { name: "Eagle Construction Co.", synergy: "88%", reason: "Similar values, different regions" },
            { name: "Indigenous Innovation Labs", synergy: "92%", reason: "Technology integration expertise" }
          ]
        },
        actionButtons: [
          { label: "Introduce Me", action: "facilitate_intro", primary: true },
          { label: "See Joint Opportunities", action: "joint_rfqs" }
        ],
        suggestions: [
          "What projects could we bid on together?",
          "How do successful partnerships work?",
          "Help me craft an introduction message"
        ]
      };
    }
    
    // Performance insights
    if (lowerQuery.includes('performance') || lowerQuery.includes('win rate') || lowerQuery.includes('improve')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Your business is showing strong growth! Here's what I've learned from analyzing your patterns:",
        timestamp: new Date(),
        data: {
          insights: {
            winRate: "67%",
            improvement: "+23% vs last quarter",
            strengths: ["Fast response time", "Cultural alignment", "Local connections"],
            opportunities: ["Technical certifications", "Larger project capacity", "Digital presence"]
          }
        },
        actionButtons: [
          { label: "Get Improvement Plan", action: "improvement_plan", primary: true },
          { label: "Compare to Peers", action: "benchmark" }
        ],
        suggestions: [
          "What training would help me most?",
          "How do I increase my project capacity?",
          "Show me successful businesses like mine"
        ]
      };
    }
    
    // Pricing help
    if (lowerQuery.includes('price') || lowerQuery.includes('bid') || lowerQuery.includes('competitive')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I can help you price strategically! Based on 2,847 similar projects, here's what I recommend:",
        timestamp: new Date(),
        data: {
          pricing: {
            suggested: "$87,500",
            confidence: "92%",
            reasoning: "Sweet spot for 73% win probability",
            competitors: "Likely range: $82k - $95k"
          }
        },
        actionButtons: [
          { label: "Optimize My Bid", action: "optimize_bid", primary: true },
          { label: "See Winning Patterns", action: "win_patterns" }
        ],
        suggestions: [
          "Help me write a compelling proposal",
          "What makes bids win in this category?",
          "How can I justify premium pricing?"
        ]
      };
    }
    
    // General business advice
    if (lowerQuery.includes('grow') || lowerQuery.includes('expand') || lowerQuery.includes('scale')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I see great potential for your growth! Based on market trends and your strengths, here's your personalized roadmap:",
        timestamp: new Date(),
        data: {
          growthPlan: {
            immediateActions: ["Apply for Infrastructure Canada certification", "Connect with 3 identified partners"],
            shortTerm: ["Expand into clean energy projects", "Build digital marketing presence"],
            longTerm: ["Regional expansion to Alberta", "Prime contractor status"]
          }
        },
        actionButtons: [
          { label: "Start Growth Plan", action: "execute_growth", primary: true },
          { label: "Find Mentors", action: "find_mentors" }
        ],
        suggestions: [
          "What's the first step I should take?",
          "How do I prepare for larger contracts?",
          "Who can help me with this journey?"
        ]
      };
    }
    
    // Default helpful response
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: "I'm here to help you succeed! I can assist with finding opportunities, connecting with partners, improving your proposals, or providing business insights. What specific challenge are you facing?",
      timestamp: new Date(),
      suggestions: [
        "Find opportunities in my field",
        "Help me improve my win rate", 
        "Connect me with potential partners",
        "Analyze my business performance"
      ]
    };
  };

  const handleVoiceInput = () => {
    if ('speechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setIsListening(!isListening);
      // Voice recognition implementation would go here
    }
  };

  const formatMessage = (message: Message) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
          {message.type === 'assistant' && (
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-xs text-white/60">Business Assistant</span>
              <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
            </div>
          )}
          
          <div className={`p-4 rounded-2xl ${
            message.type === 'user' 
              ? 'bg-blue-500/20 border border-blue-400/30' 
              : 'bg-white/5 border border-white/10'
          }`}>
            <p className="text-white text-sm leading-relaxed">{message.content}</p>
            
            {/* Data visualizations */}
            {message.data?.opportunities && (
              <div className="mt-4 space-y-2">
                {message.data.opportunities.map((opp: any, index: number) => (
                  <div key={index} className="p-3 bg-green-500/10 border border-green-400/30 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-white">{opp.title}</h4>
                        <p className="text-xs text-green-400">{opp.value} • {opp.match} match</p>
                      </div>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {message.data?.partners && (
              <div className="mt-4 space-y-2">
                {message.data.partners.map((partner: any, index: number) => (
                  <div key={index} className="p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-white">{partner.name}</h4>
                        <p className="text-xs text-purple-400">{partner.synergy} synergy • {partner.reason}</p>
                      </div>
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {message.data?.insights && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{message.data.insights.winRate}</div>
                    <div className="text-xs text-white/60">Win Rate</div>
                    <div className="text-xs text-green-400">{message.data.insights.improvement}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/60 mb-2">Top Strengths:</div>
                    {message.data.insights.strengths.slice(0, 2).map((strength: string, i: number) => (
                      <div key={i} className="text-xs text-blue-400">• {strength}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            {message.actionButtons && (
              <div className="flex flex-wrap gap-2 mt-4">
                {message.actionButtons.map((button, index) => (
                  <button
                    key={index}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      button.primary
                        ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-400/50'
                        : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/20'
                    }`}
                    onClick={() => handleSendMessage(button.action)}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            )}
            
            {/* Quick suggestions */}
            {message.suggestions && (
              <div className="mt-4">
                <div className="text-xs text-white/60 mb-2">Try asking:</div>
                <div className="flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(suggestion)}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/20 rounded-md text-xs text-white/80 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="text-xs text-white/40 mt-1 text-right">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
        
        {message.type === 'user' && (
          <div className="p-2 bg-blue-500/20 rounded-full ml-3 order-1">
            <MessageSquare className="w-4 h-4 text-blue-400" />
          </div>
        )}
      </motion.div>
    );
  };

  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <button
          onClick={onToggle}
          className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-md border border-white/20 rounded-full shadow-xl hover:scale-110 transition-all"
        >
          <Bot className="w-6 h-6 text-purple-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        </button>
      </motion.div>
    );
  }

  return (
    <GlassPanel className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Business Assistant</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-white/60">Ready to help</span>
            </div>
          </div>
        </div>
        
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-white/60" />
          </button>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(formatMessage)}
        
        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-2 p-4 bg-white/5 rounded-2xl">
                <Bot className="w-4 h-4 text-purple-400" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150" />
                </div>
                <span className="text-xs text-white/60">thinking...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick suggestions when empty */}
      {messages.length === 1 && (
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/60 mb-3">Quick starts:</div>
          <div className="grid grid-cols-2 gap-2">
            {contextualSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(suggestion)}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-xs text-white/80 text-left transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about your business..."
              className="w-full p-3 pr-12 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all"
            />
            <button
              onClick={handleVoiceInput}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                isListening ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-white/60'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim()}
            className="p-3 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/50 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4 text-blue-400" />
          </button>
        </div>
        
        <div className="flex items-center justify-center mt-2">
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Heart className="w-3 h-3 text-red-400" />
            <span>Powered by Indigenous AI • Respectful • Secure</span>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}