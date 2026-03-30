export function LogExecution(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    console.log(`[LOG] Executing ${propertyKey} with args:`, args);
    const result = await originalMethod.apply(this, args);
    console.log(`[LOG] Result from ${propertyKey}:`, result);
    return result;
  };
}