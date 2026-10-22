<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" role="dialog" aria-labelledby="scd-title" style="max-width: 600px" data-testid="call-detail">
      <div class="ui-modal__head">
        <h2 id="scd-title">{{ call.title || 'Secure call' }}</h2>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body scd">
        <div class="scd-meta">
          <span class="ui-badge" :class="call.status === 'active' ? 'ui-badge--success' : 'ui-badge--draft'">{{ call.status === 'active' ? 'Active' : endedLabel }}</span>
          <span><i class="fa-regular fa-calendar"></i> Created {{ fmt(call.created_at) }}</span>
          <span v-if="call.status === 'active'"><i class="fa-regular fa-clock"></i> Works until {{ fmt(call.expires_at) }}</span>
          <span v-else-if="call.ended_at"><i class="fa-regular fa-clock"></i> Ended {{ fmt(call.ended_at) }}</span>
          <span v-if="call.lobby"><i class="fa-solid fa-door-open"></i> People wait to be let in</span>
          <span v-if="call.locked"><i class="fa-solid fa-lock"></i> Locked</span>
        </div>

        <template v-if="call.status === 'active'">
          <ShareCallLink v-if="link" :link="link" :title="call.title" :host-name="call.host_name" :room-id="call.id" :call-key="callKey" />
          <div v-else class="ui-alert ui-alert--warning">
            <i class="fa-solid fa-key"></i>
            <span>The link (with its secret key) is only on the device that created this call, so it can't be shown here. Copy it from that device, or start a new call.</span>
          </div>
        </template>

        <section>
          <h3 class="scd-h">Who joined</h3>
          <div v-if="loading" class="ui-skeleton" style="height: 60px"></div>
          <div v-else-if="!people.length" class="scd-empty">Nobody has joined yet.</div>
          <ul v-else class="scd-people">
            <li v-for="p in people" :key="p.id">
              <span class="scd-av">{{ initials(p.name) }}</span>
              <span class="scd-name">
                <strong>{{ p.name }}</strong> <span v-if="p.is_host" class="ui-badge ui-badge--info">Host</span>
                <small>Joined {{ fmt(p.joined_at) }}<template v-if="p.left_at"> · left {{ fmt(p.left_at) }}</template></small>
              </span>
              <span class="ui-badge" :class="stateClass(p)">{{ stateLabel(p) }}</span>
            </li>
          </ul>
        </section>
      </div>
      <div class="ui-modal__foot">
        <button v-if="call.status === 'active'" class="ui-btn ui-btn--danger" data-testid="detail-end" :disabled="ending" @click="$emit('end', call)"><i class="fa-solid fa-phone-slash"></i> End for all</button>
        <button class="ui-btn" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import ShareCallLink from './ShareCallLink.vue'
import { secureCallsApi, recallKey, callLink } from '@/services/secureCall'
import { formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { apiErrorMessage } from '@/services/api'

export default {
  name: 'SecureCallDetail',
  components: { ShareCallLink },
  props: { call: { type: Object, required: true }, appUrl: { type: String, default: '' }, ending: { type: Boolean, default: false } },
  emits: ['close', 'end'],
  data() {
    return { people: [], loading: true }
  },
  computed: {
    callKey() {
      return recallKey(this.call.id)
    },
    link() {
      return this.callKey ? callLink(this.appUrl, this.call.id, this.callKey) : ''
    },
    endedLabel() {
      return this.call.end_reason === 'host' ? 'Ended' : 'Expired'
    }
  },
  async created() {
    try {
      const r = await secureCallsApi.get(this.call.id)
      this.people = r.data?.data?.call?.people || []
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load who joined'))
    } finally {
      this.loading = false
    }
  },
  methods: {
    fmt: formatDateTime,
    initials(n) {
      const p = String(n || '?').trim().split(/\s+/)
      return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
    },
    stateLabel(p) {
      if (p.state === 'active') return 'In the call'
      if (p.state === 'lobby') return 'Waiting'
      if (p.state === 'removed') return 'Removed'
      if (p.state === 'denied') return 'Not let in'
      return p.left_reason === 'stale' ? 'Lost connection' : 'Left'
    },
    stateClass(p) {
      return { active: 'ui-badge--success', lobby: 'ui-badge--warning', removed: 'ui-badge--danger', denied: 'ui-badge--danger' }[p.state] || 'ui-badge--draft'
    }
  }
}
</script>

<style scoped>
.scd {
  display: grid;
  gap: 18px;
}
.scd-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
  font-size: 13px;
  color: var(--text-2);
}
.scd-h {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
  margin: 0 0 8px;
}
.scd-empty {
  color: var(--text-3);
  font-size: 14px;
}
.scd-people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.scd-people li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}
.scd-people li:last-child {
  border-bottom: 0;
}
.scd-av {
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
}
.scd-name {
  flex: 1;
  min-width: 0;
  display: grid;
}
.scd-name small {
  color: var(--text-3);
  font-size: 12px;
}
</style>
