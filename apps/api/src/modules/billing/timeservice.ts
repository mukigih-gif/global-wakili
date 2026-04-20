import { Decimal } from '@prisma/client/runtime/library';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';

export enum TimerStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  BILLED = 'BILLED'
}

export class TimeService {
  /**
   * ⏱️ START TIMER
   * Scoped to the specific matter and user to prevent ghost entries.
   */
  static async startTimer(context: { actor: any; tenantId: string; req: any }, matterId: string) {
    const db = context.req.db;

    return await withAudit(async () => {
      // 🛡️ Warden Check: Ensure matter belongs to tenant
      const matter = await db.matter.findFirst({
        where: { id: matterId, tenantId: context.tenantId }
      });
      if (!matter) throw new Error('Matter not found');

      return await db.timeEntry.create({
        data: {
          tenantId: context.tenantId,
          matterId,
          userId: context.actor.id,
          startTime: new Date(),
          status: TimerStatus.RUNNING,
          description: 'Active Timer'
        }
      });
    }, context, { action: 'TIMER_STARTED', severity: AuditSeverity.LOW });
  }

  /**
   * ⏹️ STOP TIMER
   * Includes state guards and precision decimal math for billable hours.
   */
  static async stopTimer(context: { actor: any; tenantId: string; req: any }, entryId: string) {
    const db = context.req.db;

    return await withAudit(async () => {
      // 🛡️ Warden + State Guard
      const entry = await db.timeEntry.findFirst({
        where: { 
          id: entryId, 
          tenantId: context.tenantId, 
          userId: context.actor.id 
        }
      });

      if (!entry) throw new Error('Timer entry not found');
      if (entry.status !== TimerStatus.RUNNING) throw new Error('Timer is not active');

      const endTime = new Date();
      const diffMs = endTime.getTime() - new Date(entry.startTime).getTime();
      
      // Standardize to 2 decimal places (e.g., 0.1 hours = 6 mins)
      const hours = new Decimal(diffMs).div(3600000).toDecimalPlaces(2);

      return await db.timeEntry.update({
        where: { id: entryId },
        data: {
          endTime,
          hours,
          status: TimerStatus.STOPPED
        }
      });
    }, context, { action: 'TIMER_STOPPED', severity: AuditSeverity.INFO });
  }

  /**
   * ✍️ MANUAL ENTRY
   * Standardizes the manual capture of time with billable rates.
   */
  static async manualEntry(
    context: { actor: any; tenantId: string; req: any },
    params: {
      matterId: string;
      hours: number;
      description: string;
      rate: number;
    }
  ) {
    return await withAudit(async () => {
      return await context.req.db.timeEntry.create({
        data: {
          tenantId: context.tenantId,
          matterId: params.matterId,
          userId: context.actor.id,
          hours: new Decimal(params.hours),
          rate: new Decimal(params.rate),
          description: params.description,
          status: TimerStatus.STOPPED,
          billed: false
        }
      });
    }, context, { action: 'TIME_MANUAL_ENTRY', severity: AuditSeverity.INFO });
  }

  /**
   * 📊 PRODUCTIVITY REPORT (AGGREGATED)
   * Uses Database-level grouping for high performance.
   */
  static async getProductivity(context: { tenantId: string; req: any }) {
    const db = context.req.db;

    const stats = await db.timeEntry.groupBy({
      by: ['userId'],
      where: { 
        tenantId: context.tenantId,
        status: { in: [TimerStatus.STOPPED, TimerStatus.BILLED] }
      },
      _sum: {
        hours: true
      }
    });

    return stats.map(s => ({
      userId: s.userId,
      totalHours: new Decimal(s._sum.hours || 0).toNumber()
    }));
  }
}