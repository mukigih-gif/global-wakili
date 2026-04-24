// apps/api/src/modules/compliance/ComplianceGoAMLBridgeService.ts

import { STRService } from '../integrations/goaml/STRService';
import { ComplianceReportService } from './ComplianceReportService';

export class ComplianceGoAMLBridgeService {
  static async submitReport(
    db: any,
    params: {
      tenantId: string;
      complianceReportId: string;
      requestId?: string | null;
    },
  ) {
    const report = await ComplianceReportService.getReport(db, {
      tenantId: params.tenantId,
      reportId: params.complianceReportId,
    });

    if (report.reportType !== 'STR') {
      throw Object.assign(
        new Error('Only STR reports are currently supported by the goAML bridge'),
        {
          statusCode: 422,
          code: 'COMPLIANCE_GOAML_REPORT_TYPE_UNSUPPORTED',
          details: {
            reportType: report.reportType,
          },
        },
      );
    }

    return STRService.submitReport(db, {
      tenantId: params.tenantId,
      complianceReportId: params.complianceReportId,
      requestId: params.requestId ?? null,
    });
  }

  static async syncReportStatus(
    db: any,
    params: {
      tenantId: string;
      complianceReportId: string;
      requestId?: string | null;
    },
  ) {
    const report = await ComplianceReportService.getReport(db, {
      tenantId: params.tenantId,
      reportId: params.complianceReportId,
    });

    if (report.reportType !== 'STR') {
      throw Object.assign(
        new Error('Only STR reports are currently supported by the goAML status bridge'),
        {
          statusCode: 422,
          code: 'COMPLIANCE_GOAML_REPORT_TYPE_UNSUPPORTED',
          details: {
            reportType: report.reportType,
          },
        },
      );
    }

    return STRService.syncReportStatus(db, {
      tenantId: params.tenantId,
      complianceReportId: params.complianceReportId,
    });
  }
}

export default ComplianceGoAMLBridgeService;