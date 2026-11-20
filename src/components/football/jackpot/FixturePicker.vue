<template>
  <!-- Search upcoming fixtures by team or competition and pick one. -->
  <div class="fbfp" :data-test="testId">
    <div class="fbfp__search">
      <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      <input
        ref="input"
        v-model="q"
        class="ui-input"
        type="search"
        :placeholder="placeholder"
        :aria-label="placeholder"
        autocomplete="off"
        data-test="fb-fp-q"
        @input="search"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="pickActive"
        @keydown.esc="$emit('cancel')"
      />
    </div>
    <ul v-if="results.length" class="fbfp__list" role="listbox" :aria-label="'Fixtures matching ' + q">
      <li v-for="(f, i) in results" :key="f.id" role="option" :aria-selected="i === active" :class="{ 'is-active': i === active, 'is-used': usedIds.includes(f.id) }" :data-fixture="f.id" @click="pick(f)" @mouseenter="active = i">
        <span class="fbfp__teams">{{ f.home.name }} <span class="fb-muted">v</span> {{ f.away.name }}</span>
        <span class="fb-muted fb-small">{{ f.competition?.name }} · {{ fmtDay(f.kickoff, tz, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}<template v-if="usedIds.includes(f.id)"> · already in this jackpot</template></span>
      </li>
    </ul>
    <p v-else-if="q.trim().length >= 2 && !loading" class="fb-muted fb-small fbfp__none">No upcoming fixture matches “{{ q.trim() }}”. Try one team's name, or a shorter spelling.</p>
    <p v-if="loading" class="fb-muted fb-small fbfp__none"><i class="fa-solid fa-circle-notch spin"></i> Searching…</p>
  </div>
</template>

<script>
import { footballApi } from '@/services/football'
import { fmtDay } from '../fb'
import { apiNow } from '../fbState'

export default {
  name: 'FixturePicker',
  props: {
    initial: { type: String, default: '' },
    tz: { type: String, default: 'Africa/Nairobi' },
    usedIds: { type: Array, default: () => [] },
    placeholder: { type: String, default: 'Search a team or competition' },
    autofocus: { type: Boolean, default: false },
    // 'candidates' = the jackpot matcher's search (every stored fixture, with a confidence); 'fixtures' = the match centre list
    source: { type: String, default: 'fixtures' },
    testId: { type: String, default: 'fb-fixture-picker' }
  },
  emits: ['pick', 'cancel'],
  data() {
    return { q: this.initial, results: [], loading: false, timer: null, active: 0, req: 0 }
  },
  mounted() {
    if (this.autofocus) this.$nextTick(() => this.$refs.input?.focus())
    if (this.q.trim().length >= 2) this.search()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    fmtDay,
    search() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.run, 250)
    },
    async run() {
      const q = this.q.trim()
      if (q.length < 2) {
        this.results = []
        return
      }
      const id = ++this.req
      this.loading = true
      try {
        let list
        if (this.source === 'candidates') {
          const d = await footballApi.jackpotCandidates({ q })
          list = (d.candidates || []).map((c) => ({ id: c.fixture_id, home: { name: c.home }, away: { name: c.away }, kickoff: c.kickoff, competition: { name: c.competition }, confidence: c.confidence }))
        } else {
          const now = apiNow()
          const from = new Date(now.getTime() - 6 * 3600000).toISOString()
          const to = new Date(now.getTime() + 21 * 86400000).toISOString()
          list = (await footballApi.fixtures({ q, from, to, limit: 30 })).fixtures || []
        }
        if (id !== this.req) return
        this.results = list.slice(0, 12)
        this.active = 0
      } catch {
        if (id === this.req) this.results = []
      } finally {
        if (id === this.req) this.loading = false
      }
    },
    move(d) {
      if (!this.results.length) return
      this.active = (this.active + d + this.results.length) % this.results.length
    },
    pickActive() {
      const f = this.results[this.active]
      if (f) this.pick(f)
    },
    pick(f) {
      this.$emit('pick', f)
    }
  }
}
</script>

<style scoped>
.fbfp {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  min-width: 0;
}
.fbfp__search {
  position: relative;
}
.fbfp__search i {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  font-size: 13px;
}
.fbfp__search input {
  padding-left: 32px;
  width: 100%;
}
.fbfp__list {
  list-style: none;
  margin: 0;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  max-height: 280px;
  overflow-y: auto;
}
.fbfp__list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1px;
  padding: 7px 9px;
  border-radius: 7px;
  cursor: pointer;
}
.fbfp__list li.is-active {
  background: var(--surface-hover);
}
.fbfp__list li.is-used {
  opacity: 0.6;
}
.fbfp__teams {
  font-size: 13.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.fbfp__none {
  margin: 0;
}
</style>
