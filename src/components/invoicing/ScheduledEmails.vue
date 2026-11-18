<template>
  <li v-if="items.length" class="sch" data-testid="scheduled-emails">
    <div class="sch-head"><i class="fa-regular fa-clock"></i> Scheduled — not sent yet</div>
    <ul class="sch-list">
      <li v-for="it in items" :key="it.message.id" class="sch-item" :data-id="it.message.id" data-testid="scheduled-email">
        <span class="sch-main">
          <strong>{{ kindLabel(it.message.kind) }} → {{ it.recipients_text || '—' }}</strong>
          <small>
            <template v-if="it.message.status === 'paused'">Paused</template>
            <template v-else-if="it.message.status === 'running'">Sending now…</template>
            <template v-else>{{ when(it.message) }}</template>
            <template v-if="it.repeat_text && it.message.repeat?.freq && it.message.repeat.freq !== 'none'"> · {{ it.repeat_text }}</template>
          </small>
        </span>
        <router-link class="ui-btn ui-btn--ghost ui-btn--sm" :to="{ path: '/communication/scheduled', query: { open: it.message.id } }">Open</router-link>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm sch-cancel" :disabled="busy === it.message.id || it.message.status === 'running'" data-testid="scheduled-cancel" @click="cancel(it)">
          <i :class="busy === it.message.id ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-ban'"></i> Cancel
        </button>
      </li>
    </ul>
  </li>
</template>

<script>
import { schedsendApi, localLabel, KIND_LABELS, zoneLabel } from '@/services/schedsend'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

/** The document's scheduled sends that haven't gone yet (pkg/schedsend), with Cancel — shown on the Emails tab. */
export default {
  name: 'ScheduledEmails',
  props: { invoiceId: { type: String, required: true }, refresh: { type: Number, default: 0 } },
  emits: ['changed'],
  data() {
    return { items: [], busy: '' }
  },
  watch: {
    invoiceId() {
      this.load()
    },
    refresh() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    kindLabel(k) {
      return KIND_LABELS[k] || 'Email'
    },
    when(m) {
      return m.next_local ? `Goes ${localLabel(m.next_local)} (${zoneLabel(m.timezone)})` : 'No time set'
    },
    async load() {
      try {
        const [up, rec] = await Promise.all([
          schedsendApi.list({ tab: 'upcoming', invoice_id: this.invoiceId }),
          schedsendApi.list({ tab: 'recurring', invoice_id: this.invoiceId })
        ])
        this.items = [...(up?.items || []), ...(rec?.items || [])]
      } catch {
        this.items = [] // no schedule-send access: nothing to show
      }
    },
    async cancel(it) {
      const ok = await confirmDialog({
        title: 'Cancel this scheduled send?',
        message: `${this.kindLabel(it.message.kind)} to ${it.recipients_text || 'the client'} won't be sent. Nothing has gone yet.`,
        confirmText: 'Cancel the send',
        danger: true
      })
      if (!ok) return
      this.busy = it.message.id
      try {
        await schedsendApi.act(it.message.id, 'cancel')
        toast.success('Scheduled send cancelled — nothing was sent')
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not cancel it'))
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.sch {
  list-style: none;
  margin: 4px 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-strong);
  background: var(--surface-2);
}
.sch-head {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 4px;
}
.sch-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sch-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.sch-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sch-main strong {
  font-size: 13px;
  overflow-wrap: anywhere;
}
.sch-main small {
  color: var(--text-3);
  font-size: 12px;
}
.sch-cancel {
  color: var(--danger);
}
.spin {
  animation: schspin 0.8s linear infinite;
}
@keyframes schspin {
  to {
    transform: rotate(360deg);
  }
}
</style>
