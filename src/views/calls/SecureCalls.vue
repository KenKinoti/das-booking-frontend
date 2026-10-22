<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Communication</div>
        <h1>Secure calls</h1>
        <p>Private video calls by link — end-to-end encrypted, and nobody needs an account to join.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="loading" @click="load()"><i :class="loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate'"></i> Refresh</button>
        <button class="ui-btn ui-btn--primary" data-testid="new-call" @click="newOpen = true"><i class="fa-solid fa-user-shield"></i> New secure call</button>
      </div>
    </header>

    <div class="ui-kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-link"></i></span>Active links</div>
        <div class="ui-kpi__value" data-testid="kpi-active">{{ loaded ? active.length : '—' }}</div>
        <div class="ui-kpi__meta">{{ nextExpiry ? `Next expires ${nextExpiry}` : 'No links open' }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-success"><i class="fa-solid fa-video"></i></span>In calls now</div>
        <div class="ui-kpi__value">{{ loaded ? inCall : '—' }}</div>
        <div class="ui-kpi__meta">{{ liveCalls }} {{ liveCalls === 1 ? 'call' : 'calls' }} with people in</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-warning"><i class="fa-solid fa-door-open"></i></span>Waiting to join</div>
        <div class="ui-kpi__value">{{ loaded ? waiting : '—' }}</div>
        <div class="ui-kpi__meta">{{ waiting ? 'Open the call to let them in' : 'Nobody waiting' }}</div>
      </div>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': tab === t.value }" role="tab" :aria-selected="tab === t.value" :data-tab="t.value" @click="setTab(t.value)">
            {{ t.label }} <span class="count">{{ t.value === 'active' ? active.length : ended.length }}</span>
          </button>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load()">Try again</a></span></div>
      </div>
      <div v-else-if="!loaded" class="ui-card__body">
        <div v-for="n in 3" :key="n" class="ui-skeleton" style="height: 54px; margin-bottom: 10px"></div>
      </div>
      <div v-else-if="!rows.length" class="ui-empty" data-testid="calls-empty">
        <div class="ui-empty__icon"><i :class="tab === 'active' ? 'fa-solid fa-user-shield' : 'fa-solid fa-clock-rotate-left'"></i></div>
        <h3>{{ tab === 'active' ? 'No secure calls open' : 'No ended calls' }}</h3>
        <p>{{ tab === 'active' ? 'Create a link, send it to the people you want to talk to, and join when you are ready.' : 'Calls you end, or whose link expires, are listed here for 7 days.' }}</p>
        <button v-if="tab === 'active'" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="newOpen = true"><i class="fa-solid fa-user-shield"></i> New secure call</button>
      </div>
      <ul v-else class="calls" :class="{ 'is-loading': loading }">
        <li v-for="c in rows" :key="c.id" class="call" :data-call="c.id" tabindex="0" @click="detail = c" @keydown.enter="detail = c">
          <span class="call__icon" :class="{ 'is-live': c.participants > 0 }"><i :class="c.status === 'active' ? 'fa-solid fa-user-shield' : 'fa-solid fa-phone-slash'"></i></span>
          <div class="call__main">
            <div class="call__title">
              <strong>{{ c.title || 'Untitled call' }}</strong>
              <i v-if="c.lobby" class="fa-solid fa-door-open muted" title="People wait for you to let them in"></i>
              <i v-if="c.locked" class="fa-solid fa-lock muted" title="Locked"></i>
            </div>
            <div class="call__meta">
              <span>Created {{ ago(c.created_at) }}</span>
              <span v-if="c.status === 'active'"><i class="fa-regular fa-clock"></i> Expires {{ inTime(c.expires_at) }}</span>
              <span v-else>{{ c.end_reason === 'host' ? 'Ended' : 'Expired' }} {{ ago(c.ended_at || c.expires_at) }} · up to {{ c.peak_participants }} {{ c.peak_participants === 1 ? 'person' : 'people' }}</span>
              <span v-if="c.status === 'active' && !hasKey(c)" class="muted" title="The secret key is only on the device that created the call"><i class="fa-solid fa-key"></i> Link on another device</span>
            </div>
          </div>
          <div v-if="c.status === 'active'" class="call__people" :title="`${c.participants} in the call, ${c.waiting} waiting`">
            <span class="ui-badge" :class="c.participants ? 'ui-badge--success' : 'ui-badge--draft'" data-testid="people-count">{{ c.participants }} in call</span>
            <span v-if="c.waiting" class="ui-badge ui-badge--warning">{{ c.waiting }} waiting</span>
          </div>
          <div class="call__act" @click.stop>
            <template v-if="c.status === 'active'">
              <button v-if="hasKey(c)" class="ui-btn ui-btn--sm" data-act="copy" @click="copy(c)"><i class="fa-regular fa-copy"></i> <span class="hide-sm">Copy link</span></button>
              <router-link v-if="hasKey(c)" class="ui-btn ui-btn--sm ui-btn--success" data-act="join" :to="joinTo(c)"><i class="fa-solid fa-video"></i> <span class="hide-sm">Join</span></router-link>
              <button class="ui-btn ui-btn--sm ui-btn--ghost ui-btn--icon" data-act="end" :aria-label="`End ${c.title || 'call'}`" title="End for all" :disabled="ending === c.id" @click="end(c)"><i class="fa-solid fa-phone-slash"></i></button>
            </template>
            <button class="ui-btn ui-btn--sm ui-btn--ghost ui-btn--icon" :aria-label="`Details of ${c.title || 'call'}`" @click="detail = c"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </li>
      </ul>
    </section>

    <section class="ui-card how">
      <div class="ui-card__head"><h2><i class="fa-solid fa-lock"></i> How secure calls protect you</h2></div>
      <div class="ui-card__body how__grid">
        <div><i class="fa-solid fa-key"></i><p><strong>The key stays in the link.</strong> It is made on your device and sits after the # in the link. Browsers never send that part to a server, so DASYIN never has it.</p></div>
        <div><i class="fa-solid fa-envelope-circle-check"></i><p><strong>Set-up messages are sealed.</strong> They are encrypted and signed with that key in each browser; DASYIN only passes them on and can't read or change them.</p></div>
        <div><i class="fa-solid fa-arrows-left-right"></i><p><strong>Direct and encrypted.</strong> Sound and video go straight between the people in the call (DTLS-SRTP). A security code lets you check nobody is in the middle.</p></div>
        <div><i class="fa-solid fa-user-lock"></i><p><strong>You decide who's in.</strong> Anyone with the full link can join — you see every join, can remove people and lock the call, or turn on "Ask me before people join".</p></div>
      </div>
    </section>

    <NewSecureCallModal v-if="newOpen" @close="newOpen = false" @created="onCreated" />
    <SecureCallDetail v-if="detail" :call="detail" :app-url="appUrl" :ending="ending === detail.id" @close="detail = null" @end="end" />
  </div>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { secureCallsApi, recallKey, callLink, forgetKey } from '@/services/secureCall'
import NewSecureCallModal from '@/components/calls/NewSecureCallModal.vue'
import SecureCallDetail from '@/components/calls/SecureCallDetail.vue'

const TAB_KEY = 'securecalls.tab'

export default {
  name: 'SecureCalls',
  components: { NewSecureCallModal, SecureCallDetail },
  data() {
    let tab = 'active'
    try {
      tab = localStorage.getItem(TAB_KEY) === 'ended' ? 'ended' : 'active'
    } catch {
      tab = 'active'
    }
    return { calls: [], appUrl: '', loading: false, loaded: false, error: '', tab, newOpen: false, detail: null, ending: '', now: Date.now(), timer: null, keysTick: 0 }
  },
  computed: {
    tabs() {
      return [
        { value: 'active', label: 'Active' },
        { value: 'ended', label: 'Ended' }
      ]
    },
    active() {
      return this.calls.filter((c) => c.status === 'active')
    },
    ended() {
      return this.calls.filter((c) => c.status !== 'active')
    },
    rows() {
      return this.tab === 'active' ? this.active : this.ended
    },
    inCall() {
      return this.active.reduce((n, c) => n + (c.participants || 0), 0)
    },
    liveCalls() {
      return this.active.filter((c) => c.participants > 0).length
    },
    waiting() {
      return this.active.reduce((n, c) => n + (c.waiting || 0), 0)
    },
    nextExpiry() {
      const t = this.active.map((c) => Date.parse(c.expires_at)).sort((a, b) => a - b)[0]
      return t ? this.inTime(new Date(t).toISOString()) : ''
    }
  },
  watch: {
    '$route.query.new': {
      immediate: true,
      handler(v) {
        if (v) {
          this.newOpen = true
          this.$router.replace({ query: { ...this.$route.query, new: undefined } })
        }
      }
    }
  },
  created() {
    this.load()
    this.timer = setInterval(() => {
      this.now = Date.now()
      if (document.visibilityState === 'visible' && !this.newOpen) this.load(true)
    }, 20000)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    async load(quiet = false) {
      if (!quiet) this.loading = true
      try {
        const r = await secureCallsApi.list()
        const d = r.data?.data || {}
        this.calls = d.calls || []
        this.appUrl = d.app_url || ''
        this.error = ''
        for (const c of this.calls) if (c.status !== 'active') forgetKey(c.id)
      } catch (e) {
        if (!quiet) this.error = apiErrorMessage(e, 'Could not load your secure calls')
      } finally {
        this.loading = false
        this.loaded = true
      }
    },
    setTab(t) {
      this.tab = t
      try {
        localStorage.setItem(TAB_KEY, t)
      } catch {
        /* ignore */
      }
    },
    hasKey(c) {
      void this.keysTick
      return !!recallKey(c.id)
    },
    joinTo(c) {
      return { path: `/c/${c.id}`, hash: `#${recallKey(c.id)}` }
    },
    async copy(c) {
      const link = callLink(this.appUrl, c.id, recallKey(c.id))
      try {
        await navigator.clipboard.writeText(link)
        toast.success('Link copied — send it only to the people you want on the call')
      } catch {
        this.detail = c
      }
    },
    onCreated() {
      this.setTab('active')
      this.keysTick++
      this.load(true)
    },
    async end(c) {
      const ok = await confirmDialog({
        title: 'End this call for everyone?',
        message: `${c.title ? `"${c.title}"` : 'The call'} ends now: everyone in it is disconnected and the link stops working.`,
        confirmText: 'End for all',
        danger: true
      })
      if (!ok) return
      this.ending = c.id
      try {
        await secureCallsApi.end(c.id)
        forgetKey(c.id)
        toast.success('Call ended')
        this.detail = null
        await this.load(true)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not end the call'))
      } finally {
        this.ending = ''
      }
    },
    ago(iso) {
      if (!iso) return ''
      const s = Math.round((this.now - Date.parse(iso)) / 1000)
      if (s < 60) return 'just now'
      if (s < 3600) return `${Math.round(s / 60)} min ago`
      if (s < 86400) return `${Math.round(s / 3600)} h ago`
      return `${Math.round(s / 86400)} d ago`
    },
    inTime(iso) {
      const s = Math.round((Date.parse(iso) - this.now) / 1000)
      if (s <= 0) return 'now'
      if (s < 3600) return `in ${Math.max(1, Math.round(s / 60))} min`
      if (s < 86400 * 2) return `in ${Math.round(s / 3600)} h`
      return `in ${Math.round(s / 86400)} days`
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.k-success {
  background: var(--success-soft);
  color: var(--success);
}
.k-warning {
  background: var(--warning-soft);
  color: var(--warning);
}
.calls {
  list-style: none;
  margin: 0;
  padding: 0;
}
.calls.is-loading {
  opacity: 0.7;
}
.call {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.call:last-child {
  border-bottom: 0;
}
.call:hover,
.call:focus-visible {
  background: var(--surface-hover);
  outline: none;
}
.call__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex: none;
}
.call__icon.is-live {
  background: var(--success-soft);
  color: var(--success);
}
.call__main {
  flex: 1;
  min-width: 0;
}
.call__title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.call__title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.call__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12.5px;
  color: var(--text-3);
  margin-top: 3px;
}
.call__people {
  display: flex;
  gap: 6px;
  flex: none;
}
.call__act {
  display: flex;
  gap: 6px;
  flex: none;
  align-items: center;
}
.muted {
  color: var(--text-3);
}
.how {
  margin-top: 20px;
}
.how .ui-card__head h2 i {
  color: var(--success);
  margin-right: 6px;
}
.how__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
}
.how__grid > div {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 10px;
}
.how__grid i {
  color: var(--accent);
  padding-top: 3px;
}
.how__grid p {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-2);
  line-height: 1.55;
}
.how__grid strong {
  color: var(--text);
}
@media (max-width: 720px) {
  .call {
    flex-wrap: wrap;
    gap: 10px;
  }
  .call__main {
    flex-basis: calc(100% - 56px);
  }
  .call__people {
    margin-left: 54px;
  }
  .call__act {
    margin-left: auto;
  }
  .hide-sm {
    display: none;
  }
}
</style>
