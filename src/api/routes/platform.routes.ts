/**
 * DWIP Enterprise - Core Platform API Router
 * Sprint IL-001 Architecture
 * 
 * Express endpoints for Integration Layer & Core Platform administration.
 */

import { Router } from 'express';
import CorePlatform from '../../core/platform';

const router = Router();

// GET /api/platform/metrics - Overall monitoring metrics
router.get('/metrics', async (req, res) => {
  try {
    const summary = await CorePlatform.monitoring.getOverallDashboardMetrics();
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/platform/systems - List external system configurations
router.get('/systems', (req, res) => {
  try {
    const configs = CorePlatform.configuration.getAllConfigs();
    res.json({ success: true, data: configs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/platform/systems/:code - Update external system configuration
router.put('/systems/:code', (req, res) => {
  try {
    const updated = CorePlatform.configuration.updateConfig(req.params.code, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/platform/systems/:code/toggle - Toggle enable/disable
router.post('/systems/:code/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    const updated = CorePlatform.configuration.toggleSystemStatus(req.params.code, !!enabled);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/platform/sync/queue - Get sync queue items
router.get('/sync/queue', (req, res) => {
  try {
    const queue = CorePlatform.sync.getQueueItems();
    res.json({ success: true, data: queue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/platform/sync/retry - Retry queue processing
router.post('/sync/retry', async (req, res) => {
  try {
    const result = await CorePlatform.sync.retryFailedItems();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/platform/logs - Query audit API logs
router.get('/logs', (req, res) => {
  try {
    const { systemId, status, correlationId } = req.query;
    const logs = CorePlatform.audit.getLogs({
      systemId: systemId as string,
      status: status as string,
      correlationId: correlationId as string
    });
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/platform/health - Health telemetry
router.get('/health', async (req, res) => {
  try {
    const connectors = CorePlatform.integration.listRegisteredConnectors();
    const reports = await Promise.all(
      connectors.map(c => CorePlatform.integration.getConnector(c.code).healthService.checkHealth())
    );
    res.json({ success: true, data: reports });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/platform/cache - Cache statistics
router.get('/cache', async (req, res) => {
  try {
    const stats = await CorePlatform.cache.getStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/platform/cache/clear - Clear cache
router.post('/cache/clear', async (req, res) => {
  try {
    await CorePlatform.cache.clearAll();
    res.json({ success: true, message: 'Platform cache cleared successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
