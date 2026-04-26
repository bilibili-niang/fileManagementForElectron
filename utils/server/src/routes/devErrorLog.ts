import { Router, type IRouter } from 'express';
import { DatabaseService } from '../services/databaseService';

const router: IRouter = Router();
const dbService = new DatabaseService();

router.post('/api/dev-error-log', async (req, res) => {
  try {
    await dbService.addDevErrorLog(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('[DevErrorLog] Failed to save:', error);
    res.status(200).json({ success: false });
  }
});

router.get('/api/dev-error-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20;
    const result = await dbService.getDevErrorLogs(page, pageSize);
    res.json(result);
  } catch (error) {
    console.error('[DevErrorLog] Failed to query:', error);
    res.status(500).json({ error: 'Failed to query logs' });
  }
});

router.delete('/api/dev-error-logs', async (req, res) => {
  try {
    await dbService.clearDevErrorLogs();
    res.json({ success: true });
  } catch (error) {
    console.error('[DevErrorLog] Failed to clear:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

export { router as devErrorLogRouter };
