<template>
  <div class="er" data-testid="email-recipients">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="!d" class="sk"><div class="ui-skeleton" style="height: 120px"></div><div class="ui-skeleton" style="height: 220px"></div></div>
    <template v-else>
      <div class="modes" role="radiogroup" aria-label="Who gets emails">
        <label v-for="m in d.modes" :key="m.key" class="mode" :class="{ 'is-on': d.mode === m.key }" :data-testid="`er-mode-${m.key}`">
          <input type="radio" name="er-mode" class="sr-only" :value="m.key" :checked="d.mode === m.key" :disabled="savingMode" @change="setMode(m.key)" />
          <span class="mode__icon"><i :class="modeIcon(m.key)"></i></span>
          <span class="mode__text">
            <strong>{{ m.label }}</strong>
            <small>{{ m.description }}</small>
          </span>
          <i class="mode__check fa-solid" :class="d.mode === m.key ? 'fa-circle-check' : 'fa-circle'"></i>
        </label>
      </div>
      <p v-if="d.mode_source === 'default' && d.business_type === 'nightclub'" class="ui-hint lead"><i class="fa-solid fa-martini-glass-citrus"></i> Bars, clubs and lounges start with “Only owners”, so bartenders and other staff get no emails until you choose otherwise.</p>

      <div class="cats">
        <div v-for="c in categories" :key="c.key" class="cat">
          <span class="cat__text">
            <strong>{{ c.label }}</strong>
            <small>{{ c.description }}</small>
          </span>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :data-testid="`er-preview-${c.key}`" @click="openPreview(c)"><i class="fa-regular fa-eye"></i> Preview recipients</button>
        </div>
      </div>

      <div class="er-toolbar">
        <div class="ui-input-group er-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model.trim="q" class="ui-input" type="search" placeholder="Search people" aria-label="Search people" data-testid="er-search" />
        </div>
        <span class="muted small" data-testid="er-counts">{{ d.counts.people }} {{ d.counts.people === 1 ? 'person' : 'people' }} · {{ d.counts.emails_off }} get no emails</span>
      </div>

      <div v-if="!filtered.length" class="ui-empty small-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-user-group"></i></div>
        <h3>{{ q ? 'No one matches' : 'No people yet' }}</h3>
        <p>{{ q ? 'Try another name or email.' : 'People you add under Staff appear here.' }}</p>
      </div>
      <div v-else class="ui-table-wrap">
        <table v-table-cards class="ui-table er-table">
          <thead>
            <tr>
              <th>Person</th>
              <th class="sw">All emails</th>
              <th v-for="c in categories" :key="c.key" class="sw" :title="c.label">{{ c.short }}</th>
              <th v-if="anyCustomised" class="actions-col" data-label=""><span class="sr-only">Reset</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.user_id" :data-testid="`er-row-${p.email}`" :class="{ 'is-off': p.emails_off }">
              <td>
                <div class="er-person">
                  <span class="person__name">{{ p.name }}<span v-if="p.user_id === meId" class="you">You</span></span>
                  <small>{{ p.email || 'No email address' }}</small>
                  <span class="tags">
                    <span class="ui-badge" :class="levelBadge(p.level)">{{ p.role_label }}</span>
                    <span v-if="p.emails_off" class="ui-badge ui-badge--draft" :data-testid="`er-off-${p.email}`"><i class="fa-solid fa-bell-slash"></i> Emails off</span>
                  </span>
                </div>
              </td>
              <td class="sw">
                <span class="cell">
                  <label class="ui-switch"><input type="checkbox" :checked="!p.all_off" :disabled="busy === p.user_id" :aria-label="`All emails for ${p.name}`" :data-testid="`er-all-${p.email}`" @change="setAll(p)" /></label>
                  <small class="hint" :class="{ warn: p.all_off || p.self_all_off }">{{ p.all_off ? 'All off' : p.self_all_off ? 'Paused by them' : 'On' }}</small>
                </span>
              </td>
              <td v-for="c in categories" :key="c.key" class="sw">
                <span v-if="p.applies[c.key]" class="cell">
                  <label class="ui-switch" :title="cellTitle(p, c)">
                    <input type="checkbox" :checked="p.effective[c.key]" :disabled="busy === p.user_id || locked(p, c)" :aria-label="`${c.label} for ${p.name}`" :data-testid="`er-${c.key}-${p.email}`" @change="toggle(p, c)" />
                  </label>
                  <small class="hint" :class="hintClass(p, c)" :data-testid="`er-hint-${c.key}-${p.email}`">{{ hint(p, c) }}</small>
                </span>
                <span v-else class="na" :title="`${c.label} are not sent to ${p.role_label.toLowerCase()}s`">—</span>
              </td>
              <td v-if="anyCustomised" class="actions-col">
                <button v-if="customised(p)" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="busy === p.user_id" :data-testid="`er-reset-${p.email}`" @click="reset(p)"><i class="fa-solid fa-rotate-left"></i> Reset</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="ui-hint foot">
        Switching someone on here makes an exception to the mode. People can turn their own emails off in My profile; you can’t switch those back on for them. Addresses typed into lists (Outgoing email “Notification recipients”, bill reminder recipients) are kept, except a team member’s address when that email is off for them here — all off, turned off, turned off by them or left out by the mode. Customer emails (invoices, receipts, quotes) are not affected.
      </p>
    </template>

    <div v-if="preview.open" class="ui-modal-backdrop" @mousedown.self="preview.open = false">
      <div class="ui-modal" role="dialog" aria-labelledby="er-preview-title" data-testid="er-preview-modal">
        <div class="ui-modal__head">
          <h2 id="er-preview-title">{{ preview.label }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="preview.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="preview.loading" class="ui-skeleton" style="height: 80px"></div>
          <div v-else-if="preview.error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ preview.error }}</span></div>
          <template v-else>
            <p class="muted small">The next email goes to {{ preview.recipients.length === 1 ? 'this address' : `these ${preview.recipients.length} addresses` }}:</p>
            <ul v-if="preview.recipients.length" class="rcpts" data-testid="er-preview-list">
              <li v-for="r in preview.recipients" :key="r"><i class="fa-regular fa-envelope"></i> {{ r }}</li>
            </ul>
            <p v-else class="none" data-testid="er-preview-list">No one — nobody would receive it.</p>
            <div v-if="preview.note" class="ui-alert" :class="preview.enabled ? '' : 'ui-alert--warning'" style="margin-top: 12px"><i class="fa-solid fa-circle-info"></i><span>{{ preview.note }}</span></div>
          </template>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="preview.open = false">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { emailRecipientsApi, REASON_HINTS, MODE_ICONS, categoryShown, localCategory } from '@/services/emailPrefs'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { ensureEntitlements } from '@/composables/useEntitlements'
import { term } from '@/composables/useAccess'
import { useAuthStore } from '@/stores/auth'

// Column headings (the full name is the cell's label on phones too short to matter).
const SHORT = { agenda: 'Daily agenda', bill_reminders: 'Bill reminders', bar_night_report: 'Night report', strategy_brief: 'Strategy brief', platform_updates: 'DASYIN updates' }

export default {
  name: 'EmailRecipientsPanel',
  emits: ['changed'],
  data() {
    return { d: null, error: '', q: '', busy: '', savingMode: false, preview: { open: false, loading: false, error: '', label: '', recipients: [], note: '', enabled: true } }
  },
  computed: {
    meId() {
      try {
        return useAuthStore().user?.id || ''
      } catch {
        return ''
      }
    },
    // The emails of the modules that are on, in the organisation's words ("Reservation emails").
    categories() {
      return (this.d?.categories || []).filter(categoryShown).map((c) => {
        const l = localCategory(c)
        return { ...l, short: c.key === 'bookings' ? term('bookings') : SHORT[c.key] || l.label }
      })
    },
    anyCustomised() {
      return (this.d?.people || []).some((p) => this.customised(p))
    },
    filtered() {
      const all = this.d?.people || []
      const q = this.q.toLowerCase()
      if (!q) return all
      return all.filter((p) => `${p.name} ${p.email} ${p.role_label}`.toLowerCase().includes(q))
    }
  },
  async created() {
    await Promise.resolve(ensureEntitlements()).catch(() => {})
    this.load()
  },
  methods: {
    modeIcon(k) {
      return MODE_ICONS[k] || 'fa-solid fa-envelope'
    },
    levelBadge(l) {
      return l === 'owner' ? 'ui-badge--converted' : l === 'manager' ? 'ui-badge--info' : 'ui-badge--draft'
    },
    async load() {
      this.error = ''
      try {
        this.d = await emailRecipientsApi.get()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load who gets emails')
      }
    },
    async setMode(mode) {
      if (!this.d || mode === this.d.mode) return
      const was = this.d.mode
      this.d.mode = mode
      this.savingMode = true
      try {
        this.d = await emailRecipientsApi.setMode(mode)
        toast.success({ everyone: 'Everyone involved gets emails again', owners_managers: 'Only owners and managers get emails now', owners: 'Only owners get emails now — staff get none' }[mode] || 'Saved')
        this.$emit('changed')
      } catch (e) {
        this.d.mode = was
        toast.error(apiErrorMessage(e, 'Could not change who gets emails'))
      } finally {
        this.savingMode = false
      }
    },
    replace(person) {
      const i = this.d.people.findIndex((x) => x.user_id === person.user_id)
      if (i >= 0) this.d.people.splice(i, 1, person)
      this.d.counts.emails_off = this.d.people.filter((x) => x.emails_off).length
    },
    async put(p, body, msg) {
      this.busy = p.user_id
      try {
        const r = await emailRecipientsApi.setPerson(p.user_id, body)
        this.replace(r.person)
        toast.success(msg)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
        this.load()
      } finally {
        this.busy = ''
      }
    },
    setAll(p) {
      const off = !p.all_off
      this.put(p, { all_off: off }, off ? `All emails turned off for ${p.name}` : `Emails back on for ${p.name}`)
    },
    // Their own "off" (and an admin's "all off") can't be overruled cell by cell.
    locked(p, c) {
      const r = p.reason_per_category[c.key]
      return r === 'self_off' || r === 'self_all_off' || r === 'all_off'
    },
    toggle(p, c) {
      const want = !p.effective[c.key]
      // Back to the mode when that gives what's wanted, otherwise an explicit switch.
      const value = want === !!p.by_mode[c.key] ? null : want
      this.put(p, { overrides: { [c.key]: value } }, `${c.label} ${want ? 'on' : 'off'} for ${p.name}`)
    },
    hint(p, c) {
      const r = p.reason_per_category[c.key]
      if (r === 'mode') return this.d.mode === 'owners_managers' ? 'Off · owners & managers only' : 'Off · owners only'
      return REASON_HINTS[r] || ''
    },
    hintClass(p, c) {
      const r = p.reason_per_category[c.key]
      return { warn: r === 'admin_off' || r === 'all_off' || r === 'self_off' || r === 'self_all_off', on: r === 'admin_on' }
    },
    cellTitle(p, c) {
      const r = p.reason_per_category[c.key]
      if (r === 'self_off' || r === 'self_all_off') return `${p.name} turned this off in their profile`
      if (r === 'all_off') return 'All emails are off for this person'
      return ''
    },
    customised(p) {
      return p.all_off || Object.values(p.overrides || {}).some((v) => v !== null && v !== undefined)
    },
    reset(p) {
      const overrides = {}
      for (const c of this.d.categories) overrides[c.key] = null
      this.put(p, { all_off: false, overrides }, `${p.name} is back to the default`)
    },
    async openPreview(c) {
      Object.assign(this.preview, { open: true, loading: true, error: '', label: `${c.label} — recipients`, recipients: [], note: '', enabled: true })
      try {
        const r = await emailRecipientsApi.preview(c.key)
        Object.assign(this.preview, { recipients: r.recipients || [], note: r.note || '', enabled: r.enabled !== false })
      } catch (e) {
        this.preview.error = apiErrorMessage(e, 'Could not load the recipients')
      } finally {
        this.preview.loading = false
      }
    }
  }
}
</script>

<style scoped>
.er {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sk {
  display: grid;
  gap: 12px;
}

.modes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mode {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.mode:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
}

.mode.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.mode:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.mode__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text-2);
  flex-shrink: 0;
}

.mode.is-on .mode__icon {
  background: var(--accent);
  color: var(--accent-contrast, #fff);
}

.mode__text {
  flex: 1;
  min-width: 0;
}

.mode__text strong {
  display: block;
  font-size: 14px;
  color: var(--text);
}

.mode__text small {
  display: block;
  margin-top: 3px;
  color: var(--text-3);
  font-size: 12.5px;
  line-height: 1.4;
}

.mode__check {
  color: var(--border-strong);
  font-size: 16px;
  margin-top: 2px;
}

.mode.is-on .mode__check {
  color: var(--accent);
}

.lead {
  margin: -6px 0 0;
}

.lead i {
  color: var(--accent);
  margin-right: 4px;
}

.cats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.cat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
  margin: 0 -1px -1px 0;
}

.cat__text {
  flex: 1;
  min-width: 0;
}

.cat__text strong {
  display: block;
  font-size: 13.5px;
}

.cat__text small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
  line-height: 1.4;
}

.cat .ui-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.er-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.er-search {
  flex: 0 1 320px;
  min-width: 200px;
}

.er-search .ui-input {
  width: 100%;
}

.er-table th.sw,
.er-table td.sw {
  text-align: center;
  width: 1%;
}

.er-table thead th {
  text-transform: none;
  letter-spacing: 0;
  font-size: 12.5px;
}

.er-table th.sw {
  white-space: normal;
  min-width: 72px;
  line-height: 1.3;
}

.er-table th.sw,
.er-table td.sw {
  padding-left: 6px;
  padding-right: 6px;
}

.cell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.hint {
  font-size: 11.5px;
  line-height: 1.25;
  color: var(--text-3);
  text-align: center;
  max-width: 96px;
}

.hint.warn {
  color: var(--warning);
}

.hint.on {
  color: var(--success);
}

.na {
  color: var(--text-3);
}

@media (min-width: 641px) {
  .er-table td:first-child {
    min-width: 200px;
  }
}

.er-person {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.person__name {
  font-weight: 600;
  color: var(--text);
}

.er-person small {
  color: var(--text-3);
  font-size: 12.5px;
  overflow-wrap: anywhere;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.you {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 1px 7px;
}

tr.is-off .person__name {
  color: var(--text-2);
}

.foot {
  margin: 0;
}

.small-empty {
  padding: 28px 16px;
}

.rcpts {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.rcpts li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  overflow-wrap: anywhere;
  font-size: 14px;
}

.rcpts li i {
  color: var(--text-3);
}

.none {
  margin: 8px 0 0;
  color: var(--text-2);
}

@media (max-width: 1000px) {
  .modes {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .cats {
    grid-template-columns: minmax(0, 1fr);
  }
  .cat {
    flex-wrap: wrap;
    gap: 6px;
  }
  .cat__text {
    flex: 1 1 100%;
  }
  .cat .ui-btn {
    margin-left: -10px;
  }
  .er-search {
    flex: 1 1 100%;
  }
  .er-table td.sw {
    width: auto;
  }
  .cell {
    flex-direction: row-reverse;
    gap: 8px;
  }
  .hint {
    max-width: none;
    white-space: nowrap;
  }
}
</style>
