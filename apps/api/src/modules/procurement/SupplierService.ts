import type {
  TenantProcurementDbClient,
  VendorInput,
} from './procurement.types';
import { VendorService } from './VendorService';

export class SupplierService {
  static async create(
    db: TenantProcurementDbClient,
    tenantId: string,
    input: VendorInput,
  ) {
    return VendorService.create(db, tenantId, input);
  }

  static async update(
    db: TenantProcurementDbClient,
    tenantId: string,
    supplierId: string,
    input: Partial<VendorInput>,
  ) {
    return VendorService.update(db, tenantId, supplierId, input);
  }

  static async listActive(
    db: TenantProcurementDbClient,
    tenantId: string,
  ) {
    return VendorService.listActive(db, tenantId);
  }
}