// Minimal E.164 normalizer for US by default
// - Strips non-digits
// - If starts with '+', preserves it
// - If 11 digits and starts with '1', prefixes '+'
// - If 10 digits, assumes US and prefixes '+1'
// Returns null if it cannot infer a plausible E.164
export function normalizeToE164(raw: string | null | undefined, defaultCountry: 'US' | null = 'US'): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim()
  // Already E.164?
  if (/^\+\d{7,15}$/.test(trimmed)) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  if (digits.length === 10 && defaultCountry === 'US') {
    return `+1${digits}`
  }
  // As a last resort, if it looks like 7-15 digits, prefix '+'
  if (digits.length >= 7 && digits.length <= 15) {
    return `+${digits}`
  }
  return null
}


