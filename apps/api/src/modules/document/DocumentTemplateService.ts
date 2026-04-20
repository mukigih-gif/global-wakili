import type { TenantDocumentDbClient } from './document.types';

function interpolate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const path = key.split('.');
    let value: any = variables;

    for (const segment of path) {
      value = value?.[segment];
    }

    return value === null || value === undefined ? '' : String(value);
  });
}

export class DocumentTemplateService {
  static async buildContext(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      matterId?: string | null;
    },
  ) {
    if (!params.matterId) {
      return {
        client: null,
        matter: null,
        generatedAt: new Date().toISOString(),
      };
    }

    const matter = await db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            kraPin: true,
          },
        },
      },
    });

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    return {
      client: matter.client ?? null,
      matter: {
        id: matter.id,
        title: matter.title,
        matterCode: matter.matterCode ?? null,
        status: matter.status,
        billingModel: matter.billingModel,
        metadata: matter.metadata ?? null,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  static async renderHtmlTemplate(
    db: TenantDocumentDbClient,
    params: {
      tenantId: string;
      matterId?: string | null;
      templateName: string;
      templateBody: string;
      extraContext?: Record<string, unknown>;
    },
  ) {
    const context = await this.buildContext(db, {
      tenantId: params.tenantId,
      matterId: params.matterId ?? null,
    });

    const finalContext = {
      ...context,
      ...(params.extraContext ?? {}),
    };

    return {
      templateName: params.templateName,
      html: interpolate(params.templateBody, finalContext),
      context: finalContext,
    };
  }
}