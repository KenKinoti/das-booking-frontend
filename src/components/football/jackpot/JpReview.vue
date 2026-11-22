<template>
  <!-- v2.18 jackpot review after grading: what happened against what the chances said (frozen at close), in plain words —
       the most likely ticket, the bookmaker's favourites, draws, and how "pick or draw" would have done. -->
  <section id="review" class="fb-panel fbjrv" data-section="review" data-test="fb-jp-review" aria-labelledby="review-h" :data-correct="r.correct" :data-verdict="r.verdict || ''">
    <header class="fb-panel__head">
      <div>
        <h2 id="review-h">How this jackpot went</h2>
        <p>
          {{ complete ? 'All results in' : 'Some results still to come' }} · graded against the chances frozen
          <template v-if="r.frozen_at">{{ fmtDateTime(r.frozen_at, tz) }}</template
          ><template v-else>when the jackpot closed</template>
        </p>
      </div>
      <span v-if="range.text" class="fb-mk" :class="range.cls" data-test="fb-jp-review-range"><i :class="range.icon" aria-hidden="true"></i>{{ range.text }}</span>
    </header>
    <div class="fb-panel__body">
      <p class="fbjrv__head" data-test="fb-jp-review-headline">{{ headline }}</p>
      <ul v-if="lines.length" class="fbjrv__txt" data-test="fb-jp-review-text">
        <li v-for="(t, i) in lines" :key="i">{{ t }}</li>
      </ul>
      <div class="fbjrv__tiles">
        <div class="fbjrv__tile" data-tile="correct" :data-v="r.correct">
          <div class="fbjrv__k">Most likely ticket</div>
          <div class="fbjrv__v">
            {{ r.correct ?? '—' }} <span>of {{ of }}</span>
          </div>
          <div class="fb-muted fb-small">
            expected {{ fmt1(r.expected) }}<template v-if="r.low != null"> · normal {{ r.low }}–{{ r.high }}</template
            ><template v-if="r.p_at_most_correct != null"> · {{ r.correct }} or fewer happens {{ pct(r.p_at_most_correct, 0) }} of the time</template>
          </div>
        </div>
        <div v-if="r.favourites_correct != null" class="fbjrv__tile" data-tile="favourites" :data-v="r.favourites_correct">
          <div class="fbjrv__k">Bookmaker's favourites</div>
          <div class="fbjrv__v">
            {{ r.favourites_correct }} <span>of {{ r.favourites_of || of }}</span>
          </div>
          <div class="fb-muted fb-small">
            the jackpot odds' favourite in every game<template v-if="r.favourites_same_as_pick != null"> · same as our pick in {{ r.favourites_same_as_pick }}</template>
          </div>
        </div>
        <div v-if="r.draws_actual != null" class="fbjrv__tile" data-tile="draws" :data-v="r.draws_actual">
          <div class="fbjrv__k">Draws</div>
          <div class="fbjrv__v">
            {{ r.draws_actual }} <span>expected {{ fmt1(r.draws_expected) }}</span>
          </div>
          <div class="fb-muted fb-small">a single most-likely ticket rarely picks a draw</div>
        </div>
        <div v-if="r.safer_hits != null" class="fbjrv__tile" data-tile="safer" :data-v="r.safer_hits">
          <div class="fbjrv__k">Pick or draw</div>
          <div class="fbjrv__v">
            {{ r.safer_hits }} <span>of {{ r.safer_of || of }}</span>
          </div>
          <div class="fb-muted fb-small">
            covering the draw too on every game<template v-if="r.safer_expected != null"> · expected {{ fmt1(r.safer_expected) }}</template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { pct, fmtDateTime } from '../fb'

const n = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

export default {
  name: 'JpReview',
  props: {
    review: { type: Object, required: true },
    nGames: { type: Number, default: 0 },
    complete: { type: Boolean, default: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  computed: {
    r() {
      const x = this.review || {}
      const out = { ...x }
      for (const k of [
        'correct',
        'of',
        'expected',
        'low',
        'high',
        'p_at_most_correct',
        'favourites_correct',
        'favourites_of',
        'favourites_same_as_pick',
        'draws_actual',
        'draws_expected',
        'safer_hits',
        'safer_of',
        'safer_expected'
      ])
        out[k] = n(x[k])
      if (out.low == null) out.low = n(x.expected_low)
      if (out.high == null) out.high = n(x.expected_high)
      return out
    },
    of() {
      return this.r.of ?? this.nGames
    },
    range() {
      const r = this.r
      if (r.correct == null || r.low == null || r.high == null) return { text: '', cls: '', icon: '' }
      if (r.correct < r.low) return { text: 'Below the normal range', cls: 'fb-mk--wrong', icon: 'fa-solid fa-triangle-exclamation' }
      if (r.correct > r.high) return { text: 'Above the normal range', cls: 'fb-mk--correct', icon: 'fa-solid fa-arrow-up' }
      return { text: 'Inside the normal range', cls: 'fb-mk--none', icon: 'fa-solid fa-equals' }
    },
    headline() {
      if (this.r.headline) return this.r.headline
      const r = this.r
      return `${r.correct ?? '—'} of ${this.of} right; the ticket's own chances said about ${this.fmt1(r.expected)}${r.low != null ? ` (normal range ${r.low}–${r.high})` : ''}.`
    },
    lines() {
      const t = this.r.text
      if (Array.isArray(t)) return t
      if (typeof t === 'string' && t) return [t]
      const r = this.r
      const out = []
      if (r.draws_actual != null) out.push(`There were ${r.draws_actual} draws (about ${this.fmt1(r.draws_expected)} expected).`)
      if (r.safer_hits != null) out.push(`“Pick or draw” on every game would have hit ${r.safer_hits} of ${this.of}.`)
      return out
    }
  },
  methods: {
    pct,
    fmtDateTime,
    fmt1(v) {
      return v == null ? '—' : Number(v).toFixed(1).replace(/\.0$/, '')
    },
    reveal() {}
  }
}
</script>

<style scoped>
.fbjrv {
  scroll-margin-top: calc(var(--topbar-h, 64px) + 64px);
}
.fbjrv__head {
  margin: 0 0 8px;
  font-size: 16px;
  line-height: 1.45;
  font-weight: 650;
}
.fbjrv__txt {
  margin: 0 0 14px;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-2);
}
.fbjrv__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.fbjrv__tile {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface-2);
}
.fbjrv__k {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.fbjrv__v {
  font-size: 22px;
  font-weight: 700;
}
.fbjrv__v span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
}
</style>
