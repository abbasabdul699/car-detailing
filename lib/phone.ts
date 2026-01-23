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

// Format phone numbers for display without altering stored values.
// - US numbers: (AAA) BBB-CCCC
// - Non-US or unknown: return original
// - Missing: "-"
export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw) return '-'
  const trimmed = String(raw).trim()
  if (!trimmed) return '-'
  const digits = trimmed.replace(/\D/g, '')
  let usDigits: string | null = null
  if (digits.length === 11 && digits.startsWith('1')) {
    usDigits = digits.slice(1)
  } else if (digits.length === 10) {
    usDigits = digits
  }
  if (!usDigits) return trimmed
  return `(${usDigits.slice(0, 3)}) ${usDigits.slice(3, 6)}-${usDigits.slice(6)}`
}

