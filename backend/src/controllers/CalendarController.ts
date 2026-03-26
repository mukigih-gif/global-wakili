import { Request, Response } from 'express';
import { CalendarService } from '../services/CalendarService';

export class CalendarController {
  /**
   * GET /api/calendar/feed/:userId
   * PUBLIC SECURE URL for Google/Outlook Subscription
   */
  static async getExternalFeed(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const icsContent = await CalendarService.generateIcsFeed(userId);

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="wakili-calendar-${userId}.ics"`);
      
      return res.send(icsContent);
    } catch (error) {
      return res.status(500).send("Error generating calendar feed.");
    }
  }

  /**
   * POST /api/calendar/events
   * Dashboard creation of a new event
   */
  static async create(req: Request, res: Response) {
    try {
      const event = await CalendarService.createEvent(req.body, req.user.id);
      return res.status(201).json(event);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}