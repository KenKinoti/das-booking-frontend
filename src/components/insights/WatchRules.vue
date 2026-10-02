<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 880px" role="dialog" aria-modal="true" aria-labelledby="wr-title" data-testid="watch-rules-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="wr-title">Keyword rules</h2>
        <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="!d && !error" class="ui-skeleton" style="height: 280px"></div>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <template v-if="d">
          <p class="how"><i class="fa-solid fa-calculator"></i> {{ d.formula }}</p>
          <div class="ctx" data-testid="rules-context">
            <span><small>Business type</small>{{ d.context.business_type_name || 'Not set' }}</span>
            <span><small>You sell (last 12 months)</small>{{ lines || 'No invoices yet' }}</span>
            <span><small>Home country</small>{{ d.context.home_country || 'Not set' }}</span>
            <span><small>Clients in</small>{{ d.context.client_countries.join(', ') || '—' }}</span>
          </div>
          <p class="ui-hint">A keyword matches whole words, in any case (“domain” also matches “domains”). Separate keywords with commas. Topics with weight 0 still tag items but add no points.</p>

          <ul class="rules">
            <li v-for="(r, i) in rules" :key="r._id" class="rule" :class="{ off: !r.enabled }" :data-rule="r.key || 'new'">
              <div class="rule__top">
                <label class="ui-switch" :title="r.enabled ? 'In use' : 'Not in use'">
                  <input v-model="r.enabled" type="checkbox" :disabled="!d.can_edit" :aria-label="'Use ' + (r.label || 'topic')" />
                </label>
                <input v-model.trim="r.label" class="ui-input name" placeholder="Topic name" maxlength="80" required :disabled="!d.can_edit" :aria-label="'Topic name ' + (i + 1)" />
                <label class="weight">
                  <small>Weight</small>
                  <input v-model.number="r.weight" class="ui-input" type="number" min="0" max="5" step="0.5" :disabled="!d.can_edit" :aria-label="'Weight of ' + (r.label || 'topic')" />
                </label>
                <button v-if="d.can_edit" class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" type="button" :aria-label="'Remove ' + (r.label || 'topic')" title="Remove topic" @click="rules.splice(i, 1)"><i class="fa-regular fa-trash-can"></i></button>
              </div>
              <textarea v-model="r.text" class="ui-textarea" rows="2" :placeholder="r.hint || 'keyword, another keyword, a phrase'" :disabled="!d.can_edit" :aria-label="'Keywords of ' + (r.label || 'topic')" :data-keywords="r.key || 'new'"></textarea>
              <small v-if="r.hint" class="ui-hint">{{ r.hint }}</small>
            </li>
          </ul>
          <button v-if="d.can_edit" class="ui-btn ui-btn--sm" type="button" data-testid="rule-add" @click="addRule"><i class="fa-solid fa-plus"></i> Add a topic</button>
          <div v-if="saveError" class="ui-alert ui-alert--danger mt" data-testid="rules-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ saveError }}</span></div>
        </template>
      </div>
      <div class="ui-modal__foot">
        <button v-if="d && d.can_edit && !d.defaults" class="ui-btn ui-btn--ghost" type="button" :disabled="saving" data-testid="rules-reset" @click="reset">Reset to defaults</button>
        <span class="grow"></span>
        <button class="ui-btn" type="button" @click="$emit('close')">{{ d && d.can_edit ? 'Cancel' : 'Close' }}</button>
        <button v-if="d && d.can_edit" class="ui-btn ui-btn--primary" type="submit" :disabled="saving" data-testid="rules-save"><i v-if="saving" class="fa-solid fa-spinner fa-spin"></i> Save &amp; re-score</button>
      </div>
    </form>
  </div>
</template>

<script>
import { watchApi } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

let seq = 0
const LINE_LABELS = { web_dev: 'Web development', hosting: 'Hosting', domains: 'Domains', workspace: 'Google Workspace & email', maintenance: 'Maintenance', software: 'Software & ERP', consulting: 'Consulting' }

export default {
  name: 'WatchRules',
  props: { canEdit: { type: Boolean, default: false } },
  emits: ['close', 'saved'],
  data() {
    return { d: null, rules: [], error: '', saveError: '', saving: false }
  },
  computed: {
    lines() {
      return (this.d?.context.service_lines || []).map((l) => LINE_LABELS[l] || l).join(', ')
    }
  },
  created() {
    this.load()
  },
  methods: {
    apply(d) {
      this.d = d
      this.rules = d.rules.map((r) => ({ _id: ++seq, key: r.key, label: r.label, weight: r.weight, enabled: r.enabled, hint: r.hint || '', text: (r.keywords || []).join(', ') }))
    },
    async load() {
      try {
        this.apply(await watchApi.rules())
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the keyword rules.')
      }
    },
    addRule() {
      this.rules.push({ _id: ++seq, key: '', label: '', weight: 1, enabled: true, hint: '', text: '' })
    },
    async save() {
      this.saving = true
      this.saveError = ''
      try {
        const body = this.rules.map((r) => ({
          key: r.key,
          label: r.label,
          weight: Number(r.weight) || 0,
          enabled: !!r.enabled,
          keywords: r.text
            .split(/[,\n;]/)
            .map((k) => k.trim())
            .filter(Boolean)
        }))
        const d = await watchApi.saveRules(body)
        this.apply(d)
        toast.success(`Rules saved · ${d.rescored} stored item${d.rescored === 1 ? '' : 's'} re-scored`)
        this.$emit('saved')
        this.$emit('close')
      } catch (e) {
        this.saveError = apiErrorMessage(e, 'Could not save the rules')
      } finally {
        this.saving = false
      }
    },
    async reset() {
      if (!(await confirmDialog({ title: 'Reset the keyword rules?', message: 'Your topics, keywords and weights are replaced by the built-in ones and every stored item is re-scored.', confirmText: 'Reset', danger: true }))) return
      this.saving = true
      try {
        const d = await watchApi.resetRules()
        this.apply(d)
        toast.success('Rules reset to the defaults')
        this.$emit('saved')
      } catch (e) {
        this.saveError = apiErrorMessage(e, 'Could not reset the rules')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.how {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.5;
}

.how i {
  color: var(--text-3);
  margin-right: 4px;
}

.ctx {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px 16px;
  margin-bottom: 10px;
  font-size: 13px;
}

.ctx small {
  display: block;
  font-size: 11px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rules {
  list-style: none;
  margin: 12px 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rule {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.rule.off {
  background: var(--surface-2);
}

.rule__top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}

.weight {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.weight small {
  color: var(--text-3);
  font-size: 12px;
}

.weight input {
  width: 72px;
}

.ui-textarea {
  width: 100%;
  font-size: 12.5px;
}

.mt {
  margin-top: 10px;
}

.grow {
  flex: 1;
}

@media (max-width: 520px) {
  .rule__top {
    flex-wrap: wrap;
  }

  .name {
    flex-basis: 60%;
  }
}
</style>
