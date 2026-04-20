import crypto from 'crypto';

export function computeWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

export function verifyWebhookSignature(params: {
  payload: string;
  secret: string;
  signature: string;
}): boolean {
  const expected = computeWebhookSignature(params.payload, params.secret);

  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(params.signature, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}