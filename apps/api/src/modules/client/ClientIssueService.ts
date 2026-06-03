/**
 * ClientIssueService.ts
 *
 * Tenant-level client issues ticketing.
 * Clients raise issues with the law firm through the client portal or directly.
 * Distinct from PlatformSupportTicket (Global Wakili → law firm support).
 *
 * Both are needed:
 *   PlatformSupportTicket = Super Admin → law firm (technical/billing help)
 *   ClientIssue           = Law firm client → law firm (matter/billing/complaint)
 */

type IssueDbClient = {
  clientIssue: {
    create:    (args: unknown) => Promise<unknown>;
    update:    (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown | null>;
    findMany:  (args: unknown) => Promise<unknown[]>;
    count:     (args: unknown) => Promise<number>;
  };
  clientIssueComment: {
    create:   (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    count:    (args: unknown) => Promise<number>;
  };
  client: { findFirst: (args: unknown) => Promise<unknown | null> };
  user:   { findFirst: (args: unknown) => Promise<unknown | null> };
};

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), { statusCode: 400, code: 'ISSUE_TENANT_REQUIRED' });
  }
}

function pageOf(page?: number, limit?: number) {
  const p = page && page > 0 ? page : 1;
  const l = limit && limit > 0 ? Math.min(limit, 100) : 25;
  return { page: p, limit: l, skip: (p - 1) * l };
}

type CreateIssueInput = {
  tenantId: string;
  clientId: string;
  matterId?: string | null;
  raisedByUserId?: string | null;
  assignedToId?: string | null;
  subject: string;
  description: string;
  category?: string;
  priority?: string;
};

type UpdateIssueInput = {
  tenantId: string;
  issueId: string;
  actorId: string;
  status?: string;
  priority?: string;
  assignedToId?: string | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  firstResponseAt?: Date | null;
};

export class ClientIssueService {
  static async createIssue(db: IssueDbClient, input: CreateIssueInput) {
    assertTenant(input.tenantId);

    if (!input.subject?.trim()) {
      throw Object.assign(new Error('Issue subject is required'), { statusCode: 422, code: 'ISSUE_SUBJECT_REQUIRED' });
    }
    if (!input.description?.trim()) {
      throw Object.assign(new Error('Issue description is required'), { statusCode: 422, code: 'ISSUE_DESCRIPTION_REQUIRED' });
    }

    const client = await db.client.findFirst({ where: { tenantId: input.tenantId, id: input.clientId } });
    if (!client) {
      throw Object.assign(new Error('Client not found'), { statusCode: 404, code: 'ISSUE_CLIENT_NOT_FOUND' });
    }

    return db.clientIssue.create({
      data: {
        tenantId: input.tenantId,
        clientId: input.clientId,
        matterId: input.matterId ?? null,
        raisedByUserId: input.raisedByUserId ?? null,
        assignedToId: input.assignedToId ?? null,
        subject: input.subject.trim(),
        description: input.description.trim(),
        category: input.category ?? 'GENERAL',
        priority: input.priority ?? 'NORMAL',
        status: 'OPEN',
      },
      include: {
        client: { select: { id: true, name: true, clientCode: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        raisedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async getIssue(db: IssueDbClient, params: { tenantId: string; issueId: string }) {
    assertTenant(params.tenantId);
    const issue = await db.clientIssue.findFirst({
      where: { tenantId: params.tenantId, id: params.issueId },
      include: {
        client: { select: { id: true, name: true, clientCode: true, email: true } },
        matter: { select: { id: true, title: true, matterCode: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        raisedBy: { select: { id: true, name: true, email: true } },
        comments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true, email: true } } } },
      },
    } as any);

    if (!issue) throw Object.assign(new Error('Client issue not found'), { statusCode: 404, code: 'ISSUE_NOT_FOUND' });
    return issue;
  }

  static async searchIssues(db: IssueDbClient, params: {
    tenantId: string;
    clientId?: string | null;
    status?: string | null;
    priority?: string | null;
    assignedToId?: string | null;
    page?: number;
    limit?: number;
  }) {
    assertTenant(params.tenantId);
    const { page, limit, skip } = pageOf(params.page, params.limit);

    const where: Record<string, unknown> = { tenantId: params.tenantId };
    if (params.clientId)    where.clientId    = params.clientId;
    if (params.status)      where.status      = params.status;
    if (params.priority)    where.priority    = params.priority;
    if (params.assignedToId) where.assignedToId = params.assignedToId;

    const [data, total] = await Promise.all([
      db.clientIssue.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, clientCode: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      } as any),
      db.clientIssue.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async updateIssue(db: IssueDbClient, input: UpdateIssueInput) {
    assertTenant(input.tenantId);

    const existing = await db.clientIssue.findFirst({ where: { tenantId: input.tenantId, id: input.issueId } });
    if (!existing) throw Object.assign(new Error('Client issue not found'), { statusCode: 404, code: 'ISSUE_NOT_FOUND' });

    const data: Record<string, unknown> = {};
    if (input.status      !== undefined) data.status      = input.status;
    if (input.priority    !== undefined) data.priority    = input.priority;
    if (input.assignedToId !== undefined) data.assignedToId = input.assignedToId;
    if (input.resolvedAt  !== undefined) data.resolvedAt  = input.resolvedAt;
    if (input.closedAt    !== undefined) data.closedAt    = input.closedAt;
    if (input.firstResponseAt !== undefined) data.firstResponseAt = input.firstResponseAt;

    if (input.status === 'RESOLVED' && !(existing as any).resolvedAt) data.resolvedAt = new Date();
    if (input.status === 'CLOSED'   && !(existing as any).closedAt)   data.closedAt   = new Date();

    return db.clientIssue.update({ where: { id: input.issueId } as any, data });
  }

  static async addComment(db: IssueDbClient, input: {
    tenantId: string;
    issueId: string;
    userId: string;
    body: string;
    isInternal?: boolean;
  }) {
    assertTenant(input.tenantId);
    if (!input.body?.trim()) throw Object.assign(new Error('Comment body is required'), { statusCode: 422, code: 'ISSUE_COMMENT_REQUIRED' });

    const issue = await db.clientIssue.findFirst({ where: { tenantId: input.tenantId, id: input.issueId } });
    if (!issue) throw Object.assign(new Error('Client issue not found'), { statusCode: 404, code: 'ISSUE_NOT_FOUND' });

    // Auto-set firstResponseAt for staff comments
    if (!(issue as any).firstResponseAt && !input.isInternal) {
      await db.clientIssue.update({ where: { id: input.issueId } as any, data: { firstResponseAt: new Date() } });
    }

    return db.clientIssueComment.create({
      data: {
        tenantId: input.tenantId,
        issueId: input.issueId,
        userId: input.userId,
        body: input.body.trim(),
        isInternal: input.isInternal ?? false,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    } as any);
  }

  static async getComments(db: IssueDbClient, params: {
    tenantId: string;
    issueId: string;
    includeInternal?: boolean;
  }) {
    const where: Record<string, unknown> = {
      tenantId: params.tenantId,
      issueId: params.issueId,
    };
    if (!params.includeInternal) where.isInternal = false;

    return db.clientIssueComment.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    } as any);
  }
}

export default ClientIssueService;
