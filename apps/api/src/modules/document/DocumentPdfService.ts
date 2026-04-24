// apps/api/src/modules/document/DocumentPdfService.ts

function isPdfRenderingEnabled(): boolean {
  return process.env.DOCUMENT_PDF_RENDERER_ENABLED === 'true';
}

function assertPdfRenderingEnabled(): void {
  if (!isPdfRenderingEnabled()) {
    throw Object.assign(
      new Error('PDF rendering is not configured for this environment'),
      {
        statusCode: 501,
        code: 'DOCUMENT_PDF_RENDERER_NOT_CONFIGURED',
      },
    );
  }
}

function assertPdfBuffer(buffer: Buffer): void {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error('PDF buffer is missing or empty'), {
      statusCode: 422,
      code: 'DOCUMENT_PDF_BUFFER_REQUIRED',
    });
  }

  const header = buffer.subarray(0, 5).toString('utf-8');

  if (header !== '%PDF-') {
    throw Object.assign(new Error('Invalid PDF buffer'), {
      statusCode: 422,
      code: 'DOCUMENT_INVALID_PDF_BUFFER',
    });
  }
}

export class DocumentPdfService {
  static async renderHtmlToPdfBuffer(params: {
    html: string;
    watermarkText?: string | null;
  }): Promise<Buffer> {
    assertPdfRenderingEnabled();

    if (!params.html?.trim()) {
      throw Object.assign(new Error('HTML content is required for PDF rendering'), {
        statusCode: 422,
        code: 'DOCUMENT_PDF_HTML_REQUIRED',
      });
    }

    throw Object.assign(
      new Error('PDF rendering adapter is not yet implemented'),
      {
        statusCode: 501,
        code: 'DOCUMENT_PDF_RENDER_ADAPTER_NOT_IMPLEMENTED',
      },
    );
  }

  static async addWatermark(params: {
    pdfBuffer: Buffer;
    watermarkText: string;
  }): Promise<Buffer> {
    assertPdfRenderingEnabled();
    assertPdfBuffer(params.pdfBuffer);

    if (!params.watermarkText?.trim()) {
      throw Object.assign(new Error('Watermark text is required'), {
        statusCode: 422,
        code: 'DOCUMENT_PDF_WATERMARK_REQUIRED',
      });
    }

    throw Object.assign(
      new Error('PDF watermark adapter is not yet implemented'),
      {
        statusCode: 501,
        code: 'DOCUMENT_PDF_WATERMARK_ADAPTER_NOT_IMPLEMENTED',
      },
    );
  }

  static async flattenPdf(params: {
    pdfBuffer: Buffer;
  }): Promise<Buffer> {
    assertPdfRenderingEnabled();
    assertPdfBuffer(params.pdfBuffer);

    throw Object.assign(
      new Error('PDF flattening adapter is not yet implemented'),
      {
        statusCode: 501,
        code: 'DOCUMENT_PDF_FLATTEN_ADAPTER_NOT_IMPLEMENTED',
      },
    );
  }
}