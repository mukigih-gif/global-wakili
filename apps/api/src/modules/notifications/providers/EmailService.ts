/**
 * providers/EmailService.ts
 *
 * Real SMTP email delivery via Nodemailer.
 *
 * Behaviour:
 *   - When SMTP_HOST is set: sends via configured SMTP server (production).
 *   - When SENDGRID_API_KEY is set (and SMTP_HOST is absent): sends via
 *     SendGrid SMTP relay on smtp.sendgrid.net:587.
 *   - Otherwise: simulation mode (dev/test — logs to console, returns accepted:true).
 *
 * Required env vars (production):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   or SENDGRID_API_KEY
 *
 * Optional:
 *   SMTP_SECURE=true          — use TLS (default false for port 587)
 *   SMTP_FROM_EMAIL           — default sender address
 *   NOTIFICATION_FROM_EMAIL   — fallback sender address
 *
 * WIP-002 — Gap 006.
 */

import nodemailer from 'nodemailer';

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
  provider: 'smtp' | 'sendgrid' | 'simulated';
  accepted: boolean;
  providerMessageId: string | null;
  rawResponse?: Record<string, unknown> | null;
};

function toAddressList(recipients?: EmailRecipient[] | null): string[] {
  return (recipients ?? []).map((r) =>
    r.name ? `"${r.name}" <${r.email}>` : r.email,
  );
}

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

function resolveTransporter(): { transporter: nodemailer.Transporter; provider: 'smtp' | 'sendgrid' } | null {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();

  if (smtpHost) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      },
    });
    return { transporter, provider: 'smtp' };
  }

  if (sendgridKey) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: sendgridKey,
      },
    });
    return { transporter, provider: 'sendgrid' };
  }

  return null;
}

export class EmailService {
  static resolveDefaultSender(tenantBranding?: {
    senderEmail?: string | null;
    senderName?: string | null;
  }) {
    return {
      fromEmail:
        tenantBranding?.senderEmail?.trim() ||
        process.env.NOTIFICATION_FROM_EMAIL ||
        process.env.SMTP_FROM_EMAIL ||
        'notifications@globalwakili.com',
      fromName:
        tenantBranding?.senderName?.trim() ||
        'Global Wakili',
    };
  }

  static async send(input: EmailSendInput): Promise<EmailSendResult> {
    assertRecipients(input.to, 'to');
    assertEmailBody(input);

    const resolved = resolveTransporter();

    if (!resolved) {
      // Simulation mode — no SMTP credentials configured
      const providerMessageId = `sim-email-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      console.info('[EMAIL] Simulation mode (no SMTP_HOST or SENDGRID_API_KEY configured)', {
        tenantId: input.tenantId,
        to: input.to.map((r) => r.email),
        subject: input.subject,
      });
      return {
        provider: 'simulated',
        accepted: true,
        providerMessageId,
        rawResponse: { simulated: true, providerMode: 'SIMULATED_SMTP', deliveryClaim: 'ACCEPTED_BY_FOUNDATION_PROVIDER_ONLY' },
      };
    }

    const { transporter, provider } = resolved;

    const from = input.fromName
      ? `"${input.fromName}" <${input.fromEmail}>`
      : input.fromEmail;

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to: toAddressList(input.to),
      ...(input.cc?.length ? { cc: toAddressList(input.cc) } : {}),
      ...(input.bcc?.length ? { bcc: toAddressList(input.bcc) } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo.email } : {}),
      subject: input.subject,
      ...(input.textBody ? { text: input.textBody } : {}),
      ...(input.htmlBody ? { html: input.htmlBody } : {}),
      ...(input.attachments?.length
        ? {
            attachments: input.attachments.map((a) => ({
              filename: a.filename,
              contentType: a.contentType,
              content: Buffer.from(a.contentBase64, 'base64'),
            })),
          }
        : {}),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      const providerMessageId: string = info.messageId ?? `${provider}-${Date.now()}`;

      console.info('[EMAIL] Sent', {
        tenantId: input.tenantId,
        provider,
        providerMessageId,
        to: input.to.map((r) => r.email),
        subject: input.subject,
      });

      return {
        provider,
        accepted: true,
        providerMessageId,
        rawResponse: {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[EMAIL] Send failed', { tenantId: input.tenantId, provider, error: msg });
      return {
        provider,
        accepted: false,
        providerMessageId: null,
        rawResponse: { error: msg, provider },
      };
    }
  }
}
