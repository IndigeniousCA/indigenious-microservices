import { NextApiRequest, NextApiResponse } from 'next';
import { SwarmOrchestrator } from '../core/orchestrator/SwarmOrchestrator';
import { BusinessRepository } from '../core/storage/BusinessRepository';
import { MetricsCollector } from '../core/monitoring/MetricsCollector';

const orchestrator = new SwarmOrchestrator();
const repository = new BusinessRepository();
const metrics = new MetricsCollector();

export const handlers = {
  // GET /api/business-hunter/stats
  async getStats(req: NextApiRequest, res: NextApiResponse) {
    try {
      const stats = await metrics.getStats();
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/business-hunter/hunters
  async getHunters(req: NextApiRequest, res: NextApiResponse) {
    try {
      const hunters = await orchestrator.getHunterStatus();
      res.status(200).json(hunters);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/business-hunter/metrics
  async getMetrics(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { timeRange = '24h' } = req.query;
      const metricsData = await metrics.getMetrics(timeRange as string);
      res.status(200).json(metricsData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/business-hunter/health
  async getHealth(req: NextApiRequest, res: NextApiResponse) {
    try {
      const health = await orchestrator.getSystemHealth();
      res.status(200).json(health);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/business-hunter/hunters/:id/pause
  async pauseHunter(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { id } = req.query;
      await orchestrator.pauseHunter(id as string);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/business-hunter/hunters/:id/resume
  async resumeHunter(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { id } = req.query;
      await orchestrator.resumeHunter(id as string);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/business-hunter/hunters/:id/restart
  async restartHunter(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { id } = req.query;
      await orchestrator.restartHunter(id as string);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/business-hunter/hunters/scale
  async scaleHunters(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { type, count } = req.body;
      await orchestrator.scaleHunters(type, count);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/business-hunter/export
  async exportData(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { format, filters } = req.body;
      const data = await repository.export(format, filters);
      
      const contentType = format === 'csv' ? 'text/csv' : 
                         format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                         'application/json';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=businesses.${format}`);
      res.status(200).send(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/business-hunter/start
  async startSwarm(req: NextApiRequest, res: NextApiResponse) {
    try {
      await orchestrator.start();
      res.status(200).json({ success: true, message: 'Swarm started' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/business-hunter/stop
  async stopSwarm(req: NextApiRequest, res: NextApiResponse) {
    try {
      await orchestrator.stop();
      res.status(200).json({ success: true, message: 'Swarm stopped' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/business-hunter/businesses/search
  async searchBusinesses(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { query, filters, page = 1, limit = 50 } = req.query;
      const results = await repository.search(
        query as string,
        JSON.parse(filters as string || '{}'),
        { page: Number(page), limit: Number(limit) }
      );
      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};