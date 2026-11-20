<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal fb fbbf" style="max-width: 620px" role="dialog" aria-modal="true" aria-labelledby="fbbf-title" data-test="fb-bet-form" novalidate @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="fbbf-title">{{ bet ? 'Edit bet' : 'Record a bet' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body fbbf__body">
        <p class="fb-muted fb-small" style="margin: 0">Record a bet you placed with your own bookmaker. DASYIN never places bets or holds money.</p>

        <!-- Match -->
        <div class="ui-field">
          <span class="ui-label">Match</span>
          <div v-if="fixture" class="fbbf__match">
            <span><strong>{{ fixture.home.name }}</strong> v <strong>{{ fixture.away.name }}</strong></span>
            <span class="fb-muted fb-small">{{ fixture.competition?.name || fixture.competition }} · {{ fmtDateTime(fixture.kickoff, tz) }}</span>
            <button v-if="!bet" type="button" class="fb-linkbtn" @click="fixture = null">Change</button>
          </div>
          <template v-else>
            <input v-model="q" class="ui-input" placeholder="Search a team" aria-label="Search a match by team" data-test="fb-bf-search" @input="search" />
            <ul class="fbbf__results" role="listbox" aria-label="Matches">
              <li v-for="f in results" :key="f.id">
                <button type="button" role="option" :data-fixture="f.id" @click="pick(f)">
                  <span>{{ f.home.name }} v {{ f.away.name }}</span><span class="fb-muted fb-small">{{ fmtDateTime(f.kickoff, tz) }} · {{ f.competition.name }}</span>
                </button>
              </li>
              <li v-if="!results.length" class="fb-muted fb-small" style="padding: 8px">{{ searching ? 'Searching…' : 'No upcoming matches found' }}</li>
            </ul>
          </template>
        </div>

        <div class="fbbf__grid">
          <div class="ui-field">
            <label class="ui-label" for="fbbf-market">Market</label>
            <select id="fbbf-market" v-model="form.market" class="ui-select" data-test="fb-bf-market" @change="onMarket">
              <option v-for="m in MARKETS" :key="m.key" :value="m.key">{{ m.label }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbbf-sel">Selection</label>
            <select id="fbbf-sel" v-model="form.selection" class="ui-select" data-test="fb-bf-selection">
              <option v-for="s in market.selections" :key="s" :value="s">{{ selLabel(s) }}</option>
            </select>
          </div>
          <div v-if="market.needsLine" class="ui-field">
            <label class="ui-label" for="fbbf-line">{{ form.market === 'ou' ? 'Goals line' : 'Handicap (your team)' }}</label>
            <input id="fbbf-line" v-model="form.line" class="ui-input" inputmode="decimal" placeholder="e.g. 2.5 or -0.25" data-test="fb-bf-line" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbbf-book">Bookmaker</label>
            <input id="fbbf-book" v-model.trim="form.bookmaker" class="ui-input" list="fbbf-books" maxlength="80" placeholder="SportPesa, Betika, Odibets…" data-test="fb-bf-book" />
            <datalist id="fbbf-books">
              <option v-for="b in bookmakers" :key="b" :value="b"></option>
            </datalist>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbbf-odds">Odds (decimal)</label>
            <input id="fbbf-odds" v-model="form.odds" class="ui-input" inputmode="decimal" placeholder="2.10" data-test="fb-bf-odds" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbbf-stake">Stake ({{ currency }})</label>
            <input id="fbbf-stake" v-model="form.stake" class="ui-input" inputmode="decimal" placeholder="500" data-test="fb-bf-stake" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbbf-at">Placed at</label>
            <input id="fbbf-at" v-model="form.placed_at" class="ui-input" type="datetime-local" aria-describedby="fbbf-at-hint" />
            <span id="fbbf-at-hint" class="ui-hint">Leave empty for now</span>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbbf-tags">Tags</label>
            <input id="fbbf-tags" v-model="form.tags" class="ui-input" placeholder="e.g. price shop, weekend" />
          </div>
        </div>
        <div class="ui-field">
          <label class="ui-label" for="fbbf-notes">Notes</label>
          <textarea id="fbbf-notes" v-model="form.notes" class="ui-textarea" rows="2" maxlength="2000"></textarea>
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger" role="alert" data-test="fb-bf-error"><i class="fa-solid fa-hand"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !fixture" data-test="fb-bf-save">
          <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ bet ? 'Save changes' : 'Record bet' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { MARKETS, fmtDateTime, line as fmtLine } from '../fb'

const pad = (n) => String(n).padStart(2, '0')
const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

export default {
  name: 'BetFormModal',
  props: {
    bet: { type: Object, default: null },
    bookmakers: { type: Array, default: () => [] },
    currency: { type: String, default: 'KES' },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  emits: ['close', 'saved'],
  data() {
    const b = this.bet
    return {
      MARKETS,
      q: '',
      results: [],
      searching: false,
      timer: null,
      saving: false,
      error: '',
      fixture: b ? { id: b.fixture_id, home: b.home, away: b.away, competition: b.competition, kickoff: b.kickoff } : null,
      form: {
        market: b?.market || '1x2',
        selection: b?.selection || 'home',
        line: b?.line != null ? String(b.line) : '',
        bookmaker: b?.bookmaker || 'SportPesa',
        odds: b ? String(b.odds) : '',
        stake: b ? String(b.stake) : '',
        // New bets: empty = "now" on the server (its clock decides which day's limits apply).
        placed_at: b ? local(new Date(b.placed_at)) : '',
        tags: (b?.tags || []).join(', '),
        notes: b?.notes || ''
      }
    }
  },
  computed: {
    market() {
      return MARKETS.find((m) => m.key === this.form.market)
    }
  },
  created() {
    if (!this.fixture) this.search()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    fmtDateTime,
    selLabel(s) {
      const h = this.fixture?.home?.name || 'Home'
      const a = this.fixture?.away?.name || 'Away'
      const m = this.form.market
      if (m === '1x2') return s === 'home' ? h : s === 'away' ? a : 'Draw'
      if (m === 'dc') return s === '1x' ? `${h} or draw` : s === 'x2' ? `Draw or ${a}` : `${h} or ${a}`
      if (m === 'dnb' || m === 'ah') return (s === 'home' ? h : a) + (m === 'ah' && this.form.line !== '' ? ' ' + fmtLine(Number(this.form.line)) : '')
      if (m === 'ou') return s === 'over' ? 'Over' : 'Under'
      return s === 'yes' ? 'Yes' : 'No'
    },
    onMarket() {
      if (!this.market.selections.includes(this.form.selection)) this.form.selection = this.market.selections[0]
      if (this.form.market === 'ou' && this.form.line === '') this.form.line = '2.5'
      if (this.form.market === 'ah' && this.form.line === '') this.form.line = '0'
    },
    search() {
      clearTimeout(this.timer)
      this.timer = setTimeout(async () => {
        this.searching = true
        try {
          const d = await footballApi.fixtures({ q: this.q.trim(), status: 'upcoming', limit: 20 })
          this.results = d.fixtures || []
        } catch {
          this.results = []
        } finally {
          this.searching = false
        }
      }, 250)
    },
    pick(f) {
      this.fixture = f
    },
    async save() {
      this.error = ''
      const num = (v) => Number(String(v).replace(',', '.'))
      const body = {
        fixture_id: this.fixture.id,
        bookmaker: this.form.bookmaker,
        market: this.form.market,
        selection: this.form.selection,
        line: this.market.needsLine ? num(this.form.line) : null,
        odds: num(this.form.odds),
        stake: num(this.form.stake),
        placed_at: this.form.placed_at ? new Date(this.form.placed_at).toISOString() : undefined,
        notes: this.form.notes,
        tags: this.form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      }
      this.saving = true
      try {
        const b = this.bet ? await footballApi.updateBet(this.bet.id, body) : await footballApi.createBet(body)
        this.$emit('saved', b)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the bet')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.fbbf__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.fbbf__body .ui-field {
  margin: 0;
}
.fbbf__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.fbbf__match {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: baseline;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.fbbf__results {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.fbbf__results button {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 10px;
  text-align: left;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: none;
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}
.fbbf__results button:hover {
  background: var(--surface-hover);
}
@media (max-width: 520px) {
  .fbbf__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
