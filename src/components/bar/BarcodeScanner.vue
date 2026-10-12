<template>
  <div class="scan-backdrop" role="dialog" aria-modal="true" aria-label="Scan a barcode" data-testid="barcode-scanner" @mousedown.self="close">
    <div class="scan">
      <header class="scan__head">
        <strong><i class="fa-solid fa-barcode"></i> Scan a barcode</strong>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close scanner" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </header>
      <div v-if="mode === 'camera'" class="scan__view">
        <video ref="video" playsinline muted autoplay></video>
        <div class="scan__frame" aria-hidden="true"></div>
        <p class="scan__hint">Point the camera at the barcode on the bottle</p>
      </div>
      <div v-else class="scan__msg">
        <i :class="mode === 'starting' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-keyboard'"></i>
        <p>{{ message }}</p>
      </div>
      <form class="scan__manual" @submit.prevent="submitManual">
        <input ref="manual" v-model.trim="manual" class="ui-input" inputmode="numeric" autocomplete="off" placeholder="Or type the barcode / SKU" aria-label="Barcode" data-testid="scan-manual" />
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="!manual">Find</button>
      </form>
    </div>
  </div>
</template>

<script>
// Camera barcode scanning with the BarcodeDetector API where the browser has
// it (Chrome on Android, recent Safari), after the camera permission prompt.
// Elsewhere — or when the camera is refused — type the code (a Bluetooth /
// USB scanner types into the field too).
export default {
  name: 'BarcodeScanner',
  emits: ['code', 'close'],
  data() {
    return { mode: 'starting', message: 'Starting the camera…', manual: '', stream: null, detector: null, timer: null, stopped: false }
  },
  async mounted() {
    const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia
    if (!supported) {
      this.mode = 'manual'
      this.message = 'This browser can’t read barcodes with the camera. Type the code, or use a handheld scanner.'
      this.$nextTick(() => this.$refs.manual?.focus())
      return
    }
    try {
      let formats
      try {
        formats = await window.BarcodeDetector.getSupportedFormats()
      } catch {
        formats = undefined
      }
      const want = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']
      const use = formats ? want.filter((f) => formats.includes(f)) : want
      this.detector = new window.BarcodeDetector(use.length ? { formats: use } : undefined)
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (this.stopped) return this.stop()
      this.mode = 'camera'
      await this.$nextTick()
      const v = this.$refs.video
      v.srcObject = this.stream
      await v.play().catch(() => {})
      this.loop()
    } catch (e) {
      this.stop()
      this.mode = 'manual'
      this.message = e?.name === 'NotAllowedError' ? 'Camera access was refused. Allow the camera for this site to scan, or type the code.' : 'The camera isn’t available. Type the code instead.'
      this.$nextTick(() => this.$refs.manual?.focus())
    }
  },
  beforeUnmount() {
    this.stop()
  },
  methods: {
    loop() {
      clearTimeout(this.timer)
      this.timer = setTimeout(async () => {
        if (this.stopped || !this.detector || !this.$refs.video) return
        try {
          const codes = await this.detector.detect(this.$refs.video)
          const c = codes && codes[0]?.rawValue
          if (c) {
            if (navigator.vibrate) navigator.vibrate(40)
            this.$emit('code', c)
            return
          }
        } catch {
          /* frame not ready */
        }
        this.loop()
      }, 180)
    },
    stop() {
      this.stopped = true
      clearTimeout(this.timer)
      if (this.stream) for (const t of this.stream.getTracks()) t.stop()
      this.stream = null
    },
    submitManual() {
      if (this.manual) this.$emit('code', this.manual)
    },
    close() {
      this.stop()
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.scan-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  background: rgba(0, 0, 0, 0.7);
  display: grid;
  place-items: center;
  padding: 16px;
}
.scan {
  width: min(480px, 100%);
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.scan__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px 10px 16px;
  border-bottom: 1px solid var(--border);
}
.scan__view {
  position: relative;
  background: #000;
  aspect-ratio: 4 / 3;
}
.scan__view video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.scan__frame {
  position: absolute;
  left: 12%;
  right: 12%;
  top: 32%;
  bottom: 32%;
  border: 3px solid var(--accent);
  border-radius: 12px;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.35);
}
.scan__hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 8px;
  margin: 0;
  text-align: center;
  color: #fff;
  font-size: 13px;
  text-shadow: 0 1px 2px #000;
}
.scan__msg {
  padding: 28px 20px;
  text-align: center;
  color: var(--text-2);
}
.scan__msg i {
  font-size: 26px;
  color: var(--text-3);
}
.scan__msg p {
  margin: 10px 0 0;
  font-size: 14px;
}
.scan__manual {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border);
}
.scan__manual .ui-input {
  flex: 1;
  height: 46px;
  font-size: 16px;
}
</style>
