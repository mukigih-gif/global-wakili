import type {
  VendorDbClient,
  VendorInput,
} from '../vendor/vendor.types';
import { VendorService } from '../vendor/VendorService';

export class SupplierService {
  static async create(
    db: VendorDbClient,
    tenantId: string,
    input: VendorInput,
  ) {
    return VendorService.create(db, tenantId, input);
  }

  static async update(
    db: VendorDbClient,
    tenantId: string,
    supplierId: string,
    input: Partial<VendorInput>,
  ) {
    return VendorService.update(db, tenantId, supplierId, input);
  }

  static async listActive(
    db: VendorDbClient,
    tenantId: string,
  ) {
    return VendorService.listActive(db, tenantId);
  }
}
