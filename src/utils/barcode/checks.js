/**
 * Check digits and code normalisation for the barcodes a till sees.
 *
 *   EAN-13 / EAN-8 / UPC-A / GTIN-14 — mod-10 (weights 3,1 from the right)
 *   UPC-E — expanded to UPC-A, then the UPC-A check digit
 *   IMEI — 15 digits, Luhn
 *
 * barcodeKeys(code) lists the spellings one product barcode can have
 * (a UPC-A printed as 12 digits is the EAN-13 "0…"; a UPC-E is a short UPC-A;
 * a GS1-128 case label carries the GTIN after AI 01), so a scan finds the
 * product whichever way its barcode was typed into Inventory.
 */

const DIGITS = /^\d+$/

/** Mod-10 GTIN check digit for the digits before it (any length). */
export function gtinCheckDigit(body) {
  const s = String(body)
  if (!DIGITS.test(s)) return -1
  let sum = 0
  for (let i = s.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += (s.charCodeAt(i) - 48) * w
  return (10 - (sum % 10)) % 10
}

/** EAN-8, UPC-A (12), EAN-13, GTIN-14 with a correct check digit. */
export function isValidGtin(code) {
  const s = String(code || '')
  if (!DIGITS.test(s) || ![8, 12, 13, 14].includes(s.length)) return false
  return gtinCheckDigit(s.slice(0, -1)) === s.charCodeAt(s.length - 1) - 48
}

/** UPC-E (8 digits: number system 0/1, 6 digits, check) → UPC-A (12 digits), or '' when it isn't one. */
export function upceToUpca(upce) {
  const s = String(upce || '')
  if (!/^[01]\d{7}$/.test(s)) return ''
  const ns = s[0]
  const d = s.slice(1, 7)
  const last = d[5]
  let body
  if (last <= '2') body = ns + d.slice(0, 2) + last + '0000' + d.slice(2, 5)
  else if (last === '3') body = ns + d.slice(0, 3) + '00000' + d.slice(3, 5)
  else if (last === '4') body = ns + d.slice(0, 4) + '00000' + d[4]
  else body = ns + d.slice(0, 5) + '0000' + last
  return body + s[7]
}

export function isValidUpce(code) {
  const a = upceToUpca(code)
  return !!a && isValidGtin(a)
}

/** Luhn check (IMEI, card numbers). */
export function luhnValid(value) {
  const s = String(value || '')
  if (!DIGITS.test(s) || s.length < 2) return false
  let sum = 0
  for (let i = s.length - 1, dbl = false; i >= 0; i--, dbl = !dbl) {
    let d = s.charCodeAt(i) - 48
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

/** The Luhn digit that completes body (e.g. the 15th IMEI digit). */
export function luhnCheckDigit(body) {
  for (let d = 0; d <= 9; d++) if (luhnValid(String(body) + d)) return d
  return -1
}

export function isImei(value) {
  const s = String(value || '').replace(/[\s-]/g, '')
  return /^\d{15}$/.test(s) && luhnValid(s)
}

/**
 * Check a serial number / IMEI typed or scanned for a serialised product.
 * Returns { ok, value, kind: 'imei' | 'serial', error }.
 *   - 15 digits → an IMEI: the Luhn digit must match (a misread is rejected)
 *   - "IMEI 35…" / "IMEI:35…" / "S/N: …" prefixes from box labels are removed
 *   - otherwise 3–64 characters of letters, digits and - . / _
 */
export function checkSerial(raw) {
  let v = String(raw || '').trim()
  v = v.replace(/^(?:imei\s*\d?|s\/?n|serial(?:\s*no\.?)?)\s*[:#]?\s*/i, '')
  const compact = v.replace(/[\s-]/g, '')
  if (/^\d{15}$/.test(compact)) {
    if (!luhnValid(compact)) return { ok: false, value: compact, kind: 'imei', error: 'This IMEI fails its check digit — scan or type it again.' }
    return { ok: true, value: compact, kind: 'imei', error: '' }
  }
  if (!v) return { ok: false, value: '', kind: 'serial', error: 'Enter the serial number or IMEI.' }
  if (v.length < 3) return { ok: false, value: v, kind: 'serial', error: 'That is too short for a serial number.' }
  if (v.length > 64) return { ok: false, value: v, kind: 'serial', error: 'That is too long for a serial number.' }
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/.test(v)) return { ok: false, value: v, kind: 'serial', error: 'Use letters, digits and - . / only.' }
  return { ok: true, value: v.toUpperCase(), kind: 'serial', error: '' }
}

/** Validate a decoded result's check digit by format (BarcodeDetector results too). */
export function validDecoded(format, text) {
  const t = String(text || '')
  switch (format) {
    case 'ean_13':
      return t.length === 13 && isValidGtin(t)
    case 'upc_a':
      return t.length === 12 && isValidGtin(t)
    case 'ean_8':
      return t.length === 8 && isValidGtin(t)
    case 'upc_e':
      return (t.length === 8 && isValidUpce(t)) || (t.length === 7 && isValidUpce('0' + t)) || (t.length === 6 && /^\d{6}$/.test(t))
    case 'itf':
      return /^\d+$/.test(t) && (t.length !== 14 || isValidGtin(t))
    default:
      return t.length > 0
  }
}

/** The GTIN inside a GS1-128 / GS1 element string ("]C1" + "01" + 14 digits …), or ''. */
export function gs1Gtin(text) {
  const m = String(text || '').match(/^(?:\]C1|\]e0|\]d2|\x1d)?\(?01\)?(\d{14})/)
  return m && isValidGtin(m[1]) ? m[1] : ''
}

/**
 * All spellings of a scanned / stored barcode, lower-case, for matching a
 * product: the code itself plus its UPC-A / EAN-13 / GTIN-14 equivalents.
 */
export function barcodeKeys(code) {
  const raw = String(code || '').trim()
  if (!raw) return []
  const out = new Set([raw.toLowerCase()])
  let d = raw.replace(/[\s-]/g, '')
  const gtin = gs1Gtin(raw)
  if (gtin) d = gtin
  if (!DIGITS.test(d)) return [...out]
  out.add(d)
  if (d.length === 8 && isValidUpce(d)) {
    const a = upceToUpca(d)
    out.add(a)
    out.add('0' + a)
  }
  if (d.length === 14 && d[0] === '0') d = d.slice(1)
  if (d.length === 13 && d[0] === '0') {
    out.add(d)
    d = d.slice(1)
  }
  if (d.length === 12) {
    out.add(d)
    out.add('0' + d)
    out.add('00' + d)
  } else if (d.length === 13) {
    out.add(d)
    out.add('0' + d)
  } else if (d.length === 8) {
    out.add(d)
    out.add('000000' + d)
  }
  return [...out]
}
