<template>
  <!-- v2.18 after full time: was the pick right? ✓ / ✗ per line (pick, safer pick, goals, both teams to score, likeliest
       score) and the plain-English summary. Icon + word on every mark; colour is only a third cue. -->
  <section id="result" class="fb-panel fbrp" data-section="result" aria-labelledby="result-h" data-test="fb-result-panel" :data-result="r.kind">
    <header class="fb-panel__head">
      <div>
        <h2 id="result-h">Result</h2>
        <p>{{ scoreText }}</p>
      </div>
      <FbResultBadge :check="r" test-id="fb-result-panel-badge" />
    </header>
    <div class="fb-panel__body">
      <!-- v2.19.1: the locked pick → ✓ / ✗, the score and when it was locked, first thing after full time -->
      <FbLockedResult
        class="fbrp__locked"
        :row="a"
        :fixture-id="f.id"
        :finished="true"
        size="lg"
        :details="false"
        root-test-id="fb-locked-result"
        chip-test-id="fb-locked-pick"
        badge-test-id="fb-locked-badge"
      />
      <p class="fbrp__sum" data-test="fb-result-summary">{{ r.summary || defaultSummary }}</p>
      <ul v-if="lines.length" class="fbrp__lines">
        <li v-for="l in lines" :key="l.key" :data-line="l.key" :data-correct="l.kind || ''">
          <span class="fbrp__what">
            <span class="fbrp__k">{{ l.title }}</span>
            <span class="fbrp__v">{{ l.text }}</span>
          </span>
          <span v-if="l.kind" class="fb-mk" :class="'fb-mk--' + l.kind"
            ><i :class="l.kind === 'correct' ? 'fa-solid fa-check' : 'fa-solid fa-xmark'" aria-hidden="true"></i>{{ l.kind === 'correct' ? 'Correct' : 'Wrong' }}</span
          >
          <span v-else class="fb-mk fb-mk--none">not graded</span>
        </li>
      </ul>
      <p class="fb-muted fb-small fbrp__foot">
        Graded against the full-time (90 minutes) result{{ sourceText }}. The pick graded is the one locked before kick-off (refreshed until then, never changed
        afterwards); a single result says little on its own — see the
        <router-link to="/football/scorecard">scorecard</router-link> for the record over many matches.
      </p>
    </div>
  </section>
</template>

<script>
import '../verdict/verdict.css'
import FbResultBadge from '../verdict/FbResultBadge.vue'
import FbLockedResult from '../results/FbLockedResult.vue'
import { pct, providerName } from '../fb'
import { normResult, normVerdict, markKind } from '../verdict/verdict'

const OUTCOME = { 1: 'home win', X: 'draw', 2: 'away win', H: 'home win', D: 'draw', A: 'away win' }

export default {
  name: 'ResultPanel',
  components: { FbResultBadge, FbLockedResult },
  props: {
    a: { type: Object, required: true }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    r() {
      return normResult(this.a.result_check) || { kind: 'pending', label: 'Not graded yet', summary: '' }
    },
    v() {
      return normVerdict(this.a.verdict)
    },
    finalScore() {
      const rc = this.a.result_check || {}
      if (typeof rc.score === 'string') return rc.score
      if (rc.final_score) return rc.final_score
      return this.f.score && this.f.score.home != null ? `${this.f.score.home}-${this.f.score.away}` : ''
    },
    scoreText() {
      const o = OUTCOME[String(this.a.result_check?.outcome || '').toUpperCase()]
      return `${this.f.home.name} ${this.finalScore.replace('-', '–')} ${this.f.away.name}${o ? ' · ' + o : ''}`
    },
    sourceText() {
      const src = this.r.result_source
      if (!src) return ''
      return src === 'manual' ? ' set by hand' : ' from ' + providerName(src)
    },
    defaultSummary() {
      return this.r.kind === 'nopick'
        ? 'No pick — not locked before kick-off.'
        : this.r.kind === 'void'
          ? 'Void — the match did not finish normally, so nothing is graded.'
          : 'Not graded yet.'
    },
    lines() {
      const rc = this.a.result_check || {}
      const v = this.v
      if (this.r.kind === 'nopick' || this.r.kind === 'void') return []
      const out = []
      const exact = rc.exact_score || rc.exact || (rc.score && typeof rc.score === 'object' ? rc.score : null)
      const pp = (x, fb) => (x && x.p != null ? ` (${pct(x.p, 0)})` : fb && fb.p != null ? ` (${pct(fb.p, 0)})` : '')
      if (rc.pick) out.push({ key: 'pick', title: 'The pick', text: (rc.pick.label || v?.pick_label || this.selText(rc.pick.selection)) + pp(rc.pick, v), kind: markKind(rc.pick) })
      if (rc.safer)
        out.push({
          key: 'safer',
          title: 'Safer pick',
          text: (rc.safer.label || v?.safer?.label || this.selText(rc.safer.selection)) + pp(rc.safer, v?.safer),
          kind: markKind(rc.safer)
        })
      if (rc.goals)
        out.push({
          key: 'goals',
          title: 'Goals lean',
          text: `${rc.goals.pick === 'over' ? 'Over' : 'Under'} ${rc.goals.line ?? 2.5} goals` + pp(rc.goals, v?.goals),
          kind: markKind(rc.goals)
        })
      if (rc.btts) out.push({ key: 'btts', title: 'Both teams to score', text: (rc.btts.pick === 'yes' ? 'Yes' : 'No') + pp(rc.btts, v?.btts), kind: markKind(rc.btts) })
      if (exact)
        out.push({
          key: 'score',
          title: 'Likeliest score',
          text: `${exact.top_score || exact.pick || '—'}${pp(exact)} — exact scores land about 1 time in 9`,
          kind: markKind(exact)
        })
      return out
    }
  },
  methods: {
    providerName,
    selText(s) {
      const h = this.f.home.name
      const a = this.f.away.name
      return { 1: `${h} win`, X: 'Draw', 2: `${a} win`, '1X': `${h} or draw`, X2: `Draw or ${a}`, 12: `${h} or ${a}` }[String(s || '').toUpperCase()] || s || '—'
    },
    reveal() {}
  }
}
</script>

<style scoped>
.fbrp {
  scroll-margin-top: calc(var(--topbar-h, 64px) + 64px);
}
.fbrp__locked {
  margin: 0 0 12px;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--border);
}
.fbrp__sum {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
}
.fbrp__lines {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0 20px;
}
.fbrp__lines li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  min-width: 0;
}
.fbrp__what {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.fbrp__k {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbrp__v {
  font-size: 13.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.fbrp__foot {
  margin: 10px 0 0;
}
</style>
