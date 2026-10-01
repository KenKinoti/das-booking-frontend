<template>
  <div data-testid="recurring-tab">
    <div class="toolbar">
      <p class="rt-lead">Bills that repeat — hosting, domains, software, rent. The next bill is created for you and admins are reminded before it's due.</p>
      <div class="toolbar__right">
        <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-testid="new-recurring" @click="$emit('new')"><i class="fa-solid fa-plus"></i> New recurring bill</button>
      </div>
    </div>

    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    </div>
    <div v-else-if="loading && !list.length" class="ui-card__body"><div class="ui-skeleton" style="height: 160px"></div></div>
    <div v-else-if="!list.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-repeat"></i></div>
      <h3>No recurring bills yet</h3>
      <p>Set up bills that repeat weekly, monthly, quarterly or yearly — or turn a subscription detected in Expenses into one below.</p>
      <button type="button" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="$emit('new')"><i class="fa-solid fa-plus"></i> New recurring bill</button>
    </div>
    <div v-else class="ui-table-wrap">
      <table class="ui-table" v-table-cards data-testid="recurring-table">
        <thead>
          <tr>
            <th>Bill</th>
            <th>Schedule</th>
            <th>Next</th>
            <th class="num">Amount</th>
            <th>Status</th>
            <th style="width: 150px" data-label=""></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in list" :key="r.id" class="is-clickable" :data-testid="`recurring-${r.id}`" @click="$emit('edit', r)">
            <td class="card-title">
              <strong>{{ r.name }}</strong>
              <small class="sub">{{ r.vendor_name }}<template v-if="r.service || r.synergy_domain"> · {{ [r.service, r.synergy_domain].filter(Boolean).join(' · ') }}</template></small>
            </td>
            <td>
              {{ r.summary }}
              <small class="sub">
                {{ r.mode === 'track' ? 'Bills from Expenses' : r.amount_mode === 'estimate' ? 'Draft to confirm' : r.create_as === 'approved' ? 'Created approved' : 'Created as draft' }}
                · {{ r.auto_pay ? 'auto-pay' : 'manual payment' }}
              </small>
            </td>
            <td class="nowrap">
              <template v-if="r.next_date">{{ fmtDate(r.next_due || r.next_date) }}<small class="sub">{{ rel(r.next_due || r.next_date) }}</small></template>
              <span v-else class="muted">—</span>
            </td>
            <td class="num">
              <strong>{{ r.amount_mode === 'estimate' ? '~' : '' }}{{ fmtMoney(r.amount, r.currency) }}</strong>
              <small v-if="r.currency !== currency && r.home_amount" class="sub">≈ {{ fmtMoney(r.home_amount, currency) }}</small>
            </td>
            <td>
              <span class="ui-badge" :class="{ active: 'ui-badge--success', paused: 'ui-badge--warning', ended: 'ui-badge--draft' }[r.status]">{{ r.status }}</span>
              <small v-if="r.bill_count" class="sub">{{ r.bill_count }} so far<template v-if="r.last_paid"> · last paid {{ fmtDate(r.last_paid) }}</template></small>
            </td>
            <td class="row-actions" @click.stop>
              <button v-if="r.status === 'active'" type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy === r.id" :aria-label="`Pause ${r.name}`" title="Pause" @click="toggle(r)"><i class="fa-solid fa-pause"></i></button>
              <button v-else-if="r.status === 'paused'" type="button" class="ui-btn ui-btn--sm" :disabled="busy === r.id" @click="toggle(r)"><i class="fa-solid fa-play"></i> Resume</button>
              <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost ui-btn--icon" :aria-label="`Edit ${r.name}`" title="Edit" @click="$emit('edit', r)"><i class="fa-solid fa-pen"></i></button>
              <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost ui-btn--icon" :aria-label="`Delete ${r.name}`" title="Delete" @click="remove(r)"><i class="fa-regular fa-trash-can"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section v-if="unlinked.length" class="subs" data-testid="detected-subscriptions">
      <h3><i class="fa-solid fa-wand-magic-sparkles"></i> Detected in Expenses</h3>
      <p class="muted">These charges repeat but aren't recurring bills yet. Converting one keeps Expenses creating its bills (counted once) and adds reminders before each due date.</p>
      <div class="sub-list">
        <div v-for="s in unlinked" :key="s.key" class="sub-item">
          <div class="sub-item__main">
            <strong>{{ s.vendor }}</strong>
            <small>{{ s.service || s.category }} · {{ s.interval }} · last {{ fmtMoney(s.last_original, s.currency) }} on {{ fmtDate(s.last_date) }}</small>
          </div>
          <button type="button" class="ui-btn ui-btn--sm" :disabled="busy === s.key" :data-testid="`convert-${s.key}`" @click="convert(s)">
            <i :class="busy === s.key ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-repeat'"></i> Make recurring bill
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { recurringApi } from '@/services/recurringBills'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate, relativeDays } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'RecurringTab',
  props: {
    currency: { type: String, required: true },
    refreshKey: { type: Number, default: 0 },
    convertKey: { type: String, default: '' }
  },
  emits: ['new', 'edit', 'changed', 'loaded'],
  data() {
    return { list: [], subs: [], loading: false, error: '', busy: '' }
  },
  computed: {
    unlinked() {
      return this.subs.filter((s) => !s.linked_recurring_id && s.status !== 'lapsed')
    }
  },
  watch: {
    refreshKey() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    fmtMoney: formatMoney,
    fmtDate: formatDate,
    rel: relativeDays,
    async load() {
      this.loading = true
      this.error = ''
      try {
        const [list, subs] = await Promise.all([recurringApi.list(), recurringApi.subscriptions().catch(() => [])])
        this.list = list || []
        this.subs = subs || []
        this.$emit('loaded', this.list)
        if (this.convertKey) {
          const s = this.subs.find((x) => x.key === this.convertKey)
          if (s && !s.linked_recurring_id) this.convert(s)
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load recurring bills')
      } finally {
        this.loading = false
      }
    },
    async toggle(r) {
      this.busy = r.id
      try {
        if (r.status === 'active') {
          await recurringApi.pause(r.id)
          toast.success(`${r.name} paused — no bills or reminders until you resume it`)
        } else {
          await recurringApi.resume(r.id)
          toast.success(`${r.name} resumed`)
        }
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not change the schedule'))
      } finally {
        this.busy = ''
      }
    },
    async remove(r) {
      const ok = await confirmDialog({
        title: `Delete ${r.name}?`,
        message: 'No more bills or reminders will be created. Bills it already created stay in Bills.',
        confirmText: 'Delete schedule',
        danger: true
      })
      if (!ok) return
      try {
        await recurringApi.remove(r.id)
        toast.success(`${r.name} deleted`)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the schedule'))
      }
    },
    async convert(s) {
      const ok = await confirmDialog({
        title: `Make ${s.vendor} a recurring bill?`,
        message: `A ${s.interval} schedule from ${formatDate(s.next_date)} for about ${formatMoney(s.last_original, s.currency)}. Bills keep coming from Expenses (counted once); you'll get reminders before each due date.`,
        confirmText: 'Create recurring bill'
      })
      if (!ok) return
      this.busy = s.key
      try {
        const r = await recurringApi.fromSubscription(s.key)
        toast.success(`${r.name} is now a recurring bill`)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not convert the subscription'))
      } finally {
        this.busy = ''
      }
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
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.rt-lead {
  margin: 0;
  color: var(--text-2);
  font-size: 13.5px;
  max-width: 640px;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.muted {
  color: var(--text-3);
}
.nowrap {
  white-space: nowrap;
}
.row-actions {
  text-align: right;
  white-space: nowrap;
}
.row-actions .ui-btn + .ui-btn {
  margin-left: 4px;
}
.subs {
  border-top: 1px solid var(--border);
  padding: 16px;
}
.subs h3 {
  margin: 0 0 4px;
  font-size: 14px;
}
.subs h3 i {
  color: var(--accent);
  margin-right: 6px;
}
.subs p {
  margin: 0 0 12px;
  font-size: 13px;
}
.sub-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}
.sub-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.sub-item__main {
  min-width: 0;
}
.sub-item__main small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}
@media (max-width: 560px) {
  .sub-list {
    grid-template-columns: 1fr;
  }
  .sub-item {
    flex-wrap: wrap;
  }
}
</style>
