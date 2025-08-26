/**
 * MCP Workflow Hook
 * Provides React integration for MCP workflow execution
 */

import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { mcpClient, contextProvider } from '@/lib/mcp/client-config';
import { authBridge } from '@/lib/mcp/auth-bridge';
import { useUser } from '@supabase/auth-helpers-react';
import { toast } from '@/lib/toast';

interface WorkflowExecution {
  id: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  result?: any;
  error?: string;
}

interface UseMCPWorkflowsReturn {
  connected: boolean;
  availableTools: unknown[];
  loading: boolean;
  error: string | null;
  executeRFQWorkflow: (rfqData: unknown) => Promise<WorkflowExecution>;
  executeCommunityProject: (projectData: unknown) => Promise<WorkflowExecution>;
  evaluateBid: (bidData: any, rfqData: any) => Promise<WorkflowExecution>;
  consultElders: (consultationData: unknown) => Promise<WorkflowExecution>;
  checkWorkflowStatus: (executionId: string) => Promise<WorkflowExecution>;
  processNaturalLanguage: (request: string) => Promise<unknown>;
}

export function useMCPWorkflows(): UseMCPWorkflowsReturn {
  const user = useUser();
  const [connected, setConnected] = useState(false);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize MCP connection
  useEffect(() => {
    const initializeMCP = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        
        // Authenticate user with MCP
        const token = await user.access_token;
        const userContext = await authBridge.authenticateUser(token);
        
        if (!userContext) {
          throw new Error('Failed to authenticate with MCP');
        }

        // Connect to MCP server
        await mcpClient.connect(process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'ws://localhost:3001');
        setConnected(true);

        // Load available tools for user
        const tools = await mcpClient.listAvailableTools();
        setAvailableTools(tools);

        // Load cultural context
        if (userContext.community) {
          await authBridge.loadCulturalContext(userContext.community);
        }

      } catch (err) {
        logger.error('MCP initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize MCP');
        toast.error('Failed to connect to workflow system');
      } finally {
        setLoading(false);
      }
    };

    initializeMCP();

    // Cleanup on unmount
    return () => {
      if (connected) {
        mcpClient.disconnect();
      }
    };
  }, [user?.id]);

  // Execute RFQ workflow
  const executeRFQWorkflow = useCallback(async (rfqData: unknown): Promise<WorkflowExecution> => {
    if (!connected) {
      throw new Error('MCP not connected');
    }

    try {
      setLoading(true);
      const userContext = contextProvider.getUserContext();
      
      const result = await mcpClient.executeTool('execute_rfq_workflow', {
        rfqData,
        context: {
          community: userContext?.community || 'Unknown',
          culturalProtocols: true,
          languagePreference: userContext?.language || 'english',
          elderConsultation: false,
          traditionKnowledgeFlags: []
        }
      });

      const execution = JSON.parse(result.content[0].text);
      toast.success('RFQ workflow started successfully');
      return execution;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute workflow';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected]);

  // Execute community project workflow
  const executeCommunityProject = useCallback(async (projectData: unknown): Promise<WorkflowExecution> => {
    if (!connected) {
      throw new Error('MCP not connected');
    }

    try {
      setLoading(true);
      const userContext = contextProvider.getUserContext();
      
      const result = await mcpClient.executeTool('execute_community_project', {
        projectData,
        context: {
          community: userContext?.community || 'Unknown',
          culturalProtocols: true,
          languagePreference: userContext?.language || 'english',
          elderConsultation: projectData.requiresElderConsultation || false
        }
      });

      const execution = JSON.parse(result.content[0].text);
      toast.success('Community project workflow initiated');
      return execution;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute workflow';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected]);

  // Evaluate bid workflow
  const evaluateBid = useCallback(async (bidData: any, rfqData: any): Promise<WorkflowExecution> => {
    if (!connected) {
      throw new Error('MCP not connected');
    }

    try {
      setLoading(true);
      const userContext = contextProvider.getUserContext();
      
      const result = await mcpClient.executeTool('evaluate_bid', {
        bidData,
        rfqData,
        context: {
          community: userContext?.community || 'Unknown',
          culturalProtocols: true
        }
      });

      const execution = JSON.parse(result.content[0].text);
      toast.success('Bid evaluation completed');
      return execution;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to evaluate bid';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected]);

  // Consult elders workflow
  const consultElders = useCallback(async (consultationData: unknown): Promise<WorkflowExecution> => {
    if (!connected) {
      throw new Error('MCP not connected');
    }

    try {
      setLoading(true);
      const userContext = contextProvider.getUserContext();
      
      const result = await mcpClient.executeTool('consult_elders', {
        consultationData,
        context: {
          community: userContext?.community || 'Unknown',
          languagePreference: userContext?.language || 'english'
        }
      });

      const execution = JSON.parse(result.content[0].text);
      toast.success('Elder consultation initiated');
      return execution;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate consultation';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected]);

  // Check workflow status
  const checkWorkflowStatus = useCallback(async (executionId: string): Promise<WorkflowExecution> => {
    if (!connected) {
      throw new Error('MCP not connected');
    }

    try {
      const result = await mcpClient.executeTool('check_workflow_status', {
        executionId
      });

      return JSON.parse(result.content[0].text);
    } catch (err) {
      logger.error('Failed to check workflow status:', err);
      throw err;
    }
  }, [connected]);

  // Process natural language request
  const processNaturalLanguage = useCallback(async (request: string): Promise<unknown> => {
    if (!connected) {
      throw new Error('MCP not connected');
    }

    try {
      setLoading(true);
      
      // Use MCP client to map natural language to tool
      const mapping = await mcpClient.processNaturalLanguageRequest(request);
      
      if (!mapping.tool) {
        toast.info('I couldn\'t understand that request. Please be more specific.');
        return null;
      }

      // Show confidence and get confirmation
      if (mapping.confidence < 0.8) {
        const confirmed = window.confirm(
          `I think you want to ${mapping.tool.replace(/_/g, ' ')}. Is that correct?`
        );
        if (!confirmed) return null;
      }

      // Execute the mapped tool
      const result = await mcpClient.executeTool(mapping.tool, mapping.suggestedArgs);
      return JSON.parse(result.content[0].text);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process request';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected]);

  return {
    connected,
    availableTools,
    loading,
    error,
    executeRFQWorkflow,
    executeCommunityProject,
    evaluateBid,
    consultElders,
    checkWorkflowStatus,
    processNaturalLanguage
  };
}