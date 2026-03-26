// src/app/api/procurement/approve/route.ts
const result = await ProcurementService.approveSupplierPayment(body.id, session.user.id);