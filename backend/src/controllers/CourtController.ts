import { Request, Response } from 'express';
import { CourtService } from '../services/CourtService';

export class CourtController {
  static async schedule(req: Request, res: Response) {
    const { matterId, hearingDate, courtName, judge } = req.body;

    if (!matterId || !hearingDate || !courtName) {
      return res.status(400).json({ error: "Matter ID, Date, and Court Name are required." });
    }

    try {
      const hearing = await CourtService.scheduleHearing(
        Number(matterId),
        new Date(hearingDate),
        courtName,
        judge
      );
      res.status(201).json(hearing);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getUpcoming(req: Request, res: Response) {
    try {
      const hearings = await CourtService.getUpcomingHearings();
      res.status(200).json(hearings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}