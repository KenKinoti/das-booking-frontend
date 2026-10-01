<template>
  <div class="sso">
    <div class="sso__card ui-card" data-testid="sso-complete">
      <div class="sso__brand">
        <BrandMark :size="34" label="" />
        <span>{{ appName }}</span>
      </div>

      <div v-if="state === 'working'" class="sso__body sso__working" role="status">
        <i class="fa-solid fa-circle-notch spin"></i>
        <h1>{{ linking ? 'Linking your account…' : 'Signing you in…' }}</h1>
        <p>One moment.</p>
      </div>

      <div v-else class="sso__body" data-testid="sso-error" role="alert">
        <div class="sso__icon" :class="{ 'sso__icon--info': code === 'no_account' || code === 'cancelled' }">
          <i :class="code === 'no_account' ? 'fa-solid fa-user-slash' : code === 'cancelled' ? 'fa-solid fa-arrow-rotate-left' : 'fa-solid fa-triangle-exclamation'"></i>
        </div>
        <h1>{{ message.title }}</h1>
        <p class="sso__text">{{ message.text }}</p>
        <p v-if="email && code === 'no_account'" class="sso__email" data-testid="sso-email"><i class="fa-regular fa-envelope"></i> {{ email }}</p>
        <div class="sso__actions">
          <router-link v-if="signedIn" to="/profile" class="ui-btn ui-btn--primary">Back to your profile</router-link>
          <router-link v-else to="/login" class="ui-btn ui-btn--primary" data-testid="back-to-login">Back to sign in</router-link>
        </div>
        <p v-if="code === 'no_account'" class="sso__hint">Already have a DASYIN account under a different email? Sign in with your password, then link {{ providerName }} from your profile.</p>
      </div>
    </div>
  </div>
</template>

<script>
import BrandMark from '@/components/layout/BrandMark.vue'
import { APP_NAME } from '@/config'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import { ssoErrorText, PROVIDER_NAMES } from '@/services/sso'

/** Values the backend put in the URL fragment (#code=… / #error=… / #linked=…). */
function readFragment() {
  const raw = (window.location.hash || '').replace(/^#/, '')
  const v = new URLSearchParams(raw)
  // Don't leave the one-time code in the address bar or history.
  if (raw) window.history.replaceState(window.history.state, '', window.location.pathname)
  return v
}

function safePath(p) {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/login') && !p.startsWith('/auth/') ? p : ''
}

export default {
  name: 'SsoComplete',
  components: { BrandMark },
  data() {
    return { state: 'working', code: '', email: '', provider: '', linking: false, appName: APP_NAME, signedIn: false }
  },
  computed: {
    message() {
      return ssoErrorText(this.code, { provider: this.provider, email: this.email })
    },
    providerName() {
      return PROVIDER_NAMES[this.provider] || 'your account'
    }
  },
  async mounted() {
    const v = readFragment()
    const auth = useAuthStore()
    this.provider = v.get('provider') || v.get('linked') || ''
    this.email = v.get('email') || ''
    if (v.get('error')) {
      this.signedIn = await auth.initializeAuth().catch(() => false)
      this.fail(v.get('error'))
      return
    }
    if (v.get('linked')) {
      this.linking = true
      toast.success(`${PROVIDER_NAMES[v.get('linked')] || 'Account'} linked${this.email ? ` (${this.email})` : ''} — you can now sign in with it.`)
      this.$router.replace(safePath(v.get('redirect')) || '/profile')
      return
    }
    const code = v.get('code')
    if (!code) {
      this.fail('expired')
      return
    }
    try {
      const redirect = await auth.completeSso(code)
      if (v.get('joined') === '1') toast.success(`Welcome to ${auth.user?.organization_name || 'DASYIN'}! Your account was created from your company email.`)
      this.$router.replace(safePath(redirect) || safePath(localStorage.getItem('lastRoute')) || '/dashboard')
    } catch {
      this.fail('expired')
    }
  },
  methods: {
    fail(code) {
      this.code = code
      this.state = 'error'
    }
  }
}
</script>

<style scoped>
.sso {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: var(--bg);
}
.sso__card {
  width: 100%;
  max-width: 440px;
  padding: 28px 28px 24px;
}
.sso__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 22px;
}
.sso__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.sso__body h1 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}
.sso__body p {
  margin: 0;
  color: var(--text-2);
}
.sso__working {
  align-items: center;
  text-align: center;
  padding: 18px 0;
}
.sso__working i {
  font-size: 26px;
  color: var(--accent);
}
.sso__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--warning-soft);
  color: var(--warning);
  font-size: 18px;
}
.sso__icon--info {
  background: var(--accent-soft);
  color: var(--accent);
}
.sso__email {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-weight: 600;
  color: var(--text) !important;
  word-break: break-all;
}
.sso__actions {
  margin-top: 8px;
}
.sso__hint {
  font-size: 12.5px;
  color: var(--text-3) !important;
  margin-top: 6px !important;
}
</style>
