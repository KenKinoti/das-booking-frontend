<template>
  <div class="ui-page fb fbbt" data-test="fb-bets">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Football</div>
        <h1>My bets</h1>
        <p>Bets you placed with your own bookmaker, recorded here: honest profit and loss, how your prices compare with the closing line, and your limits.</p>
      </div>
      <div class="ui-actions">
        <button type="button" class="ui-btn ui-btn--primary" :disabled="limits && limits.on_break" data-test="fb-add-bet" @click="openForm(null)"><i class="fa-solid fa-plus"></i> Record a bet</button>
        <button type="button" class="ui-btn" :disabled="exporting" data-test="fb-export" @click="exportCsv"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
      </div>
    </header>

    <FbNoAccess v-if="forbidden" :reason="forbidden" />
    <template v-else>
      <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="loadAll">Try again</a></span></div>

      <!-- One filter row: the period scopes every number and chart below -->
      <div class="fbbt__filters">
        <div class="fb-seg" role="radiogroup" aria-label="Period">
          <button v-for="p in periods" :key="p.key" type="button" role="radio" :aria-checked="period === p.key" :class="{ 'is-on': period === p.key }" :data-test="'fb-period-' + p.key" @click="setPeriod(p.key)">
            {{ p.label }}
          </button>
        </div>
        <span class="fb-muted fb-small">{{ periodText }}</span>
      </div>

      <div :style="{ opacity: loading ? 0.6 : 1 }" class="fbbt__body">
        <!-- KPI tiles -->
        <div class="fbbt__kpis" data-test="fb-kpis">
          <div v-for="k in kpis" :key="k.key" class="fbbt__kpi" :data-kpi="k.key" :data-v="k.raw == null ? '' : k.raw">
            <div class="fbbt__kpi-l">{{ k.label }}</div>
            <div class="fbbt__kpi-v" :class="k.tone">{{ k.value }}</div>
            <div class="fbbt__kpi-s">{{ k.sub }}</div>
          </div>
        </div>
        <p v-if="s && s.model_expected_pnl != null" class="fb-honest fbbt__exp">
          <i class="fa-solid fa-scale-balanced"></i>
          <span
            >The model expected {{ smoney(s.model_expected_pnl, cur) }} on these bets; you made {{ smoney(s.pnl, cur) }}. With fewer than a few hundred bets, luck dominates both numbers — closing-line value
            (CLV) is the steadier sign of skill.</span
          >
        </p>

        <!-- Bankroll -->
        <section class="fb-panel">
          <div class="fb-panel__head">
            <div>
              <h2>Bankroll</h2>
              <p>Every deposit, withdrawal and settled bet. Shaded: how far below its previous peak the bankroll was.</p>
            </div>
          </div>
          <div class="fb-panel__body">
            <div v-if="s && s.bankroll.set" class="fbbt__bkgrid">
              <FbFigure
                :title="'Bankroll (' + cur + ')'"
                :subtitle="`Peak ${money(s.bankroll.peak, cur)} · biggest drop ${money(s.bankroll.max_drawdown, cur)} (${pct(s.bankroll.max_drawdown_pct)})`"
                :legend="[
                  { name: 'Bankroll', color: 'var(--fb-home)', kind: 'line' },
                  { name: 'Below peak (drawdown)', color: 'var(--fb-bad)', kind: 'band' }
                ]"
                :table="bankTable"
                chart-id="bankroll"
              >
                <FbLine
                  :series="bankSeries"
                  :bands="bankBands"
                  :height="240"
                  :x-ticks="bankTicks"
                  :format-x="(x) => bankDay(x)"
                  :format-x-tip="bankTip"
                  x-title="Each deposit, withdrawal and settled bet, in order"
                  :format-y="(v) => compact(v)"
                  :format-value="(v) => money(v, cur)"
                  :end-labels="bankEnd"
                  aria-label="Bankroll over time with drawdown"
                />
              </FbFigure>
              <BankrollPanel :b="s.bankroll" :entries="entries" :currency="cur" :tz="tz" @changed="loadAll" />
            </div>
            <div v-else class="fbbt__nobk">
              <p style="margin: 0 0 8px">Set a starting bankroll — the money you're prepared to bet with, not more. Stake suggestions (¼ Kelly, at most 2%) and ROI use it.</p>
              <BankrollPanel :b="(s && s.bankroll) || {}" :entries="entries" :currency="cur" :tz="tz" @changed="loadAll" />
            </div>
          </div>
        </section>

        <div class="fb-grid-2">
          <!-- Monthly P&L -->
          <section class="fb-panel">
            <div class="fb-panel__body">
              <FbFigure title="Profit and loss by month" :subtitle="'Settled bets, ' + cur" :table="monthTable" chart-id="monthly-pnl">
                <FbColumns
                  v-if="monthItems.length"
                  :items="monthItems"
                  :height="220"
                  :color="(it) => (it.value >= 0 ? 'var(--fb-good)' : 'var(--fb-bad)')"
                  :format-y="(v) => compact(v)"
                  :format-value="(v) => smoney(v, cur)"
                  value-name="Profit / loss"
                  aria-label="Profit and loss per month"
                />
                <div v-else class="fb-muted fb-small">No settled bets in this period.</div>
              </FbFigure>
            </div>
          </section>
          <!-- CLV distribution -->
          <section class="fb-panel">
            <div class="fb-panel__body">
              <FbFigure
                title="Closing-line value (CLV)"
                :subtitle="clvSub"
                :table="clvTable"
                chart-id="clv-distribution"
              >
                <FbColumns
                  v-if="clvItems.some((i) => i.value)"
                  :items="clvItems"
                  :height="220"
                  :color="(it) => (it.mid >= 0 ? 'var(--fb-good)' : 'var(--fb-bad)')"
                  :format-y="(v) => String(v)"
                  integer-ticks
                  :format-value="(v) => v + (v === 1 ? ' bet' : ' bets')"
                  value-name="Bets"
                  x-title="Your odds vs the closing odds"
                  aria-label="Number of bets by closing-line value"
                />
                <div v-else class="fb-muted fb-small">CLV appears once matches you bet on kick off and the closing price is known.</div>
                <template #foot>Positive = you got a better price than the market's final price before kick-off. Beating the close consistently is the best sign of skill.</template>
              </FbFigure>
            </div>
          </section>
        </div>

        <!-- Breakdowns -->
        <section class="fb-panel">
          <div class="fb-panel__head">
            <div>
              <h2>Breakdown</h2>
              <p>Where the profit and loss came from (settled bets).</p>
            </div>
            <div class="fb-seg" role="radiogroup" aria-label="Breakdown by">
              <button v-for="b in breakdowns" :key="b.key" type="button" role="radio" :aria-checked="bd === b.key" :class="{ 'is-on': bd === b.key }" @click="bd = b.key">{{ b.label }}</button>
            </div>
          </div>
          <div class="fb-panel__body">
            <div class="fb-scroll">
              <table class="fb-table fb-table--nowrap" :data-test="'fb-breakdown-' + bd">
                <thead>
                  <tr>
                    <th>{{ breakdowns.find((x) => x.key === bd).label }}</th>
                    <th class="num">Bets</th>
                    <th class="num">Settled</th>
                    <th class="num">Staked</th>
                    <th class="num">P&amp;L</th>
                    <th class="num">Yield</th>
                    <th class="num">Strike rate</th>
                    <th class="num">Avg odds</th>
                    <th class="num">Avg CLV</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in bdRows" :key="r.key" :data-key="r.key" :data-pnl="r.pnl">
                    <td>{{ r.label }}</td>
                    <td class="num">{{ r.bets }}</td>
                    <td class="num">{{ r.settled }}</td>
                    <td class="num">{{ money(r.staked, cur) }}</td>
                    <td class="num" :class="r.pnl > 0 ? 'fb-pos' : r.pnl < 0 ? 'fb-neg' : ''">{{ smoney(r.pnl, cur) }}</td>
                    <td class="num">{{ r.settled ? spct(r.yield) : '—' }}</td>
                    <td class="num">{{ r.settled ? pct(r.strike_rate, 0) : '—' }}</td>
                    <td class="num">{{ r.avg_odds ? odds(r.avg_odds) : '—' }}</td>
                    <td class="num">{{ r.avg_clv == null ? '—' : spct(r.avg_clv) }}</td>
                  </tr>
                  <tr v-if="!bdRows.length">
                    <td colspan="9" class="fb-muted">No bets in this period.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Bets -->
        <section class="fb-panel">
          <div class="fb-panel__head">
            <div>
              <h2>Bets</h2>
              <p>{{ total }} bet{{ total === 1 ? '' : 's' }} in this period. Open bets settle automatically from the result.</p>
            </div>
            <div class="fbbt__lf">
              <select v-model="f.status" class="ui-select" aria-label="Status" @change="loadBets(0)">
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="settled">Settled</option>
                <option v-for="st in ['won', 'lost', 'void', 'half_won', 'half_lost', 'cashed_out']" :key="st" :value="st">{{ statusLabel(st) }}</option>
              </select>
              <select v-model="f.market" class="ui-select" aria-label="Market" @change="loadBets(0)">
                <option value="">All markets</option>
                <option v-for="m in MARKETS" :key="m.key" :value="m.key">{{ m.short }}</option>
              </select>
              <select v-model="f.bookmaker" class="ui-select" aria-label="Bookmaker" @change="loadBets(0)">
                <option value="">All bookmakers</option>
                <option v-for="b in bookmakerOptions" :key="b" :value="b">{{ b }}</option>
              </select>
              <select v-model="f.competition" class="ui-select" aria-label="Competition" @change="loadBets(0)">
                <option value="">All competitions</option>
                <option v-for="c in competitionOptions" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
            </div>
          </div>
          <div class="fb-panel__body">
            <div class="ui-table-wrap">
              <table v-table-cards class="ui-table fbbt__bets" data-test="fb-bets-table">
                <thead>
                  <tr>
                    <th>Bet</th>
                    <th>Match</th>
                    <th>Bookmaker</th>
                    <th class="num">Odds</th>
                    <th class="num">Stake</th>
                    <th>Status</th>
                    <th title="DASYIN's pick for the match, locked before kick-off, and whether it was right">DASYIN's pick</th>
                    <th class="num">P&amp;L</th>
                    <th class="num" title="Your odds ÷ closing odds − 1">CLV</th>
                    <th data-label=""></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="b in bets" :key="b.id" :data-bet="b.id" :data-status="b.status">
                    <td>
                      <strong>{{ b.label }}</strong>
                      <div class="fb-muted fb-small">{{ fmtShortDate(b.placed_at, tz) }} {{ fmtTime(b.placed_at, tz) }}<template v-if="b.settled_by"> · settled {{ b.settled_by === 'auto' ? 'from the result' : 'by hand' }}</template></div>
                    </td>
                    <td>
                      <router-link :to="`/football/match/${b.fixture_id}`">{{ b.home.name }} v {{ b.away.name }}</router-link>
                      <div class="fb-muted fb-small">
                        {{ b.competition }}<template v-if="b.score && b.score.home != null"> · {{ b.score.home }}–{{ b.score.away }}</template>
                      </div>
                    </td>
                    <td>{{ b.bookmaker }}</td>
                    <td class="num">{{ odds(b.odds) }}</td>
                    <td class="num">{{ money(b.stake, b.currency) }}</td>
                    <td><span class="fb-pill" :class="statusTone(b.status)">{{ statusLabel(b.status) }}</span></td>
                    <td class="fbbt__dp" :data-dasyin="b.dasyin_pick ? b.dasyin_pick.status : ''" data-test="fb-bet-dasyin">
                      <template v-if="b.dasyin_pick && b.dasyin_pick.pick">
                        <span class="fbbt__dp-pick">{{ b.dasyin_pick.pick_label }} · {{ pct(b.dasyin_pick.p, 0) }}</span>
                        <FbResultBadge
                          v-if="['correct', 'wrong', 'void'].includes(b.dasyin_pick.status)"
                          :check="{ status: b.dasyin_pick.status, label: b.dasyin_pick.label, summary: b.dasyin_pick.summary }"
                          :score="b.dasyin_pick.score ? b.dasyin_pick.score.replace('-', '–') : ''"
                          :test-id="'fb-bet-dasyin-mark-' + b.id"
                        />
                        <span v-else class="fb-muted fb-small">{{ b.dasyin_pick.final ? b.dasyin_pick.label : 'Locked · can still refresh until kick-off' }}</span>
                      </template>
                      <span v-else class="fb-muted fb-small" :title="b.dasyin_pick && b.dasyin_pick.reason ? b.dasyin_pick.reason : ''">{{ b.dasyin_pick ? b.dasyin_pick.label : '—' }}</span>
                    </td>
                    <td class="num" :class="b.pnl > 0 ? 'fb-pos' : b.pnl < 0 ? 'fb-neg' : ''">{{ b.status === 'open' ? '—' : smoney(b.pnl, b.currency) }}</td>
                    <td class="num" :title="b.closing_odds ? `Closing ${odds(b.closing_odds)} (${b.closing_source})` : 'No closing price yet'">{{ b.clv == null ? '—' : spct(b.clv) }}</td>
                    <td class="num fbbt__acts">
                      <OverflowMenu
                        :items="[
                          { label: 'Settle…', icon: 'fa-solid fa-flag-checkered', onClick: () => (settling = b) },
                          { label: 'Edit', icon: 'fa-regular fa-pen-to-square', onClick: () => openForm(b) },
                          { label: 'Delete', icon: 'fa-regular fa-trash-can', danger: true, onClick: () => remove(b) }
                        ]"
                        :label="'Actions for ' + b.label"
                      />
                    </td>
                  </tr>
                  <tr v-if="!bets.length && !loading">
                    <td colspan="10" class="fb-muted">No bets yet. Find a match in the <router-link to="/football">match centre</router-link> and use its price check to record one.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="total > pageSize" class="fbbt__pager">
              <button type="button" class="ui-btn ui-btn--sm" :disabled="offset === 0" @click="loadBets(offset - pageSize)">Previous</button>
              <span class="fb-small fb-muted">{{ offset + 1 }}–{{ Math.min(total, offset + pageSize) }} of {{ total }}</span>
              <button type="button" class="ui-btn ui-btn--sm" :disabled="offset + pageSize >= total" @click="loadBets(offset + pageSize)">Next</button>
            </div>
          </div>
        </section>

        <LimitsPanel :view="limits" :help="meta ? meta.limits_help : ''" :tz="tz" @changed="onLimits" />
      </div>
      <FbFootnote />
    </template>

    <BetFormModal v-if="formOpen" :bet="editing" :bookmakers="(meta && meta.bookmakers) || []" :currency="cur" :tz="tz" @close="formOpen = false" @saved="afterSave" />
    <SettleModal v-if="settling" :bet="settling" @close="settling = null" @saved="afterSettle" />
  </div>
</template>

<script>
import '@/components/football/football.css'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { downloadBlob } from '@/utils/format'
import { fb, loadMeta, forbiddenReason } from '@/components/football/fbState'
import { DEFAULT_TZ, MARKETS, money, smoney, pct, spct, odds, compact, dayKey, addDaysKey, fmtDateTime, fmtShortDate, fmtTime, toCSV, selectionLabel } from '@/components/football/fb'
import FbNoAccess from '@/components/football/FbNoAccess.vue'
import FbFootnote from '@/components/football/FbFootnote.vue'
import FbFigure from '@/components/football/charts/FbFigure.vue'
import FbLine from '@/components/football/charts/FbLine.vue'
import FbColumns from '@/components/football/charts/FbColumns.vue'
import BankrollPanel from '@/components/football/bets/BankrollPanel.vue'
import LimitsPanel from '@/components/football/bets/LimitsPanel.vue'
import BetFormModal from '@/components/football/bets/BetFormModal.vue'
import SettleModal from '@/components/football/bets/SettleModal.vue'
import FbResultBadge from '@/components/football/verdict/FbResultBadge.vue'

const STATUS = { open: 'Open', won: 'Won', lost: 'Lost', void: 'Void', half_won: 'Half won', half_lost: 'Half lost', cashed_out: 'Cashed out' }

export default {
  name: 'BetTracker',
  components: { FbNoAccess, FbFootnote, FbFigure, FbLine, FbColumns, BankrollPanel, LimitsPanel, BetFormModal, SettleModal, FbResultBadge },
  data() {
    return {
      MARKETS,
      s: null,
      bets: [],
      clvBets: [],
      total: 0,
      offset: 0,
      pageSize: 50,
      entries: [],
      limits: null,
      period: 'all',
      f: { status: '', market: '', bookmaker: '', competition: '' },
      bd: 'market',
      breakdowns: [
        { key: 'market', label: 'Market' },
        { key: 'bookmaker', label: 'Bookmaker' },
        { key: 'competition', label: 'Competition' }
      ],
      periods: [
        { key: 'all', label: 'All time' },
        { key: 'month', label: 'This month' },
        { key: '30', label: '30 days' },
        { key: '90', label: '90 days' },
        { key: 'year', label: 'This year' }
      ],
      tz: DEFAULT_TZ,
      loading: false,
      error: '',
      forbidden: '',
      formOpen: false,
      editing: null,
      settling: null,
      exporting: false
    }
  },
  computed: {
    meta() {
      return fb.meta
    },
    cur() {
      return this.s?.currency || this.meta?.currency || 'KES'
    },
    today() {
      return dayKey(this.meta?.now || new Date(), this.tz)
    },
    range() {
      const t = this.today
      const tomorrow = addDaysKey(t, 1)
      switch (this.period) {
        case 'month':
          return { from: t.slice(0, 8) + '01', to: tomorrow }
        case '30':
          return { from: addDaysKey(t, -29), to: tomorrow }
        case '90':
          return { from: addDaysKey(t, -89), to: tomorrow }
        case 'year':
          return { from: t.slice(0, 5) + '01-01', to: tomorrow }
        default:
          return {}
      }
    },
    periodText() {
      return this.range.from ? `${this.range.from} to ${this.today} · placed in this period` : 'Every bet you have recorded'
    },
    kpis() {
      const s = this.s
      if (!s) return []
      const cur = this.cur
      return [
        { key: 'pnl', label: 'Profit / loss', value: smoney(s.pnl, cur), raw: s.pnl, tone: s.pnl > 0 ? 'fb-pos' : s.pnl < 0 ? 'fb-neg' : '', sub: `${s.settled} settled · ${s.open} open (${money(s.open_stake, cur)})` },
        { key: 'roi', label: 'ROI', value: s.roi == null ? '—' : spct(s.roi), raw: s.roi, tone: '', sub: 'profit ÷ money put in' },
        { key: 'yield', label: 'Yield', value: s.settled ? spct(s.yield) : '—', raw: s.yield, tone: '', sub: `profit ÷ ${money(s.staked, cur)} staked` },
        { key: 'strike_rate', label: 'Strike rate', value: s.settled ? pct(s.strike_rate, 0) : '—', raw: s.strike_rate, tone: '', sub: `${s.won + s.half_won} won of ${s.settled - s.void} (void excluded)` },
        { key: 'avg_odds', label: 'Average odds', value: s.avg_odds ? odds(s.avg_odds) : '—', raw: s.avg_odds, tone: '', sub: s.avg_odds ? `break-even strike rate ${pct(1 / s.avg_odds, 0)}` : 'settled bets' },
        {
          key: 'avg_clv',
          label: 'Closing-line value',
          value: s.avg_clv == null ? '—' : spct(s.avg_clv),
          raw: s.avg_clv,
          tone: s.avg_clv > 0 ? 'fb-pos' : s.avg_clv < 0 ? 'fb-neg' : '',
          sub: s.clv_bets ? `${s.clv_bets} bets · beat the close ${pct(s.beat_closing_rate, 0)}` : 'after kick-off'
        }
      ]
    },
    bankSeries() {
      const pts = (this.s?.bankroll?.series || []).map((p, i) => ({ x: i, y: p.balance, at: p.at, event: p.event, change: p.change }))
      return [{ key: 'bank', name: 'Bankroll', color: 'var(--fb-home)', points: pts, dots: pts.length <= 40 }]
    },
    bankBands() {
      const pts = this.bankSeries[0].points
      let peak = -Infinity
      const band = pts.map((p) => {
        peak = Math.max(peak, p.y)
        return { x: p.x, y0: p.y, y1: peak }
      })
      return [
        {
          key: 'dd',
          name: 'Below peak',
          color: 'var(--fb-bad)',
          opacity: 0.16,
          points: band,
          tip: (x) => {
            const b = band.find((q) => q.x === x)
            return b && b.y1 - b.y0 > 0.004 ? '−' + money(b.y1 - b.y0, this.cur) : null
          }
        }
      ]
    },
    bankEnd() {
      const pts = this.bankSeries[0].points
      return pts.length ? [{ key: 'bank', text: compact(pts[pts.length - 1].y) }] : []
    },
    // One tick at the first event of each day (at most 6).
    bankTicks() {
      const pts = this.bankSeries[0].points
      const out = []
      let last = ''
      for (const p of pts) {
        const d = dayKey(p.at, this.tz)
        if (d !== last) out.push(p.x)
        last = d
      }
      if (out.length <= 6) return out
      const step = Math.ceil(out.length / 6)
      return out.filter((_, i) => i % step === 0)
    },
    bankTable() {
      return {
        cols: [{ label: 'When' }, { label: 'Event' }, { label: 'Change', num: true }, { label: 'Balance', num: true }],
        rows: (this.s?.bankroll?.series || []).map((p) => [fmtDateTime(p.at, this.tz), p.event, smoney(p.change, this.cur), money(p.balance, this.cur)])
      }
    },
    monthItems() {
      return [...(this.s?.by_month || [])]
        .filter((m) => m.settled > 0)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((m) => ({ key: m.key, label: m.label.replace(/ (\d{4})$/, " '$1").replace(/'(\d\d)(\d\d)$/, "'$2"), tipTitle: m.label, value: Math.round(m.pnl * 100) / 100, tip: [['Bets', m.settled], ['Staked', money(m.staked, this.cur)], ['Yield', spct(m.yield)]] }))
    },
    monthTable() {
      return { cols: [{ label: 'Month' }, { label: 'Settled', num: true }, { label: 'Staked', num: true }, { label: 'P&L', num: true }, { label: 'Yield', num: true }], rows: (this.s?.by_month || []).map((m) => [m.label, m.settled, money(m.staked, this.cur), smoney(m.pnl, this.cur), spct(m.yield)]) }
    },
    clvValues() {
      return this.clvBets.map((b) => b.clv).filter((v) => v != null)
    },
    clvItems() {
      const bins = []
      for (let k = -4; k < 4; k++) bins.push({ lo: k * 0.05, hi: (k + 1) * 0.05 })
      const items = bins.map((b) => ({ key: b.lo.toFixed(2), lo: b.lo, hi: b.hi, mid: b.lo + 0.025, value: 0 }))
      const under = { key: 'lo', label: '< −20%', mid: -1, value: 0 }
      const over = { key: 'hi', label: '> +20%', mid: 1, value: 0 }
      for (const v of this.clvValues) {
        if (v < -0.2) under.value++
        else if (v >= 0.2) over.value++
        else items[Math.min(items.length - 1, Math.floor((v + 0.2) / 0.05 + 1e-9))].value++
      }
      const lab = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(Math.round(x * 100))}%`
      return [under, ...items.map((i) => ({ ...i, label: lab(i.lo), tipTitle: `${lab(i.lo)} to ${lab(i.hi)}` })), over]
    },
    clvSub() {
      const n = this.clvValues.length
      if (!n) return 'Your odds against the closing odds, per bet'
      const beat = this.clvValues.filter((v) => v > 0).length
      return `${n} bets with a closing price · ${beat} beat it (${pct(beat / n, 0)}) · average ${spct(this.clvValues.reduce((a, b) => a + b, 0) / n)}`
    },
    clvTable() {
      return { cols: [{ label: 'CLV range' }, { label: 'Bets', num: true }], rows: this.clvItems.map((i) => [i.tipTitle || i.label, i.value]) }
    },
    bdRows() {
      const s = this.s
      if (!s) return []
      return { market: s.by_market, bookmaker: s.by_bookmaker, competition: s.by_competition }[this.bd] || []
    },
    bookmakerOptions() {
      return [...new Set([...(this.s?.by_bookmaker || []).map((b) => b.label), ...((this.meta && this.meta.bookmakers) || []).slice(0, 7)])]
    },
    competitionOptions() {
      return (this.s?.by_competition || []).map((c) => ({ key: c.key, label: c.label }))
    }
  },
  async created() {
    await loadMeta(true)
    if (fb.forbidden) {
      this.forbidden = fb.forbidden
      return
    }
    try {
      const fx = await footballApi.fixtures({ limit: 1 })
      if (fx.timezone) this.tz = fx.timezone
    } catch {
      /* default zone */
    }
    await this.loadAll()
    if (this.$route.hash) this.$nextTick(() => document.querySelector(this.$route.hash)?.scrollIntoView())
  },
  methods: {
    money,
    smoney,
    pct,
    spct,
    odds,
    compact,
    fmtDateTime,
    fmtShortDate,
    fmtTime,
    statusLabel(s) {
      return STATUS[s] || s
    },
    statusTone(s) {
      return { won: 'fb-pill--good', half_won: 'fb-pill--good', lost: 'fb-pill--bad', half_lost: 'fb-pill--bad', open: 'fb-pill--info', cashed_out: 'fb-pill--warn' }[s] || ''
    },
    bankDay(x) {
      const p = this.bankSeries[0].points[x]
      return p ? fmtShortDate(p.at, this.tz) : ''
    },
    bankTip(x) {
      const p = this.bankSeries[0].points[x]
      if (!p) return ''
      const ev = { start: 'Starting bankroll', deposit: 'Deposit', withdrawal: 'Withdrawal', bet: 'Bet settled' }[p.event] || ''
      return `${fmtDateTime(p.at, this.tz)}${ev ? ' · ' + ev + ' ' + smoney(p.change, this.cur) : ''}`
    },
    setPeriod(k) {
      this.period = k
      this.loadAll()
    },
    async loadAll() {
      this.loading = true
      this.error = ''
      try {
        const [s, bk, lim] = await Promise.all([footballApi.summary(this.range), footballApi.bankroll(), footballApi.limits()])
        this.s = s
        this.entries = bk.entries || []
        this.limits = lim
        await Promise.all([this.loadBets(0), this.loadClv()])
      } catch (e) {
        this.forbidden = forbiddenReason(e)
        if (!this.forbidden) this.error = apiErrorMessage(e, 'Could not load your bets')
      } finally {
        this.loading = false
      }
    },
    async loadBets(offset = 0) {
      this.offset = offset
      const d = await footballApi.bets({ ...this.range, ...this.f, limit: this.pageSize, offset })
      this.bets = d.bets || []
      this.total = d.total || 0
    },
    async loadClv() {
      const d = await footballApi.bets({ ...this.range, status: 'settled', limit: 500 })
      this.clvBets = d.bets || []
    },
    openForm(b) {
      this.editing = b
      this.formOpen = true
    },
    async afterSave(b) {
      this.formOpen = false
      toast.success(`${this.editing ? 'Saved' : 'Recorded'}: ${b.label} @ ${odds(b.odds)}`)
      this.editing = null
      await this.loadAll()
    },
    async afterSettle(b) {
      this.settling = null
      toast.success(`${b.label}: ${this.statusLabel(b.status)} (${smoney(b.pnl, b.currency)})`)
      await this.loadAll()
    },
    async remove(b) {
      if (!(await confirmDialog({ title: 'Delete this bet?', message: `${b.label} @ ${odds(b.odds)} — ${money(b.stake, b.currency)}. It is removed from your history and P&L.`, confirmText: 'Delete', danger: true }))) return
      try {
        await footballApi.deleteBet(b.id)
        await this.loadAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the bet'))
      }
    },
    onLimits(v) {
      this.limits = v
    },
    async exportCsv() {
      this.exporting = true
      try {
        const all = []
        for (let off = 0; off < 20000; off += 500) {
          const d = await footballApi.bets({ ...this.range, limit: 500, offset: off })
          all.push(...(d.bets || []))
          if (all.length >= (d.total || 0) || !(d.bets || []).length) break
        }
        const csv = toCSV(all, [
          { label: 'Placed at', get: (b) => b.placed_at },
          { label: 'Match', get: (b) => `${b.home.name} v ${b.away.name}` },
          { label: 'Competition', key: 'competition' },
          { label: 'Kick-off', key: 'kickoff' },
          { label: 'Market', key: 'market' },
          { label: 'Selection', get: (b) => selectionLabel(b.market, b.selection, b.line, b.home.name, b.away.name) },
          { label: 'Line', key: 'line' },
          { label: 'Bookmaker', key: 'bookmaker' },
          { label: 'Odds', key: 'odds' },
          { label: 'Stake', key: 'stake' },
          { label: 'Currency', key: 'currency' },
          { label: 'Status', key: 'status' },
          { label: 'Return', key: 'return' },
          { label: 'P&L', key: 'pnl' },
          { label: 'Model p', key: 'model_p' },
          { label: 'Market p', key: 'market_p' },
          { label: 'Closing odds', key: 'closing_odds' },
          { label: 'Closing source', key: 'closing_source' },
          { label: 'CLV', key: 'clv' },
          { label: 'Settled at', key: 'settled_at' },
          { label: 'Settled by', key: 'settled_by' },
          { label: 'Notes', key: 'notes' },
          { label: 'Tags', get: (b) => (b.tags || []).join('; ') }
        ])
        downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `my-bets-${this.today}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not export'))
      } finally {
        this.exporting = false
      }
    }
  }
}
</script>

<style scoped>
.fbbt__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
  margin-bottom: 14px;
}
.fbbt__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  transition: opacity 0.15s;
}
.fbbt__kpis {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}
.fbbt__kpi {
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  min-width: 0;
}
.fbbt__kpi-l {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.fbbt__kpi-v {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 4px 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fbbt__kpi-s {
  font-size: 11.5px;
  color: var(--text-3);
}
.fbbt__exp {
  margin: 0;
}
.fbbt__bkgrid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 24px;
}
.fbbt__lf {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fbbt__lf .ui-select {
  width: auto;
  max-width: 180px;
}
.fbbt__bets td {
  vertical-align: top;
}
/* v2.19.1: DASYIN's locked pick next to each bet */
.fbbt__dp {
  min-width: 150px;
}
.fbbt__dp-pick {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  margin-bottom: 4px;
}
.fbbt__acts {
  width: 44px;
}
.fbbt__pager {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 10px;
}
@media (max-width: 1280px) {
  .fbbt__kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 1000px) {
  .fbbt__bkgrid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 560px) {
  .fbbt__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .fbbt__kpi-v {
    font-size: 20px;
    white-space: normal;
  }
  .fbbt__kpi[data-kpi='pnl'] {
    grid-column: span 2;
  }
  .fbbt__lf .ui-select {
    max-width: none;
    flex: 1 1 45%;
  }
}
</style>
