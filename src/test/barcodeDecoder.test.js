// Phone POS — pure-JavaScript barcode decoder, check digits and IMEI Luhn.
// Synthetic barcodes are drawn by a small software canvas (helpers/barcodeRaster.js)
// at different scales, rotations, blur, noise, contrast, lighting, tilt and
// highlights, then decoded the way the camera scanner does it.
//   node /home/claude/tools/unit-phonepos.mjs src/test/barcodeDecoder.test.js
import { describe, it, expect } from 'vitest'
import { decodeLuma, decodeImageData, decodeSignal, ALL_FORMATS } from '../utils/barcode/decoder.js'
import { encode, code128Modules } from '../utils/barcode/encode.js'
import { gtinCheckDigit, isValidGtin, upceToUpca, isValidUpce, luhnValid, luhnCheckDigit, isImei, checkSerial, barcodeKeys, validDecoded, gs1Gtin } from '../utils/barcode/checks.js'
import { EAN_L, EAN_G, C128, C39_CODES } from '../utils/barcode/patterns.js'
import { renderBarcode, renderClutter, rng } from './helpers/barcodeRaster.js'

const TWO_FRAMES = [0, 90, 45, 135, 22.5, 112.5, 67.5, 157.5] // the scanner alternates two angle sets between frames
const R = rng(2026)
const digits = (k) => Array.from({ length: k }, () => Math.floor(R() * 10)).join('')
const SAMPLES = {
  ean_13: () => '616' + digits(9),
  upc_a: () => '0' + digits(10),
  ean_8: () => digits(7),
  upc_e: () => (R() < 0.5 ? '0' : '1') + digits(6),
  code_128: () => [() => digits(15), () => 'SN' + digits(8), () => 'R58N' + digits(5) + 'K', () => digits(14)][Math.floor(R() * 4)](),
  code_39: () => ['TUSK', 'ABC', 'SN', 'X'][Math.floor(R() * 4)] + '-' + digits(4)
}
const report = []
function run(format, conds, { angles = TWO_FRAMES } = {}) {
  let ok = 0
  let wrong = 0
  const misses = []
  for (const c of conds) {
    const e = encode(format, SAMPLES[format]())
    const img = renderBarcode(e.modules, c)
    const r = decodeLuma(img.data, img.width, img.height, { formats: [format], angles })
    if (r[0] && r[0].text === e.text && r[0].format === format) ok++
    else {
      if (r[0]) wrong++
      misses.push({ c, got: r[0] })
    }
  }
  return { ok, n: conds.length, wrong, misses }
}
function grid(spec) {
  let out = [{}]
  for (const [k, vals] of Object.entries(spec)) out = out.flatMap((o) => vals.map((v) => ({ ...o, [k]: v })))
  return out.map((o, i) => ({ seed: i + 1, ...o }))
}

describe('check digits', () => {
  it('GTIN mod-10 on known codes', () => {
    for (const c of ['5901234123457', '4006381333931', '9780201379624', '6161101600118', '036000291452', '96385074', '10614141000415']) expect(isValidGtin(c)).toBe(true)
    for (const c of ['5901234123458', '036000291453', '96385075', '6161101600119', '12345', 'ABCDEFGHIJKLM']) expect(isValidGtin(c)).toBe(false)
    expect(gtinCheckDigit('590123412345')).toBe(7)
    expect(gtinCheckDigit('03600029145')).toBe(2)
  })
  it('UPC-E expands to UPC-A and checks', () => {
    expect(upceToUpca('01234565')).toBe('012345000065')
    expect(upceToUpca('04252614')).toBe('042100005264')
    expect(isValidUpce('01234565')).toBe(true)
    expect(isValidUpce('01234566')).toBe(false)
    expect(upceToUpca('21234565')).toBe('')
  })
  it('IMEI Luhn', () => {
    expect(luhnValid('490154203237518')).toBe(true)
    expect(luhnValid('490154203237517')).toBe(false)
    expect(isImei('35-209900-176148-1')).toBe(true)
    expect(isImei('352099001761482')).toBe(false)
    expect(luhnCheckDigit('35693803564380')).toBe(9)
    expect(isImei('356938035643809')).toBe(true)
  })
  it('serial / IMEI entry: misread IMEIs are rejected, label prefixes removed', () => {
    expect(checkSerial('IMEI: 490154203237518')).toEqual({ ok: true, value: '490154203237518', kind: 'imei', error: '' })
    expect(checkSerial('490154203237517').ok).toBe(false)
    expect(checkSerial('490154203237517').error).toMatch(/check digit/)
    expect(checkSerial('S/N: r58n123abc')).toEqual({ ok: true, value: 'R58N123ABC', kind: 'serial', error: '' })
    expect(checkSerial('').ok).toBe(false)
    expect(checkSerial('ab').ok).toBe(false)
    expect(checkSerial('bad<script>').ok).toBe(false)
  })
  it('barcode spellings: UPC-A ↔ EAN-13, UPC-E, GS1-128 case labels', () => {
    expect(barcodeKeys('036000291452')).toContain('0036000291452')
    expect(barcodeKeys('0036000291452')).toContain('036000291452')
    expect(barcodeKeys('01234565')).toContain('012345000065')
    expect(barcodeKeys('0106161101600118')).toContain('6161101600118')
    expect(gs1Gtin(']C10106161101600118')).toBe('06161101600118')
    expect(barcodeKeys('POS-FW')).toEqual(['pos-fw'])
  })
  it('decoded results are re-checked by format (native BarcodeDetector too)', () => {
    expect(validDecoded('ean_13', '6161101600118')).toBe(true)
    expect(validDecoded('ean_13', '6161101600119')).toBe(false)
    expect(validDecoded('upc_a', '036000291452')).toBe(true)
    expect(validDecoded('upc_e', '01234565')).toBe(true)
    expect(validDecoded('upc_e', '01234566')).toBe(false)
    expect(validDecoded('code_128', 'X')).toBe(true)
  })
})

describe('pattern tables', () => {
  it('EAN digits: 7 modules, L odd parity, G even', () => {
    for (let d = 0; d < 10; d++) {
      expect(EAN_L[d].reduce((a, b) => a + b)).toBe(7)
      expect((EAN_L[d][1] + EAN_L[d][3]) % 2).toBe(1)
      expect((EAN_G[d][1] + EAN_G[d][3]) % 2).toBe(0)
    }
  })
  it('Code 128: 106 distinct symbols of 11 modules with even bar sums, stop of 13', () => {
    expect(C128.length).toBe(107)
    const seen = new Set()
    for (let c = 0; c < 106; c++) {
      expect(C128[c].reduce((a, b) => a + b)).toBe(11)
      expect((C128[c][0] + C128[c][2] + C128[c][4]) % 2).toBe(0)
      seen.add(C128[c].join(''))
    }
    expect(seen.size).toBe(106)
    expect(C128[106].reduce((a, b) => a + b)).toBe(13)
  })
  it('Code 39: three wide elements of nine', () => {
    for (const c of C39_CODES) expect(c.toString(2).split('').filter((b) => b === '1').length).toBe(3)
    expect(new Set(C39_CODES).size).toBe(C39_CODES.length)
  })
  it('encoders lay out guards and lengths', () => {
    const e = encode('ean_13', '590123412345')
    expect(e.text).toBe('5901234123457')
    expect(e.modules.length).toBe(95)
    expect(e.modules.slice(0, 3)).toBe('101')
    expect(e.modules.slice(45, 50)).toBe('01010')
    expect(encode('ean_8', '9638507').modules.length).toBe(67)
    expect(encode('upc_e', '0123456').text).toBe('01234565')
    expect(encode('upc_e', '0123456').modules.length).toBe(51)
    expect(encode('code_128', '490154203237518').modules.length).toBe(11 * 17 + 13) // odd digit count: set B
    expect(encode('code_128', '35693803564380').modules.length).toBe(11 * 9 + 13) // even: set C, two digits a symbol
  })
})

describe('decoder — every symbology, scales × rotations × blur × noise', () => {
  const conds = grid({ mw: [2, 3, 4], angle: [0, 12, 33, 45, 90, 135, 180, 207, 270, 318], blur: [0, 0.5], noise: [0, 8] }).map((c) => ({ ...c, blur: c.blur * c.mw * 0.5 }))
  for (const f of ALL_FORMATS) {
    it(`${f}: ${conds.length} images decode correctly (two-frame angle sets)`, () => {
      const r = run(f, conds)
      report.push([f, 'core', r.ok, r.n])
      expect(r.wrong).toBe(0)
      if (r.ok !== r.n) throw new Error(`${r.n - r.ok} misses, e.g. ${JSON.stringify(r.misses.slice(0, 2))}`)
    })
  }
})

describe('decoder — real-world-like noise', () => {
  // low contrast, uneven light, a glare highlight, a tilted label (keystone), heavier blur and sensor noise
  const hard = grid({ mw: [2.5, 3.5], angle: [3, 88, 176, 271, 40], blur: [0.35], noise: [12, 18], contrast: ['lo', 'hi'], gradient: [0.45], highlight: [0, 0.6], keystone: [0.2, -0.2] }).map((c) => ({
    ...c,
    blur: c.blur * c.mw,
    ...(c.contrast === 'lo' ? { dark: 80, light: 195 } : {})
  }))
  for (const f of ALL_FORMATS) {
    it(`${f}: ≥ 90% of ${hard.length} hard images, never a wrong code`, () => {
      const r = run(f, hard)
      report.push([f, 'hard', r.ok, r.n])
      expect(r.wrong).toBe(0)
      expect(r.ok / r.n).toBeGreaterThanOrEqual(0.9)
    })
  }
  it('one frame with the first angle set still reads straight-ish codes', () => {
    const conds = grid({ mw: [2, 3], angle: [0, 8, 90, 97, 180, 270, 45, 135], blur: [0.6], noise: [6] })
    for (const f of ['ean_13', 'code_128']) {
      const r = run(f, conds, { angles: [0, 90, 45, 135] })
      report.push([f, '1 frame', r.ok, r.n])
      expect(r.ok).toBe(r.n)
    }
  })
})

describe('decoder — misreads are rejected', () => {
  it('a damaged EAN-13 or Code 128 never comes back as a different code', () => {
    const r = rng(77)
    let decodedOriginal = 0
    let rejected = 0
    for (let i = 0; i < 160; i++) {
      const f = i % 2 ? 'ean_13' : 'code_128'
      const e = encode(f, SAMPLES[f]())
      // flip 1–2 modules inside the symbol (not the guards): a printing flaw or a scratch
      const m = e.modules.split('')
      const flips = 1 + (i % 3 === 0 ? 1 : 0)
      for (let k = 0; k < flips; k++) {
        const p = 4 + Math.floor(r() * (m.length - 8))
        m[p] = m[p] === '1' ? '0' : '1'
      }
      const img = renderBarcode(m.join(''), { mw: 3, seed: i })
      const out = decodeLuma(img.data, img.width, img.height, { formats: [f], angles: TWO_FRAMES })
      for (const c of out) if (c.text !== e.text) throw new Error(`misread ${e.text} as ${c.text} (${c.votes} votes)`)
      if (out.length) decodedOriginal++
      else rejected++
    }
    report.push(['damaged', `read ${decodedOriginal}, rejected ${rejected}`, 160, 160])
  })
  it('a wrong check digit is not accepted (EAN-13 drawn with a bad check digit)', () => {
    // draw 6161101600118 but with the last digit's pattern for 9
    const bad = encode('ean_13', '6161101600118').modules
    const good9 = encode('ean_13', '6161101600125').modules // ends with …5; we splice in the "9" R-pattern
    const r9 = '1110100' // R(9) = complement of L(9) 0001011
    expect(good9.length).toBe(95)
    const m = bad.slice(0, 85) + r9 + bad.slice(92)
    const img = renderBarcode(m, { mw: 3 })
    expect(decodeLuma(img.data, img.width, img.height, {})).toEqual([])
  })
  it('clutter (noise, random stripes, textures): no code with two votes, single-line reads under 1%', () => {
    let two = 0
    let single = 0
    const N = 150
    for (let i = 0; i < N; i++)
      for (const k of ['noise', 'stripes', 'waves']) {
        const c = renderClutter(400, 300, 900 + i, k)
        const out = decodeLuma(c.data, c.width, c.height, { angles: TWO_FRAMES })
        for (const x of out) {
          if (x.votes >= 2) two++
          else single++
        }
      }
    report.push(['clutter', `${single} single-line reads, ${two} confirmed`, 3 * N, 3 * N])
    expect(two).toBe(0)
    expect(single / (3 * N)).toBeLessThan(0.01)
  })
})

describe('decoder — the till’s real codes', () => {
  it('an IMEI in Code 128 (phone box) reads and passes Luhn', () => {
    const imei = '490154203237518'
    const img = renderBarcode(code128Modules(imei).modules, { mw: 2.5, barH: 50, angle: 4, blur: 0.7, noise: 6 })
    const r = decodeLuma(img.data, img.width, img.height, { formats: ['code_128'] })
    expect(r[0].text).toBe(imei)
    expect(checkSerial(r[0].text).ok).toBe(true)
  })
  it('a GS1-128 case label maps to the bottle’s EAN-13', () => {
    const img = renderBarcode(code128Modules('0106161101600118', { gs1: true }).modules, { mw: 2.5, angle: 2 })
    const r = decodeLuma(img.data, img.width, img.height, { formats: ['code_128'] })
    expect(r[0].gs1).toBe(true)
    expect(barcodeKeys(r[0].text)).toContain('6161101600118')
  })
  it('RGBA canvas pixels (ImageData) decode the same', () => {
    const g = renderBarcode(encode('ean_13', '616110160011').modules, { mw: 3, angle: 10 })
    const rgba = new Uint8ClampedArray(g.width * g.height * 4)
    for (let i = 0; i < g.data.length; i++) rgba.set([g.data[i], g.data[i], Math.min(255, g.data[i] + 10), 255], i * 4)
    expect(decodeImageData({ data: rgba, width: g.width, height: g.height })[0].text).toBe('6161101600118')
  })
  it('a single scan line decodes (handheld-style)', () => {
    const e = encode('ean_8', '9638507')
    const line = []
    for (const ch of '0'.repeat(12) + e.modules + '0'.repeat(12)) for (let k = 0; k < 3; k++) line.push(ch === '1' ? 30 : 220)
    expect(decodeSignal(Float32Array.from(line), ['ean_8'])).toEqual({ format: 'ean_8', text: '96385074' })
  })
  it('speed: a 640×360 frame with no barcode in under 25 ms (node)', () => {
    const c = renderClutter(640, 360, 4, 'waves')
    const t0 = performance.now()
    for (let i = 0; i < 5; i++) decodeLuma(c.data, c.width, c.height, {})
    const ms = (performance.now() - t0) / 5
    report.push(['speed', `${ms.toFixed(1)} ms / empty 640×360 frame`, 1, 1])
    expect(ms).toBeLessThan(25)
  })
  it('accuracy report', () => {
    console.log('    accuracy:')
    for (const [f, kind, ok, n] of report) console.log(`      ${f.padEnd(9)} ${String(kind).padEnd(40)} ${ok}/${n}`)
  })
})
