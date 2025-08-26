import { DashboardStats, HunterStatus, DiscoveryMetrics, SystemHealth } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/business-hunter';

export class DashboardService {
  private async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getStats(): Promise<DashboardStats> {
    return this.fetchJson<DashboardStats>(`${API_BASE}/stats`);
  }

  async getHunters(): Promise<HunterStatus[]> {
    return this.fetchJson<HunterStatus[]>(`${API_BASE}/hunters`);
  }

  async getMetrics(timeRange = '24h'): Promise<DiscoveryMetrics> {
    return this.fetchJson<DiscoveryMetrics>(`${API_BASE}/metrics?timeRange=${timeRange}`);
  }

  async getHealth(): Promise<SystemHealth> {
    return this.fetchJson<SystemHealth>(`${API_BASE}/health`);
  }

  async exportData(options: {
    format: 'csv' | 'json' | 'excel';
    filters?: any;
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  async getHunterLogs(hunterId: string, limit = 100): Promise<any[]> {
    return this.fetchJson<any[]>(`${API_BASE}/hunters/${hunterId}/logs?limit=${limit}`);
  }

  async pauseHunter(hunterId: string): Promise<void> {
    await this.fetchJson(`${API_BASE}/hunters/${hunterId}/pause`, {
      method: 'POST'
    });
  }

  async resumeHunter(hunterId: string): Promise<void> {
    await this.fetchJson(`${API_BASE}/hunters/${hunterId}/resume`, {
      method: 'POST'
    });
  }

  async restartHunter(hunterId: string): Promise<void> {
    await this.fetchJson(`${API_BASE}/hunters/${hunterId}/restart`, {
      method: 'POST'
    });
  }

  async scaleHunters(type: string, count: number): Promise<void> {
    await this.fetchJson(`${API_BASE}/hunters/scale`, {
      method: 'POST',
      body: JSON.stringify({ type, count })
    });
  }

  async clearQueue(queueName: string): Promise<void> {
    await this.fetchJson(`${API_BASE}/queues/${queueName}/clear`, {
      method: 'DELETE'
    });
  }

  async reprocessFailed(): Promise<void> {
    await this.fetchJson(`${API_BASE}/reprocess-failed`, {
      method: 'POST'
    });
  }
}

export const dashboardService = new DashboardService();