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

// ---------------------------------------------------------------------------
// Countries (ISO 3166-1 alpha-2) and the currency each one invoices in.
// Keep in sync with pkg/currency/countries.go.

const COUNTRY_DATA =
  'AD:Andorra|AE:United Arab Emirates|AF:Afghanistan|AG:Antigua and Barbuda|AI:Anguilla|AL:Albania|AM:Armenia|AO:Angola|AQ:Antarctica|AR:Argentina|AS:American Samoa|AT:Austria|AU:Australia|AW:Aruba|AX:Åland Islands|AZ:Azerbaijan|BA:Bosnia and Herzegovina|BB:Barbados|BD:Bangladesh|BE:Belgium|BF:Burkina Faso|BG:Bulgaria|BH:Bahrain|BI:Burundi|BJ:Benin|BL:Saint Barthélemy|BM:Bermuda|BN:Brunei|BO:Bolivia|BQ:Caribbean Netherlands|BR:Brazil|BS:Bahamas|BT:Bhutan|BV:Bouvet Island|BW:Botswana|BY:Belarus|BZ:Belize|CA:Canada|CC:Cocos (Keeling) Islands|CD:DR Congo|CF:Central African Republic|CG:Congo|CH:Switzerland|CI:Côte d\'Ivoire|CK:Cook Islands|CL:Chile|CM:Cameroon|CN:China|CO:Colombia|CR:Costa Rica|CU:Cuba|CV:Cape Verde|CW:Curaçao|CX:Christmas Island|CY:Cyprus|CZ:Czechia|DE:Germany|DJ:Djibouti|DK:Denmark|DM:Dominica|DO:Dominican Republic|DZ:Algeria|EC:Ecuador|EE:Estonia|EG:Egypt|EH:Western Sahara|ER:Eritrea|ES:Spain|ET:Ethiopia|FI:Finland|FJ:Fiji|FK:Falkland Islands|FM:Micronesia|FO:Faroe Islands|FR:France|GA:Gabon|GB:United Kingdom|GD:Grenada|GE:Georgia|GF:French Guiana|GG:Guernsey|GH:Ghana|GI:Gibraltar|GL:Greenland|GM:Gambia|GN:Guinea|GP:Guadeloupe|GQ:Equatorial Guinea|GR:Greece|GS:South Georgia and the South Sandwich Islands|GT:Guatemala|GU:Guam|GW:Guinea-Bissau|GY:Guyana|HK:Hong Kong|HM:Heard Island and McDonald Islands|HN:Honduras|HR:Croatia|HT:Haiti|HU:Hungary|ID:Indonesia|IE:Ireland|IL:Israel|IM:Isle of Man|IN:India|IO:British Indian Ocean Territory|IQ:Iraq|IR:Iran|IS:Iceland|IT:Italy|JE:Jersey|JM:Jamaica|JO:Jordan|JP:Japan|KE:Kenya|KG:Kyrgyzstan|KH:Cambodia|KI:Kiribati|KM:Comoros|KN:Saint Kitts and Nevis|KP:North Korea|KR:South Korea|KW:Kuwait|KY:Cayman Islands|KZ:Kazakhstan|LA:Laos|LB:Lebanon|LC:Saint Lucia|LI:Liechtenstein|LK:Sri Lanka|LR:Liberia|LS:Lesotho|LT:Lithuania|LU:Luxembourg|LV:Latvia|LY:Libya|MA:Morocco|MC:Monaco|MD:Moldova|ME:Montenegro|MF:Saint Martin|MG:Madagascar|MH:Marshall Islands|MK:North Macedonia|ML:Mali|MM:Myanmar|MN:Mongolia|MO:Macao|MP:Northern Mariana Islands|MQ:Martinique|MR:Mauritania|MS:Montserrat|MT:Malta|MU:Mauritius|MV:Maldives|MW:Malawi|MX:Mexico|MY:Malaysia|MZ:Mozambique|NA:Namibia|NC:New Caledonia|NE:Niger|NF:Norfolk Island|NG:Nigeria|NI:Nicaragua|NL:Netherlands|NO:Norway|NP:Nepal|NR:Nauru|NU:Niue|NZ:New Zealand|OM:Oman|PA:Panama|PE:Peru|PF:French Polynesia|PG:Papua New Guinea|PH:Philippines|PK:Pakistan|PL:Poland|PM:Saint Pierre and Miquelon|PN:Pitcairn Islands|PR:Puerto Rico|PS:Palestine|PT:Portugal|PW:Palau|PY:Paraguay|QA:Qatar|RE:Réunion|RO:Romania|RS:Serbia|RU:Russia|RW:Rwanda|SA:Saudi Arabia|SB:Solomon Islands|SC:Seychelles|SD:Sudan|SE:Sweden|SG:Singapore|SH:Saint Helena|SI:Slovenia|SJ:Svalbard and Jan Mayen|SK:Slovakia|SL:Sierra Leone|SM:San Marino|SN:Senegal|SO:Somalia|SR:Suriname|SS:South Sudan|ST:São Tomé and Príncipe|SV:El Salvador|SX:Sint Maarten|SY:Syria|SZ:Eswatini|TC:Turks and Caicos Islands|TD:Chad|TF:French Southern Territories|TG:Togo|TH:Thailand|TJ:Tajikistan|TK:Tokelau|TL:Timor-Leste|TM:Turkmenistan|TN:Tunisia|TO:Tonga|TR:Türkiye|TT:Trinidad and Tobago|TV:Tuvalu|TW:Taiwan|TZ:Tanzania|UA:Ukraine|UG:Uganda|UM:U.S. Outlying Islands|US:United States|UY:Uruguay|UZ:Uzbekistan|VA:Vatican City|VC:Saint Vincent and the Grenadines|VE:Venezuela|VG:British Virgin Islands|VI:U.S. Virgin Islands|VN:Vietnam|VU:Vanuatu|WF:Wallis and Futuna|WS:Samoa|XK:Kosovo|YE:Yemen|YT:Mayotte|ZA:South Africa|ZM:Zambia|ZW:Zimbabwe'

/** [{ code: 'KE', name: 'Kenya' }, …] sorted by name */
export const COUNTRIES = COUNTRY_DATA.split('|')
  .map((p) => {
    const i = p.indexOf(':')
    return { code: p.slice(0, i), name: p.slice(i + 1) }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]))

/** Country → currency, only for supported currencies (others fall back to the org default). */
export const COUNTRY_CURRENCY = {
  AD: 'EUR',
  AE: 'AED',
  AS: 'USD',
  AT: 'EUR',
  AU: 'AUD',
  AX: 'EUR',
  BE: 'EUR',
  BG: 'EUR',
  BL: 'EUR',
  BQ: 'USD',
  CA: 'CAD',
  CC: 'AUD',
  CH: 'CHF',
  CK: 'NZD',
  CN: 'CNY',
  CX: 'AUD',
  CY: 'EUR',
  DE: 'EUR',
  EC: 'USD',
  EE: 'EUR',
  EG: 'EGP',
  EH: 'MAD',
  ES: 'EUR',
  FI: 'EUR',
  FM: 'USD',
  FR: 'EUR',
  GB: 'GBP',
  GF: 'EUR',
  GG: 'GBP',
  GH: 'GHS',
  GP: 'EUR',
  GR: 'EUR',
  GS: 'GBP',
  GU: 'USD',
  HK: 'HKD',
  HM: 'AUD',
  HR: 'EUR',
  IE: 'EUR',
  IM: 'GBP',
  IN: 'INR',
  IO: 'USD',
  IT: 'EUR',
  JE: 'GBP',
  JP: 'JPY',
  KE: 'KES',
  KI: 'AUD',
  KW: 'KWD',
  LI: 'CHF',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  MA: 'MAD',
  MC: 'EUR',
  ME: 'EUR',
  MF: 'EUR',
  MH: 'USD',
  MP: 'USD',
  MQ: 'EUR',
  MT: 'EUR',
  NF: 'AUD',
  NG: 'NGN',
  NL: 'EUR',
  NR: 'AUD',
  NU: 'NZD',
  NZ: 'NZD',
  PA: 'USD',
  PM: 'EUR',
  PN: 'NZD',
  PR: 'USD',
  PT: 'EUR',
  PW: 'USD',
  RE: 'EUR',
  SA: 'SAR',
  SG: 'SGD',
  SI: 'EUR',
  SK: 'EUR',
  SM: 'EUR',
  SV: 'USD',
  TC: 'USD',
  TF: 'EUR',
  TK: 'NZD',
  TL: 'USD',
  TV: 'AUD',
  TZ: 'TZS',
  UG: 'UGX',
  UM: 'USD',
  US: 'USD',
  VA: 'EUR',
  VG: 'USD',
  VI: 'USD',
  XK: 'EUR',
  YT: 'EUR',
  ZA: 'ZAR'
}

const COUNTRY_ALIASES = {
  'aus': 'AU',
  'oz': 'AU',
  'commonwealth of australia': 'AU',
  'nz': 'NZ',
  'aotearoa': 'NZ',
  'usa': 'US',
  'u.s.a.': 'US',
  'u.s.': 'US',
  'united states of america': 'US',
  'america': 'US',
  'uk': 'GB',
  'u.k.': 'GB',
  'great britain': 'GB',
  'britain': 'GB',
  'england': 'GB',
  'scotland': 'GB',
  'wales': 'GB',
  'northern ireland': 'GB',
  'uae': 'AE',
  'u.a.e.': 'AE',
  'emirates': 'AE',
  'dubai': 'AE',
  'abu dhabi': 'AE',
  'ksa': 'SA',
  'kingdom of saudi arabia': 'SA',
  'holland': 'NL',
  'the netherlands': 'NL',
  'deutschland': 'DE',
  'espana': 'ES',
  'italia': 'IT',
  'suisse': 'CH',
  'schweiz': 'CH',
  'republic of ireland': 'IE',
  'eire': 'IE',
  'korea': 'KR',
  'republic of korea': 'KR',
  'south korea': 'KR',
  'russian federation': 'RU',
  'viet nam': 'VN',
  'czech republic': 'CZ',
  'turkey': 'TR',
  'ivory coast': 'CI',
  'cote divoire': 'CI',
  'cape verde': 'CV',
  'cabo verde': 'CV',
  'swaziland': 'SZ',
  'burma': 'MM',
  'macau': 'MO',
  'peoples republic of china': 'CN',
  'prc': 'CN',
  'mainland china': 'CN',
  'hongkong': 'HK',
  'hong kong sar': 'HK',
  'republic of kenya': 'KE',
  'tanzania, united republic of': 'TZ',
  'united republic of tanzania': 'TZ',
  'democratic republic of the congo': 'CD',
  'drc': 'CD',
  'republic of the congo': 'CG',
  'south africa, republic of': 'ZA',
  'rsa': 'ZA',
  'east timor': 'TL',
  'vatican': 'VA',
  'holy see': 'VA',
  'macedonia': 'MK',
  'the gambia': 'GM',
  'the bahamas': 'BS',
  'bolivia, plurinational state of': 'BO',
  'iran, islamic republic of': 'IR',
  'syrian arab republic': 'SY',
  'lao pdr': 'LA',
  'moldova, republic of': 'MD',
  'brunei darussalam': 'BN',
  'taiwan, province of china': 'TW'
}

/** 🇰🇪 from 'KE' (regional indicator symbols). */
export function countryFlag(code) {
  const c = String(code || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return ''
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)))
}

export function countryName(code) {
  return COUNTRY_BY_CODE[String(code || '').toUpperCase()] || ''
}

const foldName = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

let NAME_INDEX = null
/** Recognise a country from a code ('KE') or a free-text name ('Kenya', 'UK'). */
export function countryCodeFromName(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  if (s.length === 2 && COUNTRY_BY_CODE[s.toUpperCase()]) return s.toUpperCase()
  if (!NAME_INDEX) {
    NAME_INDEX = {}
    for (const c of COUNTRIES) NAME_INDEX[foldName(c.name)] = c.code
    for (const [k, v] of Object.entries(COUNTRY_ALIASES)) NAME_INDEX[foldName(k)] = v
  }
  return NAME_INDEX[foldName(s)] || ''
}

/** Supported currency for a country, or '' when unsupported (use the org default). */
export function currencyForCountry(code) {
  return COUNTRY_CURRENCY[String(code || '').toUpperCase()] || ''
}

/**
 * Currency a customer should be invoiced in: their own choice, else their
 * country's currency, else the organisation default. Mirrors currency.ForCustomer.
 */
export function customerCurrency(customer, orgDefault = 'AUD') {
  const own = String(customer?.currency || '').toUpperCase()
  if (own && CURRENCY_CODES.includes(own)) return { currency: own, source: 'customer' }
  const code = customer?.country_code || countryCodeFromName(customer?.address?.country)
  const byCountry = currencyForCountry(code)
  if (byCountry) return { currency: byCountry, source: 'country' }
  return { currency: orgDefault || 'AUD', source: 'default' }
}

/** Minor units: JPY/UGX 0, KWD 3, others 2 (mirrors currency.Decimals). */
export function currencyDecimals(code) {
  const c = String(code || '').toUpperCase()
  if (c === 'JPY' || c === 'UGX') return 0
  if (c === 'KWD') return 3
  return 2
}

/** Money in a document currency with that currency's decimals. */
export function formatCurrency(value, code = 'AUD', opts = {}) {
  const n = Number(value) || 0
  const cur = code || 'AUD'
  const d = opts.compact ? 0 : currencyDecimals(cur)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
      notation: opts.compact && Math.abs(n) >= 10000 ? 'compact' : 'standard'
    }).format(n)
  } catch {
    return `${cur} ${n.toFixed(d)}`
  }
}

/** Input step for amounts in a currency (1, 0.01 or 0.001). */
export function currencyStep(code) {
  const d = currencyDecimals(code)
  return d === 0 ? '1' : (1 / 10 ** d).toFixed(d)
}
