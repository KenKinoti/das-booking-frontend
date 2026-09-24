<template>
  <div class="as">
    <label class="ui-switch as__switch">
      <input type="checkbox" :checked="autoApprove" :disabled="saving || !enabled" @change="toggle($event.target.checked)" data-test="asst-auto-approve" />
      <span>
        <strong>Auto-approve non-destructive updates</strong>
        <small>Creates and edits run without asking. Deletes, voids and other destructive actions always ask.</small>
      </span>
    </label>
    <div v-if="status" class="as__meta">
      <div><span>Model</span><strong>{{ status.model || '—' }}</strong></div>
      <div><span>Tools available</span><strong>{{ status.tools_count ?? 0 }}</strong></div>
      <div v-if="status.rate_limit"><span>Limit</span><strong>{{ status.rate_limit.limit }} messages / {{ Math.round(status.rate_limit.window_seconds / 60) }} min</strong></div>
      <template v-if="status.usage_today">
        <div class="as__sep">Token usage today (UTC)</div>
        <div><span>This organisation</span><strong>{{ fmt(status.usage_today.organization) }}</strong></div>
        <div><span>All organisations</span><strong>{{ fmt(status.usage_today.platform) }}</strong></div>
      </template>
    </div>
  </div>
</template>

<script>
import { assistant, saveAutoApprove, loadStatus } from '@/composables/useAssistant'
import { toast } from '@/composables/useToast'
import { apiErrorMessage } from '@/services/api'

export default {
  name: 'AssistantSettings',
  data() {
    return { saving: false }
  },
  computed: {
    status() {
      return assistant.status
    },
    enabled() {
      return !!assistant.status?.enabled
    },
    autoApprove() {
      return !!assistant.status?.settings?.auto_approve
    }
  },
  mounted() {
    loadStatus(true)
  },
  methods: {
    fmt(u) {
      if (!u) return '—'
      const n = (x) => Number(x || 0).toLocaleString()
      return `${n(u.input_tokens)} in · ${n(u.output_tokens)} out · ${n(u.responses)} replies`
    },
    async toggle(v) {
      this.saving = true
      try {
        await saveAutoApprove(v)
        toast.success(v ? 'Non-destructive updates will run without asking' : 'The assistant will ask before every change')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the setting'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.as {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.as__switch {
  align-items: flex-start;
}

.as__switch input {
  margin-top: 2px;
}

.as__switch strong {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
}

.as__switch small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-3);
}

.as__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  font-size: 12.5px;
}

.as__meta > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.as__meta span {
  color: var(--text-3);
}

.as__meta strong {
  font-weight: 600;
  color: var(--text-2);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.as__sep {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}
</style>
