<template>
  <div data-testid="brief">
    <div class="bar">
      <p class="lead">
        A monthly brief built from your own numbers, your export &amp; FX position, public market indicators and the industry watch — ending in ranked actions with estimates. Briefs are stored, so
        you can look back at what was recommended and why.
      </p>
      <form v-if="d && d.can_edit" class="actions" @submit.prevent="generate">
        <label class="sr" for="brief-period">Month</label>
        <input id="brief-period" v-model="period" class="ui-input month" type="month" :max="d.this_month" required data-testid="brief-period" />
        <button class="ui-btn ui-btn--primary" type="submit" :disabled="busy === 'generate'" data-testid="brief-generate">
          <i :class="busy === 'generate' ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-bolt'"></i> Generate now
        </button>
      </form>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load()">Try again</a></span></div>
    <div v-if="!d && !error" class="ui-skeleton" style="height: 320px"></div>

    <div v-if="d" class="layout">
      <aside class="side">
        <section class="ui-card">
          <div class="ui-card__head"><h2>History</h2></div>
          <div v-if="!periods.length" class="ui-empty small" data-testid="brief-none">
            <p>No briefs yet. {{ d.can_edit ? 'Generate the first one above.' : 'An admin can generate the first one.' }}</p>
          </div>
          <ul v-else class="hist" data-testid="brief-history">
            <li v-for="p in periods" :key="p.period">
              <button type="button" class="hist__btn" :class="{ on: b && b.period === p.period }" :data-period="p.period" @click="open(p.rule || p.ai)">
                <strong>{{ monthLabel(p.period, true) }}</strong>
                <span class="hist__tags">
                  <span v-if="p.rule" class="ui-badge ui-badge--draft">Rule-based</span>
                  <span v-if="p.ai" class="ui-badge ui-badge--info">AI</span>
                </span>
                <small>{{ day((p.rule || p.ai).generated_at) }}{{ (p.rule || p.ai).trigger === 'scheduled' ? ' · automatic' : '' }}</small>
              </button>
            </li>
          </ul>
        </section>

        <section class="ui-card settings" data-testid="brief-settings">
          <div class="ui-card__head"><h2>Automation</h2></div>
          <div class="ui-card__body">
            <label class="ui-switch">
              <input type="checkbox" :checked="d.settings.brief_auto" :disabled="!d.can_edit" data-setting="brief_auto" @change="setting('brief_auto', $event)" />
              <span>Generate a brief at the start of every month</span>
            </label>
            <label class="ui-switch">
              <input type="checkbox" :checked="d.settings.brief_email" :disabled="!d.can_edit" data-setting="brief_email" @change="setting('brief_email', $event)" />
              <span>Email it to the admins</span>
            </label>
            <p class="ui-hint">
              <template v-if="d.recipients.length">Goes to {{ d.recipients.join(', ') }}.</template>
              <template v-else>No admins with an email address.</template>
              <template v-if="!d.mail_ready"> Outgoing email is not set up yet (<router-link to="/messaging-settings">Email settings</router-link>).</template>
            </p>
          </div>
        </section>
      </aside>

      <div class="doc">
        <div v-if="loadingBrief" class="ui-card"><div class="ui-card__body"><div class="ui-skeleton" style="height: 420px"></div></div></div>
        <section v-else-if="!b" class="ui-card">
          <div class="ui-empty">
            <div class="ui-empty__icon"><i class="fa-solid fa-chess-knight"></i></div>
            <h3>Your first strategy brief</h3>
            <p>It takes a few seconds: performance, what changed, exports and exchange rates, market signals, industry headlines, risks — and what to do next, with estimates in {{ currencyHint }}.</p>
            <button v-if="d.can_edit" class="ui-btn ui-btn--primary" type="button" :disabled="busy === 'generate'" data-testid="brief-generate-empty" @click="generate"><i class="fa-solid fa-bolt"></i> Generate {{ monthLabel(period, true) }}</button>
          </div>
        </section>
        <article v-else class="ui-card brief" data-testid="brief-doc" :data-by="b.generated_by" :data-brief-period="b.period">
          <header class="brief__head">
            <div>
              <div class="ui-eyebrow">Strategy brief</div>
              <h2>{{ c.period_label }}</h2>
              <p class="by">
                <span class="ui-badge" :class="b.generated_by === 'ai' ? 'ui-badge--info' : 'ui-badge--draft'" data-testid="brief-label">
                  <i :class="b.generated_by === 'ai' ? 'fa-solid fa-wand-magic-sparkles' : 'fa-solid fa-calculator'"></i>
                  {{ b.generated_by === 'ai' ? 'AI-written from your data' : 'Rule-based from your data' }}
                </span>
                <span>Generated {{ dateTime(b.generated_at) }}</span>
                <span v-if="b.emailed_at">Emailed {{ day(b.emailed_at) }}</span>
              </p>
            </div>
            <div class="brief__acts">
              <div v-if="siblings.rule && siblings.ai" class="seg" role="group" aria-label="Version">
                <button type="button" class="seg__btn" :class="{ on: b.generated_by === 'rule' }" data-version="rule" @click="open(siblings.rule)">Rule-based</button>
                <button type="button" class="seg__btn" :class="{ on: b.generated_by === 'ai' }" data-version="ai" @click="open(siblings.ai)">AI</button>
              </div>
              <button v-if="d.can_edit && d.ai_enabled" class="ui-btn ui-btn--sm" type="button" :disabled="busy === 'ai'" data-testid="brief-ai" @click="writeAI">
                <i :class="busy === 'ai' ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-wand-magic-sparkles'"></i> {{ siblings.ai ? 'Rewrite with AI' : 'Write with AI' }}
              </button>
              <button v-if="d.can_edit" class="ui-btn ui-btn--sm" type="button" :disabled="busy === 'email' || !d.recipients.length" :title="d.mail_ready ? 'Send to the admins' : 'Outgoing email is not set up'" data-testid="brief-email" @click="email">
                <i :class="busy === 'email' ? 'fa-solid fa-spinner fa-spin' : 'fa-regular fa-envelope'"></i> Email
              </button>
              <button class="ui-btn ui-btn--sm" type="button" data-testid="brief-print" @click="print"><i class="fa-solid fa-print"></i> Print</button>
              <button v-if="d.can_edit" class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" type="button" aria-label="Delete this brief" title="Delete" data-testid="brief-delete" @click="remove"><i class="fa-regular fa-trash-can"></i></button>
            </div>
          </header>

          <p class="headline" data-testid="brief-headline">{{ b.headline }}</p>

          <section v-if="b.generated_by === 'ai'" class="ai" data-testid="brief-ai-text">
            <div class="ai__text">{{ b.ai_text }}</div>
            <small>Written by AI ({{ b.ai_model }}) from the figures below and nothing else — check them before acting.</small>
          </section>

          <section class="sect" data-section="snapshot">
            <h3><span>1</span> Performance snapshot</h3>
            <div class="tiles">
              <div class="tile" data-tile="revenue"><small>Revenue</small><strong>{{ m(sn.revenue) }}</strong><em :class="tone(sn.revenue_delta_pct)">{{ delta(sn.revenue_delta_pct) }} on {{ c.prev_label }}</em></div>
              <div class="tile" data-tile="costs"><small>Costs</small><strong>{{ m(sn.expenses) }}</strong><em :class="tone(sn.expenses_delta_pct, true)">{{ delta(sn.expenses_delta_pct) }}</em></div>
              <div class="tile" data-tile="net_profit"><small>Net profit</small><strong>{{ m(sn.net_profit) }}</strong><em>{{ sn.margin_pct == null ? 'no revenue' : pct(sn.margin_pct) + ' margin' }}</em></div>
              <div class="tile" data-tile="cash"><small>Cash collected</small><strong>{{ m(sn.cash_collected) }}</strong><em>{{ m(sn.prev_cash_collected) }} before</em></div>
              <div class="tile" data-tile="outstanding"><small>Owed by clients</small><strong>{{ m(sn.outstanding) }}</strong><em :class="sn.overdue > 0 ? 'bad' : ''">{{ sn.overdue > 0 ? m(sn.overdue) + ' overdue' : 'nothing overdue' }}</em></div>
              <div class="tile" data-tile="clients"><small>Clients invoiced</small><strong>{{ sn.active_clients }}</strong><em>{{ sn.new_clients }} new · {{ sn.invoices }} invoice{{ sn.invoices === 1 ? '' : 's' }}</em></div>
            </div>
          </section>

          <section class="sect" data-section="changes">
            <h3><span>2</span> What changed against {{ c.prev_label }}</h3>
            <ul class="changes">
              <li v-for="ch in c.changes" :key="ch.key" :class="'t-' + ch.tone">
                <i :class="ch.tone === 'good' ? 'fa-solid fa-arrow-trend-up' : ch.tone === 'bad' ? 'fa-solid fa-arrow-trend-down' : 'fa-solid fa-minus'"></i>
                <span>{{ ch.text }}</span>
              </li>
            </ul>
          </section>

          <section class="sect" data-section="trade">
            <h3><span>3</span> Export &amp; FX position</h3>
            <ul class="plain">
              <li v-for="(l, i) in c.trade.lines" :key="'l' + i">{{ l }}</li>
              <li v-for="(l, i) in c.trade.hedge" :key="'h' + i">{{ l }}</li>
            </ul>
            <router-link to="/insights?tab=trade" class="more no-print">Open Trade &amp; exports <i class="fa-solid fa-arrow-right"></i></router-link>
          </section>

          <section class="sect" data-section="signals">
            <h3><span>4</span> Market signals</h3>
            <p v-if="!c.signals.length" class="none">No indicator data was available when this brief was generated.</p>
            <ul v-else class="signals">
              <li v-for="(s, i) in c.signals" :key="i">
                <strong>{{ s.title }}</strong>
                <span>{{ s.text }}</span>
                <small><a v-if="s.link" :href="s.link" target="_blank" rel="noopener">{{ s.source }}</a><template v-else>{{ s.source }}</template></small>
              </li>
            </ul>
          </section>

          <section class="sect" data-section="headlines">
            <h3><span>5</span> Industry headlines</h3>
            <p v-if="!c.headlines.length" class="none">No headlines were stored for this month. <router-link to="/insights?tab=watch" class="no-print">Set up Industry watch</router-link></p>
            <ol v-else class="heads">
              <li v-for="(h, i) in c.headlines" :key="i">
                <a v-if="safe(h.link)" :href="h.link" target="_blank" rel="noopener noreferrer">{{ h.title }}</a>
                <span v-else>{{ h.title }}</span>
                <small>{{ h.source }} · {{ day(h.date) }}<template v-if="h.why"> · {{ h.why }}</template></small>
              </li>
            </ol>
          </section>

          <section class="sect" data-section="risks">
            <h3><span>6</span> Risks</h3>
            <p v-if="!c.risks.length" class="none">No risks flagged by the rules this month.</p>
            <ul v-else class="risks">
              <li v-for="r in c.risks" :key="r.key" :data-risk="r.key">
                <span class="ui-badge" :class="SEV[r.severity].cls">{{ SEV[r.severity].label }}</span>
                <div><strong>{{ r.title }}</strong><p>{{ r.text }}</p></div>
              </li>
            </ul>
          </section>

          <section class="sect" data-section="actions">
            <h3><span>7</span> Recommended actions</h3>
            <p v-if="!c.actions.length" class="none">Nothing to recommend from the data yet.</p>
            <ol v-else class="acts">
              <li v-for="a in c.actions" :key="a.key" :data-action-key="a.key">
                <div class="acts__rank">{{ a.rank }}</div>
                <div class="acts__main">
                  <strong>{{ a.title }}</strong>
                  <p>{{ a.rationale }}</p>
                  <small><i class="fa-solid fa-calculator"></i> {{ a.basis }}</small>
                </div>
                <div class="acts__val">
                  <template v-if="a.value > 0"><strong>{{ m(a.value) }}</strong><small>{{ KIND[a.value_kind] || '' }}</small></template>
                  <small v-else>not estimated</small>
                  <router-link v-if="a.link" :to="a.link" class="ui-btn ui-btn--sm ui-btn--ghost no-print">Open</router-link>
                </div>
              </li>
            </ol>
            <p v-if="c.action_total > 0" class="total">Yearly and one-off estimates add up to about <strong>{{ m(c.action_total) }}</strong>.</p>
          </section>

          <footer class="notes">
            <p v-for="(n, i) in c.notes" :key="i">{{ n }}</p>
          </footer>
        </article>
      </div>
    </div>
  </div>
</template>

<script>
import { briefApi, monthLabel } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { money, pct, day } from '@/components/analytics/fmt'
import { formatDateTime } from '@/utils/format'
import { orgCurrency } from '@/utils/orgDefaults'
import { briefPrintHtml } from './briefPrint'

const SEV = { high: { label: 'High', cls: 'ui-badge--danger' }, medium: { label: 'Medium', cls: 'ui-badge--warning' }, low: { label: 'Low', cls: 'ui-badge--info' } }
const KIND = { per_year: 'per year', one_off: 'one-off', at_risk: 'at risk' }

export default {
  name: 'StrategyBrief',
  data() {
    return { d: null, b: null, error: '', period: '', busy: '', loadingBrief: false, seq: 0, SEV, KIND }
  },
  computed: {
    c() {
      return this.b?.content || {}
    },
    sn() {
      return this.c.snapshot || {}
    },
    currencyHint() {
      return orgCurrency()
    },
    periods() {
      const by = {}
      const out = []
      ;(this.d?.briefs || []).forEach((x) => {
        if (!by[x.period]) {
          by[x.period] = { period: x.period, rule: null, ai: null }
          out.push(by[x.period])
        }
        by[x.period][x.generated_by === 'ai' ? 'ai' : 'rule'] = x
      })
      return out
    },
    siblings() {
      return this.periods.find((p) => this.b && p.period === this.b.period) || {}
    }
  },
  created() {
    this.load(true)
  },
  methods: {
    pct,
    day,
    monthLabel,
    dateTime: formatDateTime,
    m(v) {
      return money(v, this.c.currency)
    },
    delta(v) {
      return v == null ? 'no comparison' : `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`
    },
    tone(v, lowerIsBetter = false) {
      if (v == null || v === 0) return ''
      return v > 0 !== lowerIsBetter ? 'good' : 'bad'
    },
    safe(link) {
      return /^https?:\/\//i.test(link || '')
    },
    async load(first = false) {
      try {
        this.d = await briefApi.list()
        this.error = ''
        if (!this.period) this.period = this.d.last_month
        if (first) {
          const want = this.$route.query.brief
          const hit = (want && this.d.briefs.find((x) => x.id === want)) || this.d.briefs.find((x) => x.generated_by === 'rule') || this.d.briefs[0]
          if (hit) await this.open(hit)
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the briefs.')
      }
    },
    async open(x) {
      if (!x) return
      // Another brief can be picked while one is loading: only the latest is shown.
      const seq = ++this.seq
      this.loadingBrief = true
      try {
        const b = await briefApi.get(x.id)
        if (seq === this.seq) this.b = b
      } catch (e) {
        if (seq === this.seq) toast.error(apiErrorMessage(e, 'Could not open the brief'))
      } finally {
        if (seq === this.seq) this.loadingBrief = false
      }
    },
    async generate() {
      this.busy = 'generate'
      try {
        const b = await briefApi.generate(this.period)
        this.b = b
        toast.success(`${b.title} generated`)
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not generate the brief'))
      } finally {
        this.busy = ''
      }
    },
    async writeAI() {
      this.busy = 'ai'
      try {
        this.b = await briefApi.ai(this.b.id)
        toast.success('AI version written — the rule-based brief is kept too')
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'The AI version could not be written'))
      } finally {
        this.busy = ''
      }
    },
    async email() {
      this.busy = 'email'
      try {
        const r = await briefApi.email(this.b.id)
        toast.success(`Brief emailed to ${r.sent_to.join(', ')}`)
        this.b = await briefApi.get(this.b.id)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not email the brief'))
      } finally {
        this.busy = ''
      }
    },
    async remove() {
      const which = this.b.generated_by === 'ai' ? 'AI version' : 'rule-based brief'
      if (!(await confirmDialog({ title: `Delete the ${which} of ${this.c.period_label}?`, message: 'It is removed from the history. You can generate it again.', confirmText: 'Delete', danger: true }))) return
      try {
        await briefApi.remove(this.b.id)
        toast.success('Brief deleted')
        const period = this.b.period
        this.b = null
        await this.load()
        const next = this.d.briefs.find((x) => x.period === period) || this.d.briefs[0]
        if (next) this.open(next)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the brief'))
      }
    },
    async setting(key, ev) {
      const on = ev.target.checked
      try {
        this.d = { ...this.d, ...(await briefApi.settings({ [key]: on })) }
        toast.success(key === 'brief_auto' ? (on ? 'A brief will be generated every month' : 'Monthly briefs switched off') : on ? 'Briefs will be emailed to the admins' : 'Briefs will not be emailed')
      } catch (e) {
        ev.target.checked = !on
        toast.error(apiErrorMessage(e, 'Could not save the setting'))
      }
    },
    print() {
      const w = window.open('', '_blank')
      if (!w) {
        toast.warning('Allow pop-ups for this site to print the brief')
        return
      }
      w.document.open()
      w.document.write(briefPrintHtml(this.b, { money: (v) => this.m(v), day, pct }))
      w.document.close()
      w.focus()
      setTimeout(() => {
        try {
          w.print()
        } catch {
          /* the user can print from the browser menu */
        }
      }, 300)
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.bar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.lead {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  max-width: 720px;
}

.actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.month {
  width: 170px;
}

.layout {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.hist {
  list-style: none;
  margin: 0;
  padding: 0 8px 8px;
  max-height: 420px;
  overflow: auto;
}

.hist__btn {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 8px;
  text-align: left;
  padding: 9px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 13.5px;
}

.hist__btn:hover {
  background: var(--surface-hover);
}

.hist__btn.on {
  background: var(--accent-soft);
}

.hist__btn small {
  grid-column: 1 / -1;
  color: var(--text-3);
  font-size: 11.5px;
}

.hist__tags {
  display: inline-flex;
  gap: 4px;
}

.settings .ui-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings .ui-switch {
  font-size: 13px;
}

.doc {
  min-width: 0;
}

.brief {
  padding: 22px 26px 20px;
}

.brief__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.brief__head h2 {
  margin: 2px 0 6px;
  font-size: 24px;
}

.by {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  font-size: 12px;
  color: var(--text-3);
}

.brief__acts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.seg__btn {
  padding: 5px 10px;
  border: 0;
  border-left: 1px solid var(--border);
  background: transparent;
  color: var(--text-2);
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
}

.seg__btn:first-child {
  border-left: 0;
}

.seg__btn.on {
  background: var(--accent-soft);
  color: var(--text);
}

.headline {
  margin: 16px 0 4px;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--text);
  font-weight: 550;
}

.ai {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--info-soft);
}

.ai__text {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin-bottom: 8px;
}

.ai small {
  color: var(--text-2);
  font-size: 12px;
}

.sect {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.sect h3 {
  margin: 0 0 12px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sect h3 span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-subtle);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 650;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.tile {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  min-width: 0;
}

.tile small {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

.tile strong {
  display: block;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  margin: 2px 0;
  overflow-wrap: anywhere;
}

.tile em {
  font-style: normal;
  font-size: 12px;
  color: var(--text-3);
}

.good {
  color: var(--success) !important;
}

.bad {
  color: var(--danger) !important;
}

.changes,
.plain,
.signals,
.risks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text);
}

.changes li {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
}

.changes i {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-3);
}

.t-good i {
  color: var(--success);
}

.t-bad i {
  color: var(--danger);
}

.plain li {
  padding-left: 14px;
  position: relative;
}

.plain li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 9px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-3);
}

.more {
  display: inline-block;
  margin-top: 10px;
  font-size: 12.5px;
}

.none {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}

.signals li {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 2px 12px;
}

.signals small {
  grid-column: 2;
  font-size: 11.5px;
  color: var(--text-3);
}

.signals small a {
  color: var(--text-3);
}

.heads {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13.5px;
}

.heads small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.risks li {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.risks p {
  margin: 2px 0 0;
  color: var(--text-2);
  font-size: 13px;
}

.acts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.acts li {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.acts li:first-child {
  border-top: 0;
  padding-top: 0;
}

.acts__rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--text);
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.acts__main strong {
  font-size: 14px;
}

.acts__main p {
  margin: 3px 0 4px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}

.acts__main small {
  font-size: 12px;
  color: var(--text-3);
}

.acts__val {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 110px;
}

.acts__val strong {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.acts__val small {
  font-size: 11.5px;
  color: var(--text-3);
}

.total {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.notes {
  margin-top: 22px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
}

.notes p {
  margin: 0 0 4px;
}

@media (max-width: 980px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .hist {
    max-height: 200px;
  }
}

@media (max-width: 560px) {
  .brief {
    padding: 16px 14px;
  }

  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .signals li {
    grid-template-columns: minmax(0, 1fr);
  }

  .signals small {
    grid-column: 1;
  }

  .risks li {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }

  .acts li {
    grid-template-columns: 30px minmax(0, 1fr);
  }

  .acts__val {
    grid-column: 2;
    align-items: flex-start;
    text-align: left;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .actions {
    width: 100%;
  }

  .month {
    flex: 1;
    width: auto;
  }
}
</style>
