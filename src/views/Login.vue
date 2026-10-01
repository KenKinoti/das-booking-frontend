<template>
  <div class="login">
    <section class="login__brand" aria-hidden="true">
      <div class="login__brand-inner">
        <div class="login__logo">
          <BrandMark class="login__mark" :size="40" label="" />
          <span>{{ appName }}</span>
        </div>
        <div class="login__pitch">
          <h2>Run bookings, sales and operations from one calm workspace.</h2>
          <ul>
            <li><i class="fa-solid fa-file-invoice-dollar"></i> Professional invoices, quotes and payments</li>
            <li><i class="fa-solid fa-calendar-check"></i> Bookings, services and staff scheduling</li>
            <li><i class="fa-solid fa-boxes-stacked"></i> Inventory, POS and suppliers</li>
            <li><i class="fa-solid fa-chart-line"></i> Live dashboards across every module</li>
          </ul>
        </div>
        <p class="login__foot">© {{ year }} DASYIN · <span class="login__ver">{{ versionLabel }}</span></p>
      </div>
    </section>

    <section class="login__panel">
      <form class="login__form" @submit.prevent="handleLogin" novalidate>
        <div class="login__mobile-logo">
          <BrandMark class="login__mark" :size="40" label="" />
          <span>{{ appName }}</span>
        </div>
        <h1>Welcome back</h1>
        <p class="login__sub">Sign in to your workspace to continue.</p>

        <div v-if="expired" class="ui-alert ui-alert--warning" role="status">
          <i class="fa-solid fa-clock"></i><span>Your session expired. Please sign in again.</span>
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger" role="alert">
          <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span>
        </div>

        <div class="ui-field">
          <label for="email">Email</label>
          <div class="ui-input-group">
            <i class="fa-regular fa-envelope"></i>
            <input id="email" v-model.trim="form.email" type="email" class="ui-input login__input" autocomplete="username" placeholder="you@company.com" required autofocus />
          </div>
        </div>

        <div class="ui-field">
          <div class="login__label-row">
            <label for="password">Password</label>
            <button type="button" class="login__link" @click="showHelp = !showHelp">Forgot password?</button>
          </div>
          <div class="ui-input-group">
            <i class="fa-solid fa-lock"></i>
            <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" class="ui-input login__input" autocomplete="current-password" placeholder="••••••••" required />
            <button type="button" class="login__eye" @click="showPassword = !showPassword" :aria-label="showPassword ? 'Hide password' : 'Show password'">
              <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
            </button>
          </div>
        </div>

        <div v-if="showHelp" class="ui-alert" role="note">
          <i class="fa-solid fa-circle-info"></i>
          <span>Ask your workspace administrator to reset your password from <strong>Users</strong>, or contact DASYIN support.</span>
        </div>

        <button type="submit" class="ui-btn ui-btn--primary login__submit" :disabled="loading">
          <i v-if="loading" class="fa-solid fa-circle-notch spin"></i>
          <span>{{ loading ? 'Signing in…' : 'Sign in' }}</span>
        </button>

        <template v-if="providers.length">
          <div class="login__or" role="separator"><span>or</span></div>
          <div class="login__sso" data-testid="sso-buttons">
            <ProviderButton v-for="p in providers" :key="p.id" :provider="p.id" :href="startUrl(p.id)" :busy="leaving === p.id" @click="leaving = p.id" />
          </div>
        </template>

        <p class="login__secure"><i class="fa-solid fa-shield-halved"></i> Secured with encrypted sessions</p>
        <p class="login__version">
          <span>{{ appName }}</span>
          <span class="ui-version" :title="`${appName} version ${appVersion}`">{{ versionLabel }}</span>
        </p>
      </form>
    </section>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth'
import { APP_NAME } from '../config'
import { APP_VERSION, VERSION_LABEL } from '../version'
import BrandMark from '../components/layout/BrandMark.vue'
import ProviderButton from '../components/auth/ProviderButton.vue'
import { ssoApi } from '../services/sso'

export default {
  name: 'LoginView',
  components: { BrandMark, ProviderButton },
  data() {
    return {
      // Sign in with Google / Microsoft — only the providers enabled in System settings
      providers: [],
      leaving: '',
      form: { email: '', password: '' },
      showPassword: false,
      showHelp: false,
      loading: false,
      error: null,
      appName: APP_NAME,
      appVersion: APP_VERSION,
      versionLabel: VERSION_LABEL,
      year: new Date().getFullYear()
    }
  },
  computed: {
    expired() {
      return this.$route.query.expired === '1' && !this.error
    },
    redirectTarget() {
      const r = this.$route.query.redirect
      return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : ''
    }
  },
  async mounted() {
    // Back from the provider via the browser's back button: clear the spinner.
    window.addEventListener('pageshow', this.onPageShow)
    try {
      this.providers = await ssoApi.providers()
    } catch {
      this.providers = []
    }
  },
  beforeUnmount() {
    window.removeEventListener('pageshow', this.onPageShow)
  },
  methods: {
    onPageShow() {
      this.leaving = ''
    },
    startUrl(provider) {
      return ssoApi.startUrl(provider, this.redirectTarget)
    },
    async handleLogin() {
      this.error = null
      if (!this.form.email || !this.form.password) {
        this.error = 'Enter your email and password.'
        return
      }
      this.loading = true
      const auth = useAuthStore()
      try {
        await auth.login(this.form)
        await this.$router.replace(this.redirectTarget || '/dashboard')
      } catch {
        this.error = auth.error || 'Sign in failed. Please try again.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  background: var(--bg);
}

.login__brand {
  position: relative;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(1200px 600px at -10% -20%, rgba(124, 107, 255, 0.9), transparent 60%),
    radial-gradient(900px 500px at 120% 110%, rgba(47, 134, 255, 0.85), transparent 55%),
    linear-gradient(150deg, #1b1446 0%, #2a1f7a 45%, #16307a 100%);
}

.login__brand::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%);
  pointer-events: none;
}

.login__brand-inner {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 44px 56px;
  gap: 40px;
}

.login__logo,
.login__mobile-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 17px;
}

.login__mark {
  box-shadow: 0 10px 24px -8px rgba(91, 76, 240, 0.8);
}

.login__pitch {
  margin-top: auto;
  max-width: 520px;
}

.login__pitch h2 {
  color: #fff;
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.12;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin-bottom: 28px;
}

.login__pitch ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;
}

.login__pitch li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.86);
  font-size: 15px;
}

.login__pitch li i {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 13px;
}

.login__card-preview {
  max-width: 420px;
  padding: 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px);
}

.lp-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.lp-row + .lp-row {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.lp-badge {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(76, 180, 255, 0.22);
  color: #bfe3ff;
}

.lp-badge--paid {
  background: rgba(60, 207, 126, 0.22);
  color: #b6f3cf;
}

.lp-badge--acc {
  background: rgba(139, 127, 255, 0.28);
  color: #ddd8ff;
}

.login__foot {
  margin: 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12.5px;
}

.login__panel {
  display: grid;
  place-items: center;
  padding: 40px 24px;
}

.login__form {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login__mobile-logo {
  display: none;
  color: var(--text);
  margin-bottom: 8px;
}

.login__form h1 {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0;
}

.login__sub {
  margin: -10px 0 6px;
  color: var(--text-3);
}

.login__input {
  height: 46px;
  font-size: 15px;
}

.login__label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.login__label-row label {
  font-size: 13px;
  font-weight: 550;
  color: var(--text-2);
}

.login__link {
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  color: var(--accent);
  cursor: pointer;
}

.login__eye {
  position: absolute;
  right: 6px;
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--text-3);
  border-radius: 8px;
  cursor: pointer;
}

.login__eye:hover {
  color: var(--text);
}

.login__submit {
  height: 46px;
  font-size: 15px;
  margin-top: 4px;
}

.login__or {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12.5px;
  color: var(--text-3);
  margin: 2px 0 -4px;
}

.login__or::before,
.login__or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.login__sso {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.login__ver {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
}

.login__version {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  font-size: 12.5px;
  color: var(--text-3);
}

.login__secure {
  text-align: center;
  font-size: 12.5px;
  color: var(--text-3);
  margin: 4px 0 0;
}

@media (max-width: 960px) {
  .login {
    grid-template-columns: 1fr;
  }
  .login__brand {
    display: none;
  }
  .login__mobile-logo {
    display: flex;
  }
}
</style>
