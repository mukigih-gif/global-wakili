import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../database/src/prisma';
import { HttpError } from '../../../../packages/core/exceptions/ErrorHandler';

/**
 * RegistryService
 * - Static methods for registry operations
 * - Uses centralized prisma instance (import path preserved)
 */
export class RegistryService {
  /**
   * Fetch a summary of matters for the firm dashboard
   */
  static async getRegistryStats(tenantId: string) {
    if (!tenantId) throw new HttpError(400, 'tenantId is required');

    try {
      // Group matters by status and return counts
      const counts = await prisma.matter.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      });

      return counts.map(stat => ({
        status: stat.status,
        count: stat._count._all,
      }));
    } catch (err: any) {
      // Map DB errors to safe HTTP errors
      console.error('RegistryService.getRegistryStats error', err);
      throw new HttpError(500, 'Failed to fetch registry statistics');
    }
  }

  /**
   * Create a new Legal Matter
   */
  static async createNewMatter(tenantId: string, advocateId: string, data: any) {
    if (!tenantId) throw new HttpError(400, 'tenantId is required');
    if (!advocateId) throw new HttpError(400, 'advocateId is required');

    // Basic server-side validation (expand with Zod in packages/common)
    if (!data?.title) throw new HttpError(422, 'title is required');

    try {
      const matter = await prisma.matter.create({
        data: {
          title: data.title,
          description: data.description ?? null,
          category: data.practiceArea ?? 'GENERAL',
          status: 'ACTIVE',
          stage: 'INTAKE',
          priority: data.priority ?? 'MEDIUM',
          tenantId,
          createdBy: advocateId,
          assignedToId: advocateId,
          trustBalance: 0,
        },
      });

      return matter;
    } catch (err: any) {
      console.error('RegistryService.createNewMatter error', err);
      // Handle unique constraint or foreign key errors explicitly if needed
      throw new HttpError(500, 'Failed to create matter');
    }
  }

  /**
   * List matters (helper used by controller)
   */
  static async listMatters(tenantId: string, opts?: { limit?: number; offset?: number }) {
    if (!tenantId) throw new HttpError(400, 'tenantId is required');

    try {
      const matters = await prisma.matter.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: opts?.limit ?? 50,
        skip: opts?.offset ?? 0,
      });
      return matters;
    } catch (err: any) {
      console.error('RegistryService.listMatters error', err);
      throw new HttpError(500, 'Failed to list matters');
    }
  }
}