<template>
  <div class="ph-backdrop" @mousedown.self="!busy && close()">
    <section class="ph" role="dialog" aria-modal="true" aria-labelledby="ph-title" data-testid="sale-photo">
      <header class="ph__head">
        <div>
          <h2 id="ph-title">Add a photo</h2>
          <p class="muted">To sale {{ transaction.transaction_number }} · managers can see it</p>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" :disabled="busy" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </header>

      <div class="ph__body">
        <div class="ph__kinds" role="radiogroup" aria-label="What is the photo of">
          <button v-for="k in kinds" :key="k.value" type="button" class="ph__kind" :class="{ 'is-active': kind === k.value }" role="radio" :aria-checked="kind === k.value" @click="kind = k.value">
            <i :class="k.icon"></i> {{ k.label }}
          </button>
        </div>

        <div class="ph__stage">
          <img v-if="preview" :src="preview" alt="Photo to attach" class="ph__img" data-testid="photo-preview" />
          <template v-else-if="camOn">
            <video ref="video" playsinline muted autoplay class="ph__video"></video>
            <button type="button" class="ph__shutter" aria-label="Take the photo" data-testid="photo-shutter" :disabled="!camReady || busy" @click="snap"><span></span></button>
          </template>
          <div v-else class="ph__start">
            <button type="button" class="ui-btn ui-btn--primary ph__big" data-testid="photo-camera" :disabled="busy" @click="startCamera"><i class="fa-solid fa-camera"></i> Take photo</button>
            <label class="ui-btn ph__big">
              <i class="fa-regular fa-image"></i> Choose a picture
              <input type="file" accept="image/*" class="ph__file" data-testid="photo-file" @change="onFile" />
            </label>
            <p class="ui-hint">The camera only opens when you tap “Take photo”, and turns off as soon as the photo is taken.</p>
          </div>
        </div>
        <p v-if="info" class="ph__info muted">{{ info }}</p>

        <div class="ui-field ph__note">
          <label for="ph-note">Note <span class="muted">(optional)</span></label>
          <input id="ph-note" v-model="note" class="ui-input" maxlength="200" :placeholder="kind === 'payment' ? 'e.g. confirmation code QK12AB34CD' : 'What does the photo show?'" />
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>

      <footer class="ph__foot">
        <button v-if="preview" class="ui-btn" :disabled="busy" @click="retake"><i class="fa-solid fa-rotate-left"></i> Retake</button>
        <button v-else class="ui-btn" :disabled="busy" @click="close">Cancel</button>
        <button class="ui-btn ui-btn--primary" :disabled="busy || !blob" data-testid="photo-save" @click="save">
          <i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save photo
        </button>
      </footer>
    </section>
  </div>
</template>

<script>
// Optional photo on a sale (M-Pesa confirmation, a damaged bottle): the
// camera opens only on "Take photo" (mediaGuard) and stops right after the
// shot; the picture is shrunk to a ≤ 1280 px JPEG on the device, then stored
// with the sale for managers (POST /pos/transactions/:id/photos).
import { openMedia, stopStream, whenHiddenFor } from '@/services/mediaGuard'
import { posService, mobileMoneyLabel } from '@/services/posService'
import { apiErrorMessage } from '@/services/api'
import { compressPhoto } from '@/utils/photoCompress'
import { toast } from '@/composables/useToast'

export default {
  name: 'SalePhotoSheet',
  props: {
    transaction: { type: Object, required: true },
    currency: { type: String, default: '' },
    initialKind: { type: String, default: 'payment' }
  },
  emits: ['close', 'saved'],
  data() {
    return { kind: this.initialKind, note: '', camOn: false, camReady: false, stream: null, blob: null, preview: '', info: '', busy: false, error: '', gone: false }
  },
  computed: {
    kinds() {
      return [
        { value: 'payment', label: `${mobileMoneyLabel(this.currency)} message`, icon: 'fa-solid fa-mobile-screen' },
        { value: 'damage', label: 'Damaged item', icon: 'fa-solid fa-wine-bottle' },
        { value: 'other', label: 'Other', icon: 'fa-regular fa-image' }
      ]
    }
  },
  mounted() {
    document.addEventListener('keydown', this.onKey)
    this.unwatch = whenHiddenFor(30 * 1000, () => this.stopCamera())
  },
  beforeUnmount() {
    this.gone = true
    document.removeEventListener('keydown', this.onKey)
    this.unwatch?.()
    this.stopCamera()
    if (this.preview) URL.revokeObjectURL(this.preview)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape' && !this.busy) this.close()
    },
    close() {
      this.stopCamera()
      this.$emit('close')
    },
    async startCamera() {
      this.error = ''
      this.camOn = true
      this.camReady = false
      try {
        this.stream = await openMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }, { alive: () => !this.gone && this.camOn })
        await this.$nextTick()
        const v = this.$refs.video
        if (!v) return this.stopCamera()
        v.srcObject = this.stream
        await v.play().catch(() => {})
        this.camReady = true
      } catch (e) {
        this.stopCamera()
        if (e?.closed) return
        this.error = e?.name === 'NotAllowedError' ? 'Camera access was refused. Allow the camera for this site, or choose a picture instead.' : 'The camera isn’t available. Choose a picture instead.'
      }
    },
    stopCamera() {
      stopStream(this.stream)
      this.stream = null
      this.camOn = false
      this.camReady = false
    },
    async snap() {
      const v = this.$refs.video
      if (!v || !v.videoWidth) return
      this.busy = true
      try {
        const out = await compressPhoto(v)
        this.stopCamera() // the camera goes off as soon as the photo is taken
        this.setBlob(out)
      } catch (e) {
        this.error = e?.message || 'Could not take the photo'
      } finally {
        this.busy = false
      }
    },
    async onFile(e) {
      const f = e.target.files && e.target.files[0]
      e.target.value = ''
      if (!f) return
      if (!/^image\//.test(f.type)) {
        this.error = 'Choose a picture (JPEG, PNG, HEIC…)'
        return
      }
      this.busy = true
      this.error = ''
      try {
        this.setBlob(await compressPhoto(f))
      } catch (err) {
        this.error = err?.message || 'Could not read that picture'
      } finally {
        this.busy = false
      }
    },
    setBlob({ blob, width, height }) {
      if (this.preview) URL.revokeObjectURL(this.preview)
      this.blob = blob
      this.preview = URL.createObjectURL(blob)
      this.info = `${Math.max(1, Math.round(blob.size / 1024))} KB · ${width}×${height} JPEG`
    },
    retake() {
      if (this.preview) URL.revokeObjectURL(this.preview)
      this.preview = ''
      this.blob = null
      this.info = ''
    },
    async save() {
      if (!this.blob || this.busy) return
      this.busy = true
      this.error = ''
      try {
        const p = await posService.addSalePhoto(this.transaction.id, this.blob, { kind: this.kind, note: this.note.trim() })
        toast.success('Photo saved with the sale')
        this.$emit('saved', p)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the photo')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.ph-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2160;
  background: rgba(10, 12, 24, 0.55);
  display: grid;
  place-items: center;
  padding: 16px;
}
.ph {
  width: min(520px, 100%);
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.ph__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 12px 8px 18px;
}
.ph__head h2 {
  margin: 0;
  font-size: 18px;
}
.ph__head p {
  margin: 2px 0 0;
  font-size: 13px;
}
.muted {
  color: var(--text-3);
}
.ph__body {
  padding: 6px 18px 14px;
  overflow-y: auto;
  min-height: 0;
}
.ph__kinds {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.ph__kind {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 13.5px;
  font-weight: 550;
  cursor: pointer;
}
.ph__kind.is-active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}
.ph__stage {
  position: relative;
  border-radius: var(--radius);
  border: 1px dashed var(--border-strong);
  background: var(--bg-subtle);
  min-height: 200px;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.ph__video,
.ph__img {
  width: 100%;
  max-height: 46dvh;
  object-fit: contain;
  display: block;
  background: #000;
}
.ph__shutter {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 66px;
  height: 66px;
  border-radius: 50%;
  border: 4px solid #fff;
  background: rgba(255, 255, 255, 0.25);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.ph__shutter span {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
}
.ph__shutter:disabled {
  opacity: 0.5;
}
.ph__start {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 18px;
  width: 100%;
  max-width: 320px;
  text-align: center;
}
.ph__big {
  min-height: 48px;
  justify-content: center;
  position: relative;
}
.ph__file {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.ph__info {
  margin: 6px 0 0;
  font-size: 12.5px;
}
.ph__note {
  margin-top: 12px;
}
.ph__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}
.ph__foot .ui-btn {
  min-height: 44px;
}
.spin {
  animation: fa-spin 1s linear infinite;
}
@media (max-width: 480px) {
  .ph-backdrop {
    padding: 0;
    place-items: end stretch;
  }
  .ph {
    width: 100%;
    max-height: 94dvh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  .ph__foot .ui-btn {
    flex: 1;
  }
}
</style>
