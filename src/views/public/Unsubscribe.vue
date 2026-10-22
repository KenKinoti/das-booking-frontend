<template>
  <main class="unsub">
    <div class="unsub__card" role="main">
      <div class="unsub__brand"><BrandMark :size="40" /><span>DASYIN</span></div>

      <template v-if="state === 'working'">
        <div class="unsub__icon is-busy" aria-hidden="true"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
        <h1>Unsubscribing…</h1>
        <p>One moment.</p>
      </template>

      <template v-else-if="state === 'done'">
        <div class="unsub__icon is-ok" aria-hidden="true"><i class="fa-solid fa-envelope-circle-check"></i></div>
        <h1>You're unsubscribed</h1>
        <p><strong>{{ email || 'You' }}</strong> won't get offers from DASYIN any more — not by email and not in the app. It takes effect straight away.</p>
        <p class="unsub__small">You'll still get important notices about your account and the service, and any updates you have chosen to receive (change those in My profile → Email notifications).</p>
        <div class="unsub__actions">
          <button type="button" class="ui-btn" :disabled="busy" @click="resubscribe"><i class="fa-solid fa-rotate-left"></i> Changed your mind? Resubscribe</button>
          <router-link to="/login" class="ui-btn ui-btn--ghost">Go to DASYIN</router-link>
        </div>
      </template>

      <template v-else-if="state === 'resubscribed'">
        <div class="unsub__icon is-ok" aria-hidden="true"><i class="fa-solid fa-gift"></i></div>
        <h1>You're subscribed again</h1>
        <p><strong>{{ email || 'You' }}</strong> will get DASYIN offers again. You can unsubscribe from any offer email.</p>
        <div class="unsub__actions">
          <button type="button" class="ui-btn ui-btn--ghost" :disabled="busy" @click="unsubscribe">Unsubscribe again</button>
          <router-link to="/login" class="ui-btn ui-btn--primary">Go to DASYIN</router-link>
        </div>
      </template>

      <template v-else>
        <div class="unsub__icon is-bad" aria-hidden="true"><i class="fa-solid fa-link-slash"></i></div>
        <h1>This link doesn't work</h1>
        <p>{{ error || 'The unsubscribe link is incomplete or no longer valid.' }}</p>
        <p class="unsub__small">Sign in and turn offers off in My profile, or reply to the email and we'll take you off the list.</p>
        <div class="unsub__actions">
          <button v-if="token" type="button" class="ui-btn" :disabled="busy" @click="unsubscribe"><i class="fa-solid fa-rotate"></i> Try again</button>
          <router-link to="/login" class="ui-btn ui-btn--primary">Sign in</router-link>
        </div>
      </template>

      <p class="unsub__legal">DASYIN honours every unsubscribe request at once, as Kenya's Data Protection Act 2019 and Australia's Spam Act 2003 require.</p>
    </div>
  </main>
</template>

<script>
import BrandMark from '@/components/layout/BrandMark.vue'
import { unsubscribeAPI } from '@/services/announcements'
import { apiErrorMessage } from '@/services/api'

/**
 * One-click unsubscribe from DASYIN offers (the link in every offer email).
 * Opening the page unsubscribes — no sign-in, no second click; a link
 * checker that only fetches the page does not, because the change is a POST.
 */
export default {
  name: 'Unsubscribe',
  components: { BrandMark },
  data() {
    return { state: 'working', email: '', error: '', busy: false }
  },
  computed: {
    token() {
      const t = this.$route.query.t
      return typeof t === 'string' ? t : ''
    }
  },
  mounted() {
    if (!this.token) {
      this.state = 'error'
      return
    }
    this.unsubscribe()
  },
  methods: {
    async unsubscribe() {
      this.busy = true
      if (this.state !== 'done') this.state = 'working'
      try {
        const r = await unsubscribeAPI.unsubscribe(this.token)
        this.email = r.email
        this.state = 'done'
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not unsubscribe — please try again.')
        this.state = 'error'
      } finally {
        this.busy = false
      }
    },
    async resubscribe() {
      this.busy = true
      try {
        const r = await unsubscribeAPI.resubscribe(this.token)
        this.email = r.email
        this.state = 'resubscribed'
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not resubscribe — please try again.')
        this.state = 'error'
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.unsub {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: var(--bg);
  color: var(--text);
}
.unsub__card {
  width: min(520px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 32px 28px 24px;
  text-align: center;
}
.unsub__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  margin-bottom: 22px;
  color: var(--text);
}
.unsub__icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 14px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 24px;
  background: var(--accent-soft);
  color: var(--accent);
}
.unsub__icon.is-ok {
  background: var(--success-soft);
  color: var(--success);
}
.unsub__icon.is-bad {
  background: var(--danger-soft);
  color: var(--danger);
}
.unsub h1 {
  font-size: 22px;
  margin: 0 0 8px;
}
.unsub p {
  color: var(--text-2);
  line-height: 1.55;
  margin: 0 0 10px;
  overflow-wrap: anywhere;
}
.unsub__small {
  font-size: 13.5px;
  color: var(--text-3) !important;
}
.unsub__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin: 18px 0 6px;
}
.unsub__legal {
  margin-top: 18px !important;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-3) !important;
}
@media (max-width: 480px) {
  .unsub__card {
    padding: 24px 18px 18px;
  }
  .unsub__actions .ui-btn {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
