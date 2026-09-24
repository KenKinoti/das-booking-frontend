<template>
  <div class="olu" :class="{ 'is-compact': compact }">
    <div
      class="olu__drop"
      :class="{ 'is-over': dragOver, 'is-busy': busy, 'is-disabled': !canEdit }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragEnter"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <div class="olu__previews" :aria-label="shownUrl ? 'Logo preview on light and dark backgrounds' : 'No logo yet'">
        <div class="olu__tile olu__tile--light">
          <img v-if="shownUrl" :src="shownUrl" alt="Company logo on a light background" @error="imgError = true" />
          <span v-else class="olu__initials">{{ initials }}</span>
          <span class="olu__tile-label">Light</span>
        </div>
        <div class="olu__tile olu__tile--dark">
          <img v-if="shownUrl" :src="shownUrl" alt="Company logo on a dark background" />
          <span v-else class="olu__initials">{{ initials }}</span>
          <span class="olu__tile-label">Dark</span>
        </div>
      </div>

      <div class="olu__body">
        <strong class="olu__title">{{ branding.hasLogo ? 'Company logo' : 'Add your company logo' }}</strong>
        <p class="olu__text">
          <template v-if="canEdit">Drag an image here or choose a file. PNG, JPG, WebP or SVG, up to 1 MB.</template>
          <template v-else>Only organisation admins can change the company logo.</template>
        </p>
        <p v-if="meta" class="olu__meta">{{ meta }}</p>
        <div v-if="canEdit" class="olu__actions">
          <button type="button" class="ui-btn ui-btn--sm" :class="{ 'ui-btn--primary': !branding.hasLogo }" :disabled="busy" @click="choose">
            <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : branding.hasLogo ? 'fa-solid fa-arrows-rotate' : 'fa-solid fa-upload'"></i>
            {{ busy ? 'Uploading…' : branding.hasLogo ? 'Replace' : 'Choose file' }}
          </button>
          <button v-if="branding.hasLogo" type="button" class="ui-btn ui-btn--sm ui-btn--ghost olu__remove" :disabled="busy" @click="remove">
            <i class="fa-regular fa-trash-can"></i> Remove
          </button>
        </div>
        <input ref="file" type="file" :accept="accept" hidden data-testid="org-logo-input" @change="onPick" />
      </div>
    </div>
    <p v-if="hint" class="ui-hint olu__hint"><i class="fa-solid fa-circle-info"></i> {{ hint }}</p>
  </div>
</template>

<script>
import api, { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { useBranding, initialsOf } from '@/composables/useBranding'
import { useAuthStore } from '@/stores/auth'

const MAX_BYTES = 1024 * 1024
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const EXT = /\.(png|jpe?g|webp|svg)$/i

export default {
  name: 'OrgLogoUploader',
  props: {
    /** Extra explanation shown under the uploader. */
    hint: { type: String, default: '' },
    compact: { type: Boolean, default: false }
  },
  emits: ['changed'],
  setup() {
    const { branding, loadBranding, setBranding } = useBranding()
    return { branding, loadBranding, setBranding }
  },
  data() {
    return { busy: false, dragOver: false, preview: '', imgError: false, accept: TYPES.join(',') + ',.png,.jpg,.jpeg,.webp,.svg' }
  },
  computed: {
    canEdit() {
      return useAuthStore().isAdmin
    },
    shownUrl() {
      return this.preview || (this.branding.hasLogo && !this.imgError ? this.branding.logoUrl : '')
    },
    initials() {
      return initialsOf(this.branding.orgName)
    },
    meta() {
      const b = this.branding
      if (!b.hasLogo) return ''
      const parts = []
      if (b.width && b.height) parts.push(`${b.width} × ${b.height}px`)
      if (b.updatedAt) parts.push(`updated ${new Date(b.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`)
      return parts.join(' · ')
    }
  },
  watch: {
    'branding.logoUrl'() {
      this.imgError = false
    }
  },
  created() {
    this.loadBranding()
  },
  beforeUnmount() {
    if (this.preview) URL.revokeObjectURL(this.preview)
  },
  methods: {
    choose() {
      this.$refs.file?.click()
    },
    onDragEnter() {
      if (this.canEdit && !this.busy) this.dragOver = true
    },
    onDrop(e) {
      this.dragOver = false
      if (!this.canEdit || this.busy) return
      const f = e.dataTransfer?.files?.[0]
      if (f) this.upload(f)
    },
    onPick(e) {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (f) this.upload(f)
    },
    check(f) {
      if (!(TYPES.includes(f.type) || EXT.test(f.name || ''))) return 'Use a PNG, JPG, WebP or SVG image.'
      if (f.size > MAX_BYTES) return `That file is ${(f.size / 1024 / 1024).toFixed(1)} MB — the logo must be 1 MB or smaller.`
      if (!f.size) return 'That file is empty.'
      return ''
    },
    async upload(f) {
      const problem = this.check(f)
      if (problem) return toast.error(problem)
      this.busy = true
      this.preview = URL.createObjectURL(f)
      try {
        const fd = new FormData()
        fd.append('file', f, f.name || 'logo')
        // multipart: axios drops this header so the browser adds the boundary
        const res = await api.put('/organization/logo', fd, { timeout: 60000, headers: { 'Content-Type': 'multipart/form-data' } })
        this.setBranding(res.data?.data || {})
        toast.success('Logo updated — it now appears on invoices, quotes, receipts and emails')
        this.$emit('changed', this.branding)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not upload the logo'))
      } finally {
        URL.revokeObjectURL(this.preview)
        this.preview = ''
        this.busy = false
      }
    },
    async remove() {
      const ok = await confirmDialog({
        title: 'Remove the company logo?',
        message: 'Invoices, quotes, receipts, emails and the sidebar will show your business name instead.',
        confirmText: 'Remove logo',
        danger: true
      })
      if (!ok) return
      this.busy = true
      try {
        const res = await api.delete('/organization/logo')
        this.setBranding(res.data?.data || {})
        toast.success('Logo removed')
        this.$emit('changed', this.branding)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the logo'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.olu__drop {
  display: flex;
  gap: 18px;
  align-items: center;
  padding: 16px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
  transition: border-color 0.15s, background 0.15s;
}

.olu__drop.is-over {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.olu__drop.is-busy {
  opacity: 0.75;
}

.olu__previews {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Fixed light/dark checkerboards: they show how the logo looks on paper and on dark UI, whatever the app theme. */
.olu__tile {
  position: relative;
  width: 132px;
  height: 84px;
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  padding: 12px 12px 18px;
  overflow: hidden;
  border: 1px solid var(--border);
  background-size: 14px 14px;
  background-position: 0 0, 7px 7px;
}

.olu__tile--light {
  background-color: #ffffff;
  background-image: linear-gradient(45deg, #eef0f5 25%, transparent 25%, transparent 75%, #eef0f5 75%), linear-gradient(45deg, #eef0f5 25%, transparent 25%, transparent 75%, #eef0f5 75%);
}

.olu__tile--dark {
  background-color: #151826;
  background-image: linear-gradient(45deg, #1d2133 25%, transparent 25%, transparent 75%, #1d2133 75%), linear-gradient(45deg, #1d2133 25%, transparent 25%, transparent 75%, #1d2133 75%);
}

.olu__tile img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.olu__initials {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-weight: 750;
  font-size: 15px;
  color: #fff;
  background: var(--accent);
}

.olu__tile-label {
  position: absolute;
  left: 8px;
  bottom: 4px;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7b839a;
}

.olu__tile--dark .olu__tile-label {
  color: #8a90a6;
}

.olu__body {
  min-width: 0;
  flex: 1;
}

.olu__title {
  display: block;
  font-size: 14px;
  color: var(--text);
}

.olu__text {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.olu__meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.olu__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.olu__remove {
  color: var(--danger);
}

.olu__hint {
  display: flex;
  gap: 6px;
  align-items: baseline;
  margin: 8px 0 0;
}

.is-compact .olu__tile {
  width: 112px;
  height: 72px;
}

@media (max-width: 640px) {
  .olu__drop {
    flex-direction: column;
    align-items: stretch;
  }
  .olu__previews {
    justify-content: center;
  }
  .olu__tile {
    flex: 1;
    width: auto;
    max-width: 160px;
  }
}
</style>
