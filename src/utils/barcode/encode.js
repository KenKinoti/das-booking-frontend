/**
 * Barcode encoders: text → a module string ('1' = bar, '0' = space) without
 * quiet zones. Used by the decoder's tests and the end-to-end fake camera
 * (it renders these into video frames); handy for printing shelf labels too.
 *
 *   encode('ean_13', '616110160011')   // check digit added when missing
 *   encode('code_128', '356938035643809')
 */
import { EAN_L, EAN_G, EAN13_PARITY, UPCE_PARITY0, flipParity, C128, C128_START_B, C128_START_C, C128_STOP, C39_ALPHABET, C39_CODES, C39_STAR } from './patterns.js'
import { gtinCheckDigit, upceToUpca } from './checks.js'

const bits = (widths, startWithBar) => {
  let s = ''
  let bar = startWithBar
  for (const w of widths) {
    s += (bar ? '1' : '0').repeat(w)
    bar = !bar
  }
  return s
}
const withCheck = (digits, len) => {
  const d = String(digits)
  if (!/^\d+$/.test(d)) throw new Error('digits only')
  if (d.length === len - 1) return d + gtinCheckDigit(d)
  if (d.length === len) return d
  throw new Error(`expected ${len - 1} or ${len} digits`)
}

export function ean13Modules(code) {
  const c = withCheck(code, 13)
  const par = EAN13_PARITY[+c[0]]
  let s = '101'
  for (let i = 1; i <= 6; i++) s += bits((par[i - 1] === 'L' ? EAN_L : EAN_G)[+c[i]], false)
  s += '01010'
  for (let i = 7; i <= 12; i++) s += bits(EAN_L[+c[i]], true)
  return { modules: s + '101', text: c }
}

export function upcaModules(code) {
  const c = withCheck(code, 12)
  return { modules: ean13Modules('0' + c).modules, text: c }
}

export function ean8Modules(code) {
  const c = withCheck(code, 8)
  let s = '101'
  for (let i = 0; i < 4; i++) s += bits(EAN_L[+c[i]], false)
  s += '01010'
  for (let i = 4; i < 8; i++) s += bits(EAN_L[+c[i]], true)
  return { modules: s + '101', text: c }
}

/** UPC-E from 7 digits (number system 0/1 + six) or 8 (with check digit). */
export function upceModules(code) {
  let c = String(code)
  if (!/^[01]\d{6,7}$/.test(c)) throw new Error('UPC-E needs 0/1 + 6 digits')
  if (c.length === 7) {
    const a = upceToUpca(c + '0').slice(0, 11)
    c += gtinCheckDigit(a)
  }
  const check = +c[7]
  const par = c[0] === '0' ? UPCE_PARITY0[check] : flipParity(UPCE_PARITY0[check])
  let s = '101'
  for (let i = 1; i <= 6; i++) s += bits((par[i - 1] === 'L' ? EAN_L : EAN_G)[+c[i]], false)
  return { modules: s + '010101', text: c }
}

/**
 * Code 128: set C for even-length digit strings, set B otherwise (ASCII 32–126).
 * { gs1: true } starts with FNC1 (a GS1-128 case label, e.g. "01" + GTIN-14).
 */
export function code128Modules(text, { gs1 = false } = {}) {
  const t = String(text)
  const codes = []
  if (/^\d+$/.test(t) && t.length % 2 === 0 && t.length >= 2) {
    codes.push(C128_START_C)
    if (gs1) codes.push(102)
    for (let i = 0; i < t.length; i += 2) codes.push(+t.slice(i, i + 2))
  } else {
    if (gs1) throw new Error('GS1-128 here: an even number of digits')
    codes.push(C128_START_B)
    for (const ch of t) {
      const v = ch.charCodeAt(0) - 32
      if (v < 0 || v > 95) throw new Error('Code 128 set B: printable ASCII only')
      codes.push(v)
    }
  }
  let sum = codes[0]
  for (let i = 1; i < codes.length; i++) sum += i * codes[i]
  codes.push(sum % 103, C128_STOP)
  return { modules: codes.map((c) => bits(C128[c], true)).join(''), text: t }
}

/** Code 39 with '*' start/stop; wide = `ratio` modules (integer), narrow gap between characters. */
export function code39Modules(text, ratio = 3) {
  const t = String(text).toUpperCase()
  const chars = [C39_STAR]
  for (const ch of t) {
    const i = C39_ALPHABET.indexOf(ch)
    if (i < 0) throw new Error('Code 39: 0-9 A-Z - . space $ / + % only')
    chars.push(C39_CODES[i])
  }
  chars.push(C39_STAR)
  const parts = chars.map((code) => {
    const w = []
    for (let b = 8; b >= 0; b--) w.push((code >> b) & 1 ? ratio : 1)
    return bits(w, true)
  })
  return { modules: parts.join('0'), text: t }
}

export function encode(format, text) {
  switch (format) {
    case 'ean_13':
      return ean13Modules(text)
    case 'upc_a':
      return upcaModules(text)
    case 'ean_8':
      return ean8Modules(text)
    case 'upc_e':
      return upceModules(text)
    case 'code_128':
      return code128Modules(text)
    case 'code_39':
      return code39Modules(text)
    default:
      throw new Error('unsupported format ' + format)
  }
}
