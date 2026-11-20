<template>
  <FbSection id="games" title="Each game" :subtitle="subtitle" open-on-phone>
    <FbFigure
      title="Home win · draw · away win, per game"
      subtitle="Blended chances; the pick is underlined and ticked, a covered extra selection has a hollow line"
      :legend="[
        { name: '1 · home win', color: 'var(--fb-home)' },
        { name: 'X · draw', color: 'var(--fb-draw)' },
        { name: '2 · away win', color: 'var(--fb-away)' }
      ]"
      :table="boardTable"
      chart-id="jp-board"
    >
      <FbJackpotBoard :games="board" />
    </FbFigure>

    <div class="fbjg__head">
      <div class="fb-fig__title">Where each chance comes from</div>
      <div class="fb-fig__sub">
        Percentages are 1 · X · 2. Weights: <span v-for="(w, k) in weightList" :key="k" class="fbjg__w"><i class="fbjg__sw" :class="{ 'is-ring': w.ring }" :style="w.style"></i>{{ w.label }} {{ w.pct }}</span>
        — renormalised over the sources a game has. Select a row to see the details.
      </div>
    </div>
    <div class="fb-scroll">
      <table class="fb-table fbjg__t" data-test="fb-jp-games">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Game</th>
            <th class="num" title="The jackpot's own odds">Odds 1 · X · 2</th>
            <th class="num"><i class="fbjg__sw is-ring" :style="SRC.jackpot.style"></i>Fair %</th>
            <th class="num"><i class="fbjg__sw" :style="SRC.market.style"></i>Market %</th>
            <th class="num"><i class="fbjg__sw" :style="SRC.clubelo.style"></i>ClubElo %</th>
            <th class="num"><i class="fbjg__sw" :style="SRC.model.style"></i>Model %</th>
            <th>Pick</th>
            <th>2nd choice</th>
            <th>Team news</th>
            <th>Source check</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="g in games" :key="g.n">
            <tr class="fbjg__row" :class="{ 'is-open': open === g.n }" :data-game="g.n" :data-pick="g.pick" tabindex="0" :aria-expanded="open === g.n" @click="toggle(g.n, $event)" @keydown.enter="toggle(g.n, $event)">
              <td class="num fb-muted">{{ g.n }}</td>
              <td>
                <div class="fbjg__game">
                  <router-link v-if="g.fixture_id" :to="`/football/match/${g.fixture_id}`" class="fbjg__name" @click.stop>{{ g.home }} v {{ g.away }}</router-link>
                  <span v-else class="fbjg__name">{{ g.home }} v {{ g.away }}</span>
                  <span class="fb-muted fb-small">{{ g.kickoff ? fmtKo(g.kickoff) : '' }}<template v-if="!g.fixture_id"> · not matched</template></span>
                </div>
              </td>
              <td class="num">
                <div>{{ trioOdds(g.odds) }}</div>
                <div v-if="g.margin != null" class="fb-muted fb-small">{{ pct(g.margin, 1) }} margin</div>
              </td>
              <td v-for="k in ['jackpot', 'market', 'clubelo', 'model']" :key="k" class="num" :data-src="k" :title="srcTitle(g, k)">
                <template v-if="g.sources[k] && g.sources[k].probs && g.sources[k].used !== false"
                  ><span v-for="(s, j) in SYMS" :key="s"><span v-if="j" class="fb-muted"> · </span><b v-if="s === g.pick">{{ p0(g.sources[k].probs, s) }}</b><template v-else>{{ p0(g.sources[k].probs, s) }}</template></span></template
                >
                <span v-else class="fb-muted">—</span>
              </td>
              <td :data-v="g.pPick">
                <span class="fbjg__pick"><b class="fbjg__sym">{{ g.pick }}</b> <span class="fb-num">{{ pct(g.pPick, 0) }}</span></span>
              </td>
              <td>
                <span v-if="g.second" class="fbjg__pick fb-muted"><b class="fbjg__sym fbjg__sym--2">{{ g.second }}</b> <span class="fb-num">{{ pct(g.pSecond, 0) }}</span></span>
                <span v-if="g.drawLean" class="fb-pill fbjg__lean" title="The evidence leans towards a draw">draw lean</span>
              </td>
              <td @click.stop>
                <FbPopBtn v-if="newsOf(g).length" :label="'Team news for game ' + g.n" :btn-class="['fb-fact', newsConfirmed(g) ? 'fb-fact--confirmed' : 'fb-fact--reported']" :test-id="'fb-jp-news-' + g.n">
                  <template #button
                    ><i :class="newsConfirmed(g) ? 'fa-solid fa-check' : 'fa-regular fa-newspaper'" aria-hidden="true"></i>{{ newsConfirmed(g) ? 'Confirmed' : 'Reported' }}<template v-if="newsOf(g).length > 1"> · {{ newsOf(g).length }}</template></template
                  >
                  <div class="fb-pop__title">Team news</div>
                  <p v-for="(e, i) in newsOf(g)" :key="i" class="fbjg__ev"><i class="fb-mark" :class="/confirmed/i.test(e.text) ? 'fb-mark--confirmed' : 'fb-mark--reported'"></i>{{ e.text }}</p>
                  <router-link v-if="g.fixture_id" :to="`/football/match/${g.fixture_id}#team-news`" class="fb-small">Open the match's team news</router-link>
                </FbPopBtn>
                <span v-else class="fb-muted fb-small">—</span>
              </td>
              <td @click.stop>
                <SourceBadge v-if="g.fixture_id" :checks="checksOf(g)" :title="`Source check · game ${g.n}`" short :test-key="'jp-' + g.n" />
                <span v-else class="fb-muted fb-small">not matched</span>
              </td>
            </tr>
            <tr v-if="open === g.n" class="fbjg__detail" :data-detail="g.n">
              <td colspan="11">
                <div class="fbjg__dwrap">
                  <FbStack :rows="stackRows(g)" :names="[g.home, 'Draw', g.away]" />
                  <ul class="fbjg__notes">
                    <li v-for="s in g.sourceList" :key="s.key">
                      <i class="fbjg__sw" :class="{ 'is-ring': SRC[s.key] && SRC[s.key].ring }" :style="SRC[s.key] ? SRC[s.key].style : {}"></i>
                      <strong>{{ s.label }}</strong>
                      <span class="fb-muted"> · weight {{ s.used !== false && s.weight != null ? pct(s.weight, 0) : 'not used' }}</span>
                      <template v-if="s.detail"> · {{ s.detail }}</template>
                      <template v-if="s.why"> · <span class="fb-muted">{{ s.why }}</span></template>
                    </li>
                    <li v-for="(e, i) in g.evidence" :key="'e' + i"><i class="fa-solid fa-circle-info fb-muted" aria-hidden="true"></i> {{ e.text }}</li>
                    <li v-if="g.publicShares" class="fb-muted">
                      Assumed share of tickets picking 1 · X · 2: {{ pct(g.publicShares.h, 0) }} · {{ pct(g.publicShares.d, 0) }} · {{ pct(g.publicShares.a, 0) }} (used for sharing the prize)
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </FbSection>
</template>

<script>
import FbSection from '../match/FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbStack from '../charts/FbStack.vue'
import FbJackpotBoard from '../charts/FbJackpotBoard.vue'
import SourceBadge from '../match/SourceBadge.vue'
import { toChecks } from '../match/srccheck'
import FbPopBtn from '../FbPopBtn.vue'
import { pct, SOURCE_STYLE } from '../fb'
import { SYMS } from './jp'
import { pOf } from './jpApi'

const SRC = Object.fromEntries(Object.entries(SOURCE_STYLE).map(([k, v]) => [k, { ...v, style: v.ring ? { boxShadow: `inset 0 0 0 2px ${v.color}` } : { background: v.color } }]))

export default {
  name: 'JpGames',
  components: { FbSection, FbFigure, FbStack, FbJackpotBoard, SourceBadge, FbPopBtn },
  props: {
    an: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' },
    plan: { type: Object, default: null } // chosen cover plan: { picks: ["1","12",…] }
  },
  data() {
    return { SRC, SYMS, open: null }
  },
  computed: {
    games() {
      return this.an.games
    },
    subtitle() {
      const n = this.games.length
      const matched = this.games.filter((g) => g.fixture_id).length
      return `${n} games · ${matched} matched to fixtures · chances blend the jackpot's own odds with the sharp market, ClubElo and DASYIN's model`
    },
    weightList() {
      const w = this.an.weights || {}
      return ['jackpot', 'market', 'clubelo', 'model'].filter((k) => w[k] != null).map((k) => ({ label: SRC[k].label, style: SRC[k].style, ring: SRC[k].ring, pct: pct(w[k], 0) }))
    },
    board() {
      const plan = this.plan?.picks || null
      return this.games.map((g, i) => {
        const cover = plan ? String(plan[i] || '') : ''
        return {
          key: g.n,
          n: g.n,
          label: `${g.home} v ${g.away}`,
          sub: g.kickoff ? this.fmtKo(g.kickoff) : '',
          h: g.probs?.h,
          d: g.probs?.d,
          a: g.probs?.a,
          pick: g.pick,
          extra: cover.length > 1 ? cover.split('').filter((s) => s !== g.pick) : [],
          names: [g.home, g.away],
          note: g.drawLean ? 'The evidence leans towards a draw.' : g.certainty != null ? `Gap between the top two: ${pct(g.certainty, 1)}` : ''
        }
      })
    },
    boardTable() {
      return {
        cols: [{ label: '#', num: true }, { label: 'Game' }, { label: '1', num: true }, { label: 'X', num: true }, { label: '2', num: true }, { label: 'Pick' }],
        rows: this.games.map((g, i) => [g.n, `${g.home} v ${g.away}`, pct(g.probs?.h), pct(g.probs?.d), pct(g.probs?.a), this.board[i].extra.length ? g.pick + this.board[i].extra.join('') : g.pick])
      }
    }
  },
  methods: {
    pct,
    fmtKo(iso) {
      return new Intl.DateTimeFormat(undefined, { timeZone: this.tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
    },
    trioOdds(t) {
      if (!t) return '—'
      return [t.h, t.d, t.a].map((v) => (v == null ? '—' : Number(v).toFixed(2))).join(' · ')
    },
    p0(t, s) {
      const v = pOf(t, s)
      return v == null ? '—' : Math.round(v * 100)
    },
    srcTitle(g, k) {
      const s = g.sources[k]
      if (!s) return 'No such source for this game'
      if (s.used === false || !s.probs) return s.why || 'Not available for this game'
      return [s.label, s.detail, s.weight != null ? `weight ${Math.round(s.weight * 100)}%` : ''].filter(Boolean).join(' · ')
    },
    newsOf(g) {
      return (g.evidence || []).filter((e) => e.kind === 'team_news')
    },
    newsConfirmed(g) {
      return this.newsOf(g).some((e) => (e.status ? e.status === 'confirmed' : /confirmed/i.test(e.text) && !/not confirmed/i.test(e.text)))
    },
    checksOf(g) {
      const ev = (g.evidence || []).filter((e) => e.kind === 'source_check')
      if (g.source_check?.items?.length) return toChecks(g.source_check.items, this.tz)
      if (!ev.length) return [{ label: 'Table, results and kick-off', status: 'agree', sources: [], note: 'No differences between the sources were noted for this game.' }]
      return ev.map((e) => ({ label: e.text, status: e.status || (/conflict/i.test(e.text) ? 'conflict' : 'minor'), sources: [], note: '' }))
    },
    stackRows(g) {
      const rows = g.sourceList
        .filter((s) => s.probs && s.used !== false)
        .map((s) => ({ key: s.key, label: s.label, sub: s.weight != null ? `weight ${Math.round(s.weight * 100)}%` : '', h: s.probs.h, d: s.probs.d, a: s.probs.a, dot: SRC[s.key]?.color, ring: SRC[s.key]?.ring, note: s.detail }))
      rows.push({ key: 'blend', label: 'Blended', sub: `pick ${g.pick}`, h: g.probs?.h, d: g.probs?.d, a: g.probs?.a, note: 'Weighted average of the sources above' })
      return rows
    },
    toggle(n, e) {
      if (e && e.target.closest('a,button')) return
      this.open = this.open === n ? null : n
    }
  }
}
</script>

<style scoped>
.fbjg__head {
  margin: 22px 0 6px;
}
.fbjg__w {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
  white-space: nowrap;
}
.fbjg__sw {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 5px;
  vertical-align: 0;
  flex-shrink: 0;
}
.fbjg__t td {
  white-space: nowrap;
}
.fbjg__row {
  cursor: pointer;
}
.fbjg__row:hover td,
.fbjg__row.is-open td {
  background: var(--surface-hover);
}
.fbjg__row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.fbjg__game {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.fbjg__name {
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
}
a.fbjg__name:hover {
  text-decoration: underline;
}
.fbjg__pick {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.fbjg__sym {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  border-radius: 6px;
  background: var(--neutral-soft);
  color: var(--text);
  font-weight: 750;
  font-size: 12.5px;
}
.fbjg__sym--2 {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
.fbjg__lean {
  margin-left: 6px;
}
.fbjg__ev {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  margin: 4px 0;
}
.fbjg__ev .fb-mark {
  margin-top: 4px;
}
.fbjg__detail td {
  background: var(--surface-2);
  white-space: normal;
}
.fbjg__dwrap {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 16px;
  padding: 6px 2px;
  max-width: 1100px;
}
.fbjg__notes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 5px;
  font-size: 12.5px;
  color: var(--text-2);
}
@media (max-width: 900px) {
  .fbjg__dwrap {
    grid-template-columns: minmax(0, 1fr);
    max-width: calc(100vw - 80px);
  }
}
</style>
