import { Request, Response } from 'express';
import { ArchiveService } from '../services/ArchiveService';

export class ArchiveController {
  static async requestArchival(req: any, res: Response) {
    const { matterId } = req.params;
    const partnerId = req.user.id;

    try {
      const result = await ArchiveService.closeMatter(matterId, partnerId);
      res.json({
        success: true,
        message: "Matter successfully validated and moved to archives.",
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}