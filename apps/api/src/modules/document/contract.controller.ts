import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ContractService } from './contract.service';
import { ContractVersionService } from './contract-version.service';
import { DocumentAuditService } from './DocumentAuditService';

export const createContract = asyncHandler(async (req: Request, res: Response) => {
  const contract = await ContractService.createContract(req.db, {
    tenantId: req.tenantId!,
    matterId: req.body.matterId,
    contractNumber: req.body.contractNumber,
    title: req.body.title,
    description: req.body.description ?? null,
    status: req.body.status ?? undefined,
    executionDate: req.body.executionDate ?? null,
    effectiveDate: req.body.effectiveDate ?? null,
    expiryDate: req.body.expiryDate ?? null,
    counterpartyName: req.body.counterpartyName ?? null,
    counterpartyEmail: req.body.counterpartyEmail ?? null,
    counterpartyPhone: req.body.counterpartyPhone ?? null,
    createdById: req.body.createdById ?? req.user?.sub ?? null,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: contract.matterId,
    action: 'UPLOADED',
    requestId: req.id,
    metadata: {
      domain: 'CONTRACT',
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      status: contract.status,
    },
  });

  res.status(201).json(contract);
});

export const updateContract = asyncHandler(async (req: Request, res: Response) => {
  const contract = await ContractService.updateContract(req.db, {
    tenantId: req.tenantId!,
    contractId: req.params.contractId,
    input: {
      contractNumber: req.body.contractNumber,
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      executionDate: req.body.executionDate,
      effectiveDate: req.body.effectiveDate,
      expiryDate: req.body.expiryDate,
      counterpartyName: req.body.counterpartyName,
      counterpartyEmail: req.body.counterpartyEmail,
      counterpartyPhone: req.body.counterpartyPhone,
    },
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: contract.matterId,
    action: 'EDITED',
    requestId: req.id,
    metadata: {
      domain: 'CONTRACT',
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      status: contract.status,
    },
  });

  res.status(200).json(contract);
});

export const getContractById = asyncHandler(async (req: Request, res: Response) => {
  const contract = await ContractService.getContractById(req.db, {
    tenantId: req.tenantId!,
    contractId: req.params.contractId,
  });

  if (!contract) {
    throw Object.assign(new Error('Contract not found'), {
      statusCode: 404,
      code: 'CONTRACT_NOT_FOUND',
    });
  }

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: contract.matterId,
    action: 'VIEWED',
    requestId: req.id,
    metadata: {
      domain: 'CONTRACT',
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      versionCount: Array.isArray(contract.versions) ? contract.versions.length : 0,
    },
  });

  res.status(200).json(contract);
});

export const listMatterContracts = asyncHandler(async (req: Request, res: Response) => {
  const result = await ContractService.listMatterContracts(req.db, {
    tenantId: req.tenantId!,
    matterId: req.params.matterId,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status ? String(req.query.status) : null,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: req.params.matterId,
    action: 'SEARCHED',
    requestId: req.id,
    metadata: {
      domain: 'CONTRACT',
      resultCount: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      status: req.query.status ? String(req.query.status) : null,
    },
  });

  res.status(200).json(result);
});

export const addContractVersion = asyncHandler(async (req: Request, res: Response) => {
  const version = await ContractService.addContractVersion(req.db, {
    tenantId: req.tenantId!,
    contractId: req.params.contractId,
    fileUrl: req.body.fileUrl,
    changesSummary: req.body.changesSummary ?? null,
    createdById: req.body.createdById ?? req.user?.sub ?? null,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'VERSION_CREATED',
    requestId: req.id,
    metadata: {
      domain: 'CONTRACT',
      contractId: req.params.contractId,
      versionId: version.id,
      versionNumber: version.versionNumber,
      fileUrl: version.fileUrl,
    },
  });

  res.status(201).json(version);
});

export const getLatestContractVersion = asyncHandler(async (req: Request, res: Response) => {
  const version = await ContractVersionService.getLatestVersion(req.db, {
    tenantId: req.tenantId!,
    contractId: req.params.contractId,
  });

  if (!version) {
    throw Object.assign(new Error('Contract version not found'), {
      statusCode: 404,
      code: 'CONTRACT_VERSION_NOT_FOUND',
    });
  }

  res.status(200).json(version);
});

export const getContractVersionHistory = asyncHandler(async (req: Request, res: Response) => {
  const versions = await ContractVersionService.getVersionHistory(req.db, {
    tenantId: req.tenantId!,
    contractId: req.params.contractId,
  });

  res.status(200).json({
    data: versions,
    meta: {
      total: versions.length,
    },
  });
});