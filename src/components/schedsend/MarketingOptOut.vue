<template>
  <div class="mo" data-testid="marketing-optout">
    <label class="ui-switch">
      <input type="checkbox" :checked="optedOut" :disabled="busy || !loaded" data-testid="marketing-optout-toggle" @change="toggle($event.target.checked)" />
      No marketing messages
    </label>
    <span class="mo-hint">{{ hint }}</span>
  </div>
</template>

<script>
import { schedsendApi } from '@/services/schedsend'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'

/** A customer's "no marketing messages" choice (scheduled offers skip them; invoices, receipts and reminders still go). */
export default {
  name: 'MarketingOptOut',
  props: { customerId: { type: String, required: true } },
  data() {
    return { optedOut: false, since: null, source: '', loaded: false, busy: false }
  },
  computed: {
    hint() {
      if (!this.optedOut) return 'Gets offers and promotions you schedule.'
      const by = this.source === 'link' ? 'used the unsubscribe link' : this.source === 'sms' ? 'replied STOP' : 'was set by your team'
      return `Skipped for offers and promotions (${by}${this.since ? ', ' + formatDate(this.since) : ''}). Invoices, receipts and reminders still go out.`
    }
  },
  watch: {
    customerId() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      try {
        const r = await schedsendApi.optOut(this.customerId)
        this.optedOut = !!r.opted_out
        this.since = r.opted_out ? r.since : null
        this.source = r.source || ''
        this.loaded = true
      } catch {
        this.loaded = false
      }
    },
    async toggle(v) {
      this.busy = true
      try {
        await schedsendApi.setOptOut(this.customerId, v)
        toast.success(v ? 'They won’t get marketing messages' : 'Marketing messages are on again')
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not change it'))
        await this.load()
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.mo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mo-hint {
  font-size: 12.5px;
  color: var(--text-3);
}
</style>
