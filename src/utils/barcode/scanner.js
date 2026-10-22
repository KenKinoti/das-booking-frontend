/**
 * Camera barcode scanning for the till and the product forms.
 *
 *   const s = new CameraScanner({ video, onCode, continuous: true })
 *   await s.start()      // only from a tap: opens the rear camera through mediaGuard
 *   s.setTorch(true)     // where the camera has a torch (s.torch)
 *   s.stop()             // camera off (tracks stopped)
 *
 * Decoding: the browser's BarcodeDetector where it reads 1D codes (Chrome on
 * Android, Safari 17+ on macOS); everywhere else (iPhone Safari, Firefox,
 * desktop Chrome on Windows / Linux) the dependency-free decoder in
 * ./decoder.js reads EAN-13, EAN-8, UPC-A, UPC-E, Code 128 and Code 39 from
 * the middle of each frame. QR codes only with BarcodeDetector (s.qr).
 *
 * Every result passes its check digit again (validDecoded). A code read by a
 * single scan line must come back in the next frame before it is used.
 * Continuous mode reports a code again only after it has been out of view for
 * `debounceMs` (holding a bottle in front of the camera adds it once).
 */
import { openMedia, stopStream, mediaSupported } from '@/services/mediaGuard'
import { decodeImageData, FrameConfirmer } from './decoder.js'
import { validDecoded } from './checks.js'

const NATIVE_WANT = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']
const JS_FORMATS = ['ean_13', 'upc_a', 'ean_8', 'upc_e', 'code_128', 'code_39']
const ANGLES = [
  [0, 90, 45, 135],
  [22.5, 112.5, 67.5, 157.5]
]

/** Formats the browser's BarcodeDetector reads, or null when there is none. */
export async function nativeFormats() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null
  try {
    const f = await window.BarcodeDetector.getSupportedFormats()
    return Array.isArray(f) ? f : null
  } catch {
    return null
  }
}

export function cameraAvailable() {
  return mediaSupported()
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export class CameraScanner {
  constructor({ video, onCode, onError, continuous = false, debounceMs = 1500, alive } = {}) {
    this.video = video
    this.onCode = onCode || (() => {})
    this.onError = onError || (() => {})
    this.continuous = continuous
    this.debounceMs = debounceMs
    this.alive = alive || (() => true)
    this.stream = null
    this.track = null
    this.detector = null
    this.engine = ''
    this.qr = false
    this.torch = false
    this.torchOn = false
    this.stopped = false
    this.paused = false
    this.timer = null
    this.frame = 0
    this.seen = new Map() // text → last time it was in view
    this.confirm = new FrameConfirmer({ windowMs: 900 }) // single-line reads wait for the next frame
    this.canvas = null
    this.ctx = null
    this.stats = { engine: '', frames: 0, decodeMs: 0, codes: 0 }
  }

  async start() {
    const fmts = await nativeFormats()
    const oneD = fmts && fmts.some((f) => f === 'ean_13' || f === 'code_128')
    if (oneD) {
      try {
        this.detector = new window.BarcodeDetector({ formats: NATIVE_WANT.filter((f) => fmts.includes(f)) })
        this.engine = 'native'
        this.qr = fmts.includes('qr_code')
      } catch {
        this.detector = null
      }
    }
    if (!this.detector) this.engine = 'js'
    this.stats.engine = this.engine
    this.stream = await openMedia(
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { alive: () => !this.stopped && this.alive() }
    )
    this.track = this.stream.getVideoTracks()[0] || null
    const caps = (this.track && typeof this.track.getCapabilities === 'function' && this.track.getCapabilities()) || {}
    this.torch = !!caps.torch
    if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
      this.track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
    }
    const v = this.video
    v.srcObject = this.stream
    v.setAttribute('playsinline', '')
    v.muted = true
    await v.play().catch(() => {})
    if (this.stopped) return this
    this.schedule(60)
    return this
  }

  schedule(ms) {
    clearTimeout(this.timer)
    if (this.stopped) return
    this.timer = setTimeout(() => this.tick(), ms)
  }

  async tick() {
    if (this.stopped) return
    const v = this.video
    if (this.paused || !v || v.readyState < 2 || !v.videoWidth) {
      this.schedule(120)
      return
    }
    const t0 = now()
    let found = []
    try {
      found = this.engine === 'native' ? await this.readNative(v) : this.readJs(v)
    } catch {
      found = []
    }
    const dt = now() - t0
    this.stats.frames++
    this.stats.decodeMs = this.stats.decodeMs ? this.stats.decodeMs * 0.8 + dt * 0.2 : dt
    if (this.stopped) return
    const t = now()
    for (const r of found) {
      const last = this.seen.get(r.text)
      this.seen.set(r.text, t)
      if (last !== undefined && t - last <= this.debounceMs) continue
      this.stats.codes++
      try {
        this.onCode(r.text, r.format)
      } catch {
        /* the page handles its own errors */
      }
      if (!this.continuous) {
        this.stop()
        return
      }
    }
    // keep the main thread free: wait at least twice as long as the decode took
    this.schedule(Math.max(this.engine === 'native' ? 110 : 90, dt * 2))
  }

  async readNative(v) {
    const codes = (await this.detector.detect(v)) || []
    const out = []
    for (const c of codes) {
      const text = String(c.rawValue || '').trim()
      if (text && validDecoded(c.format, text) && !out.some((o) => o.text === text)) out.push({ text, format: c.format })
    }
    return out
  }

  readJs(v) {
    const vw = v.videoWidth
    const vh = v.videoHeight
    // the middle of the picture (where the frame on screen is), at most ~1000 px wide
    // (shrinking further would make the bars of a barcode held at arm's length too thin to read)
    const sw = Math.round(vw * 0.86)
    const sh = Math.round(Math.min(vh * 0.62, sw * 0.75))
    const sx = Math.round((vw - sw) / 2)
    const sy = Math.round((vh - sh) / 2)
    const scale = Math.min(1, 1000 / sw)
    const dw = Math.max(1, Math.round(sw * scale))
    const dh = Math.max(1, Math.round(sh * scale))
    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    }
    if (this.canvas.width !== dw || this.canvas.height !== dh) {
      this.canvas.width = dw
      this.canvas.height = dh
    }
    this.ctx.drawImage(v, sx, sy, sw, sh, 0, 0, dw, dh)
    const img = this.ctx.getImageData(0, 0, dw, dh)
    const angles = ANGLES[this.frame++ % 2]
    const res = decodeImageData(img, { formats: JS_FORMATS, angles, lines: 13, budgetMs: 45, raw: true }).filter((r) => validDecoded(r.format, r.text))
    return this.confirm.push(res, now()).map((r) => ({ text: r.text, format: r.format }))
  }

  async setTorch(on) {
    if (!this.track || !this.torch) return false
    try {
      await this.track.applyConstraints({ advanced: [{ torch: !!on }] })
      this.torchOn = !!on
    } catch {
      this.torchOn = false
    }
    return this.torchOn
  }

  pause(p = true) {
    this.paused = p
    if (!p) this.seen.clear()
  }

  stop() {
    this.stopped = true
    clearTimeout(this.timer)
    stopStream(this.stream)
    this.stream = null
    this.track = null
    if (this.video) {
      try {
        this.video.srcObject = null
      } catch {
        /* detached */
      }
    }
  }
}

/** A short beep (WebAudio) — create the context from a tap. */
export function makeBeeper() {
  let ctx = null
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) ctx = new AC()
  } catch {
    ctx = null
  }
  return {
    beep(freq = 1760, ms = 70) {
      if (!ctx) return
      try {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'square'
        o.frequency.value = freq
        g.gain.value = 0.06
        o.connect(g)
        g.connect(ctx.destination)
        o.start()
        o.stop(ctx.currentTime + ms / 1000)
      } catch {
        /* no audio */
      }
    },
    close() {
      try {
        ctx && ctx.close()
      } catch {
        /* closed */
      }
      ctx = null
    }
  }
}
