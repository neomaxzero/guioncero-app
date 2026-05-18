export function getServiceColor(serviceName: string): string {
  const normalizedName = normalizeServiceName(serviceName);
  const hash = hashString(normalizedName);
  const hue = hash % 360;

  return `oklch(0.78 0.095 ${hue})`;
}

function normalizeServiceName(serviceName: string): string {
  return serviceName.trim().toLocaleLowerCase() || "unknown service";
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
