/**
 * A tiny software "canvas" for decoder tests (node has no canvas): draws a
 * barcode module string onto a grayscale image the way a camera would see a
 * bottle label — scaled, rotated, keystoned (tilted), blurred, unevenly lit,
 * with a highlight, sensor noise and a textured background around the label.
 *
 *   const img = renderBarcode(modules, { mw: 2.5, angle: 30, blur: 1.2, noise: 10 })
 *   decodeLuma(img.data, img.width, img.height)
 */

export function rng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gauss(r) {
  let u = 0
  let v = 0
  while (u === 0) u = r()
  while (v === 0) v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function blurInPlace(img, W, H, sigma) {
  if (!(sigma > 0.05)) return
  const rad = Math.ceil(sigma * 3)
  const k = []
  let ks = 0
  for (let i = -rad; i <= rad; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma))
    k.push(v)
    ks += v
  }
  for (let i = 0; i < k.length; i++) k[i] /= ks
  const tmp = new Float32Array(W * H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let a = 0
      for (let i = -rad; i <= rad; i++) a += img[y * W + Math.min(W - 1, Math.max(0, x + i))] * k[i + rad]
      tmp[y * W + x] = a
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let a = 0
      for (let i = -rad; i <= rad; i++) a += tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x] * k[i + rad]
      img[y * W + x] = a
    }
}

/**
 * opts: mw (module px), barH (px), quiet (modules), angle (deg), blur (sigma px),
 * noise (sigma, 0–255 levels), dark/light levels, gradient (0–1 light fall-off
 * across the image), highlight (0–1), keystone (−0.5…0.5: one end of the bars
 * longer, as when the label is tilted), bg ('plain' | 'texture'), W/H, seed.
 */
export function renderBarcode(modules, opts = {}) {
  const mw = opts.mw ?? 2
  const quiet = opts.quiet ?? 10
  const nMod = modules.length + 2 * quiet
  const symW = nMod * mw
  const barH = opts.barH ?? Math.max(30, Math.round(symW * 0.45))
  const angle = ((opts.angle ?? 0) * Math.PI) / 180
  const W = opts.W ?? Math.ceil(Math.max(symW, barH) * 1.25 + 60)
  const H = opts.H ?? Math.ceil(Math.max(symW, barH) * 1.0 + 60)
  const dark = opts.dark ?? 28
  const light = opts.light ?? 228
  const r = rng(opts.seed ?? 7)
  const bgKind = opts.bg ?? 'texture'
  const ss = opts.ss ?? 3
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const cx = opts.cx ?? W / 2
  const cy = opts.cy ?? H / 2
  const key = opts.keystone ?? 0
  const labelW = symW / 2 + mw * 2
  const labelH = barH / 2 + Math.max(8, barH * 0.25)
  // background texture: a few soft stripes and blotches (bottle glass, shelf)
  const stripes = []
  for (let i = 0; i < 6; i++) stripes.push({ f: 0.01 + r() * 0.05, p: r() * 6.28, a: 18 + r() * 30, d: r() * 6.28 })
  const img = new Float32Array(W * H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let acc = 0
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss - cx
          const py = y + (sy + 0.5) / ss - cy
          let u = px * ca + py * sa
          const v = -px * sa + py * ca
          if (key) u = u / (1 + (key * v) / barH)
          let val
          if (Math.abs(u) <= labelW && Math.abs(v) <= labelH) {
            val = light
            if (Math.abs(v) <= barH / 2) {
              const mu = u / mw + nMod / 2 - quiet
              if (mu >= 0 && mu < modules.length && modules.charCodeAt(mu | 0) === 49) val = dark
            }
          } else if (bgKind === 'texture') {
            val = 95
            for (const s of stripes) val += s.a * Math.sin((px * Math.cos(s.d) + py * Math.sin(s.d)) * s.f + s.p)
          } else val = opts.bgLevel ?? 200
          acc += val
        }
      img[y * W + x] = acc / (ss * ss)
    }
  blurInPlace(img, W, H, opts.blur ?? 0)
  const grad = opts.gradient ?? 0
  const hl = opts.highlight ?? 0
  const hx = W * (0.3 + r() * 0.4)
  const hy = H * (0.3 + r() * 0.4)
  const hr = Math.max(W, H) * 0.12
  const noise = opts.noise ?? 0
  const out = new Uint8ClampedArray(W * H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = img[y * W + x]
      if (grad) v *= 1 - grad * (x / W) * 0.9
      if (hl) {
        const d2 = ((x - hx) ** 2 + (y - hy) ** 2) / (hr * hr)
        v += hl * 120 * Math.exp(-d2)
      }
      if (noise) v += gauss(r) * noise
      out[y * W + x] = v
    }
  return { data: out, width: W, height: H }
}

/** Random noise / texture images with no barcode (false-positive checks). */
export function renderClutter(W, H, seed, kind = 'noise') {
  const r = rng(seed)
  const out = new Uint8ClampedArray(W * H)
  if (kind === 'noise') {
    for (let i = 0; i < W * H; i++) out[i] = r() * 255
  } else if (kind === 'stripes') {
    // random vertical stripes: the worst case for a 1D decoder
    let x = 0
    const cols = new Uint8ClampedArray(W)
    while (x < W) {
      const w = 1 + Math.floor(r() * 7)
      const v = r() < 0.5 ? 30 : 225
      for (let i = 0; i < w && x < W; i++) cols[x++] = v
    }
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) out[y * W + i] = cols[i] + (r() - 0.5) * 20
  } else {
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) out[y * W + i] = 128 + 60 * Math.sin(i * 0.11 + y * 0.03) + 40 * Math.sin(i * 0.37) * Math.cos(y * 0.21)
  }
  return { data: out, width: W, height: H }
}
