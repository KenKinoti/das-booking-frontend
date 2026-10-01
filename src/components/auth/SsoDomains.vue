<template>
  <div class="sd" data-testid="sso-domains">
    <div v-if="loading" class="ui-skeleton" style="height: 60px"></div>
    <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <template v-else>
      <p class="sd-intro">
        People can sign in with Google or Microsoft when their verified email matches a DASYIN user. Nobody gets an account automatically — unless you allow your company's email domain below.
      </p>
      <div v-if="!ssoEnabled" class="ui-alert" style="margin-bottom: 14px">
        <i class="fa-solid fa-circle-info"></i><span>Sign-in with Google or Microsoft isn't switched on for this platform yet, so these rules won't apply until it is.</span>
      </div>

      <h3 class="sd-h">Allow anyone from these email domains to join</h3>
      <div v-if="!rules.length" class="sd-empty muted small">No domains — only people you invite can sign in.</div>
      <ul v-else class="sd-list">
        <li v-for="r in rules" :key="r.id" class="sd-row" :data-testid="`domain-${r.domain}`">
          <span class="sd-dom"><i class="fa-solid fa-at"></i> {{ r.domain }}</span>
          <span class="muted small">join as</span>
          <span class="ui-badge ui-badge--info">{{ roleLabel(r.role) }}</span>
          <span class="sd-spacer"></span>
          <button v-if="canEdit" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy === r.id" :aria-label="`Remove ${r.domain}`" @click="remove(r)">
            <i :class="busy === r.id ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-trash-can'"></i> Remove
          </button>
        </li>
      </ul>

      <form v-if="canEdit" class="sd-form" novalidate @submit.prevent="add">
        <label class="ui-field">
          <span class="ui-label">Email domain</span>
          <div class="ui-input-group">
            <i class="fa-solid fa-at"></i>
            <input v-model.trim="form.domain" class="ui-input" :placeholder="ownDomain || 'yourcompany.com'" data-testid="domain-input" maxlength="255" />
          </div>
        </label>
        <label class="ui-field">
          <span class="ui-label">Join as</span>
          <select v-model="form.role" class="ui-select" data-testid="domain-role">
            <option v-for="r in roles" :key="r" :value="r">{{ roleLabel(r) }}</option>
          </select>
        </label>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="adding || !form.domain" data-testid="domain-add"><i :class="adding ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-plus'"></i> Allow domain</button>
      </form>
      <p v-if="canEdit" class="ui-hint sd-hint">
        Only addresses the provider has verified count. You can add your own email domain<template v-if="ownDomain"> ({{ ownDomain }})</template>; public providers such as gmail.com can't be used. New people join as the role you choose — change it later under Users.
      </p>
    </template>
  </div>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { ssoApi } from '@/services/sso'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const ROLE_LABELS = { staff: 'Staff', manager: 'Manager', care_worker: 'Care worker', support_coordinator: 'Support coordinator' }

export default {
  name: 'SsoDomains',
  data() {
    return { loading: true, error: '', rules: [], roles: [], ssoEnabled: false, ownDomain: '', canEdit: false, form: { domain: '', role: 'staff' }, adding: false, busy: '' }
  },
  mounted() {
    this.load()
  },
  methods: {
    roleLabel(r) {
      return ROLE_LABELS[r] || r
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const d = await ssoApi.domains()
        this.rules = d.rules || []
        this.roles = d.roles || ['staff']
        this.ssoEnabled = !!d.sso_enabled
        this.ownDomain = d.own_domain || ''
        this.canEdit = !!d.can_edit
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load sign-in settings')
      } finally {
        this.loading = false
      }
    },
    async add() {
      if (!this.form.domain) return
      this.adding = true
      try {
        const r = await ssoApi.addDomain(this.form.domain, this.form.role)
        this.rules = [...this.rules, r].sort((a, b) => a.domain.localeCompare(b.domain))
        toast.success(`Anyone with a verified @${r.domain} address can now join as ${this.roleLabel(r.role)}`)
        this.form.domain = ''
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not add the domain'))
      } finally {
        this.adding = false
      }
    },
    async remove(r) {
      const ok = await confirmDialog({
        title: `Stop auto-joining from ${r.domain}?`,
        message: 'People who already joined keep their accounts. New people from this domain will need an invitation.',
        confirmText: 'Remove',
        danger: true
      })
      if (!ok) return
      this.busy = r.id
      try {
        await ssoApi.deleteDomain(r.id)
        this.rules = this.rules.filter((x) => x.id !== r.id)
        toast.success(`${r.domain} removed`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the domain'))
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.sd-intro {
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 13.5px;
}
.sd-h {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px;
}
.sd-empty {
  padding: 12px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  margin-bottom: 14px;
}
.sd-list {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sd-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}
.sd-dom {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.sd-dom i {
  color: var(--text-3);
  margin-right: 4px;
}
.sd-spacer {
  flex: 1;
}
.sd-form {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}
.sd-hint {
  margin-top: 8px;
}
@media (max-width: 640px) {
  .sd-form {
    grid-template-columns: 1fr;
  }
}
</style>
