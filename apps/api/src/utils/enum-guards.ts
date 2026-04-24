export function isEnumValue<T extends Record<string, string | number>>(
  enumObject: T,
  value: unknown,
): value is T[keyof T] {
  return Object.values(enumObject).includes(value as T[keyof T]);
}

export function assertEnumValue<T extends Record<string, string | number>>(
  enumObject: T,
  value: unknown,
  label: string,
): T[keyof T] {
  if (!isEnumValue(enumObject, value)) {
    throw new Error(`${label} must be one of: ${Object.values(enumObject).join(', ')}`);
  }

  return value as T[keyof T];
}