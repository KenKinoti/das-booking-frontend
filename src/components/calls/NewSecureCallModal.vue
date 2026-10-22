<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <div class="ui-modal" role="dialog" aria-labelledby="nsc-title" style="max-width: 560px" data-testid="new-call-modal">
      <div class="ui-modal__head">
        <h2 id="nsc-title">{{ created ? 'Your secure call is ready' : 'New secure call' }}</h2>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form v-if="!created" class="ui-modal__body nsc" @submit.prevent="create">
        <label class="ui-field">
          <span>Title <small class="muted">(optional)</small></span>
          <input v-model="title" class="ui-input" maxlength="80" placeholder="e.g. Contract review with Amina" data-testid="call-title-input" />
          <small class="ui-hint">The title is visible to DASYIN and to the people you invite. The conversation is not.</small>
        </label>

        <div class="ui-field">
          <span>Link works for</span>
          <div class="nsc-opts" role="radiogroup" aria-label="Link works for">
            <label v-for="o in expiryOptions" :key="o.value" class="nsc-opt" :class="{ 'is-on': expires === o.value }">
              <input v-model="expires" type="radio" name="expires" :value="o.value" :data-testid="`expires-${o.value}`" />
              <strong>{{ o.label }}</strong>
            </label>
          </div>
        </div>

        <label class="ui-switch nsc-switch">
          <input v-model="lobby" type="checkbox" data-testid="lobby-toggle" />
          <span>
            <strong>Ask me before people join</strong>
            <small>Off: anyone with the link joins straight away — you see every join and can remove people or lock the call. On: they wait until you let them in.</small>
          </span>
        </label>

        <label class="ui-field">
          <span>Up to</span>
          <select v-model.number="max" class="ui-select" data-testid="max-people">
            <option v-for="n in [2, 3, 4, 5, 6]" :key="n" :value="n">{{ n }} people</option>
          </select>
          <small class="ui-hint">Everyone connects to everyone. On phones, video works best with up to 4 people.</small>
        </label>

        <div class="ui-alert nsc-note">
          <i class="fa-solid fa-lock"></i>
          <span>A secret key is made on this device and goes only into the link. DASYIN never receives it, so it can't listen in. This device remembers the key so you can copy the link or rejoin from Secure calls.</span>
        </div>

        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </form>

      <div v-else class="ui-modal__body">
        <ShareCallLink :link="created.link" :title="created.call.title" :host-name="created.call.host_name" :room-id="created.call.id" :call-key="created.key" />
        <p class="ui-hint nsc-exp"><i class="fa-regular fa-clock"></i> The link works until {{ expiresLabel }}{{ created.call.lobby ? ' · people wait for you to let them in' : '' }}.</p>
      </div>

      <div class="ui-modal__foot">
        <template v-if="!created">
          <button class="ui-btn" type="button" @click="close">Cancel</button>
          <button class="ui-btn ui-btn--primary" type="button" data-testid="create-call" :disabled="busy" @click="create">
            <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-link'"></i> Create link
          </button>
        </template>
        <button v-else class="ui-btn" type="button" data-testid="share-done" @click="close">Done</button>
      </div>
    </div>
  </div>
</template>

<script>
import ShareCallLink from './ShareCallLink.vue'
import { createSecureCall, EXPIRY_OPTIONS, unsupportedReason } from '@/services/secureCall'
import { apiErrorMessage } from '@/services/api'
import { formatDateTime } from '@/utils/format'

export default {
  name: 'NewSecureCallModal',
  components: { ShareCallLink },
  emits: ['close', 'created'],
  data() {
    return { title: '', expires: '24h', lobby: false, max: 6, busy: false, error: '', created: null, expiryOptions: EXPIRY_OPTIONS }
  },
  computed: {
    expiresLabel() {
      return this.created ? formatDateTime(this.created.call.expires_at) : ''
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    async create() {
      if (this.busy) return
      const why = unsupportedReason()
      if (why) {
        this.error = why
        return
      }
      this.busy = true
      this.error = ''
      try {
        this.created = await createSecureCall({ title: this.title.trim(), expires: this.expires, lobby: this.lobby, maxParticipants: this.max })
        this.$emit('created', this.created)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not create the call')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.nsc {
  display: grid;
  gap: 16px;
}
.nsc-opts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.nsc-opt {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
}
.nsc-opt.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.nsc-opt input {
  accent-color: var(--accent);
}
.nsc-switch {
  align-items: flex-start;
}
.nsc-switch span {
  display: grid;
  gap: 2px;
}
.nsc-switch strong {
  color: var(--text);
  font-size: 14px;
}
.nsc-switch small {
  color: var(--text-3);
  font-size: 12.5px;
  line-height: 1.45;
}
.nsc-note {
  background: var(--success-soft);
  border-color: transparent;
  font-size: 13px;
}
.nsc-note i {
  color: var(--success);
}
.nsc-exp {
  margin: 14px 0 0;
}
.muted {
  color: var(--text-3);
  font-weight: 400;
}
@media (max-width: 480px) {
  .nsc-opts {
    grid-template-columns: 1fr;
  }
}
</style>
