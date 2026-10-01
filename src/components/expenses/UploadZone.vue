<template>
  <div
    class="drop"
    :class="{ over, busy }"
    data-testid="expense-upload"
    @dragenter.prevent="over = true"
    @dragover.prevent="over = true"
    @dragleave.prevent="over = false"
    @drop.prevent="onDrop"
  >
    <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-cloud-arrow-up'"></i>
    <div class="txt">
      <strong>{{ busy ? `Reading ${count} file${count === 1 ? '' : 's'}…` : 'Drop invoice PDFs, CSV exports or photos here' }}</strong>
      <span>PDF, CSV, PNG or JPG · up to 15 MB each · the same file is never imported twice</span>
    </div>
    <select v-model="vendorId" class="ui-select vend" aria-label="Vendor for these files" :disabled="busy">
      <option value="">Detect vendor</option>
      <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option>
    </select>
    <label class="ui-btn ui-btn--sm" :class="{ disabled: busy }">
      <i class="fa-solid fa-paperclip"></i> Choose files
      <input ref="file" type="file" multiple accept=".pdf,.csv,.png,.jpg,.jpeg,.webp,application/pdf,text/csv,image/*" hidden :disabled="busy" data-testid="expense-file" @change="onPick" />
    </label>
  </div>
</template>

<script>
import { expensesApi } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'UploadZone',
  props: { vendors: { type: Array, default: () => [] } },
  emits: ['uploaded'],
  data() {
    return { over: false, busy: false, count: 0, vendorId: '' }
  },
  methods: {
    onDrop(e) {
      this.over = false
      this.upload([...(e.dataTransfer?.files || [])])
    },
    onPick(e) {
      this.upload([...(e.target.files || [])])
      e.target.value = ''
    },
    async upload(files) {
      if (!files.length || this.busy) return
      const big = files.find((f) => f.size > 15 * 1024 * 1024)
      if (big) return toast.error(`${big.name} is larger than 15 MB`)
      this.busy = true
      this.count = files.length
      try {
        const r = await expensesApi.upload(files, { vendor_id: this.vendorId })
        let created = 0
        let dups = 0
        let skipped = 0
        const ids = []
        for (const res of r.results || []) {
          created += res.created
          skipped += res.skipped
          for (const it of res.items || []) {
            if (it.status === 'duplicate') dups++
            ids.push(it.id)
          }
        }
        for (const e of r.errors || []) toast.error(`${e.file}: ${e.message}`)
        if (r.results?.length) {
          const parts = [`${created} added to the inbox`]
          if (dups) parts.push(`${dups} already known (duplicate)`)
          if (skipped) parts.push(`${skipped} uploaded before`)
          toast.success(parts.join(' · '))
        }
        this.$emit('uploaded', ids)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Upload failed'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.drop {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg-subtle);
  transition: border-color 0.15s, background 0.15s;
}
.drop.over {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.drop > i {
  font-size: 22px;
  color: var(--accent);
}
.txt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 200px;
}
.txt strong {
  font-size: 14px;
}
.txt span {
  font-size: 12.5px;
  color: var(--text-3);
}
.vend {
  width: auto;
  min-width: 150px;
}
.disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
