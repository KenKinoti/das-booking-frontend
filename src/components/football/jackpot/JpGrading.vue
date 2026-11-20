<template>
  <FbSection id="results" title="Results & your tickets" :subtitle="subtitle" open-on-phone>
    <div v-if="grading" class="fbjr__sum" data-test="fb-jp-grading">
      <div class="fbjr__tile">
        <div class="fbjr__k">Most likely ticket</div>
        <div class="fbjr__v" data-test="fb-jp-graded-ml">{{ grading.correct_most_likely ?? '—' }} <span class="fb-muted">of {{ n }} right</span></div>
        <div v-if="grading.expected_correct != null" class="fb-muted fb-small">expected {{ Number(grading.expected_correct).toFixed(1) }} before kick-off</div>
      </div>
      <div v-if="grading.best_top_n" class="fbjr__tile">
        <div class="fbjr__k">Best of the top tickets</div>
        <div class="fbjr__v">{{ grading.best_top_n.correct }} <span class="fb-muted">right (#{{ grading.best_top_n.rank }})</span></div>
      </div>
      <div class="fbjr__tile">
        <div class="fbjr__k">Status</div>
        <div class="fbjr__v fbjr__v--s">{{ grading.complete ? 'All results in' : 'Some results still to come' }}</div>
        <div class="fb-muted fb-small">graded {{ fmtDT(grading.graded_at) }}</div>
      </div>
    </div>

    <!-- Results per game -->
    <div class="fb-fig__title" style="margin-top: 4px">Results</div>
    <div class="fb-fig__sub">Full-time (90 minutes) results of the matched fixtures. For a game that isn't matched, set the result yourself.</div>
    <ol class="fbjr__res" data-test="fb-jp-results">
      <li v-for="(g, i) in games" :key="g.n" :data-n="g.n" :data-result="resultOf(i) || ''">
        <span class="fb-muted fbjr__n">{{ g.n }}</span>
        <span class="fbjr__teams">{{ g.home }} v {{ g.away }}</span>
        <span class="fbjr__r">
          <template v-if="g.void"><span class="fb-pill">void</span></template>
          <template v-else-if="resultOf(i)"
            ><b class="fbjr__sym">{{ resultOf(i) }}</b><span v-if="g.score" class="fb-muted fb-small"> {{ g.score }}</span
            ><span v-if="g.result_source === 'manual'" class="fb-muted fb-small"> · set by you</span></template
          >
          <span v-else class="fb-muted fb-small">not yet</span>
        </span>
        <span v-if="!g.fixture_id || g.result_source === 'manual'" class="fbjr__set">
          <select class="ui-select" :aria-label="'Result of game ' + g.n" :value="g.void ? 'void' : g.result || ''" :data-test="'fb-jp-result-' + g.n" @change="setResult(g, $event.target.value)">
            <option value="">—</option>
            <option value="1">1</option>
            <option value="X">X</option>
            <option value="2">2</option>
            <option value="void">Void</option>
          </select>
        </span>
      </li>
    </ol>
    <div class="fbjr__btns">
      <button type="button" class="ui-btn ui-btn--sm" :disabled="busy" data-test="fb-jp-grade" @click="grade"><i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-flag-checkered'"></i> Grade now</button>
      <span class="fb-muted fb-small">Grading also runs on its own as results come in.</span>
    </div>

    <!-- Saved tickets -->
    <div class="fb-fig__title" style="margin-top: 20px">Saved tickets ({{ tickets.length }})</div>
    <div v-if="!tickets.length" class="fb-muted fb-small" style="margin-top: 4px">None yet. Save the most likely ticket, a top ticket, a cover plan or a variant above to have it graded here.</div>
    <div v-else class="fb-scroll" style="margin-top: 6px">
      <table class="fb-table fb-table--nowrap" data-test="fb-jp-tickets">
        <thead>
          <tr>
            <th>Name</th>
            <th>Picks</th>
            <th class="num">Combinations</th>
            <th class="num">Cost</th>
            <th class="num">Chance</th>
            <th class="num">Right</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tickets" :key="t.id" :data-ticket="t.id" :data-correct="t.correct ?? ''">
            <td>{{ t.name }} <span class="fb-muted fb-small">· {{ sourceLabel(t.source) }}</span></td>
            <td>
              <span class="fb-ticket"
                ><b v-for="(p, i) in t.picks" :key="i" :class="cls(p, i)" :title="`Game ${i + 1}: ${p}${resultOf(i) ? ' · result ' + resultOf(i) : ''}`">{{ p }}</b></span
              >
            </td>
            <td class="num">{{ t.combos?.toLocaleString() }}</td>
            <td class="num">{{ money(t.cost, currency) }}</td>
            <td class="num">1 in {{ t.oneIn ? t.oneIn.toLocaleString() : '—' }}</td>
            <td class="num">
              <template v-if="t.correct != null"
                ><strong>{{ t.correct }}/{{ t.of }}</strong><span v-if="t.won_jackpot" class="fb-pill fb-pill--good" style="margin-left: 4px">jackpot</span
                ><span v-else-if="t.bonus" class="fb-pill fb-pill--good" style="margin-left: 4px">bonus {{ money(t.bonus.amount, currency) }}</span></template
              >
              <span v-else class="fb-muted">—</span>
            </td>
            <td class="num">
              <button type="button" class="fb-linkbtn" :aria-label="'Copy ' + t.name" @click="copy(t.picks)"><i class="fa-regular fa-copy"></i></button>
              <button type="button" class="fb-linkbtn" :aria-label="'Delete ' + t.name" @click="remove(t)"><i class="fa-regular fa-trash-can"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </FbSection>
</template>

<script>
import FbSection from '../match/FbSection.vue'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { money, fmtDateTime } from '../fb'
import { copyText, ticketText, sym } from './jp'

const SOURCES = { custom: 'your own', most_likely: 'most likely', top: 'top ticket', cover: 'cover plan', contrarian: 'contrarian' }

export default {
  name: 'JpGrading',
  components: { FbSection },
  props: {
    jackpotId: { type: String, required: true },
    games: { type: Array, default: () => [] },
    tickets: { type: Array, default: () => [] },
    grading: { type: Object, default: null },
    currency: { type: String, default: 'KES' },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  emits: ['changed'],
  data() {
    return { busy: false }
  },
  computed: {
    n() {
      return this.games.length
    },
    subtitle() {
      const done = this.games.filter((g, i) => g.void || this.resultOf(i)).length
      return `${done} of ${this.n} results in · saved tickets are graded automatically`
    }
  },
  methods: {
    money,
    fmtDT(iso) {
      return fmtDateTime(iso, this.tz)
    },
    sourceLabel(s) {
      return SOURCES[s] || s || ''
    },
    resultOf(i) {
      const r = this.grading?.results?.[i] ?? this.games[i]?.result
      return r ? sym(r) : null
    },
    cls(p, i) {
      const r = this.resultOf(i)
      const out = []
      if (p.length > 1) out.push('is-multi')
      if (this.games[i]?.void) return out
      if (r) out.push(p.includes(r) ? 'is-hit' : 'is-miss')
      return out
    },
    async copy(picks) {
      if (await copyText(ticketText(picks))) toast.success(`Copied: ${ticketText(picks)}`)
    },
    async setResult(g, v) {
      try {
        const body = v === 'void' ? { result: null, void: true } : { result: v || null, void: false }
        this.$emit('changed', await footballApi.setJackpotResult(this.jackpotId, g.n, body))
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not set the result'))
      }
    },
    async grade() {
      this.busy = true
      try {
        this.$emit('changed', await footballApi.gradeJackpot(this.jackpotId))
        toast.success('Graded with the results so far')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not grade'))
      } finally {
        this.busy = false
      }
    },
    async remove(t) {
      if (!(await confirmDialog({ title: 'Delete this ticket?', message: `${t.name} — ${ticketText(t.picks)}`, confirmText: 'Delete', danger: true }))) return
      try {
        this.$emit('changed', await footballApi.deleteJackpotTicket(this.jackpotId, t.id))
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the ticket'))
      }
    }
  }
}
</script>

<style scoped>
.fbjr__sum {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.fbjr__tile {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface-2);
}
.fbjr__k {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.fbjr__v {
  font-size: 22px;
  font-weight: 700;
}
.fbjr__v--s {
  font-size: 15px;
}
.fbjr__v .fb-muted {
  font-size: 13px;
  font-weight: 500;
}
.fbjr__res {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0 16px;
}
.fbjr__res li {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.fbjr__n {
  font-variant-numeric: tabular-nums;
}
.fbjr__teams {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fbjr__sym {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--neutral-soft);
  font-weight: 750;
}
.fbjr__set .ui-select {
  width: 76px;
  height: 30px;
  min-height: 30px;
  padding: 2px 8px;
  font-size: 12.5px;
}
.fbjr__btns {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 10px;
}
@media (max-width: 640px) {
  .fbjr__sum {
    grid-template-columns: minmax(0, 1fr);
  }
  .fbjr__res {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
