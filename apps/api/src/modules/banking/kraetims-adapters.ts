type KRAEtimsSubmissionResult = {
  submitted: boolean;
  status: 'PENDING_PROVIDER';
  provider: 'KRA_ETIMS';
  payload: Record<string, unknown>;
  submittedAt: string;
  error?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class KRAEtimsAdapter {
  static async submitInvoice(invoiceData: Record<string, unknown>): Promise<KRAEtimsSubmissionResult> {
    try {
      const signedPayload = this.signPayload(invoiceData);

      return {
        submitted: false,
        status: 'PENDING_PROVIDER',
        provider: 'KRA_ETIMS',
        payload: signedPayload,
        submittedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      return {
        submitted: false,
        status: 'PENDING_PROVIDER',
        provider: 'KRA_ETIMS',
        payload: invoiceData,
        submittedAt: new Date().toISOString(),
        error: errorMessage(error),
      };
    }
  }

  private static signPayload(data: Record<string, unknown>): Record<string, unknown> {
    return {
      ...data,
      signatureStatus: 'PENDING_DEVICE_OR_PROVIDER_SIGNATURE',
    };
  }
}

export default KRAEtimsAdapter;
