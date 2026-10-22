/**
 * Pure-JavaScript 1D barcode decoder (no dependencies, no DOM): EAN-13,
 * UPC-A, EAN-8, UPC-E, Code 128 and Code 39 from a grayscale frame.
 *
 * Used on phones and browsers without BarcodeDetector (iPhone Safari,
 * Firefox, desktop Windows/Linux) — the scanner draws camera frames into a
 * canvas and hands the pixels here.
 *
 * How it reads a frame
 *   1. Scan lines at 0°, 90°, 45° and 135° (any rotation is within 22.5° of
 *      one of them, and a barcode is still readable along a line up to ~35°
 *      off its axis), spread across the frame from the centre outwards. Each
 *      line samples three parallel pixel rows (bilinear) and averages them, so
 *      sensor noise drops while the bars stay sharp.
 *   2. Each line becomes bar / space widths three ways, tried in turn:
 *      gradient edges with sub-pixel peak positions (best under blur), a local
 *      mean threshold and a local min/max midpoint threshold (best with uneven
 *      light), with contrast gating so noise in the quiet zone is not read as
 *      bars.
 *   3. The widths are matched against each symbology's element patterns with
 *      per-character normalisation (so perspective and distance don't matter)
 *      and a fitted ink-spread / blur bias (bars read thinner than spaces).
 *      Guards and quiet zones must be present; the result must pass its
 *      check digit (EAN/UPC mod 10, UPC-E parity + UPC-A check, Code 128
 *      mod 103). Code 39 has no check digit and UPC-E only a weak one, so they
 *      need two lines that agree.
 *   4. Results are voted across lines. The caller (scanner) also asks a
 *      single-line read to come back in the next frame before using it.
 *
 *   decodeLuma(luma, width, height, { formats }) → [{ text, format, votes }]
 *   decodeImageData(imageData, opts)            → same, from canvas pixels
 */
import { EAN_L, EAN_G, EAN13_PARITY, UPCE_PARITY0, flipParity, C128, C39_ALPHABET, C39_CODES, C39_STAR } from './patterns.js'
import { isValidGtin, isValidUpce } from './checks.js'
import { readEanModel } from './eanModel.js'

export const ALL_FORMATS = ['ean_13', 'upc_a', 'ean_8', 'upc_e', 'code_128', 'code_39']

const MAX_AVG = 0.42 // average pattern variance (fraction of the character width)
// EAN-8 and UPC-E are short (8 digits, one check digit): they must match tighter and show
// wider quiet zones, or noise and textures would now and then pass as one.
const CFG = { shortAvg: 0.3, upceAvg: 0.22, shortQuiet: 6, upceQuiet: 7, quiet13: 4, minModule: 1, edgeDigits: true, modelDigits: true, varMargin: 0.035 }
// formats without a strong check need this many agreeing scan lines in one frame
const MIN_VOTES = { code_39: 2, upc_e: 2 }
const MAX_IND = 0.7 // a single element may be off by this many modules
const MAX_AVG_128 = 0.25
const C39_INDEX = new Map(C39_CODES.map((c, i) => [c, i]))

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

// scratch buffers reused across lines (decoding runs on one thread)
const scratch = new Map()
function buf(name, n, Type) {
  let b = scratch.get(name)
  if (!b || b.length < n) {
    b = new Type(Math.max(n, 1024))
    scratch.set(name, b)
  }
  return b
}

// ------------------------------------------------------------------ pixels

export function toLuma(rgba, width, height) {
  const n = width * height
  const out = new Uint8ClampedArray(n)
  for (let i = 0, j = 0; i < n; i++, j += 4) out[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8
  return out
}

export function decodeImageData(img, opts) {
  return decodeLuma(toLuma(img.data, img.width, img.height), img.width, img.height, opts)
}

function bil(L, W, x, y) {
  const x0 = x | 0
  const y0 = y | 0
  const fx = x - x0
  const fy = y - y0
  const i = y0 * W + x0
  const a = L[i]
  const b = L[i + 1]
  const c = L[i + W]
  const d = L[i + W + 1]
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

function lineRange(c, d, max) {
  if (Math.abs(d) < 1e-9) return c >= 1 && c <= max - 2 ? [-Infinity, Infinity] : null
  const a = (1 - c) / d
  const b = (max - 2 - c) / d
  return a < b ? [a, b] : [b, a]
}

function sampleLine(L, W, H, cx, cy, dx, dy) {
  const rx = lineRange(cx, dx, W)
  const ry = lineRange(cy, dy, H)
  if (!rx || !ry) return null
  const t0 = Math.max(rx[0], ry[0])
  const t1 = Math.min(rx[1], ry[1])
  const n = Math.floor(t1 - t0)
  if (!(n >= 48)) return null
  const nx = -dy
  const ny = dx
  const out = new Float32Array(n)
  for (let k = 0; k < n; k++) {
    const t = t0 + k
    const x = cx + dx * t
    const y = cy + dy * t
    out[k] = (bil(L, W, x, y) + bil(L, W, x + nx, y + ny) + bil(L, W, x - nx, y - ny)) / 3
  }
  return out
}

// ------------------------------------------------------------------ runs

/** Widths of alternating runs; index 0 is always light (0 wide when the line starts dark). */
function buildRuns(xs, firstDark, n) {
  const out = new Float64Array(xs.length + 2)
  let k = 0
  if (firstDark) out[k++] = 0
  let prev = 0
  for (let i = 0; i < xs.length; i++) {
    out[k++] = xs[i] - prev
    prev = xs[i]
  }
  out[k++] = Math.max(0, n - 1 - prev)
  return out.subarray(0, k)
}

function reverseRuns(r) {
  const n = r.length
  const lastDark = (n - 1) % 2 === 1
  const out = new Float64Array(n + (lastDark ? 1 : 0))
  let k = 0
  if (lastDark) out[k++] = 0
  for (let i = n - 1; i >= 0; i--) out[k++] = r[i]
  return out
}

function percentiles(s, a, b) {
  const h = new Uint32Array(256)
  for (let i = 0; i < s.length; i++) h[Math.max(0, Math.min(255, s[i] | 0))]++
  const na = s.length * a
  const nb = s.length * b
  let acc = 0
  let lo = 0
  let hi = 255
  let gotLo = false
  for (let v = 0; v < 256; v++) {
    acc += h[v]
    if (!gotLo && acc >= na) {
      lo = v
      gotLo = true
    }
    if (acc >= nb) {
      hi = v
      break
    }
  }
  return [lo, hi]
}

function slidingMinMax(s, half, mn, mx) {
  const n = s.length
  const qa = buf('qa', n, Int32Array)
  const qb = buf('qb', n, Int32Array)
  let ha = 0
  let ta = 0
  let hb = 0
  let tb = 0
  let j = 0
  for (let i = 0; i < n; i++) {
    const end = Math.min(n - 1, i + half)
    while (j <= end) {
      while (ta > ha && s[qa[ta - 1]] >= s[j]) ta--
      qa[ta++] = j
      while (tb > hb && s[qb[tb - 1]] <= s[j]) tb--
      qb[tb++] = j
      j++
    }
    const lo = i - half
    while (qa[ha] < lo) ha++
    while (qb[hb] < lo) hb++
    mn[i] = s[qa[ha]]
    mx[i] = s[qb[hb]]
  }
}

/** Noise level of a line: median absolute step between samples (robust to the edges). */
function noiseSigma(s) {
  const n = s.length
  const h = new Uint32Array(256)
  for (let i = 1; i < n; i++) h[Math.min(255, Math.abs(s[i] - s[i - 1]) | 0)]++
  let acc = 0
  for (let v = 0; v < 256; v++) {
    acc += h[v]
    if (acc >= (n - 1) / 2) return (v + 0.5) / 0.95
  }
  return 0
}

/** Edges = peaks of the forward difference (sub-pixel), alternating in sign. */
function edgeRuns(s, range) {
  const n = s.length
  const g = buf('g', n, Float32Array)
  g[n - 1] = 0
  for (let i = 0; i < n - 1; i++) g[i] = s[i + 1] - s[i]
  const T = Math.max(4, range * 0.08)
  const pos = []
  const sign = []
  const mag = []
  for (let i = 1; i < n - 2; i++) {
    const v = g[i]
    let sg = 0
    if (v > T && v >= g[i - 1] && v > g[i + 1]) sg = 1
    else if (v < -T && v <= g[i - 1] && v < g[i + 1]) sg = -1
    if (!sg) continue
    const a = g[i - 1]
    const c = g[i + 1]
    const den = a - 2 * v + c
    let x = i + 0.5
    if (den !== 0) {
      const o = (0.5 * (a - c)) / den
      if (o > -1 && o < 1) x += o
    }
    const m = Math.abs(v)
    const L = pos.length
    if (L && sign[L - 1] === sg) {
      if (m > mag[L - 1]) {
        pos[L - 1] = x
        mag[L - 1] = m
      }
      continue
    }
    pos.push(x)
    sign.push(sg)
    mag.push(m)
  }
  if (pos.length < 12) return null
  // a falling edge (−) goes light → dark: the line starts dark when its first edge rises
  return buildRuns(pos, sign[0] === 1, n)
}

/**
 * Peaks and valleys with hysteresis (a turn must exceed `amp`), each edge
 * where the signal crosses halfway between its neighbouring peak and valley.
 * Keeps thin bars and spaces that blur has turned into shallow wiggles.
 */
function extremaRuns(s, range) {
  const n = s.length
  const amp = Math.max(6, range * 0.06, Math.min(range * 0.22, 3.2 * noiseSigma(s)))
  const ex = []
  let mxI = 0
  let mnI = 0
  let state = 0 // 0 undecided, 1 after a peak (looking for a valley), −1 after a valley
  for (let i = 1; i < n; i++) {
    const v = s[i]
    if (v > s[mxI]) mxI = i
    if (v < s[mnI]) mnI = i
    if (state !== 1 && v < s[mxI] - amp) {
      ex.push(mxI)
      state = 1
      mnI = i
    } else if (state !== -1 && v > s[mnI] + amp) {
      ex.push(mnI)
      state = -1
      mxI = i
    }
  }
  if (ex.length < 13) return null
  // each edge sits on the steepest step between a peak and the next valley (sub-pixel)
  const xs = []
  for (let k = 0; k + 1 < ex.length; k++) {
    const a = ex[k]
    const b = ex[k + 1]
    const sg = s[b] > s[a] ? 1 : -1
    let j0 = a
    let best = -Infinity
    for (let j = a; j < b; j++) {
      const d = (s[j + 1] - s[j]) * sg
      if (d > best) {
        best = d
        j0 = j
      }
    }
    let x = j0 + 0.5
    if (j0 > a && j0 + 1 < b) {
      const g0 = (s[j0] - s[j0 - 1]) * sg
      const g2 = (s[j0 + 2] - s[j0 + 1]) * sg
      const den = g0 - 2 * best + g2
      if (den !== 0) {
        const o = (0.5 * (g0 - g2)) / den
        if (o > -1 && o < 1) x += o
      }
    }
    xs.push(x)
  }
  // the first extremum is a peak (light) → the first edge goes dark
  return buildRuns(xs, s[ex[0]] < s[ex[1]], n)
}

function thresholdRuns(s, range, kind) {
  const n = s.length
  const mn = buf('mn', n, Float32Array)
  const mx = buf('mx', n, Float32Array)
  const t = buf('t', n, Float32Array)
  const gateMin = Math.max(10, range * 0.22)
  if (kind === 'mean') {
    const half = Math.max(4, Math.round(n / 16))
    const pre = buf('pre', n + 1, Float64Array)
    pre[0] = 0
    for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + s[i]
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - half)
      const b = Math.min(n, i + half + 1)
      t[i] = (pre[b] - pre[a]) / (b - a)
    }
    slidingMinMax(s, Math.max(3, Math.round(n / 48)), mn, mx)
  } else {
    slidingMinMax(s, Math.max(4, Math.round(n / 30)), mn, mx)
    for (let i = 0; i < n; i++) t[i] = (mn[i] + mx[i]) / 2
  }
  const xs = []
  const dark0 = mx[0] - mn[0] >= gateMin && s[0] < t[0]
  let dark = dark0
  for (let i = 1; i < n; i++) {
    const d = mx[i] - mn[i] >= gateMin && s[i] < t[i]
    if (d !== dark) {
      const a = s[i - 1] - t[i - 1]
      const b = s[i] - t[i]
      let f = a !== b ? a / (a - b) : 0.5
      if (!(f >= 0 && f <= 1)) f = 0.5
      xs.push(i - 1 + f)
      dark = d
    }
  }
  if (xs.length < 12) return null
  return buildRuns(xs, dark0, n)
}

// ------------------------------------------------------------------ matching

function sum(w, off, len) {
  let t = 0
  for (let k = 0; k < len; k++) t += w[off + k]
  return t
}

/** Average variance of w[off..] against pattern p (modules wide), or Infinity. */
function variance(w, off, p, modules, maxInd) {
  let total = 0
  for (let k = 0; k < p.length; k++) total += w[off + k]
  if (!(total > 0)) return Infinity
  const unit = total / modules
  const lim = maxInd * unit
  let v = 0
  for (let k = 0; k < p.length; k++) {
    const d = Math.abs(w[off + k] - p[k] * unit)
    if (d > lim) return Infinity
    v += d
  }
  return v / total
}

/** Copy of runs[i .. i+len) with the bar/space bias removed (bars sit at odd indices). */
function span(runs, i, len, delta) {
  const w = new Float64Array(len)
  for (let k = 0; k < len; k++) {
    const j = i + k
    const v = j & 1 ? runs[j] - delta : runs[j] + delta
    w[k] = v > 0.05 ? v : 0.05
  }
  return w
}

/** Half the difference between the average bar and space of guard elements (all one module wide). */
function guardBias(runs, i, rel, m) {
  let bs = 0
  let bn = 0
  let ss = 0
  let sn = 0
  for (const k of rel) {
    const j = i + k
    if (j & 1) {
      bs += runs[j]
      bn++
    } else {
      ss += runs[j]
      sn++
    }
  }
  if (!bn || !sn) return 0
  const d = (bs / bn - ss / sn) / 2
  return Math.max(-0.45 * m, Math.min(0.45 * m, d))
}

/** Least-squares module size and bias for a known pattern starting with a bar. */
function fitBias(runs, i, p) {
  let A = 0
  let B = 0
  let D = 0
  let E = 0
  for (let k = 0; k < p.length; k++) {
    const sg = k % 2 === 0 ? 1 : -1
    const w = runs[i + k]
    A += p[k] * p[k]
    B += p[k] * sg
    D += p[k] * w
    E += sg * w
  }
  const C = p.length
  const det = A * C - B * B
  if (!det) return 0
  const m = (D * C - B * E) / det
  const d = (A * E - B * D) / det
  return Math.max(-0.4 * m, Math.min(0.4 * m, d))
}

function guardOk(w, off, len, m) {
  let t = 0
  for (let k = 0; k < len; k++) {
    const x = w[off + k]
    if (x < 0.3 * m || x > 2.3 * m) return false
    t += x
  }
  return t > 0.55 * len * m && t < 1.65 * len * m
}

// Similar-edge distances of the EAN / UPC digit patterns (ISO/IEC 15420
// reference decode): T1 = e1 + e2, T2 = e2 + e3 in modules. Bar + space sums
// don't move when ink spread or blur make every bar thicker or thinner, and
// blur shifts them far less than single element widths (a blurred 1-module
// space next to a 4-module bar reads ~1.5 / 3.5, but their sum stays 5).
const edgeT = (p) => [p[0] + p[1], p[1] + p[2]]
const EDGE_L = EAN_L.map(edgeT)
const EDGE_G = EAN_G.map(edgeT)

/**
 * The digit by similar-edge distances; L1/L7 and L2/L8 (same distances) are
 * told apart by their element widths. It must win clearly (by `margin`) over
 * every digit with other distances.
 */
function edgeDigit(w, off, allowG, limit = 0.9, margin = 0.18) {
  const a = w[off]
  const b = w[off + 1]
  const c = w[off + 2]
  const d4 = w[off + 3]
  const tot = a + b + c + d4
  if (!(tot > 0)) return null
  const k = 7 / tot
  const t1 = (a + b) * k
  const t2 = (b + c) * k
  let best = Infinity
  let second = Infinity
  let cands = []
  const sets = allowG ? [['L', EDGE_L], ['G', EDGE_G]] : [['L', EDGE_L]]
  for (const [par, tbl] of sets) {
    for (let d = 0; d < 10; d++) {
      const e = Math.abs(t1 - tbl[d][0]) + Math.abs(t2 - tbl[d][1])
      if (e < best - 1e-9) {
        if (!cands.length || tbl[d][0] !== cands[0].t[0] || tbl[d][1] !== cands[0].t[1]) second = best
        best = e
        cands = [{ digit: d, par, t: tbl[d] }]
      } else if (Math.abs(e - best) <= 1e-9 && tbl[d][0] === cands[0].t[0] && tbl[d][1] === cands[0].t[1]) {
        cands.push({ digit: d, par, t: tbl[d] })
      } else if (e < second) second = e
    }
  }
  if (!(best <= limit) || second - best < margin) return null
  if (cands.length === 1) return { digit: cands[0].digit, par: cands[0].par }
  // 1 / 7 and 2 / 8: the element widths decide
  let pick = null
  let pv = Infinity
  for (const cd of cands) {
    const v = variance(w, off, (cd.par === 'L' ? EAN_L : EAN_G)[cd.digit], 7, 1.5)
    if (v < pv) {
      pv = v
      pick = cd
    }
  }
  return pick && { digit: pick.digit, par: pick.par }
}

function bestDigit(w, off, allowG, limit = MAX_AVG, mode = 'var') {
  if (mode === 'edge') return edgeDigit(w, off, allowG, limit === MAX_AVG ? 0.9 : 0.7)
  let best = Infinity
  let second = Infinity
  let digit = -1
  let par = 'L'
  const consider = (v, d, p) => {
    if (v < best) {
      second = best
      best = v
      digit = d
      par = p
    } else if (v < second) second = v
  }
  for (let d = 0; d < 10; d++) {
    consider(variance(w, off, EAN_L[d], 7, MAX_IND), d, 'L')
    if (allowG) consider(variance(w, off, EAN_G[d], 7, MAX_IND), d, 'G')
  }
  if (!(best < limit)) return null
  // a near tie (blur makes 1 / 7, 2 / 8 and L / G look alike) is not a read: the
  // similar-edge and model readers get the line instead
  if (second - best < CFG.varMargin) return null
  return { digit, par }
}

// quiet zone after a symbol ending at run index `end` (exclusive): the next run is light
function quietAfter(runs, end, need) {
  if (end >= runs.length) return false
  if (end === runs.length - 1) return true // the line ends in the quiet zone
  return runs[end] >= need
}

// ------------------------------------------------------------------ EAN / UPC

// The scan line the runs came from (oriented like them) and its run start
// positions, for the model-based digit reader (./eanModel.js) — set by
// decodeRuns, read by the *At functions in 'model' mode.
const lineCtx = { line: null, pos: null, runs: null }
function runPos(runs) {
  if (lineCtx.runs !== runs || !lineCtx.pos) {
    const pos = new Float64Array(runs.length + 1)
    for (let k = 0; k < runs.length; k++) pos[k + 1] = pos[k] + runs[k]
    lineCtx.pos = pos
    lineCtx.runs = runs
  }
  return lineCtx.pos
}
/** Model-read digits for a symbol whose guards were found at runs[i…]; anchors = [module centre, run index of that bar]. */
function modelDigits(runs, i, kind, bars) {
  if (!lineCtx.line) return null
  const pos = runPos(runs)
  const anchors = bars.map(([u, k]) => [u, pos[i + k] + runs[i + k] / 2])
  return readEanModel(lineCtx.line, kind, anchors)
}

const G13 = [0, 1, 2, 27, 28, 29, 30, 31, 56, 57, 58]
const G8 = [0, 1, 2, 19, 20, 21, 22, 23, 40, 41, 42]
const GE = [0, 1, 2, 27, 28, 29, 30, 31, 32]

function ean13At(runs, i, m, fmt, delta, mode) {
  const w = span(runs, i, 59, delta)
  const mL = sum(w, 3, 24) / 42
  const mR = sum(w, 32, 24) / 42
  if (mL > 1.7 * mR || mR > 1.7 * mL) return null
  if (!guardOk(w, 0, 3, mL) || !guardOk(w, 27, 5, (mL + mR) / 2) || !guardOk(w, 56, 3, mR)) return null
  let par = ''
  let code = ''
  let first = -1
  if (mode === 'model') {
    const r = modelDigits(runs, i, 'ean13', [[0.5, 0], [2.5, 2], [46.5, 28], [48.5, 30], [92.5, 56], [94.5, 58]])
    if (!r) return null
    par = r.par
    first = EAN13_PARITY.indexOf(par)
    if (first < 0) return null
    code = r.digits.join('')
  } else {
    for (let d = 0; d < 6; d++) {
      const r = bestDigit(w, 3 + 4 * d, true, MAX_AVG, mode)
      if (!r) return null
      code += r.digit
      par += r.par
    }
    first = EAN13_PARITY.indexOf(par)
    if (first < 0) return null
    for (let d = 0; d < 6; d++) {
      const r = bestDigit(w, 32 + 4 * d, false, MAX_AVG, mode)
      if (!r) return null
      code += r.digit
    }
  }
  const full = first + code
  if (!isValidGtin(full)) return null
  if (i > 1 && runs[i - 1] < CFG.quiet13 * mL) return null
  if (!quietAfter(runs, i + 59, CFG.quiet13 * mR)) return null
  if (first === 0 && fmt.upca) return { format: 'upc_a', text: full.slice(1) }
  if (fmt.ean13) return { format: 'ean_13', text: full }
  return null
}

function ean8At(runs, i, m, fmt, delta, mode) {
  const w = span(runs, i, 43, delta)
  const mL = sum(w, 3, 16) / 28
  const mR = sum(w, 24, 16) / 28
  if (mL > 1.7 * mR || mR > 1.7 * mL) return null
  if (!guardOk(w, 0, 3, mL) || !guardOk(w, 19, 5, (mL + mR) / 2) || !guardOk(w, 40, 3, mR)) return null
  if (i > 1 && runs[i - 1] < CFG.shortQuiet * mL) return null
  let code = ''
  if (mode === 'model') {
    const r = modelDigits(runs, i, 'ean8', [[0.5, 0], [2.5, 2], [32.5, 20], [34.5, 22], [64.5, 40], [66.5, 42]])
    if (!r) return null
    code = r.digits.join('')
  } else {
    for (let d = 0; d < 4; d++) {
      const r = bestDigit(w, 3 + 4 * d, false, CFG.shortAvg, mode)
      if (!r) return null
      code += r.digit
    }
    for (let d = 0; d < 4; d++) {
      const r = bestDigit(w, 24 + 4 * d, false, CFG.shortAvg, mode)
      if (!r) return null
      code += r.digit
    }
  }
  if (!isValidGtin(code)) return null
  if (!quietAfter(runs, i + 43, CFG.shortQuiet * mR)) return null
  return { format: 'ean_8', text: code }
}

function upceAt(runs, i, m, fmt, delta, mode) {
  const w = span(runs, i, 33, delta)
  const mm = sum(w, 3, 24) / 42
  if (!guardOk(w, 0, 3, mm) || !guardOk(w, 27, 6, mm)) return null
  for (const k of GE) if (w[k] < 0.5 * mm || w[k] > 1.7 * mm) return null
  if (i > 1 && runs[i - 1] < CFG.upceQuiet * mm) return null
  let par = ''
  let code = ''
  if (mode === 'model') {
    const r = modelDigits(runs, i, 'upce', [[0.5, 0], [2.5, 2], [46.5, 28], [48.5, 30], [50.5, 32]])
    if (!r) return null
    code = r.digits.join('')
    par = r.par
  } else {
    for (let d = 0; d < 6; d++) {
      const r = bestDigit(w, 3 + 4 * d, true, CFG.upceAvg, mode)
      if (!r) return null
      code += r.digit
      par += r.par
    }
  }
  let ns = 0
  let check = UPCE_PARITY0.indexOf(par)
  if (check < 0) {
    ns = 1
    check = UPCE_PARITY0.indexOf(flipParity(par))
  }
  if (check < 0) return null
  const full = `${ns}${code}${check}`
  if (!isValidUpce(full)) return null
  // stricter quiet zone: the left half of an EAN-13 must not pass as a UPC-E
  if (!quietAfter(runs, i + 33, CFG.upceQuiet * mm)) return null
  return { format: 'upc_e', text: full }
}

function decodeEan(runs, fmt) {
  const n = runs.length
  for (let i = 1; i + 33 <= n; i += 2) {
    const b1 = runs[i]
    const s1 = runs[i + 1]
    const b2 = runs[i + 2]
    const m = (b1 + s1 + b2) / 3
    if (m < CFG.minModule) continue
    if (b1 > 2.4 * m || s1 > 2.4 * m || b2 > 2.4 * m) continue
    if (i > 1 && runs[i - 1] < 2.5 * m) continue // quiet zone before the start guard
    let r = null
    if ((fmt.ean13 || fmt.upca) && i + 59 <= n) {
      const d = guardBias(runs, i, G13, m)
      r = ean13At(runs, i, m, fmt, d) || (d ? ean13At(runs, i, m, fmt, 0) : null) || (CFG.edgeDigits && ean13At(runs, i, m, fmt, 0, 'edge')) || (CFG.modelDigits && ean13At(runs, i, m, fmt, 0, 'model')) || null
    }
    if (!r && fmt.ean8 && i + 43 <= n) {
      const d = guardBias(runs, i, G8, m)
      r = ean8At(runs, i, m, fmt, d) || (d ? ean8At(runs, i, m, fmt, 0) : null) || (CFG.edgeDigits && ean8At(runs, i, m, fmt, 0, 'edge')) || (CFG.modelDigits && ean8At(runs, i, m, fmt, 0, 'model')) || null
    }
    if (!r && fmt.upce) {
      const d = guardBias(runs, i, GE, m)
      r = upceAt(runs, i, m, fmt, d) || (d ? upceAt(runs, i, m, fmt, 0) : null) || (CFG.edgeDigits && upceAt(runs, i, m, fmt, 0, 'edge')) || (CFG.modelDigits && upceAt(runs, i, m, fmt, 0, 'model')) || null
    }
    if (r) return r
  }
  return null
}

// ------------------------------------------------------------------ Code 128

function c128Text(codes) {
  let set = codes[0] === 103 ? 'A' : codes[0] === 104 ? 'B' : 'C'
  let out = ''
  let gs1 = false
  let shift = false
  for (let k = 1; k < codes.length; k++) {
    const c = codes[k]
    let cur = set
    if (shift) {
      cur = set === 'A' ? 'B' : 'A'
      shift = false
    }
    if (c === 102) {
      if (k === 1) gs1 = true
      else out += '\x1d'
      continue
    }
    if (cur === 'C') {
      if (c < 100) out += (c < 10 ? '0' : '') + c
      else if (c === 100) set = 'B'
      else if (c === 101) set = 'A'
      continue
    }
    if (c < 64) out += String.fromCharCode(c + 32)
    else if (c < 96) out += cur === 'A' ? String.fromCharCode(c - 64) : String.fromCharCode(c + 32)
    else if (c === 98) shift = true
    else if (c === 99) set = 'C'
    else if (c === 100 && cur === 'A') set = 'B'
    else if (c === 101 && cur === 'B') set = 'A'
    // 96/97 (FNC3/FNC2) and FNC4 are not used by retail labels
  }
  return { text: out, gs1 }
}

function readC128(runs, i, start, delta) {
  const n = runs.length
  const codes = [start]
  const w = new Float64Array(7)
  let j = i + 6
  for (let guard = 0; guard < 90; guard++) {
    if (j + 7 > n) return null
    for (let k = 0; k < 7; k++) {
      const x = j + k
      const v = x & 1 ? runs[x] - delta : runs[x] + delta
      w[k] = v > 0.05 ? v : 0.05
    }
    if (variance(w, 0, C128[106], 13, MAX_IND) < MAX_AVG_128) {
      if (!quietAfter(runs, j + 7, (4 * sum(w, 0, 7)) / 13)) return null
      if (codes.length < 3) return null
      const check = codes.pop()
      let s = codes[0]
      for (let k = 1; k < codes.length; k++) s += k * codes[k]
      if (s % 103 !== check) return null
      const t = c128Text(codes)
      if (!t.text) return null
      return { format: 'code_128', text: t.text, gs1: t.gs1 }
    }
    let best = MAX_AVG_128
    let code = -1
    for (let c = 0; c < 103; c++) {
      const v = variance(w, 0, C128[c], 11, MAX_IND)
      if (v < best) {
        best = v
        code = c
      }
    }
    if (code < 0) return null
    codes.push(code)
    j += 6
  }
  return null
}

function decodeC128(runs) {
  const n = runs.length
  for (let i = 1; i + 19 < n; i += 2) {
    const m = sum(runs, i, 6) / 11
    if (m < 0.6) continue
    if (i > 1 && runs[i - 1] < 4 * m) continue
    let start = -1
    let sv = MAX_AVG_128
    for (let c = 103; c <= 105; c++) {
      const v = variance(runs, i, C128[c], 11, MAX_IND)
      if (v < sv) {
        sv = v
        start = c
      }
    }
    if (start < 0) continue
    const d = fitBias(runs, i, C128[start])
    const r = readC128(runs, i, start, d) || (d ? readC128(runs, i, start, 0) : null)
    if (r) return r
  }
  return null
}

// ------------------------------------------------------------------ Code 39

const C39V = new Float64Array(9)

function c39Classify(w, off, delta) {
  const v = C39V
  // the 3rd and 4th widest elements, without sorting
  let a1 = 0
  let a2 = 0
  let a3 = 0
  let a4 = 0
  for (let k = 0; k < 9; k++) {
    let x = w[off + k] + (k % 2 === 0 ? -delta : delta)
    if (x < 0.05) x = 0.05
    v[k] = x
    if (x > a1) {
      a4 = a3
      a3 = a2
      a2 = a1
      a1 = x
    } else if (x > a2) {
      a4 = a3
      a3 = a2
      a2 = x
    } else if (x > a3) {
      a4 = a3
      a3 = x
    } else if (x > a4) a4 = x
  }
  if (a3 < 1.5 * a4) return null
  const thr = (a3 + a4) / 2
  let code = 0
  let ns = 0
  let nn = 0
  let ws = 0
  let nb = 0
  let nbn = 0
  let nsp = 0
  let nspn = 0
  for (let k = 0; k < 9; k++) {
    code <<= 1
    if (v[k] > thr) {
      code |= 1
      ws += v[k]
    } else {
      ns += v[k]
      nn++
      if (k % 2 === 0) {
        nb += v[k]
        nbn++
      } else {
        nsp += v[k]
        nspn++
      }
    }
  }
  const narrow = ns / nn
  const ratio = ws / 3 / narrow
  if (ratio < 1.8 || ratio > 4.5) return null
  return { code, narrow, bias: nbn && nspn ? (nb / nbn - nsp / nspn) / 2 : 0 }
}

function c39Char(runs, i) {
  if (i + 9 > runs.length) return null
  const a = c39Classify(runs, i, 0)
  if (!a) return null
  if (Math.abs(a.bias) > 0.15 * a.narrow) {
    const b = c39Classify(runs, i, Math.max(-0.45 * a.narrow, Math.min(0.45 * a.narrow, a.bias)))
    if (b) return b
  }
  return a
}

function decodeC39(runs) {
  const n = runs.length
  for (let i = 1; i + 19 < n; i += 2) {
    const st = c39Char(runs, i)
    if (!st || st.code !== C39_STAR) continue
    const nw = st.narrow
    if (i > 1 && runs[i - 1] < 5 * nw) continue
    let j = i + 9
    let text = ''
    let done = false
    while (j + 10 <= n) {
      if (runs[j] > 3.5 * nw) break
      const ch = c39Char(runs, j + 1)
      if (!ch || Math.abs(ch.narrow - nw) > 0.6 * nw) break
      if (ch.code === C39_STAR) {
        done = quietAfter(runs, j + 10, 5 * nw)
        break
      }
      const idx = C39_INDEX.get(ch.code)
      if (idx === undefined) break
      text += C39_ALPHABET[idx]
      if (text.length > 64) break
      j += 10
    }
    if (done && text) return { format: 'code_39', text }
  }
  return null
}

// ------------------------------------------------------------------ lines → results

function formatFlags(formats) {
  const f = new Set(formats || ALL_FORMATS)
  const fmt = { ean13: f.has('ean_13'), upca: f.has('upc_a'), ean8: f.has('ean_8'), upce: f.has('upc_e'), c128: f.has('code_128'), c39: f.has('code_39') }
  fmt.ean = fmt.ean13 || fmt.upca || fmt.ean8 || fmt.upce
  return fmt
}

function decodeRuns(runs, fmt, line) {
  if (!runs || runs.length < 21) return null
  if (fmt.ean) {
    lineCtx.line = line || null
    lineCtx.runs = null
    let r
    try {
      r = decodeEan(runs, fmt)
    } finally {
      lineCtx.line = null
      lineCtx.runs = null
      lineCtx.pos = null
    }
    if (r) return r
  }
  if (fmt.c128) {
    const r = decodeC128(runs)
    if (r) return r
  }
  if (fmt.c39) {
    const r = decodeC39(runs)
    if (r) return r
  }
  return null
}

function tryBoth(runs, fmt, n, line) {
  // more than one edge every ~2.2 px is noise, not bars (modules are at least a pixel wide)
  if (!runs || runs.length > n * 0.45) return null
  return decodeRuns(runs, fmt, line) || decodeRuns(reverseRuns(runs), fmt, line ? reversed(line) : null)
}

function reversed(line) {
  const n = line.length
  const out = new Float32Array(n)
  for (let k = 0; k < n; k++) out[k] = line[n - 1 - k]
  return out
}

/** Decode one scan line of luminance samples (light ≈ 255, bars dark). */
export function decodeSignal(raw, formats, only) {
  const fmt = formats && formats.ean !== undefined ? formats : formatFlags(formats)
  const n = raw.length
  if (n < 48) return null
  const s = new Float32Array(n)
  s[0] = raw[0]
  s[n - 1] = raw[n - 1]
  for (let i = 1; i < n - 1; i++) s[i] = (raw[i - 1] + 2 * raw[i] + raw[i + 1]) * 0.25
  const [lo, hi] = percentiles(s, 0.04, 0.96)
  const range = hi - lo
  if (range < 18) return null
  const r = raw instanceof Float32Array ? raw : Float32Array.from(raw)
  for (let k = 0; k < STRATEGIES.length; k++) {
    if (only && !only.includes(k)) continue
    const res = tryBoth(STRATEGIES[k](s, r, range), fmt, n, r)
    if (res) return res
  }
  return null
}

// bar/space widths from a line, in the order they are tried (smoothed s, raw r)
const STRATEGIES = [
  (s, r, range) => extremaRuns(s, range), // blur
  (s, r, range) => edgeRuns(r, range), // sharp, small modules
  (s, r, range) => edgeRuns(s, range), // noise
  (s, r, range) => thresholdRuns(s, range, 'mean'), // uneven light
  (s, r, range) => thresholdRuns(r, range, 'mid')
]

/**
 * Decode a grayscale frame. Returns candidates sorted by votes (lines that
 * read the same code), best first; Code 39 needs two lines.
 *   opts.formats  — subset of ALL_FORMATS
 *   opts.angles   — scan directions in degrees (default 0, 90, 45, 135)
 *   opts.lines    — parallel lines per direction (default 13)
 *   opts.stopAt   — stop once a code has this many votes (default 3)
 *   opts.budgetMs — stop reading new lines after this long (0 = no limit)
 */
export function decodeLuma(L, W, H, opts = {}) {
  const fmt = formatFlags(opts.formats)
  const angles = opts.angles || [0, 90, 45, 135]
  const per = opts.lines || 13
  const stopAt = opts.stopAt || 3
  const spread = opts.spread || 0.86
  const found = new Map()
  const budget = opts.budgetMs || 0
  const t0 = budget ? now() : 0
  let top = 0
  outer: for (const deg of angles) {
    const a = (deg * Math.PI) / 180
    const dx = Math.abs(Math.cos(a)) < 1e-9 ? 0 : Math.cos(a)
    const dy = Math.abs(Math.sin(a)) < 1e-9 ? 0 : Math.sin(a)
    const nx = -dy
    const ny = dx
    const ext = Math.abs(nx) * W + Math.abs(ny) * H
    const half = Math.ceil(per / 2)
    for (let k = 0; k < per; k++) {
      const idx = k === 0 ? 0 : k % 2 ? (k + 1) / 2 : -k / 2
      const off = (idx * ((ext * spread) / 2)) / half
      const cx = (W - 1) / 2 + nx * off
      const cy = (H - 1) / 2 + ny * off
      if (budget && now() - t0 > budget) break outer
      const line = sampleLine(L, W, H, cx, cy, dx, dy)
      if (!line) continue
      const r = decodeSignal(line, fmt)
      if (!r) continue
      const key = r.format + '\n' + r.text
      let e = found.get(key)
      if (!e) {
        e = { text: r.text, format: r.format, votes: 0 }
        if (r.gs1) e.gs1 = true
        found.set(key, e)
      }
      e.votes++
      if (e.votes > top) top = e.votes
      if (top >= stopAt) break outer
    }
  }
  const all = [...found.values()].sort((a, b) => b.votes - a.votes)
  // raw: every candidate with its votes (the camera scanner confirms across frames, see FrameConfirmer)
  return opts.raw ? all : all.filter((e) => e.votes >= (MIN_VOTES[e.format] || 1))
}

/**
 * Accepts a code read in one camera frame when two scan lines agree, or when
 * the same code was read in a frame shortly before (single-line reads of a
 * small or short barcode). Feed it decodeLuma(…, { raw: true }) per frame.
 */
export class FrameConfirmer {
  constructor({ windowMs = 900 } = {}) {
    this.windowMs = windowMs
    this.prev = new Map()
  }
  push(results, t) {
    const out = []
    const next = new Map()
    for (const r of results || []) {
      const key = r.format + '\n' + r.text
      const p = this.prev.get(key)
      if (r.votes >= 2 || (p && t - p < this.windowMs)) out.push(r)
      next.set(key, t)
    }
    for (const [k, v] of this.prev) if (!next.has(k) && t - v < this.windowMs) next.set(k, v)
    this.prev = next
    return out
  }
  reset() {
    this.prev.clear()
  }
}

/** The best candidate, or null. */
export function decodeBest(L, W, H, opts) {
  return decodeLuma(L, W, H, opts)[0] || null
}

// internals for the unit tests
export const __test = { CFG, edgeRuns, extremaRuns, thresholdRuns, decodeRuns, reverseRuns, formatFlags, percentiles, STRATEGIES, MIN_VOTES }
