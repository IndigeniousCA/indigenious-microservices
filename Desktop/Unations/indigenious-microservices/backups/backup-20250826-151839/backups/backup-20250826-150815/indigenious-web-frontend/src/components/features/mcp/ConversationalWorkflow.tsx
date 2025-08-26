'use client';

import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { useMCPWorkflows } from '@/hooks/useMCPWorkflows';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Zap,
  FileText,
  Users as UsersIcon,
  Building2,
  DollarSign,
  Shield,
  Mic,
  MicOff
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'thinking' | 'executing' | 'completed' | 'error';
  workflow?: {
    name: string;
    id: string;
    result?: any;
  };
  suggestions?: string[];
}

interface WorkflowIntent {
  type: string;
  confidence: number;
  parameters: Record<string, any>;
  suggestedWorkflow: string;
}

const EXAMPLE_PROMPTS = [
  {
    category: 'RFQ Management',
    icon: FileText,
    prompts: [
      "Review and approve RFQ #12345",
      "Show me all pending RFQs over $100k",
      "Create a new RFQ for construction services",
      "Find RFQs that match Mikisew Construction capabilities"
    ]
  },
  {
    category: 'Compliance',
    icon: Shield,
    prompts: [
      "Check if ABC Corp meets Indigenous content requirements",
      "Verify business certification for Eagle Enterprises",
      "Run compliance audit on recent contract awards",
      "Show businesses with expiring certifications"
    ]
  },
  {
    category: 'Analytics',
    icon: DollarSign,
    prompts: [
      "Generate procurement report for Q4 2024",
      "How many jobs were created last month?",
      "Show Indigenous business growth in Alberta",
      "What's our progress toward the 5% target?"
    ]
  },
  {
    category: 'Business Support',
    icon: Building2,
    prompts: [
      "Find mentorship programs for tech startups",
      "What funding is available for construction businesses?",
      "Match my business with relevant RFQs",
      "Help me complete my business profile"
    ]
  }
];

import AssistantSelector from '@/components/features/ai/AssistantSelector';
import { assistantManager } from '@/lib/ai/role-specific-assistants';
import type { AssistantPersonality } from '@/lib/ai/role-specific-assistants';

export default function ConversationalWorkflow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantPersonality | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { processNaturalLanguage, executeRFQWorkflow, connected, loading } = useMCPWorkflows();

  // Initialize with assistant greeting
  const handleAssistantSelect = (assistant: AssistantPersonality) => {
    setCurrentAssistant(assistant);
    
    // Add assistant's greeting as first message
    const greetingMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: assistant.greeting,
      timestamp: new Date(),
      suggestions: assistant.role === 'business_owner' 
        ? ["Browse current RFQs", "Update my profile", "Find funding", "Get certified"]
        : assistant.role === 'government_official'
        ? ["View procurement metrics", "Find Indigenous suppliers", "Check compliance", "Generate reports"]
        : ["Get started", "Learn more", "View opportunities", "Ask a question"]
    };
    
    setMessages([greetingMessage]);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Natural Language Understanding
  const analyzeIntent = async (userInput: string): Promise<WorkflowIntent> => {
    const input = userInput.toLowerCase();
    
    // RFQ approval patterns
    if (input.includes('approve') && input.includes('rfq')) {
      const rfqMatch = input.match(/rfq\s*#?\s*(\d+)/i);
      return {
        type: 'rfq_approval',
        confidence: 0.9,
        parameters: { rfqId: rfqMatch?.[1] || null },
        suggestedWorkflow: 'execute_rfq_workflow'
      };
    }
    
    // Compliance check patterns
    if ((input.includes('check') || input.includes('verify')) && 
        (input.includes('compliance') || input.includes('certification'))) {
      const businessMatch = input.match(/for\s+([A-Za-z\s]+?)(?:\s+corp|\s+inc|\s+ltd|$)/i);
      return {
        type: 'compliance_check',
        confidence: 0.85,
        parameters: { businessName: businessMatch?.[1]?.trim() || null },
        suggestedWorkflow: 'check_compliance'
      };
    }
    
    // Analytics patterns
    if ((input.includes('report') || input.includes('analytics') || input.includes('show')) &&
        (input.includes('procurement') || input.includes('jobs') || input.includes('business'))) {
      return {
        type: 'analytics_report',
        confidence: 0.8,
        parameters: { 
          reportType: input.includes('jobs') ? 'jobs' : 'procurement',
          period: input.includes('month') ? 'monthly' : 'quarterly'
        },
        suggestedWorkflow: 'generate_analytics'
      };
    }
    
    // Opportunity matching
    if (input.includes('match') || input.includes('find') || input.includes('opportunities')) {
      return {
        type: 'opportunity_match',
        confidence: 0.75,
        parameters: { 
          businessType: input.includes('construction') ? 'construction' : 'general'
        },
        suggestedWorkflow: 'match_opportunities'
      };
    }
    
    // Default: AI discovery
    return {
      type: 'unknown',
      confidence: 0.3,
      parameters: { query: userInput },
      suggestedWorkflow: 'discover_workflow'
    };
  };

  // Handle message submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Add thinking message
    const thinkingMessage: Message = {
      id: Date.now().toString() + '-thinking',
      role: 'assistant',
      content: 'Analyzing your request...',
      timestamp: new Date(),
      status: 'thinking'
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      // Analyze user intent
      const intent = await analyzeIntent(userMessage.content);
      
      // Update thinking message with intent
      setMessages(prev => prev.map(msg => 
        msg.id === thinkingMessage.id
          ? { 
              ...msg, 
              content: `I understand you want to ${intent.type.replace(/_/g, ' ')}. Let me execute that workflow for you.`,
              status: 'executing'
            }
          : msg
      ));

      // Execute workflow based on intent
      let result;
      if (intent.confidence > 0.7 && intent.suggestedWorkflow === 'execute_rfq_workflow') {
        result = await executeRFQWorkflow(intent.parameters);
      } else {
        // Use natural language processing for unknown intents
        result = await processNaturalLanguage(userMessage.content);
      }

      // Process result and create response
      const responseContent = formatWorkflowResult(intent, result);
      const suggestions = generateSuggestions(intent, result);

      // Update with final result
      setMessages(prev => prev.map(msg => 
        msg.id === thinkingMessage.id
          ? {
              ...msg,
              content: responseContent,
              status: 'completed',
              workflow: {
                name: intent.type,
                id: intent.suggestedWorkflow,
                result
              },
              suggestions
            }
          : msg
      ));

    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === thinkingMessage.id
          ? {
              ...msg,
              content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your request.`,
              status: 'error'
            }
          : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  // Format workflow results for display
  const formatWorkflowResult = (intent: WorkflowIntent, result: any): string => {
    switch (intent.type) {
      case 'rfq_approval':
        return result?.approved 
          ? `✅ RFQ #${intent.parameters.rfqId} has been successfully approved! The supplier will be notified shortly.`
          : `❌ RFQ #${intent.parameters.rfqId} was not approved. ${result?.reason || 'Please review the requirements.'}`;
      
      case 'compliance_check':
        return result?.compliant
          ? `✅ ${intent.parameters.businessName} is fully compliant with all Indigenous procurement requirements.`
          : `⚠️ ${intent.parameters.businessName} has compliance issues: ${result?.issues?.join(', ') || 'Please review certification status.'}`;
      
      case 'analytics_report':
        return `📊 ${intent.parameters.reportType === 'jobs' ? 'Job Creation' : 'Procurement'} Report Generated:\n\n` +
          `• Total Value: $${result?.totalValue?.toLocaleString() || '0'}\n` +
          `• ${intent.parameters.reportType === 'jobs' ? 'Jobs Created' : 'Contracts Awarded'}: ${result?.count || 0}\n` +
          `• Growth Rate: ${result?.growthRate || 0}%\n` +
          `• Indigenous Content: ${result?.indigenousContent || 0}%`;
      
      case 'opportunity_match':
        if (result?.opportunities?.length > 0) {
          return `🎯 Found ${result.opportunities.length} matching opportunities:\n\n` +
            result.opportunities.slice(0, 3).map((opp: any) => 
              `• ${opp.title} - $${opp.value?.toLocaleString() || 'TBD'} (Closes: ${opp.closeDate})`
            ).join('\n');
        }
        return '📭 No matching opportunities found at this time. Try broadening your search criteria.';
      
      default:
        return result?.message || 'Workflow executed successfully.';
    }
  };

  // Generate contextual suggestions
  const generateSuggestions = (intent: WorkflowIntent, result: any): string[] => {
    switch (intent.type) {
      case 'rfq_approval':
        return [
          "Show me more pending RFQs",
          "View RFQ details",
          "Check supplier compliance",
          "Generate RFQ report"
        ];
      
      case 'compliance_check':
        return [
          "Check another business",
          "View certification requirements",
          "Send compliance reminder",
          "Generate compliance report"
        ];
      
      case 'analytics_report':
        return [
          "Show detailed breakdown",
          "Compare to last period",
          "Export report as PDF",
          "Schedule regular reports"
        ];
      
      default:
        return [
          "Try another workflow",
          "Get help with workflows",
          "View all capabilities",
          "Contact support"
        ];
    }
  };

  // Voice input handling
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please use Chrome.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Process message with assistant context
  const processWithAssistant = async (userMessage: string, intent: WorkflowIntent) => {
    if (!currentAssistant) return null;

    try {
      const result = await assistantManager.processMessageWithAssistant(
        'current-user-id', // This should come from auth context
        userMessage,
        messages.slice(-5).map(m => ({ role: m.role, content: m.content }))
      );
      
      return result;
    } catch (error) {
      logger.error('Assistant processing error:', error);
      return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Assistant Header */}
      <div className="border-b border-white/20 p-4">
        <AssistantSelector
          userId="current-user-id" // This should come from auth context
          onAssistantSelect={handleAssistantSelect}
          currentAssistant={currentAssistant || undefined}
          allowChange={true}
        />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    currentAssistant?.avatar ? (
                      <span className="text-lg">{currentAssistant.avatar}</span>
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )
                  )}
                </div>

                {/* Message Content */}
                <GlassPanel className={`p-4 ${
                  message.role === 'user' ? 'bg-blue-500/20' : 'bg-white/10'
                }`}>
                  {/* Status indicator */}
                  {message.status && (
                    <div className="flex items-center gap-2 mb-2 text-sm">
                      {message.status === 'thinking' && (
                        <>
                          <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                          <span className="text-yellow-400">Analyzing request...</span>
                        </>
                      )}
                      {message.status === 'executing' && (
                        <>
                          <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                          <span className="text-blue-400">Executing workflow...</span>
                        </>
                      )}
                      {message.status === 'completed' && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-green-400">Completed</span>
                        </>
                      )}
                      {message.status === 'error' && (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <span className="text-red-400">Error</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Message text */}
                  <div className="text-white whitespace-pre-wrap">{message.content}</div>

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <div className="text-xs text-white/60 mb-2">Suggested actions:</div>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => setInput(suggestion)}
                            className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-xs text-white/50 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </GlassPanel>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Example Prompts */}
      {messages.length === 1 && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXAMPLE_PROMPTS.map((category) => (
              <GlassPanel key={category.category} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <category.icon className="h-5 w-5 text-purple-400" />
                  <h4 className="text-white font-semibold">{category.category}</h4>
                </div>
                <div className="space-y-2">
                  {category.prompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(prompt)}
                      className="w-full text-left text-sm px-3 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-white/20 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask me to execute a workflow... (e.g., 'Approve RFQ #12345' or 'Check compliance for Eagle Enterprises')"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-purple-400/50 resize-none"
              rows={1}
              disabled={isProcessing}
            />
            
            {/* Voice input button */}
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`absolute right-2 top-3 p-2 rounded-lg transition-colors ${
                isListening 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
              disabled={isProcessing}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>
          
          <GlassButton
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="px-6"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </GlassButton>
        </form>
        
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-white/50">
            Press Enter to send, Shift+Enter for new line
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Zap className="h-3 w-3" />
            Powered by MCP + AI
          </div>
        </div>
      </div>
    </div>
  );
}