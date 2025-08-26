import { useState, useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { DashboardStats, HunterStatus, DiscoveryMetrics, SystemHealth, RealtimeUpdate } from '../types';
import { dashboardService } from '../services/dashboardService';

interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  hunters: HunterStatus[];
  metrics: DiscoveryMetrics | null;
  health: SystemHealth | null;
  isLoading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
}

export const useDashboardData = (autoRefresh = true): UseDashboardDataReturn => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hunters, setHunters] = useState<HunterStatus[]>([]);
  const [metrics, setMetrics] = useState<DiscoveryMetrics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [statsData, huntersData, metricsData, healthData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getHunters(),
        dashboardService.getMetrics(),
        dashboardService.getHealth()
      ]);

      setStats(statsData);
      setHunters(huntersData);
      setMetrics(metricsData);
      setHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRealtimeUpdate = useCallback((update: RealtimeUpdate) => {
    switch (update.type) {
      case 'discovery':
        setStats(prev => prev ? {
          ...prev,
          totalDiscovered: prev.totalDiscovered + 1,
          discoveryRate: update.data.rate
        } : null);
        break;

      case 'validation':
        setStats(prev => prev ? {
          ...prev,
          verificationRate: update.data.rate,
          queues: {
            ...prev.queues,
            validation: update.data.queueDepth
          }
        } : null);
        break;

      case 'enrichment':
        setStats(prev => prev ? {
          ...prev,
          indigenousIdentified: update.data.indigenousCount,
          enrichmentRate: update.data.rate
        } : null);
        break;

      case 'hunter_status':
        setHunters(prev => prev.map(hunter => 
          hunter.id === update.data.hunterId 
            ? { ...hunter, ...update.data }
            : hunter
        ));
        break;

      case 'error':
        console.error('Dashboard error:', update.data);
        break;
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!autoRefresh) return;

    const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Dashboard connected to WebSocket');
      newSocket.emit('subscribe', { channel: 'dashboard' });
    });

    newSocket.on('dashboard:update', handleRealtimeUpdate);

    newSocket.on('disconnect', () => {
      console.log('Dashboard disconnected from WebSocket');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [autoRefresh, handleRealtimeUpdate]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  return {
    stats,
    hunters,
    metrics,
    health,
    isLoading,
    error,
    refreshData: fetchData
  };
};