export function normalizePhone(input) {
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
