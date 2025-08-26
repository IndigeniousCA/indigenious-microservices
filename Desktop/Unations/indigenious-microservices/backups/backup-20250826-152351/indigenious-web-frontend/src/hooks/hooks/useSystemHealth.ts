import { useEffect, useState } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { io, Socket } from 'socket.io-client';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  details: string;
}

interface HealthData {
  overallHealth: string;
  systems: Record<string, SystemHealth>;
  metrics: {
    activeUsers: number;
    rfqsToday: number;
    bidsToday: number;
    revenue: number;
    uptime: number;
    responseTime: number;
    errorRate: number;
    deployments: number;
  };
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
  lastDeployment: {
    version: string;
    status: string;
    time: string;
    duration: string;
  };
}

export function useSystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchHealth();

    // Set up WebSocket for real-time updates
    const ws = io('/health', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    ws.on('connect', () => {
      logger.info('Connected to health monitoring');
      setError(null);
    });

    ws.on('health:update', (data: HealthData) => {
      setHealth(data);
    });

    ws.on('alert:new', (alert) => {
      setHealth(prev => prev ? {
        ...prev,
        alerts: [alert, ...prev.alerts].slice(0, 10) // Keep last 10 alerts
      } : null);
    });

    ws.on('disconnect', () => {
      logger.info('Disconnected from health monitoring');
    });

    ws.on('error', (err) => {
      setError('Failed to connect to monitoring service');
    });

    setSocket(ws);

    // Refresh every 30 seconds as backup
    const interval = setInterval(fetchHealth, 30000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  async function fetchHealth() {
    try {
      const response = await fetch('/api/admin/health', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }

      const data = await response.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Manual refresh
  const refresh = () => {
    setLoading(true);
    fetchHealth();
  };

  // Acknowledge alert
  const acknowledgeAlert = (alertId: string) => {
    socket?.emit('alert:acknowledge', alertId);
    setHealth(prev => prev ? {
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== alertId)
    } : null);
  };

  return {
    health,
    loading,
    error,
    refresh,
    acknowledgeAlert,
    isConnected: socket?.connected || false
  };
}