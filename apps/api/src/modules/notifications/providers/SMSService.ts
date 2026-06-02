/**
 * providers/SMSService.ts
 *
 * Real SMS delivery via Africa's Talking (primary) or Twilio (fallback).
 *
 * Behaviour:
 *   - When AT_API_KEY + AT_USERNAME set: sends via Africa's Talking (Kenya primary).
 *   - When TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN set (and AT absent): sends via Twilio.
 *   - Otherwise: simulation mode (dev/test — logs to console, returns accepted:true).
 *
 * Required env vars (production — choose one provider):
 *   Africa's Talking: AT_API_KEY, AT_USERNAME
 *   Twilio:           TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *
 * Optional:
 *   SMS_SENDER_ID / NOTIFICATION_SMS_SENDER_ID — alphanumeric sender ID (AT only)
 *
 * Phone number format: E.164 (+254XXXXXXXXX for Kenya).
 * This service normalises numbers — strips spaces, ensures leading +.
 *
 * WIP-002 — Gap 006.
 */

import AfricasTalking from 'africastalking';

export type SMSRecipient = {
  phoneNumber: string;
  name?: string | null;
};

export type SMSSendInput = {
  tenantId: string;
  senderId?: string | null;
  recipients: SMSRecipient[];
  message: string;
  metadata?: Record<string, unknown>;
};

export type SMSSendResult = {
  provider: 'africastalking' | 'twilio' | 'simulated';
  accepted: boolean;
  providerMessageIds: string[];
  rawResponse?: Record<string, unknown> | null;
};

function normalizePhone(phone: string): string {
  const stripped = phone.replace(/\s+/g, '').trim();
  if (stripped.startsWith('+')) return stripped;
  if (stripped.startsWith('0')) return `+254${stripped.slice(1)}`;
  return `+${stripped}`;
}

async function sendViaAfricasTalking(input: SMSSendInput): Promise<SMSSendResult> {
  const at = AfricasTalking({
    apiKey: process.env.AT_API_KEY!,
    username: process.env.AT_USERNAME!,
  });

  const sms = at.SMS;
  const to = input.recipients.map((r) => normalizePhone(r.phoneNumber));
  const senderId = input.senderId?.trim() ||
    process.env.NOTIFICATION_SMS_SENDER_ID ||
    process.env.SMS_SENDER_ID ||
    'GlobalWakili';

  const result = await sms.send({
    to,
    message: input.message,
    from: senderId,
  });

  const recipients: Array<{ messageId?: string; statusCode?: string }> =
    result?.SMSMessageData?.Recipients ?? [];

  const accepted = recipients.some((r) => r.statusCode === '101');
  const providerMessageIds = recipients
    .filter((r) => r.messageId)
    .map((r) => r.messageId!);

  console.info('[SMS] Africa\'s Talking sent', {
    tenantId: input.tenantId,
    count: to.length,
    accepted,
    providerMessageIds,
  });

  return {
    provider: 'africastalking',
    accepted,
    providerMessageIds: providerMessageIds.length ? providerMessageIds : [`at-${Date.now()}`],
    rawResponse: (result?.SMSMessageData as Record<string, unknown>) ?? null,
  };
}

async function sendViaTwilio(input: SMSSendInput): Promise<SMSSendResult> {
  // Twilio is accessed via REST — use axios to avoid requiring twilio package
  // (keeps optional dependency footprint smaller; AT is the primary provider)
  const { default: axios } = await import('axios');
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_PHONE_NUMBER!;

  const ids: string[] = [];
  let accepted = false;

  for (const recipient of input.recipients) {
    const to = normalizePhone(recipient.phoneNumber);
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({ To: to, From: from, Body: input.message }),
      {
        auth: { username: accountSid, password: authToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    if (response.data?.sid) {
      ids.push(response.data.sid);
      accepted = true;
    }
  }

  console.info('[SMS] Twilio sent', { tenantId: input.tenantId, count: input.recipients.length, accepted });

  return {
    provider: 'twilio',
    accepted,
    providerMessageIds: ids.length ? ids : [`twilio-${Date.now()}`],
    rawResponse: { count: input.recipients.length },
  };
}

export class SMSService {
  static resolveDefaultSender(tenantBranding?: { smsSenderId?: string | null }): string {
    return (
      tenantBranding?.smsSenderId?.trim() ||
      process.env.NOTIFICATION_SMS_SENDER_ID ||
      process.env.SMS_SENDER_ID ||
      'GlobalWakili'
    );
  }

  static async send(input: SMSSendInput): Promise<SMSSendResult> {
    if (!input.recipients.length) {
      throw Object.assign(new Error('At least one SMS recipient is required'), {
        statusCode: 400,
        code: 'NOTIFICATION_INVALID_RECIPIENTS',
      });
    }

    if (!input.message?.trim()) {
      throw Object.assign(new Error('SMS message cannot be empty'), {
        statusCode: 400,
        code: 'NOTIFICATION_INVALID_BODY',
      });
    }

    const hasAT = process.env.AT_API_KEY?.trim() && process.env.AT_USERNAME?.trim();
    const hasTwilio = process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim();

    if (hasAT) {
      return sendViaAfricasTalking(input);
    }

    if (hasTwilio) {
      return sendViaTwilio(input);
    }

    // Simulation mode
    const providerMessageIds = input.recipients.map(
      () => `sim-sms-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    );
    console.info('[SMS] Simulation mode (no AT_API_KEY or TWILIO_ACCOUNT_SID configured)', {
      tenantId: input.tenantId,
      count: input.recipients.length,
      messageLength: input.message.length,
    });
    return {
      provider: 'simulated',
      accepted: true,
      providerMessageIds,
      rawResponse: { simulated: true, providerMode: 'SIMULATED_SMS_GATEWAY', deliveryClaim: 'ACCEPTED_BY_FOUNDATION_PROVIDER_ONLY' },
    };
  }
}
