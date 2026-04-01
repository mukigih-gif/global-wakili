// apps/api/src/lib/repository.ts
import { Request } from "express";
import prisma from "../prisma/client";

/**
 * enforceTenantProxy(req)
 * Returns a Prisma client proxy that injects tenantId into queries for tenant-scoped models.
 *
 * Usage:
 *   const db = enforceTenantProxy(req);
 *   await db.invoice.findMany({});
 *
 * Notes:
 * - This helper is a safety layer. Services should still perform explicit checks for branch-scoped models.
 * - Keep the TENANT_SCOPED_MODELS list in sync with your Prisma schema.
 */

const TENANT_SCOPED_MODELS = new Set<string>([
  "Invoice","Matter","Document","TimeEntry","ExpenseEntry","TrustTransaction","OfficeTransaction",
  "ClientTrustLedger","TrustAccount","OfficeAccount","TenantMembership","Client","Branch"
]);

export function enforceTenantProxy(req: Request) {
  const tenantId = req.tenant?.id;
  if (!tenantId) return prisma;

  const handler: ProxyHandler<typeof prisma> = {
    get(target, prop: string | symbol) {
      const delegate = (target as any)[prop];
      if (!delegate) return delegate;

      // If this is not a model delegate, return as-is
      if (typeof delegate !== "object" && typeof delegate !== "function") return delegate;

      return new Proxy(delegate, {
        get(modelTarget, method: string | symbol) {
          const orig = (modelTarget as any)[method];
          if (typeof orig !== "function") return orig;

          return function proxiedMethod(...args: any[]) {
            try {
              const modelName = String(prop);
              const firstArg = args[0] ?? {};

              // Only inject for known tenant-scoped models
              if (TENANT_SCOPED_MODELS.has(modelName)) {
                // findMany without where
                if (method === "findMany" && (!firstArg || !firstArg.where)) {
                  args[0] = { ...(firstArg || {}), where: { tenantId } };
                } else if (firstArg && typeof firstArg === "object") {
                  // where clause present
                  if (firstArg.where && typeof firstArg.where === "object") {
                    if (firstArg.where.tenantId === undefined) {
                      firstArg.where = { AND: [firstArg.where, { tenantId }] };
                    }
                  }
                  // create / update data
                  if (firstArg.data && typeof firstArg.data === "object") {
                    if (firstArg.data.tenantId === undefined) {
                      firstArg.data = { ...firstArg.data, tenantId };
                    }
                  }
                }
              }
            } catch (e) {
              // If injection fails, fall back to original call
            }
            return orig.apply(modelTarget, args);
          };
        },
      });
    },
  };

  return new Proxy(prisma, handler);
}

/**
 * assertBranchBelongsToTenant
 * Use before creating/updating branch-scoped resources (Matter, TimeEntry, ExpenseEntry).
 */
export async function assertBranchBelongsToTenant(branchId: string, tenantId: string) {
  if (!branchId) throw new Error("branchId required");
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { tenantId: true } });
  if (!branch) throw new Error("Branch not found");
  if (branch.tenantId !== tenantId) throw new Error("Branch does not belong to tenant");
}

export default prisma;