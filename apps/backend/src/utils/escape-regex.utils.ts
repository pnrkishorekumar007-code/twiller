export function escapeRegex(str: string): string {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}