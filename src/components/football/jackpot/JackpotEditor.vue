<template>
  <!-- New jackpot (details + games) or "Edit games" of a saved one. Games come from pasted text (parsed by the API,
       each line matched to a fixture with a confidence) or from a fixture search; odds are edited inline. -->
  <div class="fbje" data-test="fb-jp-editor">
    <!-- Details (new jackpot only; a saved jackpot edits them in a dialog) -->
    <section v-if="isNew" class="fb-panel fbje__sec" aria-labelledby="fbje-d">
      <div class="fb-panel__head">
        <div>
          <h2 id="fbje-d">1. The jackpot</h2>
          <p>As shown in your bookmaker's app. The prize and bonuses are only used for the expected value.</p>
        </div>
      </div>
      <div class="fb-panel__body fbje__details">
        <div class="ui-field">
          <label class="ui-label" for="fbje-book">Bookmaker</label>
          <input id="fbje-book" v-model.trim="d.bookmaker" class="ui-input" list="fbje-books" maxlength="80" data-test="fb-jp-bookmaker" @change="autoName" />
          <datalist id="fbje-books">
            <option v-for="b in bookmakers" :key="b" :value="b"></option>
          </datalist>
        </div>
        <div class="ui-field">
          <label class="ui-label" for="fbje-name">Name</label>
          <input id="fbje-name" v-model.trim="d.name" class="ui-input" maxlength="120" data-test="fb-jp-name" @input="nameTouched = true" />
        </div>
        <div class="ui-field">
          <label class="ui-label" for="fbje-prize">Top prize ({{ currency }})</label>
          <input id="fbje-prize" v-model="d.prize" class="ui-input" inputmode="decimal" placeholder="e.g. 22500447" data-test="fb-jp-prize" />
          <span class="ui-hint">{{ moneyHint(d.prize) }}</span>
        </div>
        <div class="ui-field">
          <label class="ui-label" for="fbje-price">Ticket price ({{ currency }})</label>
          <input id="fbje-price" v-model="d.ticket_price" class="ui-input" inputmode="decimal" placeholder="e.g. 99" data-test="fb-jp-price" />
          <span class="ui-hint">The cost of one combination</span>
        </div>
        <div class="ui-field">
          <label class="ui-label" for="fbje-close">Closes at ({{ tzLabel }})</label>
          <input id="fbje-close" v-model="d.closes_at" class="ui-input" type="datetime-local" data-test="fb-jp-closes" />
        </div>
        <fieldset class="fbje__bonus">
          <legend class="ui-label">Bonuses <span class="fb-muted fb-small">(optional — paid for exactly that many right)</span></legend>
          <div v-for="(b, i) in d.bonuses" :key="i" class="fbje__brow">
            <input v-model="b.correct" class="ui-input" inputmode="numeric" :aria-label="'Bonus ' + (i + 1) + ': number right'" placeholder="12" :data-test="'fb-jp-bonus-k-' + i" />
            <span class="fb-muted fb-small">right pays</span>
            <input v-model="b.amount" class="ui-input" inputmode="decimal" :aria-label="'Bonus ' + (i + 1) + ': amount'" placeholder="Amount" :data-test="'fb-jp-bonus-amt-' + i" />
            <button type="button" class="fb-linkbtn" :aria-label="'Remove bonus ' + (i + 1)" @click="d.bonuses.splice(i, 1)"><i class="fa-regular fa-trash-can"></i></button>
          </div>
          <button type="button" class="ui-btn ui-btn--sm" data-test="fb-jp-bonus-add" @click="addBonus"><i class="fa-solid fa-plus"></i> Add a bonus tier</button>
        </fieldset>
      </div>
    </section>

    <!-- Games -->
    <section class="fb-panel fbje__sec" aria-labelledby="fbje-g">
      <div class="fb-panel__head">
        <div>
          <h2 id="fbje-g">{{ isNew ? '2. The games' : 'Games' }}</h2>
          <p>Paste the list from the app (one game per line, odds optional at the end), or search the fixtures one by one.</p>
        </div>
        <div class="fb-seg" role="tablist" aria-label="How to add games">
          <button type="button" role="tab" :aria-selected="mode === 'paste'" :class="{ 'is-on': mode === 'paste' }" data-test="fb-jp-mode-paste" @click="mode = 'paste'"><i class="fa-regular fa-paste"></i> Paste games</button>
          <button type="button" role="tab" :aria-selected="mode === 'search'" :class="{ 'is-on': mode === 'search' }" data-test="fb-jp-mode-search" @click="mode = 'search'"><i class="fa-solid fa-magnifying-glass"></i> Search fixtures</button>
        </div>
      </div>
      <div class="fb-panel__body">
        <div v-if="mode === 'paste'" class="fbje__paste">
          <label class="ui-label" for="fbje-text">Paste the games</label>
          <textarea
            id="fbje-text"
            v-model="text"
            class="ui-input fbje__text"
            rows="8"
            spellcheck="false"
            :placeholder="'1. GKS PIAST GLIWICE - KORONA KELCE 2.44 3.35 2.55\n2. Chrobry Glogow v Puszcza Niepolomice 2.19 3.20 2.90\n…'"
            data-test="fb-jp-text"
          ></textarea>
          <div class="fbje__pastebtns">
            <button type="button" class="ui-btn ui-btn--primary" :disabled="!text.trim() || parsing" data-test="fb-jp-parse" @click="parse">
              <i :class="parsing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-wand-magic-sparkles'"></i> Read the games
            </button>
            <span class="fb-muted fb-small">Numbering, dates, country names and “v”, “vs” or “-” between the teams are fine. Nothing is saved until you press Save.</span>
          </div>
          <div v-if="parseError" class="ui-alert ui-alert--danger" role="alert"><i class="fa-solid fa-circle-exclamation"></i><span>{{ parseError }}</span></div>
          <div v-if="skipped.length || warnings.length" class="fbje__notes" data-test="fb-jp-parse-notes">
            <p v-for="(w, i) in warnings" :key="'w' + i"><i class="fa-solid fa-triangle-exclamation fbje__warn" aria-hidden="true"></i> {{ w }}</p>
            <p v-for="s in skipped" :key="'s' + s.line"><i class="fa-solid fa-forward fb-muted" aria-hidden="true"></i> Line {{ s.line }} skipped (“{{ s.raw }}”): {{ s.why }}</p>
          </div>
        </div>
        <div v-else class="fbje__search">
          <FixturePicker source="candidates" :tz="tz" :used-ids="usedIds" placeholder="Search a team or competition to add a game" autofocus test-id="fb-jp-search" @pick="addFixture" />
        </div>

        <!-- Preview / list -->
        <div v-if="rows.length" class="fbje__list">
          <div class="fbje__listhead">
            <strong>{{ rows.length }} game{{ rows.length === 1 ? '' : 's' }}</strong>
            <span class="fbje__summary" data-test="fb-jp-match-summary">
              <span class="fbje__ms fbje__ms--matched"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> {{ counts.matched }} matched</span>
              <span v-if="counts.suggested" class="fbje__ms fbje__ms--suggested"><i class="fa-solid fa-circle-question" aria-hidden="true"></i> {{ counts.suggested }} to check</span>
              <span v-if="counts.unmatched" class="fbje__ms fbje__ms--unmatched"><i class="fa-solid fa-link-slash" aria-hidden="true"></i> {{ counts.unmatched }} not matched</span>
            </span>
            <button type="button" class="fb-linkbtn" @click="clearAll">Clear the list</button>
          </div>
          <ol class="fbje__rows">
            <li v-for="(r, i) in rows" :key="r.key" class="fbje__row" :data-row="i + 1" :data-status="r.match.status">
              <div class="fbje__n fb-num">{{ i + 1 }}</div>
              <div class="fbje__game">
                <div class="fbje__teams">
                  <input v-model.trim="r.home" class="fbje__name" :aria-label="'Game ' + (i + 1) + ' home team'" />
                  <span class="fb-muted">v</span>
                  <input v-model.trim="r.away" class="fbje__name" :aria-label="'Game ' + (i + 1) + ' away team'" />
                </div>
                <div v-if="r.raw" class="fb-muted fb-small fbje__raw" :title="r.raw">Pasted: {{ r.raw }}</div>
                <div class="fbje__match" :data-test="'fb-jp-match-' + (i + 1)">
                  <template v-if="r.match.status === 'matched' || r.match.status === 'manual'">
                    <span class="fbje__ms fbje__ms--matched"
                      ><i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                      {{ r.match.status === 'manual' ? 'Picked by you' : `Matched ${pctTxt(r.match.confidence)}` }}</span
                    >
                    <span class="fbje__fx">{{ r.match.home }} v {{ r.match.away }}<span class="fb-muted"> · {{ r.match.competition }}<template v-if="r.match.kickoff"> · {{ fmtKo(r.match.kickoff) }}</template></span></span>
                    <button type="button" class="fb-linkbtn" :data-test="'fb-jp-change-' + (i + 1)" @click="openPicker(r)">Change</button>
                  </template>
                  <template v-else-if="r.match.status === 'suggested' && r.match.candidates.length">
                    <span class="fbje__ms fbje__ms--suggested"><i class="fa-solid fa-circle-question" aria-hidden="true"></i> Is it this one? {{ pctTxt(r.match.candidates[0].confidence) }}</span>
                    <span class="fbje__fx">{{ r.match.candidates[0].home }} v {{ r.match.candidates[0].away }}<span class="fb-muted"> · {{ r.match.candidates[0].competition }}<template v-if="r.match.candidates[0].kickoff"> · {{ fmtKo(r.match.candidates[0].kickoff) }}</template></span></span>
                    <button type="button" class="ui-btn ui-btn--sm" :data-test="'fb-jp-accept-' + (i + 1)" @click="useCandidate(r, r.match.candidates[0])"><i class="fa-solid fa-check"></i> Yes, use it</button>
                    <button type="button" class="fb-linkbtn" :data-test="'fb-jp-pick-' + (i + 1)" @click="openPicker(r)">Pick another</button>
                  </template>
                  <template v-else>
                    <span class="fbje__ms fbje__ms--unmatched"><i class="fa-solid fa-link-slash" aria-hidden="true"></i> Not matched</span>
                    <span class="fb-muted fb-small">Only the jackpot's own odds will be used for this game.</span>
                    <button type="button" class="ui-btn ui-btn--sm" :data-test="'fb-jp-pick-' + (i + 1)" @click="openPicker(r)"><i class="fa-solid fa-magnifying-glass"></i> Pick the fixture</button>
                  </template>
                </div>
                <div v-if="r.picking" class="fbje__picker">
                  <ul v-if="r.match.candidates.length > 1" class="fbje__cands">
                    <li v-for="c in r.match.candidates" :key="c.fixture_id">
                      <button type="button" class="fb-linkbtn" @click="useCandidate(r, c)">{{ c.home }} v {{ c.away }} · {{ c.competition }} · {{ pctTxt(c.confidence) }}</button>
                    </li>
                  </ul>
                  <FixturePicker source="candidates" :initial="seed(r)" :tz="tz" :used-ids="usedIds" autofocus :test-id="'fb-jp-picker-' + (i + 1)" @pick="(f) => pickFixture(r, f)" @cancel="r.picking = false" />
                  <div class="fbje__pickfoot">
                    <button v-if="r.fixture_id" type="button" class="fb-linkbtn" @click="unmatch(r)">Leave unmatched</button>
                    <button type="button" class="fb-linkbtn" @click="r.picking = false">Close</button>
                  </div>
                </div>
              </div>
              <div class="fbje__odds">
                <label v-for="(s, j) in ['1', 'X', '2']" :key="s" class="fbje__odd">
                  <span class="fb-muted fb-small">{{ s }}</span>
                  <input v-model="r.odds[j]" class="ui-input fb-num" inputmode="decimal" :aria-label="`Game ${i + 1} odds for ${s}`" :class="{ 'is-bad': oddBad(r.odds[j]) }" :data-test="`fb-jp-odds-${i + 1}-${s}`" />
                </label>
                <span class="fb-muted fb-small fbje__margin">{{ marginTxt(r) }}</span>
              </div>
              <button type="button" class="fb-linkbtn fbje__del" :aria-label="'Remove game ' + (i + 1)" @click="rows.splice(i, 1)"><i class="fa-regular fa-trash-can"></i></button>
            </li>
          </ol>
        </div>
        <p v-else class="fb-muted fb-small" style="margin: 12px 0 0">No games yet.</p>
      </div>
    </section>

    <div class="fbje__save">
      <div v-if="error" class="ui-alert ui-alert--danger" role="alert" data-test="fb-jp-save-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      <div class="fbje__btns">
        <button type="button" class="ui-btn ui-btn--primary" :disabled="saving || rows.length < 2" data-test="fb-jp-save" @click="save">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-chart-column'"></i> {{ isNew ? 'Save and analyse' : 'Save games' }}
        </button>
        <button v-if="!isNew" type="button" class="ui-btn" @click="$emit('cancel')">Cancel</button>
        <span v-if="rows.length < 2" class="fb-muted fb-small">Add at least 2 games.</span>
      </div>
    </div>
  </div>
</template>

<script>
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import FixturePicker from './FixturePicker.vue'
import { BOOKMAKERS } from './jp'

let keySeq = 0
const numOrNull = (v) => {
  const s = String(v ?? '').replace(/\s/g, '').replace(/,(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}
const oddNum = (v) => {
  const s = String(v ?? '').trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export function toLocalInput(iso, tz) {
  if (!iso) return ''
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const g = (k) => p.find((x) => x.type === k)?.value
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}
export function fromLocalInput(v, tz) {
  if (!v) return null
  const guess = new Date(v + ':00Z')
  const back = toLocalInput(guess.toISOString(), tz)
  const diff = new Date(back + ':00Z') - guess
  return new Date(guess.getTime() - diff).toISOString()
}

function rowFrom(g) {
  const m = g.match || {}
  return {
    key: ++keySeq,
    home: g.home || '',
    away: g.away || '',
    raw: g.raw || '',
    odds: (Array.isArray(g.odds) ? g.odds : g.odds ? [g.odds.h ?? g.odds['1'], g.odds.d ?? g.odds.X, g.odds.a ?? g.odds['2']] : ['', '', '']).map((o) => (o == null || o === '' ? '' : Number.isFinite(Number(o)) ? Number(o).toFixed(2) : String(o))),
    kickoff: g.kickoff || m.kickoff || null,
    fixture_id: m.status === 'matched' || m.status === 'manual' ? m.fixture_id ?? g.fixture_id ?? null : null,
    match: { status: m.status || 'unmatched', fixture_id: m.fixture_id ?? null, confidence: m.confidence ?? null, home: m.home || '', away: m.away || '', kickoff: m.kickoff || null, competition: m.competition || '', candidates: m.candidates || [] },
    picking: false
  }
}

export default {
  name: 'JackpotEditor',
  components: { FixturePicker },
  props: {
    jackpot: { type: Object, default: null }, // saved jackpot (edit games) or null (new)
    games: { type: Array, default: () => [] }, // saved games (normGame)
    currency: { type: String, default: 'KES' },
    tz: { type: String, default: 'Africa/Nairobi' },
    bookmakers: { type: Array, default: () => BOOKMAKERS },
    addFixtureId: { type: [String, Number], default: null }
  },
  emits: ['saved', 'cancel'],
  data() {
    return {
      d: { bookmaker: 'SportPesa', name: '', prize: '', ticket_price: '', closes_at: '', bonuses: [] },
      nameTouched: false,
      mode: 'paste',
      text: '',
      parsing: false,
      parseError: '',
      skipped: [],
      warnings: [],
      rows: this.games.map((g) => rowFrom({ ...g, odds: g.odds ? [g.odds.h, g.odds.d, g.odds.a] : null })),
      saving: false,
      error: ''
    }
  },
  computed: {
    isNew() {
      return !this.jackpot
    },
    tzLabel() {
      return this.tz.replace('_', ' ')
    },
    usedIds() {
      return this.rows.map((r) => r.fixture_id).filter(Boolean)
    },
    counts() {
      const c = { matched: 0, suggested: 0, unmatched: 0 }
      for (const r of this.rows) {
        if (r.fixture_id) c.matched++
        else if (r.match.status === 'suggested' && r.match.candidates.length) c.suggested++
        else c.unmatched++
      }
      return c
    }
  },
  created() {
    this.autoName()
    if (this.addFixtureId) this.addById(this.addFixtureId)
  },
  methods: {
    moneyHint(v) {
      const n = numOrNull(v)
      return n > 0 ? formatMoney(n, this.currency) : ' '
    },
    pctTxt(p) {
      return p == null ? '' : `${Math.round(p * 100)}%`
    },
    fmtKo(iso) {
      return new Intl.DateTimeFormat(undefined, { timeZone: this.tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
    },
    autoName() {
      if (this.nameTouched || !this.isNew) return
      const day = new Intl.DateTimeFormat(undefined, { timeZone: this.tz, day: 'numeric', month: 'short' }).format(new Date())
      this.d.name = `${this.d.bookmaker || 'Jackpot'} jackpot ${day}`
    },
    addBonus() {
      const used = this.d.bonuses.map((b) => Number(b.correct))
      const n = this.rows.length || 13
      const next = [n - 1, n - 2, n - 3].find((k) => k > 0 && !used.includes(k)) ?? ''
      this.d.bonuses.push({ correct: String(next), amount: '' })
    },
    oddBad(v) {
      const n = oddNum(v)
      return n !== null && (Number.isNaN(n) || n < 1.01 || n > 1000)
    },
    marginTxt(r) {
      const o = r.odds.map(oddNum)
      if (o.every((x) => x === null)) return r.fixture_id ? 'odds not typed yet' : ''
      if (o.some((x) => !(x >= 1.01))) return ''
      const m = o.reduce((t, x) => t + 1 / x, 0) - 1
      return `margin ${(m * 100).toFixed(1)}%`
    },
    seed(r) {
      return (r.home || '').replace(/\b(GKS|KS|FC|SC|CF|AFC|U21|U23|II)\b/gi, '').trim().split(/\s+/).slice(0, 2).join(' ')
    },
    async parse() {
      this.parsing = true
      this.parseError = ''
      try {
        const r = await footballApi.parseJackpot({ text: this.text })
        const add = (r.games || []).map(rowFrom)
        if (!add.length) {
          this.parseError = 'No games found in the text. Put one game per line, e.g. “Piast Gliwice v Korona Kielce 2.44 3.35 2.55”.'
        } else {
          this.rows = this.rows.length && this.rows.some((x) => x.raw) ? add : this.rows.concat(add)
          this.text = ''
        }
        this.skipped = r.skipped || []
        this.warnings = r.warnings || []
      } catch (e) {
        this.parseError = apiErrorMessage(e, 'Could not read the games')
      } finally {
        this.parsing = false
      }
    },
    addFixture(f) {
      if (this.usedIds.includes(f.id)) return
      this.rows.push(
        rowFrom({ home: f.home.name, away: f.away.name, kickoff: f.kickoff, odds: ['', '', ''], match: { status: 'manual', fixture_id: f.id, confidence: 1, home: f.home.name, away: f.away.name, kickoff: f.kickoff, competition: f.competition?.name || '' } })
      )
    },
    async addById(id) {
      try {
        const a = await footballApi.analysis(id)
        const f = a.fixture
        this.addFixture({ id: f.id, home: f.home, away: f.away, kickoff: f.kickoff, competition: f.competition })
        this.mode = 'search'
      } catch {
        /* the fixture may be gone; nothing to add */
      }
    },
    openPicker(r) {
      for (const x of this.rows) if (x !== r) x.picking = false
      r.picking = !r.picking
    },
    useCandidate(r, c) {
      r.fixture_id = c.fixture_id
      r.kickoff = c.kickoff || r.kickoff
      r.match = { ...r.match, status: 'manual', fixture_id: c.fixture_id, confidence: c.confidence, home: c.home, away: c.away, kickoff: c.kickoff, competition: c.competition }
      r.picking = false
    },
    pickFixture(r, f) {
      this.useCandidate(r, { fixture_id: f.id, home: f.home.name, away: f.away.name, kickoff: f.kickoff, competition: f.competition?.name || '', confidence: 1 })
    },
    unmatch(r) {
      r.fixture_id = null
      r.match = { ...r.match, status: 'unmatched', fixture_id: null }
      r.picking = false
    },
    clearAll() {
      this.rows = []
      this.skipped = []
      this.warnings = []
    },
    body() {
      const games = []
      for (const [i, r] of this.rows.entries()) {
        if (!r.home || !r.away) throw new Error(`Game ${i + 1} needs both team names.`)
        const o = r.odds.map(oddNum)
        const none = o.every((x) => x === null)
        // A matched game may wait for its jackpot odds (the other sources are used meanwhile); otherwise all three are needed.
        if (none && !r.fixture_id) throw new Error(`Type the jackpot's three odds for game ${i + 1} (${r.home} v ${r.away}), pick its fixture, or remove it.`)
        if (!none && o.some((x) => x === null)) throw new Error(`Game ${i + 1}: type all three odds (1, X and 2) or none.`)
        if (o.some((x) => Number.isNaN(x) || (x !== null && (x < 1.01 || x > 1000)))) throw new Error(`Game ${i + 1}: odds must be decimals between 1.01 and 1000.`)
        const g = { home: r.home, away: r.away, kickoff: r.kickoff || null, fixture_id: r.fixture_id || null }
        if (!none) g.odds = o
        games.push(g)
      }
      if (games.length < 2) throw new Error('Add at least 2 games.')
      if (games.length > 30) throw new Error('A jackpot can have at most 30 games.')
      if (!this.isNew) return { games }
      const prize = numOrNull(this.d.prize)
      const price = numOrNull(this.d.ticket_price)
      if (Number.isNaN(prize) || (prize != null && prize < 0)) throw new Error('The prize must be a number.')
      if (price == null || Number.isNaN(price) || price <= 0) throw new Error('Type the ticket price (the cost of one combination).')
      const bonuses = []
      for (const b of this.d.bonuses) {
        if (!String(b.correct).trim() && !String(b.amount).trim()) continue
        const k = Number(b.correct)
        const a = numOrNull(b.amount)
        if (!Number.isInteger(k) || k < 1 || k >= games.length || a == null || Number.isNaN(a)) throw new Error(`Each bonus needs a number right (below ${games.length}) and an amount.`)
        bonuses.push({ correct: k, amount: a })
      }
      return {
        name: this.d.name || `${this.d.bookmaker} jackpot`,
        bookmaker: this.d.bookmaker,
        prize: prize ?? 0,
        currency: this.currency,
        ticket_price: price,
        bonuses,
        closes_at: fromLocalInput(this.d.closes_at, this.tz),
        games
      }
    },
    async save() {
      this.error = ''
      let body
      try {
        body = this.body()
      } catch (e) {
        this.error = e.message
        return
      }
      this.saving = true
      try {
        const v = this.isNew ? await footballApi.createJackpot(body) : await footballApi.updateJackpot(this.jackpot.id, body)
        this.$emit('saved', v)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the jackpot')
      } finally {
        this.saving = false
      }
    }
  }
}

</script>

<style scoped>
.fbje {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.fbje__details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
}
.fbje__details .ui-field {
  margin: 0;
  min-width: 0;
}
.fbje__bonus {
  grid-column: 1 / -1;
  border: 0;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  justify-items: start;
}
.fbje__brow {
  display: grid;
  grid-template-columns: 70px auto minmax(0, 220px) auto;
  gap: 8px;
  align-items: center;
  max-width: 100%;
}
.fbje__paste {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}
.fbje__text {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  min-height: 150px;
  resize: vertical;
  width: 100%;
}
.fbje__pastebtns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}
.fbje__notes {
  font-size: 12.5px;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 10px;
}
.fbje__notes p {
  margin: 3px 0;
}
.fbje__warn {
  color: #b77a00;
}
.fbje__list {
  margin-top: 16px;
}
.fbje__listhead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  margin-bottom: 6px;
}
.fbje__summary {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12.5px;
}
.fbje__ms {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
  white-space: nowrap;
}
.fbje__ms--matched i {
  color: var(--fb-good);
}
.fbje__ms--suggested i {
  color: #b77a00;
}
.fbje__ms--unmatched i {
  color: var(--fb-bad);
}
.fbje__rows {
  list-style: none;
  margin: 0;
  padding: 0;
}
.fbje__row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto 28px;
  gap: 10px;
  align-items: start;
  padding: 10px 0;
  border-top: 1px solid var(--border);
}
.fbje__n {
  font-weight: 650;
  color: var(--text-3);
  padding-top: 6px;
}
.fbje__game {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
}
.fbje__teams {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.fbje__name {
  flex: 1 1 0;
  min-width: 0;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  padding: 3px 5px;
  font: inherit;
  font-weight: 600;
  font-size: 13.5px;
  color: var(--text);
}
.fbje__name:hover,
.fbje__name:focus {
  border-color: var(--border-strong);
  background: var(--surface);
  outline: none;
}
.fbje__raw {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 6px;
}
.fbje__match {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding-left: 6px;
  font-size: 12.5px;
}
.fbje__fx {
  min-width: 0;
  overflow-wrap: anywhere;
}
.fbje__picker {
  margin-top: 6px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}
.fbje__cands {
  list-style: none;
  margin: 0;
  padding: 0;
}
.fbje__pickfoot {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.fbje__odds {
  display: grid;
  grid-template-columns: repeat(3, 62px);
  gap: 4px 6px;
  align-items: end;
}
.fbje__odd {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1px;
  justify-items: center;
}
.fbje__odd input {
  width: 100%;
  text-align: center;
  padding: 4px 6px;
  height: 32px;
  min-height: 32px;
}
.fbje__odd input.is-bad {
  border-color: var(--danger);
}
.fbje__margin {
  grid-column: 1 / -1;
  text-align: center;
  min-height: 16px;
}
.fbje__del {
  margin-top: 4px;
}
.fbje__save {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.fbje__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}
@media (max-width: 900px) {
  .fbje__details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .fbje__details {
    grid-template-columns: minmax(0, 1fr);
  }
  .fbje__row {
    grid-template-columns: 22px minmax(0, 1fr) 28px;
    grid-template-areas: 'n game del' 'n odds odds';
  }
  .fbje__n {
    grid-area: n;
  }
  .fbje__game {
    grid-area: game;
  }
  .fbje__odds {
    grid-area: odds;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    justify-self: stretch;
  }
  .fbje__margin {
    grid-column: auto;
    align-self: center;
  }
  .fbje__del {
    grid-area: del;
  }
  .fbje__brow {
    grid-template-columns: 56px auto minmax(0, 1fr) auto;
  }
}
</style>
