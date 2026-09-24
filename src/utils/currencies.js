/**
 * Supported currencies (ISO 4217). Keep in sync with pkg/currency/currency.go.
 * Grouped for pickers; formatting uses Intl so symbols/decimals are correct.
 */
export const CURRENCIES = [
  // Major / high-value
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', region: 'Major' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', region: 'Major' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', region: 'Major' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵', region: 'Major' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', region: 'Major' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', region: 'Major' },
  // Asia-Pacific
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', region: 'Asia-Pacific' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿', region: 'Asia-Pacific' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', region: 'Asia-Pacific' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', region: 'Asia-Pacific' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬', region: 'Asia-Pacific' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰', region: 'Asia-Pacific' },
  // Middle East (high-value)
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', region: 'Middle East' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', region: 'Middle East' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼', region: 'Middle East' },
  // Africa
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦', region: 'Africa' },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬', region: 'Africa' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬', region: 'Africa' },
  { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪', region: 'Africa' },
  { code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭', region: 'Africa' },
  { code: 'MAD', name: 'Moroccan Dirham', flag: '🇲🇦', region: 'Africa' },
  { code: 'TZS', name: 'Tanzanian Shilling', flag: '🇹🇿', region: 'Africa' },
  { code: 'UGX', name: 'Ugandan Shilling', flag: '🇺🇬', region: 'Africa' }
]

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code)

export function currencyLabel(code) {
  const c = CURRENCIES.find((x) => x.code === code)
  return c ? `${c.code} — ${c.name}` : code
}

/** [{ region, items: [...] }] for <optgroup> pickers */
export function currencyGroups() {
  const out = []
  for (const c of CURRENCIES) {
    let g = out.find((x) => x.region === c.region)
    if (!g) out.push((g = { region: c.region, items: [] }))
    g.items.push(c)
  }
  return out
}
