import { Request, Response } from 'express';
import { MatterService } from '../services/MatterService';

export class MatterController {
  /**
   * POST /api/matters/sync-efiling
   * Body: { documentId: number, status: string, caseNumber?: string }
   */
  static async syncEfiling(req: Request, res: Response) {
    const { documentId, status, caseNumber } = req.body;

    // 1. Basic Validation
    if (!documentId || !status) {
      return res.status(400).json({ 
        error: "Missing required fields: documentId and status are mandatory." 
      });
    }

    // 2. Call Service
    const result = await MatterService.syncEfilingStatus(
      Number(documentId), 
      status, 
      caseNumber
    );

    // 3. Response
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json({ error: result.error });
    }
  }

  /**
   * GET /api/matters/analytics/stages
   * Returns data for the Dashboard charts
   */
  static async getStageStats(req: Request, res: Response) {
    try {
      const stats = await MatterService.getStageAnalytics();
      return res.status(200).json(stats);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}