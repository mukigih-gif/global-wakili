import { env } from '../../../config/env';

export type EmailRecipient = {
  email: string;
  name?: string | null;
};

export type EmailAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

export type EmailSendInput = {
  tenantId: string;
  fromEmail: string;
  fromName?: string | null;
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  replyTo?: EmailRecipient | null;
  subject: string;
  textBody?: string | null;
  htmlBody?: string | null;
  attachments?: EmailAttachment[];
  metadata?: Record<string, unknown>;
};

export type EmailSendResult = {
  provider: 'smtp';
  accepted: boolean;
  providerMessageId: string | null;
  rawResponse?: Record<string, unknown> | null;
};

function assertRecipients(recipients: EmailRecipient[] | undefined, field: string): void {
  if (!recipients?.length) {
    throw Object.assign(new Error(`${field} recipients are required`), {
      statusCode: 400,
      code: 'NOTIFICATION_INVALID_RECIPIENTS',
      details: { field },
    });
  }
}

function assertEmailBody(input: EmailSendInput): void {
  if (!input.textBody && !input.htmlBody) {
    throw Object.assign(new Error('Either textBody or htmlBody must be provided'), {
      statusCode: 400,
      code: 'NOTIFICATION_INVALID_BODY',
    });
  }
}

export class EmailService {
  static resolveDefaultSender(tenantBranding?: {
    senderEmail?: string | null;
    senderName?: string | null;
  }) {
    return {
      fromEmail:
        tenantBranding?.senderEmail?.trim() ||
        'notifications@globalwakili.com',
      fromName:
        tenantBranding?.senderName?.trim() ||
        'Global Wakili',
    };
  }

  static async send(input: EmailSendInput): Promise<EmailSendResult> {
    assertRecipients(input.to, 'to');
    assertEmailBody(input);

    if (!env.NODE_ENV) {
      throw Object.assign(new Error('Environment not initialized correctly'), {
        statusCode: 500,
        code: 'ENV_NOT_READY',
      });
    }

    const providerMessageId = `smtp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    console.info('[EMAIL_SEND_ATTEMPT]', {
      tenantId: input.tenantId,
      fromEmail: input.fromEmail,
      to: input.to.map((r) => r.email),
      cc: input.cc?.map((r) => r.email) ?? [],
      bcc: input.bcc?.map((r) => r.email) ?? [],
      subject: input.subject,
      metadata: input.metadata ?? null,
    });

    return {
      provider: 'smtp',
      accepted: true,
      providerMessageId,
      rawResponse: {
        simulated: true,
        subject: input.subject,
      },
    };
  }
}