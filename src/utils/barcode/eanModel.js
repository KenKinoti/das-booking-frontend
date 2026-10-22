/**
 * Model-based EAN / UPC digit reading for blurred pictures.
 *
 * When a phone camera is a little out of focus, a 1-module space between
 * two wide bars no longer reaches full white and its edges move: element
 * widths read 0.5 module off and the width-based matcher in decoder.js
 * picks the wrong digit. Once the guards have been found, this reads each
 * digit by comparing the scan line itself with what every candidate digit
 * would look like through the same blur: the bars and spaces of the digit
 * plus the module on each side (always known — left-hand digits start with
 * a space and end with a bar, right-hand ones the other way round), blurred
 * by a Gaussian whose width is measured on the guard bars. The best normalised
 * cross-correlation wins if it is clearly better than the runner-up; the
 * caller still checks parity and the check digit.
 *
 *   readEanModel(line, kind, anchors) → { digits: [0-9…], par: 'LGLGG…' } | null
 *     kind     'ean13' | 'ean8' | 'upce'
 *     anchors  [[module centre, x in line samples], …] — the guard bar centres
 */
import { EAN_L, EAN_G } from './patterns.js'

// layouts in modules: digit offsets, the bars of the guards, which halves
const LAYOUT = {
  ean13: { left: [3, 10, 17, 24, 31, 38], right: [50, 57, 64, 71, 78, 85], guards: [[0, '101', 0, 0], [45, '01010', 1, 1], [92, '101', 0, 0]], split: 47.5, size: 95 },
  ean8: { left: [3, 10, 17, 24], right: [36, 43, 50, 57], guards: [[0, '101', 0, 0], [31, '01010', 1, 1], [64, '101', 0, 0]], split: 33.5, size: 67 },
  upce: { left: [3, 10, 17, 24, 31, 38], right: [], guards: [[0, '101', 0, 0], [45, '010101', 1, 0]], split: Infinity, size: 51 }
}

const bitsOf = (widths, firstBar) => {
  const out = []
  let bar = firstBar
  for (const w of widths) {
    for (let k = 0; k < w; k++) out.push(bar ? 1 : 0)
    bar = !bar
  }
  return out
}
const PAT_L = EAN_L.map((w) => bitsOf(w, false))
const PAT_G = EAN_G.map((w) => bitsOf(w, false))
const PAT_R = EAN_L.map((w) => bitsOf(w, true))

// standard normal CDF (Abramowitz–Stegun 7.1.26 erf, |error| < 1.5e-7)
function Phi(z) {
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y)
}

/** Brightness (1 = space, 0 = bar) at t (modules from the start of `bits`) through a Gaussian blur of `sigma` modules. */
function model(bits, t, sigma) {
  let v = 1
  for (let k = 0; k < bits.length; k++) {
    if (!bits[k]) continue
    const a = (t - k) / sigma
    if (a < -5) break
    const b = (t - k - 1) / sigma
    if (b > 5) continue
    v -= Phi(a) - Phi(b)
  }
  return v
}

/** Least-squares x = a + b·u through the anchors. */
function fit(anchors) {
  const n = anchors.length
  if (n < 2) return null
  let su = 0
  let sx = 0
  let suu = 0
  let sux = 0
  for (const [u, x] of anchors) {
    su += u
    sx += x
    suu += u * u
    sux += u * x
  }
  const den = n * suu - su * su
  if (!den) return null
  const b = (n * sux - su * sx) / den
  const a = (sx - b * su) / n
  return b > 0.3 ? { a, b } : null
}

/** Normalised cross-correlation of the line over modules [u0, u1) with `bits` placed at module `o`. */
function ncc(line, map, u0, u1, bits, o, sigma, shift) {
  const x0 = Math.ceil(map.a + map.b * (u0 + shift))
  const x1 = Math.floor(map.a + map.b * (u1 + shift))
  if (x0 < 0 || x1 >= line.length || x1 - x0 < 4) return -1
  let n = 0
  let sy = 0
  let sm = 0
  let syy = 0
  let smm = 0
  let sym = 0
  for (let x = x0; x <= x1; x++) {
    const u = (x - map.a) / map.b - shift
    const y = line[x]
    const m = model(bits, u - o, sigma)
    n++
    sy += y
    sm += m
    syy += y * y
    smm += m * m
    sym += y * m
  }
  const vy = syy - (sy * sy) / n
  const vm = smm - (sm * sm) / n
  if (!(vy > 1e-6) || !(vm > 1e-6)) return -1
  return (sym - (sy * sm) / n) / Math.sqrt(vy * vm)
}

const SIGMAS = [0.15, 0.28, 0.4, 0.52, 0.65]
const SHIFTS = [-0.2, -0.1, 0, 0.1, 0.2]

export function readEanModel(line, kind, anchors, { minScore = 0.86, margin = 0.025 } = {}) {
  const L = LAYOUT[kind]
  if (!L || !line) return null
  const left = anchors.filter(([u]) => u < L.split + 2)
  const right = anchors.filter(([u]) => u > L.split - 2)
  const mapL = fit(left)
  const mapR = L.right.length ? fit(right) : null
  if (!mapL || (L.right.length && !mapR)) return null
  const mapAt = (u) => (u < L.split ? mapL : mapR)

  // blur width from the guards (known bars and spaces, with one module of context each side)
  let sigma = SIGMAS[0]
  let bestG = -Infinity
  for (const s of SIGMAS) {
    let tot = 0
    for (const [o, pat, before, after] of L.guards) {
      const bits = [before, ...pat.split('').map(Number), after]
      tot += ncc(line, mapAt(o + pat.length / 2), o - 0.5, o + pat.length + 0.5, bits, o - 1, s, 0)
    }
    if (tot > bestG) {
      bestG = tot
      sigma = s
    }
  }
  if (bestG / L.guards.length < 0.8) return null

  const digits = []
  let par = ''
  const read = (o, sets, before, after) => {
    const map = mapAt(o + 3.5)
    let best = -Infinity
    let second = -Infinity
    let pick = null
    for (const [p, tbl] of sets) {
      for (let d = 0; d < 10; d++) {
        const bits = [before, ...tbl[d], after]
        let sc = -Infinity
        for (const sh of SHIFTS) sc = Math.max(sc, ncc(line, map, o, o + 7, bits, o - 1, sigma, sh))
        if (sc > best) {
          second = best
          best = sc
          pick = { digit: d, par: p }
        } else if (sc > second) second = sc
      }
    }
    if (!(best >= minScore) || best - second < margin) return null
    return pick
  }
  const leftSets = kind === 'ean8' ? [['L', PAT_L]] : [['L', PAT_L], ['G', PAT_G]]
  for (const o of L.left) {
    const r = read(o, leftSets, 1, 0)
    if (!r) return null
    digits.push(r.digit)
    par += r.par
  }
  for (const o of L.right) {
    const r = read(o, [['R', PAT_R]], 0, 1)
    if (!r) return null
    digits.push(r.digit)
  }
  return { digits, par, sigma }
}

export const __model = { model, Phi, fit, LAYOUT }
