<template>
  <div class="drawer-backdrop" @mousedown.self="$emit('close')">
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="sd-title" data-testid="sub-drawer">
      <header class="drawer__head">
        <div class="min0">
          <div class="ui-eyebrow">{{ d ? `${d.number} · ${periodLabel(d.period)}` : 'Subscription' }}</div>
          <h2 id="sd-title">{{ d ? d.customer_name : 'Loading…' }}</h2>
          <div v-if="d" class="chips">
            <span class="ui-badge" :class="statusBadge(d.status)" data-testid="sd-status">{{ statusLabel(d.status) }}</span>
            <span class="muted">{{ d.name }}</span>
          </div>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" data-testid="sd-close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>
      <div class="drawer__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-if="!d && !error" class="ui-skeleton" style="height: 360px"></div>
        <template v-else-if="d">
          <!-- State -->
          <div v-if="d.status === 'suspended'" class="ui-alert ui-alert--danger" data-testid="sd-banner-suspended">
            <i class="fa-solid fa-ban"></i>
            <span>
              Suspended since {{ fmt(d.suspended_at) }}<template v-if="VIA[d.suspended_via]"> — {{ VIA[d.suspended_via] }}</template>.
              <template v-if="d.open">Invoice {{ d.open.invoice_number }} ({{ money(d.open.balance, d.open.currency) }}) is unpaid — paying it unsuspends the service.</template>
              <a v-if="openTasks.length" href="#tasks" @click.prevent="scrollTo('sd-tasks')">{{ openTasks.length }} task{{ openTasks.length === 1 ? '' : 's' }} to do</a>
            </span>
          </div>
          <div v-else-if="d.open && d.open.sent && d.status !== 'cancelled'" class="ui-alert" :class="d.open.days_overdue > 0 ? 'ui-alert--warning' : ''" data-testid="sd-banner-open">
            <i :class="d.open.days_overdue > 0 ? 'fa-solid fa-triangle-exclamation' : 'fa-regular fa-clock'"></i>
            <span>
              Invoice <strong>{{ d.open.invoice_number }}</strong> ({{ money(d.open.balance, d.open.currency) }})
              <template v-if="d.open.days_overdue > 0">is {{ d.open.days_overdue }} day{{ d.open.days_overdue === 1 ? '' : 's' }} overdue.</template>
              <template v-else>is due {{ fmt(d.open.due_date) }}.</template>
              <template v-if="d.open.suspend_on">
                Suspended <strong data-testid="sd-suspend-on">{{ fmt(d.open.suspend_on) }}</strong> ({{ whenIn(d.open.days_to_suspend) }}) unless paid<template v-if="d.open.extra_days"> — {{ d.open.extra_days }} more days given</template>.
                <template v-if="d.open.deferred">Moved from {{ fmt(d.open.planned_on) }} so you hear about it 3 days ahead.</template>
              </template>
              <template v-else-if="d.open.no_suspend"> Not suspended for this invoice (you chose “don't suspend this time”).</template>
              <template v-else-if="!d.auto_suspend"> Auto-suspend is off for this subscription.</template>
            </span>
          </div>
          <div v-else-if="d.open && !d.open.sent" class="ui-alert"><i class="fa-regular fa-file-lines"></i><span>Invoice {{ d.open.invoice_number }} is a draft — auto-send is off. <router-link :to="`/invoices/${d.open.invoice_id}`">Review and send it</router-link>.</span></div>
          <div v-else-if="d.status === 'cancelled'" class="ui-alert"><i class="fa-solid fa-circle-xmark"></i><span>Cancelled on {{ fmt(d.cancelled_at) }}{{ d.cancel_reason === 'end_of_term' ? ' at the end of its term' : '' }}.</span></div>
          <div v-if="d.end_date && d.status !== 'cancelled'" class="ui-alert"><i class="fa-solid fa-flag-checkered"></i><span>Ends on {{ fmt(d.end_date) }} — no invoices after that.</span></div>

          <!-- One-click actions -->
          <div v-if="d.status !== 'cancelled'" class="actions" data-testid="sd-actions">
            <template v-if="d.open">
              <button type="button" class="ui-btn ui-btn--sm" :disabled="busy" data-testid="sd-extend7" @click="doExtend(7)"><i class="fa-solid fa-hourglass-half"></i> {{ d.status === 'suspended' ? 'Unsuspend + 7 days' : 'Give 7 more days' }}</button>
              <button type="button" class="ui-btn ui-btn--sm" :disabled="busy" data-testid="sd-extend14" @click="doExtend(14)">{{ d.status === 'suspended' ? 'Unsuspend + 14 days' : 'Give 14 more days' }}</button>
              <button type="button" class="ui-btn ui-btn--sm ui-btn--success" :disabled="busy" data-testid="sd-paid" @click="paidOpen = true"><i class="fa-solid fa-circle-check"></i> Mark as paid</button>
              <button v-if="d.status !== 'suspended'" type="button" class="ui-btn ui-btn--sm ui-btn--danger" :disabled="busy" data-testid="sd-suspend" @click="doSuspend"><i class="fa-solid fa-ban"></i> Suspend now</button>
              <button v-if="d.status !== 'suspended' && d.open.sent && !d.open.no_suspend && d.auto_suspend" type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy" data-testid="sd-skip" @click="doSkip(false)">Don't suspend this time</button>
              <button v-if="d.open.no_suspend" type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy" data-testid="sd-unskip" @click="doSkip(true)">Suspend it after all</button>
              <button v-if="d.open.sent" type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy" data-testid="sd-remind" @click="doRemind"><i class="fa-solid fa-paper-plane"></i> Remind now</button>
            </template>
            <button v-else-if="d.status === 'suspended'" type="button" class="ui-btn ui-btn--sm ui-btn--success" :disabled="busy" data-testid="sd-unsuspend" @click="doUnsuspend"><i class="fa-solid fa-rotate-left"></i> Unsuspend</button>
            <span class="actions__right">
              <button type="button" class="ui-btn ui-btn--sm" data-testid="sd-edit" @click="editOpen = true"><i class="fa-solid fa-pen"></i> Edit</button>
              <OverflowMenu label="More actions" :items="moreActions" />
            </span>
          </div>

          <div class="stats">
            <div>
              <span>Per {{ periodNoun(d.period) }}</span>
              <strong class="num">{{ money(d.amount_tax, d.currency) }}</strong>
              <small>{{ money(d.amount, d.currency) }} before tax<template v-if="d.monthly_home !== null && d.currency !== d.home_currency"> · ≈ {{ money(d.monthly_home, d.home_currency) }}/mo</template></small>
            </div>
            <div>
              <span>Next billing</span>
              <strong class="num" data-testid="sd-next-billing">{{ fmt(d.next_billing_date) }}</strong>
              <small>{{ d.next_invoice_date ? `next invoice ${fmt(d.next_invoice_date, 'short')}` : '' }}</small>
            </div>
            <div>
              <span>Paid through</span>
              <strong class="num">{{ d.paid_through ? fmt(d.paid_through) : '—' }}</strong>
              <small>since {{ fmt(d.start_date, 'short') }}</small>
            </div>
            <div>
              <span>Margin /mo</span>
              <strong class="num" :class="{ neg: d.margin < 0 }">{{ d.margin !== null && d.margin !== undefined ? money(d.margin, d.home_currency) : '—' }}</strong>
              <small>{{ d.cost && d.cost.source !== 'none' ? `costs ${money(d.cost.monthly, d.cost.currency)}/mo` : 'cost unknown' }}</small>
            </div>
          </div>

          <section class="block">
            <h3>Services</h3>
            <ul class="lines">
              <li v-for="l in d.lines" :key="l.id">
                <span><i :class="kindIcon(l.kind)" class="muted"></i> {{ l.description }}<small v-if="l.service_name && l.service_name !== l.description" class="sub">{{ l.service_name }}</small></span>
                <span class="num">{{ trimQty(l.quantity) }} × {{ money(l.price, l.price_currency) }}<small class="sub">{{ l.from_catalog ? 'catalogue price' : 'price for this client' }} · {{ l.tax_rate }}% tax</small></span>
              </li>
            </ul>
          </section>

          <section class="block">
            <h3>Sites, domains and billing</h3>
            <dl class="facts">
              <dt>Hosted site</dt>
              <dd>{{ d.site_domain || '—' }}<template v-if="d.domains?.length"> · {{ d.domains.join(', ') }}</template></dd>
              <dt>Hosted at</dt>
              <dd>{{ supplierLabel(d.supplier) || '—' }}{{ d.supplier_plan ? ` · ${d.supplier_plan}` : '' }}</dd>
              <template v-for="x in d.domain_info" :key="x.domain">
                <dt>{{ x.domain }}</dt>
                <dd :data-testid="`sd-domain-${x.domain}`">
                  <template v-if="x.expires">expires {{ fmt(x.expires) }} ({{ x.days_left >= 0 ? `${x.days_left} days` : 'expired' }})<template v-if="x.auto_renew !== undefined && x.auto_renew !== null"> · auto-renew {{ x.auto_renew ? 'on' : 'off' }}</template><small class="sub">{{ x.source === 'synergy' ? 'from Synergy Wholesale' : 'typed on the subscription' }}</small></template>
                  <span v-else class="muted">expiry unknown</span>
                </dd>
              </template>
              <dt>Billing</dt>
              <dd>{{ periodLabel(d.period) }} from {{ fmt(d.anchor_date) }} · {{ d.payment_terms_days ? `due ${d.payment_terms_days} days after it starts` : 'due when the period starts' }} · invoiced {{ d.lead }} days ahead{{ d.auto_send ? ', emailed with the pay link' : ', as a draft' }}</dd>
              <dt>If unpaid</dt>
              <dd>{{ d.auto_suspend ? `suspended ${d.grace} day${d.grace === 1 ? '' : 's'} after the due date (admins told 3 days before)` : 'never suspended automatically' }}</dd>
              <dt>Client's page</dt>
              <dd><a v-if="d.portal_url" :href="d.portal_url" target="_blank" rel="noopener" data-testid="sd-portal">Your services</a><span v-else class="muted">—</span></dd>
            </dl>
            <p v-if="d.notes" class="notes">{{ d.notes }}</p>
          </section>

          <section class="block" data-testid="sd-timeline">
            <h3>Timeline</h3>
            <p v-if="!d.timeline.length" class="muted">Nothing yet — the first invoice goes out {{ d.next_invoice_date ? fmt(d.next_invoice_date) : 'soon' }}.</p>
            <ol v-else class="tl">
              <li v-for="(t, i) in d.timeline" :key="i" :class="[`tl--${t.kind}`, `is-${t.status}`, { 'is-today': t.date === d.today }]" :data-kind="t.kind" :data-status="t.status">
                <span class="tl__dot" aria-hidden="true"><i :class="TIMELINE_ICONS[t.kind] || 'fa-regular fa-circle'"></i></span>
                <span class="tl__body">
                  <span class="tl__title">{{ t.title }}<span v-if="t.audience" class="aud">{{ t.audience === 'client' ? 'client' : t.audience === 'admin' ? 'admins' : '' }}</span></span>
                  <small v-if="t.detail" class="sub">{{ t.detail }}</small>
                </span>
                <span class="tl__side">
                  <span class="tl__date">{{ fmt(t.date, 'short') }}</span>
                  <span class="tl__st" :class="`st-${t.status}`">{{ statusWord(t) }}</span>
                </span>
              </li>
            </ol>
          </section>

          <section class="block">
            <h3>Invoices <small>{{ d.periods.length }}</small></h3>
            <p v-if="!d.periods.length" class="muted">No invoices yet.</p>
            <div v-else class="ui-table-wrap">
              <table class="ui-table" v-table-cards data-testid="sd-periods">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Period</th>
                    <th>Due</th>
                    <th class="num">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in d.periods" :key="p.id" :class="{ 'is-clickable': p.invoice_id }" @click="p.invoice_id && $router.push(`/invoices/${p.invoice_id}`)">
                    <td class="card-title"><strong>{{ p.invoice_number || '—' }}</strong><small class="sub">issued {{ fmt(p.issue_date, 'short') }}{{ p.sent ? '' : ' · not sent' }}</small></td>
                    <td>{{ fmt(p.start, 'short') }} – {{ fmt(minusDay(p.end), 'short') }}<small v-if="p.partial" class="sub">prorated</small></td>
                    <td>{{ fmt(p.due_date, 'short') }}</td>
                    <td class="num">{{ money(p.amount, p.currency) }}<small v-if="p.status === 'invoiced' && p.balance !== p.amount" class="sub">{{ money(p.balance, p.currency) }} left</small></td>
                    <td><span class="ui-badge" :class="PERIOD_STATUS[p.status]?.badge">{{ PERIOD_STATUS[p.status]?.label || p.status }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-if="d.tasks.length" id="sd-tasks" class="block">
            <h3>At the provider</h3>
            <TaskCard v-for="t in d.tasks" :key="t.id" :task="t" @changed="load" />
          </section>
        </template>
      </div>
    </aside>

    <SubscriptionModal v-if="editOpen && d" :sub="d" :invoiced="d.periods.length > 0" @close="editOpen = false" @saved="onSaved" />
    <MarkPaidModal v-if="paidOpen && d && d.open" :sub="d" @close="paidOpen = false" @paid="onPaid" />
  </div>
</template>

<script>
import SubscriptionModal from './SubscriptionModal.vue'
import MarkPaidModal from './MarkPaidModal.vue'
import TaskCard from './TaskCard.vue'
import { subscriptionsApi, periodLabel, periodNoun, kindIcon, statusLabel, statusBadge, supplierLabel, PERIOD_STATUS, TIMELINE_ICONS, VIA, whenIn } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, addDays } from '@/utils/format'
import { formatCurrency } from '@/utils/currencies'

export default {
  name: 'SubscriptionDrawer',
  components: { SubscriptionModal, MarkPaidModal, TaskCard },
  props: {
    id: { type: String, required: true },
    /** A one-click action from an alert to confirm: extend | paid | suspend | skip. */
    action: { type: String, default: '' },
    actionDays: { type: Number, default: 7 }
  },
  emits: ['close', 'changed', 'action-done'],
  data() {
    return { PERIOD_STATUS, TIMELINE_ICONS, VIA, d: null, error: '', busy: false, editOpen: false, paidOpen: false }
  },
  computed: {
    openTasks() {
      return (this.d?.tasks || []).filter((t) => t.status === 'open')
    },
    moreActions() {
      const d = this.d
      if (!d) return []
      return [
        { label: 'Copy the client’s “Your services” link', icon: 'fa-solid fa-link', onClick: this.copyPortal, hidden: !d.portal_url },
        { label: 'Open the customer', icon: 'fa-regular fa-user', onClick: () => this.$router.push({ path: '/customers', query: { customer: d.customer_id } }) },
        { divider: true },
        { label: 'Cancel at the end of the term…', icon: 'fa-solid fa-flag-checkered', onClick: () => this.doCancel('end_of_term'), hidden: d.status === 'cancelled' || !!d.end_date },
        { label: 'Cancel now…', icon: 'fa-solid fa-circle-xmark', danger: true, onClick: () => this.doCancel('now'), hidden: d.status === 'cancelled' },
        { label: 'Delete', icon: 'fa-regular fa-trash-can', danger: true, onClick: this.remove, hidden: d.periods.some((p) => p.invoice_id) }
      ]
    }
  },
  watch: {
    id() {
      this.load()
    }
  },
  async created() {
    await this.load()
    if (this.action && this.d) this.runAction(this.action)
  },
  methods: {
    periodLabel,
    periodNoun,
    kindIcon,
    statusLabel,
    statusBadge,
    supplierLabel,
    whenIn,
    money(v, c) {
      return formatCurrency(v || 0, c)
    },
    fmt(d, s) {
      return d ? formatDate(d, s) : '—'
    },
    minusDay(d) {
      return d ? addDays(d.slice(0, 10), -1) : d
    },
    trimQty(q) {
      return Number(q).toString()
    },
    statusWord(t) {
      if (t.status === 'planned') return t.date === this.d.today ? 'Today' : 'Planned'
      return { sent: 'Sent', done: 'Done', failed: 'Failed', skipped: 'Skipped', open: 'To do', sending: 'Sending' }[t.status] || t.status
    },
    scrollTo(id) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    async load() {
      this.error = ''
      try {
        this.d = await subscriptionsApi.get(this.id)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the subscription')
      }
    },
    changed(msg) {
      if (msg) toast.success(msg)
      this.$emit('changed')
      return this.load()
    },
    async runAction(a) {
      const d = this.d
      if (!d.open && a !== 'paid') {
        toast.info(d.status === 'cancelled' ? 'The subscription is cancelled.' : 'There is no unpaid invoice any more — nothing to do.')
        this.$emit('action-done')
        return
      }
      if (a === 'extend') await this.doExtend(this.actionDays || 7)
      else if (a === 'paid') {
        if (d.open) this.paidOpen = true
        else toast.info('The invoice is already paid.')
      } else if (a === 'suspend') await this.doSuspend()
      else if (a === 'skip') await this.doSkip(false)
      this.$emit('action-done')
    },
    async doExtend(days) {
      const d = this.d
      const ok = await confirmDialog({
        title: d.status === 'suspended' ? `Unsuspend and give ${days} more days?` : `Give ${d.customer_name} ${days} more days?`,
        message:
          d.status === 'suspended'
            ? `${d.name} is unsuspended now${d.supplier === 'synergy' ? ' (at Synergy Wholesale through the API when connected)' : ''} and suspended again in ${days} days unless invoice ${d.open.invoice_number} is paid.`
            : `The suspension of ${d.name} moves from ${this.fmt(d.open.suspend_on || d.open.planned_on)} by ${days} days, with the final notice and your alerts before it.`,
        confirmText: d.status === 'suspended' ? 'Unsuspend' : `Give ${days} days`
      })
      if (!ok) return
      this.busy = true
      try {
        const r = await subscriptionsApi.extend(d.id, days, '')
        await this.changed(r.suspend_on ? `${days} more days — suspended ${this.fmt(r.suspend_on)} unless paid` : `${days} more days given`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not give more time'))
      } finally {
        this.busy = false
      }
    },
    async doSuspend() {
      const d = this.d
      const ok = await confirmDialog({
        title: `Suspend ${d.name} now?`,
        message: `${d.supplier === 'synergy' ? 'It is suspended at Synergy Wholesale through the API when connected; otherwise you get a task with the steps.' : 'You get a task with the steps to suspend it at the provider.'} The client is told; paying invoice ${d.open.invoice_number} unsuspends it.`,
        confirmText: 'Suspend now',
        danger: true
      })
      if (!ok) return
      this.busy = true
      try {
        await subscriptionsApi.suspend(d.id, '')
        await this.changed('Suspended')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not suspend it'))
      } finally {
        this.busy = false
      }
    },
    async doSkip(undo) {
      const d = this.d
      const ok = await confirmDialog({
        title: undo ? 'Suspend it after all?' : 'Don’t suspend this time?',
        message: undo
          ? `Invoice ${d.open.invoice_number} can suspend ${d.name} again — at least 3 days after your next alert.`
          : `${d.name} keeps running even if invoice ${d.open.invoice_number} stays unpaid. The client still gets the reminders; later invoices suspend as usual.`,
        confirmText: undo ? 'Turn suspension back on' : 'Don’t suspend'
      })
      if (!ok) return
      this.busy = true
      try {
        await subscriptionsApi.skipSuspension(d.id, '', undo)
        await this.changed(undo ? 'Suspension back on' : 'It won’t be suspended for this invoice')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not change it'))
      } finally {
        this.busy = false
      }
    },
    async doUnsuspend() {
      const ok = await confirmDialog({ title: `Unsuspend ${this.d.name}?`, message: 'It is running again, at Synergy Wholesale through the API when it was suspended that way.', confirmText: 'Unsuspend' })
      if (!ok) return
      this.busy = true
      try {
        await subscriptionsApi.unsuspend(this.d.id, 0, '')
        await this.changed('Unsuspended')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not unsuspend it'))
      } finally {
        this.busy = false
      }
    },
    async doRemind() {
      this.busy = true
      try {
        const r = await subscriptionsApi.remind(this.d.id)
        await this.changed(`Reminder emailed to ${r.sent_to}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not send the reminder'))
      } finally {
        this.busy = false
      }
    },
    async doCancel(when) {
      const d = this.d
      const ok = await confirmDialog({
        title: when === 'now' ? `Cancel ${d.number} now?` : `Cancel ${d.number} at the end of the term?`,
        message: when === 'now' ? 'No more invoices. You get a task to cancel the hosting / domain at the provider — nothing is terminated automatically.' : `No invoices after the current term; it ends on ${this.fmt(d.next_period_start)}.`,
        confirmText: 'Cancel subscription',
        danger: when === 'now'
      })
      if (!ok) return
      try {
        await subscriptionsApi.cancel(d.id, when, '')
        await this.changed('Cancelled')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not cancel it'))
      }
    },
    async remove() {
      const ok = await confirmDialog({ title: `Delete ${this.d.number}?`, message: 'It never had an invoice, so it is removed completely.', confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await subscriptionsApi.remove(this.d.id)
        toast.success('Deleted')
        this.$emit('changed')
        this.$emit('close')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete it'))
      }
    },
    async copyPortal() {
      try {
        await navigator.clipboard.writeText(this.d.portal_url)
        toast.success('Link copied — send it to the client')
      } catch {
        toast.info(this.d.portal_url)
      }
    },
    onSaved() {
      this.editOpen = false
      this.changed('Saved')
    },
    onPaid() {
      this.paidOpen = false
      this.changed('Payment recorded')
    }
  }
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  justify-content: flex-end;
}
.drawer {
  width: min(680px, 100vw);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: slide 0.18s ease-out;
}
@keyframes slide {
  from {
    transform: translateX(24px);
    opacity: 0.6;
  }
}
@media (prefers-reduced-motion: reduce) {
  .drawer {
    animation: none;
  }
}
.drawer__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
}
.drawer__head h2 {
  margin: 2px 0 4px;
  font-size: 19px;
  overflow-wrap: anywhere;
}
.min0 {
  min-width: 0;
}
.chips {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.drawer__body {
  padding: 16px 18px 28px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.drawer__body > .ui-alert {
  margin: 0;
}
.muted {
  color: var(--text-3);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.actions__right {
  margin-left: auto;
  display: flex;
  gap: 6px;
  align-items: center;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.stats > div {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  background: var(--surface-2);
  min-width: 0;
}
.stats span {
  display: block;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}
.stats strong {
  display: block;
  font-size: 16px;
  margin: 2px 0;
}
.stats small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}
.num {
  font-variant-numeric: tabular-nums;
}
.neg {
  color: var(--danger);
}
.block h3 {
  margin: 0 0 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-2);
}
.block h3 small {
  font-weight: 400;
  color: var(--text-3);
  margin-left: 4px;
}
.lines {
  list-style: none;
  margin: 0;
  padding: 0;
}
.lines li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--border);
}
.lines li:first-child {
  border-top: 0;
}
.lines li > span:last-child {
  text-align: right;
  white-space: nowrap;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  white-space: normal;
}
.facts {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 6px 12px;
  margin: 0;
  font-size: 13.5px;
}
.facts dt {
  color: var(--text-3);
  overflow-wrap: anywhere;
}
.facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.notes {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-size: 13px;
  white-space: pre-wrap;
}
.tl {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}
.tl::before {
  content: '';
  position: absolute;
  left: 13px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--border);
}
.tl li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  padding: 6px 0;
  position: relative;
}
.tl__dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--surface);
  border: 2px solid var(--border-strong);
  color: var(--text-2);
  font-size: 12px;
  z-index: 1;
}
.tl li.is-planned .tl__dot {
  border-style: dashed;
  color: var(--text-3);
}
.tl--paid .tl__dot,
.tl--unsuspend .tl__dot {
  border-color: var(--success);
  color: var(--success);
}
.tl--suspend .tl__dot,
.tl li.is-failed .tl__dot {
  border-color: var(--danger);
  color: var(--danger);
}
.tl--alert .tl__dot,
.tl--notice .tl__dot,
.tl--task .tl__dot {
  border-color: var(--warning);
  color: var(--warning);
}
.tl li.is-today .tl__title {
  font-weight: 700;
}
.tl__title {
  font-size: 13.5px;
}
.aud {
  margin-left: 6px;
  font-size: 11px;
  color: var(--text-3);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0 6px;
}
.tl__side {
  text-align: right;
  white-space: nowrap;
}
.tl__date {
  display: block;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.tl__st {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}
.tl__st.st-failed {
  color: var(--danger);
}
.tl__st.st-open {
  color: var(--warning);
}
@media (max-width: 640px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .drawer__head,
  .drawer__body {
    padding-left: 14px;
    padding-right: 14px;
  }
  .facts {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  .facts dd {
    margin-bottom: 6px;
  }
  .actions__right {
    margin-left: 0;
  }
}
</style>
