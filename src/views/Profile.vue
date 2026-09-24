<template>
  <div class="mp ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Account</div>
        <h1>My profile</h1>
        <p>Your personal details, sign-in password and session.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/settings" class="ui-btn"><i class="fa-solid fa-sliders"></i> Organisation settings</router-link>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div class="layout">
      <aside class="ui-card who">
        <template v-if="me">
          <div class="who__avatar">{{ initials }}</div>
          <h2>{{ fullName }}</h2>
          <p class="muted">{{ me.email }}</p>
          <span class="ui-badge ui-badge--converted">{{ roleLabel }}</span>
          <dl class="who__meta">
            <div><dt>Organisation</dt><dd>{{ me.organization_name || '—' }}</dd></div>
            <div><dt>Member since</dt><dd>{{ date(me.created_at) }}</dd></div>
            <div><dt>Last sign-in</dt><dd>{{ me.last_login_at ? dateTime(me.last_login_at) : '—' }}</dd></div>
          </dl>
          <button class="ui-btn signout" @click="signOut"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign out</button>
        </template>
        <template v-else>
          <div class="ui-skeleton" style="width: 84px; height: 84px; border-radius: 24px; margin: 0 auto 14px"></div>
          <div class="ui-skeleton" style="height: 18px; margin-bottom: 8px"></div>
          <div class="ui-skeleton" style="height: 14px; width: 70%; margin: 0 auto"></div>
        </template>
      </aside>

      <div class="stack">
        <form class="ui-card" novalidate @submit.prevent="saveProfile">
          <div class="ui-card__head">
            <h2><i class="fa-regular fa-id-card"></i>&nbsp; Personal details</h2>
          </div>
          <div class="ui-card__body">
            <div class="form-grid">
              <label class="ui-field">
                <span class="ui-label">First name *</span>
                <input id="pf_first" v-model.trim="form.first_name" class="ui-input" :class="{ 'is-invalid': errors.first_name }" maxlength="100" autocomplete="given-name" :disabled="!me" />
                <span v-if="errors.first_name" class="field-error">{{ errors.first_name }}</span>
              </label>
              <label class="ui-field">
                <span class="ui-label">Last name *</span>
                <input id="pf_last" v-model.trim="form.last_name" class="ui-input" :class="{ 'is-invalid': errors.last_name }" maxlength="100" autocomplete="family-name" :disabled="!me" />
                <span v-if="errors.last_name" class="field-error">{{ errors.last_name }}</span>
              </label>
              <label class="ui-field">
                <span class="ui-label">Email</span>
                <input :value="me ? me.email : ''" class="ui-input" disabled />
                <span class="ui-hint">Your sign-in email. Ask an admin to change it.</span>
              </label>
              <label class="ui-field">
                <span class="ui-label">Phone</span>
                <input id="pf_phone" v-model.trim="form.phone" type="tel" class="ui-input" :class="{ 'is-invalid': errors.phone }" maxlength="20" autocomplete="tel" :disabled="!me" />
                <span v-if="errors.phone" class="field-error">{{ errors.phone }}</span>
              </label>
            </div>
          </div>
          <div class="card-foot">
            <span v-if="dirty" class="muted small">You have unsaved changes</span>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !me || !dirty"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save profile</button>
          </div>
        </form>

        <form class="ui-card" novalidate autocomplete="off" @submit.prevent="changePassword">
          <div class="ui-card__head">
            <h2><i class="fa-solid fa-key"></i>&nbsp; Password</h2>
          </div>
          <div class="ui-card__body">
            <div v-if="pwError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ pwError }}</span></div>
            <div class="form-grid">
              <label class="ui-field span-2 half">
                <span class="ui-label">Current password</span>
                <input id="pw_current" v-model="pw.current" :type="showPw ? 'text' : 'password'" class="ui-input" autocomplete="current-password" />
              </label>
              <label class="ui-field">
                <span class="ui-label">New password</span>
                <input id="pw_new" v-model="pw.next" :type="showPw ? 'text' : 'password'" class="ui-input" autocomplete="new-password" />
                <div class="meter" :data-level="strength.level" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
                <span class="ui-hint">{{ strength.label }}</span>
              </label>
              <label class="ui-field">
                <span class="ui-label">Confirm new password</span>
                <input id="pw_confirm" v-model="pw.confirm" :type="showPw ? 'text' : 'password'" class="ui-input" :class="{ 'is-invalid': pw.confirm && pw.confirm !== pw.next }" autocomplete="new-password" />
                <span v-if="pw.confirm && pw.confirm !== pw.next" class="field-error">Passwords don't match</span>
              </label>
            </div>
            <label class="ui-switch show-pw"><input v-model="showPw" type="checkbox" /> <span>Show passwords</span></label>
          </div>
          <div class="card-foot">
            <span class="muted small">At least 8 characters. Use a mix of words, numbers and symbols.</span>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="pwSaving || !pw.current || !pw.next || !pw.confirm"><i :class="pwSaving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-lock'"></i> Change password</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import '@/styles/module-page.css'
import api, { apiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const ROLES = { super_admin: 'Super admin', admin: 'Admin', manager: 'Manager', owner: 'Owner', care_worker: 'Staff', support_coordinator: 'Coordinator' }

export default {
  name: 'Profile',
  data() {
    return {
      me: null,
      form: { first_name: '', last_name: '', phone: '' },
      errors: {},
      saving: false,
      loadError: '',
      pw: { current: '', next: '', confirm: '' },
      pwError: '',
      pwSaving: false,
      showPw: false
    }
  },
  computed: {
    fullName() {
      return `${this.me.first_name || ''} ${this.me.last_name || ''}`.trim() || this.me.email
    },
    initials() {
      return (this.fullName || '?').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    },
    roleLabel() {
      return ROLES[this.me.role] || this.me.role
    },
    dirty() {
      if (!this.me) return false
      return ['first_name', 'last_name', 'phone'].some((k) => (this.form[k] || '') !== (this.me[k] || ''))
    },
    strength() {
      const p = this.pw.next
      if (!p) return { level: 0, label: 'Enter a new password' }
      let score = 0
      if (p.length >= 8) score++
      if (p.length >= 12) score++
      if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
      if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++
      if (p.length < 8) return { level: 1, label: 'Too short — at least 8 characters' }
      return [{ level: 1, label: 'Weak' }, { level: 2, label: 'Fair' }, { level: 3, label: 'Good' }, { level: 4, label: 'Strong' }][Math.max(0, score - 1)]
    }
  },
  created() {
    this.load()
  },
  methods: {
    date: formatDate,
    dateTime: formatDateTime,
    async load() {
      this.loadError = ''
      try {
        const { data } = await api.get('/account/profile')
        this.me = data.data
        this.form = { first_name: this.me.first_name || '', last_name: this.me.last_name || '', phone: this.me.phone || '' }
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load your profile')
      }
    },
    async saveProfile() {
      const e = {}
      if (!this.form.first_name) e.first_name = 'Required'
      if (!this.form.last_name) e.last_name = 'Required'
      if (this.form.phone && !/^[0-9+\-() .]+$/.test(this.form.phone)) e.phone = 'Digits, spaces and + - ( ) only'
      this.errors = e
      if (Object.keys(e).length) return
      this.saving = true
      try {
        const { data } = await api.put('/account/profile', this.form)
        this.me = data.data
        const auth = useAuthStore()
        if (auth.user) {
          auth.user = { ...auth.user, first_name: this.me.first_name, last_name: this.me.last_name, phone: this.me.phone }
          try {
            localStorage.setItem('current_user', JSON.stringify(auth.user))
          } catch {
            /* storage unavailable */
          }
        }
        toast.success('Profile updated')
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not save your profile'))
      } finally {
        this.saving = false
      }
    },
    async changePassword() {
      this.pwError = ''
      if (this.pw.next.length < 8) return (this.pwError = 'New password must be at least 8 characters')
      if (this.pw.next !== this.pw.confirm) return (this.pwError = "The new passwords don't match")
      if (this.pw.next === this.pw.current) return (this.pwError = 'New password must be different from the current one')
      this.pwSaving = true
      try {
        await api.post('/account/change-password', { current_password: this.pw.current, new_password: this.pw.next })
        this.pw = { current: '', next: '', confirm: '' }
        this.showPw = false
        toast.success('Password changed')
      } catch (err) {
        this.pwError = apiErrorMessage(err, 'Could not change your password')
      } finally {
        this.pwSaving = false
      }
    },
    async signOut() {
      const okd = await confirmDialog({ title: 'Sign out?', message: 'You will need to sign in again to continue.', confirmText: 'Sign out' })
      if (!okd) return
      await useAuthStore().logout()
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.who {
  padding: 28px 24px;
  text-align: center;
  position: sticky;
  top: 88px;
}

.who__avatar {
  width: 84px;
  height: 84px;
  border-radius: 24px;
  margin: 0 auto 14px;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
}

.who h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.who p {
  margin: 2px 0 10px;
  word-break: break-all;
}

.who__meta {
  text-align: left;
  margin: 20px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 12px;
}

.who__meta dt {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 500;
}

.who__meta dd {
  margin: 0;
  font-weight: 600;
}

.signout {
  width: 100%;
  justify-content: center;
  margin-top: 20px;
}

.ui-card__head h2 i {
  color: var(--text-3);
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.card-foot .ui-btn {
  margin-left: auto;
}

.half {
  max-width: calc(50% - 8px);
}

.meter {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin-top: 8px;
}

.meter span {
  height: 4px;
  border-radius: 2px;
  background: var(--border);
}

.meter[data-level='1'] span:nth-child(-n + 1) { background: var(--danger); }
.meter[data-level='2'] span:nth-child(-n + 2) { background: var(--warning); }
.meter[data-level='3'] span:nth-child(-n + 3) { background: var(--info); }
.meter[data-level='4'] span { background: var(--success); }

.show-pw {
  margin-top: 16px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .who {
    position: static;
  }
  .half {
    max-width: none;
  }
}
</style>
