// apps/api/src/modules/platform/PlatformTicketingService.ts

import type { PlatformDbClient } from './platform.types';

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export class PlatformTicketingService {
  static async upsertTicket(db: PlatformDbClient, input: any) {
    const existing = input.id
      ? await db.platformSupportTicket.findFirst({ where: { id: input.id } })
      : null;

    const data = {
      tenantId: input.tenantId ?? null,
      requestedByTenantUserId: input.requestedByTenantUserId ?? null,
      assignedPlatformUserId: input.assignedPlatformUserId ?? null,
      status: input.status ?? 'OPEN',
      priority: input.priority ?? 'NORMAL',
      category: input.category,
      subject: input.subject,
      description: input.description,
      moduleKey: input.moduleKey ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformSupportTicket.update({ where: { id: existing.id }, data });
    }

    return db.platformSupportTicket.create({ data });
  }

  static async searchTickets(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.assignedPlatformUserId ? { assignedPlatformUserId: params.assignedPlatformUserId } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformSupportTicket.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip, take: limit }),
      db.platformSupportTicket.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async addComment(db: PlatformDbClient, input: any) {
    const ticket = await db.platformSupportTicket.findFirst({ where: { id: input.ticketId } });
    if (!ticket) {
      throw Object.assign(new Error('Support ticket not found'), { statusCode: 404, code: 'SUPPORT_TICKET_NOT_FOUND' });
    }

    return db.platformSupportTicketComment.create({
      data: {
        ticketId: input.ticketId,
        authorPlatformUserId: input.authorPlatformUserId ?? null,
        authorTenantUserId: input.authorTenantUserId ?? null,
        visibility: input.visibility,
        body: input.body,
        metadata: input.metadata ?? {},
      },
    });
  }
}