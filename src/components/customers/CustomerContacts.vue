<template>
  <div class="cc">
    <div class="cc__intro">
      <p>
        People at this customer who should be kept in the loop. They're copied (CC) automatically on the emails you tick; the
        <strong>primary billing contact</strong> receives invoices directly instead of the customer's own email.
      </p>
      <button v-if="!form" type="button" class="ui-btn ui-btn--sm" @click="startAdd"><i class="fa-solid fa-plus"></i> Add contact</button>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a v-if="customerId" href="#" @click.prevent="load">Retry</a></span></div>

    <div v-if="loading" class="cc__list">
      <div v-for="n in 2" :key="n" class="ui-skeleton" style="height: 64px; border-radius: 10px"></div>
    </div>

    <!-- Add / edit form -->
    <div v-if="form" class="cc__form" role="group" @keydown.enter.exact="onEnter" :aria-label="form.id || form._local ? 'Edit contact' : 'New contact'">
      <div class="cc__form-grid">
        <div class="ui-field">
          <label :for="uid + '-name'">Name</label>
          <input :id="uid + '-name'" ref="name" v-model="form.name" class="ui-input" placeholder="e.g. Jane Mwangi" autocomplete="off" />
        </div>
        <div class="ui-field">
          <label :for="uid + '-role'">Role / title</label>
          <input :id="uid + '-role'" v-model="form.role" class="ui-input" placeholder="e.g. Accounts payable" autocomplete="off" />
        </div>
        <div class="ui-field">
          <label :for="uid + '-email'">Email <span class="req">*</span></label>
          <input :id="uid + '-email'" v-model.trim="form.email" type="email" class="ui-input" :class="{ 'is-invalid': formError }" placeholder="name@company.com" autocomplete="off" />
        </div>
        <div class="ui-field">
          <label :for="uid + '-phone'">Phone</label>
          <input :id="uid + '-phone'" v-model.trim="form.phone" type="tel" class="ui-input" maxlength="50" autocomplete="off" />
        </div>
      </div>
      <fieldset class="cc__flags">
        <legend>Copy this person on</legend>
        <label class="ui-switch"><input v-model="form.cc_invoices" type="checkbox" /> Invoices</label>
        <label class="ui-switch"><input v-model="form.cc_quotes" type="checkbox" /> Quotes</label>
        <label class="ui-switch"><input v-model="form.cc_reminders" type="checkbox" /> Payment reminders</label>
        <label class="ui-switch"><input v-model="form.cc_bookings" type="checkbox" /> Booking emails</label>
      </fieldset>
      <label class="ui-switch cc__primary">
        <input v-model="form.is_primary_billing" type="checkbox" />
        Primary billing contact <span class="muted">— invoices are addressed to this person</span>
      </label>
      <div class="ui-field">
        <label :for="uid + '-notes'">Notes</label>
        <input :id="uid + '-notes'" v-model="form.notes" class="ui-input" placeholder="Optional" />
      </div>
      <p v-if="formError" class="field-error" role="alert">{{ formError }}</p>
      <div class="cc__form-actions">
        <button type="button" class="ui-btn ui-btn--sm" :disabled="saving" @click="form = null">Cancel</button>
        <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="saving" @click="save">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ form.id || form._local ? 'Save contact' : 'Add contact' }}
        </button>
      </div>
    </div>

    <ul v-if="!loading && list.length" class="cc__list">
      <li v-for="c in list" :key="c.id || c._local" class="cc__item">
        <span class="cc__avatar">{{ initials(c.name || c.email) }}</span>
        <span class="cc__main">
          <strong>
            {{ c.name || c.email }}
            <span v-if="c.is_primary_billing" class="ui-badge ui-badge--info">Primary billing</span>
          </strong>
          <small>{{ [c.role, c.name ? c.email : '', c.phone].filter(Boolean).join(' · ') }}</small>
          <span class="cc__tags">
            <span v-for="t in tags(c)" :key="t" class="cc__tag"><i class="fa-regular fa-envelope"></i> {{ t }}</span>
            <span v-if="!tags(c).length && !c.is_primary_billing" class="cc__tag cc__tag--off">Not copied on emails</span>
          </span>
        </span>
        <span class="cc__actions">
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :title="`Edit ${c.name || c.email}`" :aria-label="`Edit ${c.name || c.email}`" @click="startEdit(c)"><i class="fa-regular fa-pen-to-square"></i></button>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger" :title="`Remove ${c.name || c.email}`" :aria-label="`Remove ${c.name || c.email}`" @click="remove(c)"><i class="fa-regular fa-trash-can"></i></button>
        </span>
      </li>
    </ul>
    <div v-else-if="!loading && !form && !error" class="cc__empty">
      <i class="fa-regular fa-address-card"></i>
      <p>No contacts yet. Add accounts or management staff to copy them on invoices automatically.</p>
    </div>
  </div>
</template>

<script>
import { customerService, initials } from '@/services/customerService'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/
let seq = 0
const blank = () => ({ name: '', role: '', email: '', phone: '', notes: '', cc_invoices: true, cc_quotes: false, cc_reminders: false, cc_bookings: false, is_primary_billing: false })

export default {
  name: 'CustomerContacts',
  props: {
    /** When set, contacts are loaded and saved through the API. */
    customerId: { type: String, default: '' },
    /** Local (unsaved customer) mode: v-model list of contacts to create later. */
    modelValue: { type: Array, default: null }
  },
  emits: ['update:modelValue', 'changed'],
  data() {
    return { remote: [], loading: false, error: '', form: null, formError: '', saving: false, uid: `cc${++seq}` }
  },
  computed: {
    list() {
      return this.customerId ? this.remote : this.modelValue || []
    }
  },
  watch: {
    customerId: {
      immediate: true,
      handler(id) {
        this.form = null
        if (id) this.load()
      }
    }
  },
  methods: {
    initials,
    tags(c) {
      return [c.cc_invoices && 'Invoices', c.cc_quotes && 'Quotes', c.cc_reminders && 'Reminders', c.cc_bookings && 'Bookings'].filter(Boolean)
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.remote = await customerService.contacts(this.customerId)
        this.$emit('changed', this.remote.length)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load contacts')
      } finally {
        this.loading = false
      }
    },
    focusName() {
      this.$nextTick(() => this.$refs.name?.focus())
    },
    startAdd() {
      this.form = blank()
      this.formError = ''
      this.focusName()
    },
    startEdit(c) {
      this.form = { ...blank(), ...c }
      this.formError = ''
      this.focusName()
    },
    validate() {
      const f = this.form
      const email = (f.email || '').trim().toLowerCase()
      if (!email) return 'Add an email address'
      if (!EMAIL.test(email)) return 'Enter a valid email address'
      const key = f.id || f._local
      if (this.list.some((c) => (c.id || c._local) !== key && (c.email || '').toLowerCase() === email)) return 'This email is already a contact for this customer'
      return ''
    },
    onEnter(e) {
      // Inside the customer form: Enter saves the contact, not the customer.
      if (e.target.tagName === 'INPUT') {
        e.preventDefault()
        this.save()
      }
    },
    async save() {
      this.formError = this.validate()
      if (this.formError) return
      const f = { ...this.form, email: this.form.email.trim().toLowerCase() }
      if (!this.customerId) {
        // Local mode: stage for creation with the customer.
        let next = this.list.map((c) => (f.is_primary_billing ? { ...c, is_primary_billing: false } : c))
        if (f._local) next = next.map((c) => (c._local === f._local ? f : c))
        else next = [...next, { ...f, _local: `new-${++seq}` }]
        this.$emit('update:modelValue', next)
        this.form = null
        return
      }
      this.saving = true
      try {
        const payload = { name: f.name, role: f.role, email: f.email, phone: f.phone, notes: f.notes, cc_invoices: f.cc_invoices, cc_quotes: f.cc_quotes, cc_reminders: f.cc_reminders, cc_bookings: f.cc_bookings, is_primary_billing: f.is_primary_billing }
        if (f.id) await customerService.updateContact(this.customerId, f.id, payload)
        else await customerService.createContact(this.customerId, payload)
        toast.success(f.id ? 'Contact updated' : 'Contact added')
        this.form = null
        await this.load()
      } catch (e) {
        this.formError = apiErrorMessage(e, 'Could not save the contact')
      } finally {
        this.saving = false
      }
    },
    async remove(c) {
      const ok = await confirmDialog({ title: `Remove ${c.name || c.email}?`, message: 'They will no longer be copied on emails to this customer.', confirmText: 'Remove', danger: true })
      if (!ok) return
      if (!this.customerId) {
        this.$emit('update:modelValue', this.list.filter((x) => x._local !== c._local))
        return
      }
      try {
        await customerService.removeContact(this.customerId, c.id)
        toast.success('Contact removed')
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the contact'))
      }
    }
  }
}
</script>

<style scoped>
.cc {
  display: grid;
  gap: 12px;
}

.cc__intro {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.cc__intro p {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.5;
}

.cc__intro .ui-btn {
  flex-shrink: 0;
}

.cc__form {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.cc__form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cc__flags {
  border: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
}

.cc__flags legend {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 6px;
  padding: 0;
}

.cc__flags .ui-switch,
.cc__primary {
  font-size: 13px;
}

.muted {
  color: var(--text-3);
}

.req,
.field-error {
  color: var(--danger);
}

.field-error {
  margin: 0;
  font-size: 12.5px;
}

.cc__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cc__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.cc__item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.cc__avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.cc__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cc__main strong {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-weight: 600;
  word-break: break-word;
}

.cc__main small {
  color: var(--text-3);
  font-size: 12.5px;
  word-break: break-word;
}

.cc__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.cc__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
}

.cc__tag--off {
  background: var(--surface-2);
  color: var(--text-3);
}

.cc__actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.danger:hover {
  color: var(--danger);
}

.cc__empty {
  text-align: center;
  padding: 24px 12px;
  color: var(--text-3);
}

.cc__empty i {
  font-size: 22px;
  margin-bottom: 8px;
}

.cc__empty p {
  margin: 0;
  font-size: 13px;
}

@media (max-width: 560px) {
  .cc__form-grid {
    grid-template-columns: 1fr;
  }
  .cc__intro {
    flex-direction: column;
  }
}
</style>
