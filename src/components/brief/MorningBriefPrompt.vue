<template>
  <!-- Dashboard: one-click "Get a morning brief at 8:00" for owners and admins who haven't switched it on. -->
  <section v-if="show" class="mbp" :class="{ 'is-done': done }" data-testid="brief-prompt">
    <span class="mbp__icon"><i :class="done ? 'fa-solid fa-check' : 'fa-solid fa-mug-hot'"></i></span>
    <div class="mbp__text">
      <template v-if="!done">
        <strong>Get a morning brief at 8:00</strong>
        <span>Bills due, money in, Jira progress and the opportunities worth going for — by email{{ waReady ? ' and WhatsApp' : '' }}, every morning.</span>
      </template>
      <template v-else>
        <strong>Your morning brief is on</strong>
        <span data-testid="brief-prompt-done">The first one comes {{ nextText }}. Change the time, channels or sections in My profile.</span>
      </template>
    </div>
    <div class="mbp__actions">
      <template v-if="!done">
        <button class="ui-btn ui-btn--primary" type="button" :disabled="busy" data-testid="brief-prompt-on" @click="turnOn">
          <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-bell'"></i> Get a morning brief at 8:00
        </button>
        <router-link :to="{ path: '/profile', hash: '#morning-brief' }" class="ui-btn ui-btn--ghost">Customise</router-link>
      </template>
      <router-link v-else to="/brief" class="ui-btn" data-testid="brief-prompt-open"><i class="fa-solid fa-sun"></i> See today's brief</router-link>
      <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Dismiss" title="Dismiss" @click="dismiss"><i class="fa-solid fa-xmark"></i></button>
    </div>
  </section>
</template>

<script>
import { briefApi, whenIn } from '@/services/brief'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { atLeast, ensureAccess } from '@/composables/useAccess'
import { useAuthStore } from '@/stores/auth'

function storageKey() {
  try {
    const u = useAuthStore().user || {}
    return `brief-prompt-dismissed:${u.id || u.email || ''}`
  } catch {
    return 'brief-prompt-dismissed'
  }
}

export default {
  name: 'MorningBriefPrompt',
  data() {
    return { d: null, busy: false, done: false, dismissed: false }
  },
  computed: {
    show() {
      return !!this.d && !this.dismissed && (this.done || !this.d.settings.enabled)
    },
    waReady() {
      return !!this.d?.whatsapp?.ready && !!this.d?.phone
    },
    nextText() {
      return this.d?.next_send_at ? whenIn(this.d.next_send_at, this.d.timezone) : 'tomorrow morning'
    }
  },
  async created() {
    try {
      this.dismissed = localStorage.getItem(storageKey()) === '1'
    } catch {
      this.dismissed = false
    }
    if (this.dismissed) return
    try {
      await Promise.resolve(ensureAccess()).catch(() => {})
      if (!atLeast('admin')) return
      this.d = await briefApi.settings()
    } catch {
      this.d = null
    }
  },
  methods: {
    async turnOn() {
      this.busy = true
      try {
        this.d = await briefApi.quickOn()
        this.done = true
        toast.success('Morning brief on')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not turn it on'))
      } finally {
        this.busy = false
      }
    },
    dismiss() {
      this.dismissed = true
      try {
        localStorage.setItem(storageKey(), '1')
      } catch {
        /* storage unavailable */
      }
    }
  }
}
</script>

<style scoped>
.mbp {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 20px;
  border: 1px solid var(--accent-ring);
  background: var(--accent-soft);
  border-radius: var(--radius-lg);
}

.mbp.is-done {
  border-color: var(--border);
  background: var(--success-soft);
}

.mbp__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--accent);
  flex-shrink: 0;
}

.is-done .mbp__icon {
  color: var(--success);
}

.mbp__text {
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.mbp__text span {
  color: var(--text-2);
  font-size: 13px;
}

.mbp__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .mbp {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .mbp__text {
    flex-basis: calc(100% - 60px);
  }

  .mbp__actions {
    width: 100%;
  }

  .mbp__actions .ui-btn--primary {
    flex: 1;
    justify-content: center;
  }
}
</style>
