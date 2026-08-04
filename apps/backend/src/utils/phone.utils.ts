export function normalizePhone(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    return digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    return digits.slice(2);
  }
  if (digits.length === 13 && digits.startsWith("091") && /^[6-9]/.test(digits.slice(3))) {
    return digits.slice(3);
  }
  return null;
}

export function toE164(phone: string | null | undefined): string | null {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("091")) return `+91${digits.slice(2)}`;
  return null;
}