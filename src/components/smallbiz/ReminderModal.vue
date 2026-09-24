<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" role="dialog" aria-modal="true" :aria-label="title" novalidate @submit.prevent="save">
      <div class="ui-modal__head">
        <h2>{{ title }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div class="ui-field">
          <label for="rm_title">What needs doing?</label>
          <input id="rm_title" ref="title" v-model="form.title" class="ui-input" :class="{ 'has-error': errors.title }" maxlength="200" placeholder="e.g. Pay shop rent, lodge BAS" />
          <div v-if="errors.title" class="err">{{ errors.title }}</div>
          <div class="chips">
            <button v-for="s in suggestions" :key="s.title" type="button" class="chip" @click="useSuggestion(s)">{{ s.title }}</button>
          </div>
        </div>
        <div class="row">
          <div class="ui-field grow">
            <label for="rm_due">Due date</label>
            <input id="rm_due" v-model="form.due_date" type="date" class="ui-input" :class="{ 'has-error': errors.due_date }" />
            <div v-if="errors.due_date" class="err">{{ errors.due_date }}</div>
          </div>
          <div class="ui-field grow">
            <label for="rm_rec">Repeats</label>
            <select id="rm_rec" v-model="form.recurrence" class="ui-select">
              <option v-for="r in recurrence" :key="r.key" :value="r.key">{{ r.label }}</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="ui-field grow">
            <label for="rm_amt">Amount <span class="opt">(optional)</span></label>
            <input id="rm_amt" v-model.trim="form.amount" class="ui-input num" inputmode="decimal" :class="{ 'has-error': errors.amount }" placeholder="0.00" />
            <div v-if="errors.amount" class="err">{{ errors.amount }}</div>
          </div>
          <div class="ui-field grow">
            <label for="rm_cur">Currency</label>
            <select id="rm_cur" v-model="form.currency" class="ui-select">
              <optgroup v-for="g in groups" :key="g.region" :label="g.region">
                <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
              </optgroup>
            </select>
          </div>
        </div>
        <div class="ui-field">
          <label for="rm_notes">Notes <span class="opt">(optional)</span></label>
          <textarea id="rm_notes" v-model="form.notes" class="ui-textarea" rows="2" maxlength="2000"></textarea>
        </div>
        <p v-if="form.recurrence !== 'none'" class="ui-hint"><i class="fa-solid fa-repeat"></i> When you tick this off, the next one is added automatically.</p>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i> {{ reminder ? 'Save changes' : 'Add reminder' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { smallbizApi, minorToInput, parseMinor, fieldErrors, RECURRENCE } from '@/services/smallbiz'
import { apiErrorMessage } from '@/services/api'
import { currencyGroups } from '@/utils/currencies'
import { isoDate, addDays } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'ReminderModal',
  props: {
    settings: { type: Object, required: true },
    reminder: { type: Object, default: null }
  },
  emits: ['close', 'saved'],
  data() {
    const r = this.reminder
    return {
      form: r
        ? {
            title: r.title,
            due_date: String(r.due_date).slice(0, 10),
            recurrence: r.recurrence || 'none',
            amount: r.amount_minor ? minorToInput(r.amount_minor, r.currency) : '',
            currency: r.currency || this.settings.currency,
            notes: r.notes || ''
          }
        : { title: '', due_date: addDays(isoDate(), 7), recurrence: 'none', amount: '', currency: this.settings.currency, notes: '' },
      errors: {},
      saving: false,
      recurrence: RECURRENCE,
      groups: currencyGroups()
    }
  },
  computed: {
    title() {
      return this.reminder ? 'Edit reminder' : 'New reminder'
    },
    suggestions() {
      if (this.reminder) return []
      const tax = this.settings.tax_name || 'Tax'
      return [
        { title: 'Pay rent', recurrence: 'monthly' },
        { title: `Lodge ${tax} return`, recurrence: 'quarterly' },
        { title: 'Renew insurance', recurrence: 'yearly' },
        { title: 'Pay wages', recurrence: 'monthly' }
      ]
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
    this.$refs.title?.focus()
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape') this.close()
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    useSuggestion(s) {
      this.form.title = s.title
      this.form.recurrence = s.recurrence
      this.errors.title = ''
    },
    async save() {
      const e = {}
      if (!this.form.title.trim()) e.title = 'What do you need to remember?'
      if (!this.form.due_date) e.due_date = 'Pick a due date'
      if (this.form.amount && (parseMinor(this.form.amount, this.form.currency) === null || parseMinor(this.form.amount, this.form.currency) < 0)) e.amount = 'Enter a valid amount'
      this.errors = e
      if (Object.keys(e).length) return
      this.saving = true
      try {
        const saved = this.reminder ? await smallbizApi.updateReminder(this.reminder.id, this.form) : await smallbizApi.createReminder(this.form)
        this.$emit('saved', saved, !this.reminder)
      } catch (err) {
        const f = fieldErrors(err)
        if (Object.keys(f).length) this.errors = f
        else toast.error(apiErrorMessage(err, 'Could not save reminder'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.ui-modal__body > * + * {
  margin-top: 14px;
}

.row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.grow {
  flex: 1;
  min-width: 150px;
}

.opt {
  color: var(--text-3);
  font-weight: 400;
}

.num {
  font-variant-numeric: tabular-nums;
}

.has-error {
  border-color: var(--danger) !important;
}

.err {
  color: var(--danger);
  font-size: 12.5px;
}

.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font: inherit;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
