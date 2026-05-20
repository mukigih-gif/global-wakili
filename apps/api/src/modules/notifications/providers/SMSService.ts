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
  provider: 'sms_gateway';
  accepted: boolean;
  providerMessageIds: string[];
  rawResponse?: Record<string, unknown> | null;
};

function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/\s+/g, '').trim();
}

export class SMSService {
  static resolveDefaultSender(tenantBranding?: {
    smsSenderId?: string | null;
  }): string {
    return tenantBranding?.smsSenderId?.trim() || 'GlobalWakili';
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

    const providerMessageIds = input.recipients.map(
      () => `sms-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    );

    console.info('[SMS_SEND_ATTEMPT]', {
      tenantId: input.tenantId,
      providerMode: 'SIMULATED_SMS_GATEWAY',
      senderIdConfigured: Boolean(input.senderId?.trim()),
      recipientCount: input.recipients.length,
      messageLength: input.message.length,
      metadataKeys: Object.keys(input.metadata ?? {}),
    });

    return {
      provider: 'sms_gateway',
      accepted: true,
      providerMessageIds,
      rawResponse: {
        simulated: true,
        providerMode: 'SIMULATED_SMS_GATEWAY',
        deliveryClaim: 'ACCEPTED_BY_FOUNDATION_PROVIDER_ONLY',
        count: input.recipients.length,
      },
    };
  }
}