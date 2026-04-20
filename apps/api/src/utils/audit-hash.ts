import crypto from 'crypto';
import type { JsonObject, JsonValue } from '../types/audit';

function stableSerialize(value: JsonValue): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const objectValue = value as JsonObject;
  const sortedKeys = Object.keys(objectValue).sort();

  const serializedEntries = sortedKeys.map((key) => {
    const serializedKey = JSON.stringify(key);
    const serializedValue = stableSerialize(objectValue[key]);
    return `${serializedKey}:${serializedValue}`;
  });

  return `{${serializedEntries.join(',')}}`;
}

export function generateAuditHash(
  payload: JsonObject,
  previousHash: string = '0'.repeat(64),
): string {
  const canonicalPayload = stableSerialize(payload);

  return crypto
    .createHash('sha256')
    .update(`${canonicalPayload}:${previousHash}`, 'utf8')
    .digest('hex');
}