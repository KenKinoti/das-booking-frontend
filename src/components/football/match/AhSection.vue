<template>
  <FbSection id="asian-handicap" title="Asian handicap" subtitle="How a stake settles at each line: win, half win, refund (push), half loss or loss">
    <template #actions>
      <div class="fb-seg" role="radiogroup" aria-label="Side">
        <button type="button" role="radio" :aria-checked="side === 'home'" :class="{ 'is-on': side === 'home' }" @click="side = 'home'">{{ f.home.name }}</button>
        <button type="button" role="radio" :aria-checked="side === 'away'" :class="{ 'is-on': side === 'away' }" @click="side = 'away'">{{ f.away.name }}</button>
      </div>
    </template>
    <div v-if="!matrix.length" class="fb-muted">The goals model has no estimate for this match.</div>
    <template v-else>
      <ul class="fb-legend">
        <li><i class="fb-key" :style="{ background: winColor }"></i>{{ sideName }} covers</li>
        <li><i class="fb-key" :style="{ background: winColor, opacity: 0.5 }"></i>half win</li>
        <li><i class="fb-key" style="background: var(--fb-draw)"></i>refund</li>
        <li><i class="fb-key" :style="{ background: lossColor, opacity: 0.5 }"></i>half loss</li>
        <li><i class="fb-key" :style="{ background: lossColor }"></i>{{ otherName }} covers</li>
      </ul>
      <div class="fb-scroll">
        <table class="fb-table fbah" data-test="fb-ah-table">
          <thead>
            <tr>
              <th>{{ sideName }}</th>
              <th class="fbah__barh">Split</th>
              <th class="num">Win</th>
              <th class="num">½ win</th>
              <th class="num">Push</th>
              <th class="num">½ loss</th>
              <th class="num">Loss</th>
              <th class="num" title="Push-aware: (win + ½·half win) ÷ everything that isn't refunded">Model · odds</th>
              <th class="num">Fair odds</th>
              <th class="num">Best price</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.l" :class="{ 'is-hl': r.priced }" :data-line="r.l" :data-eff="r.eff == null ? '' : r.eff.toFixed(6)">
              <td class="fb-num">{{ line(r.l) }}</td>
              <td class="fbah__barc">
                <span class="fbah__bar" role="img" :aria-label="`${sideName} ${line(r.l)}: win ${pct(r.s.win)}, half win ${pct(r.s.half_win)}, push ${pct(r.s.push)}, half loss ${pct(r.s.half_loss)}, loss ${pct(r.s.loss)}`">
                  <i v-if="r.s.win > 0" :style="{ flexGrow: r.s.win, background: winColor }"></i>
                  <i v-if="r.s.half_win > 0" :style="{ flexGrow: r.s.half_win, background: winColor, opacity: 0.5 }"></i>
                  <i v-if="r.s.push > 0" :style="{ flexGrow: r.s.push, background: 'var(--fb-draw)' }"></i>
                  <i v-if="r.s.half_loss > 0" :style="{ flexGrow: r.s.half_loss, background: lossColor, opacity: 0.5 }"></i>
                  <i v-if="r.s.loss > 0" :style="{ flexGrow: r.s.loss, background: lossColor }"></i>
                </span>
              </td>
              <td class="num">{{ pct0(r.s.win) }}</td>
              <td class="num">{{ pct0(r.s.half_win) }}</td>
              <td class="num">{{ pct0(r.s.push) }}</td>
              <td class="num">{{ pct0(r.s.half_loss) }}</td>
              <td class="num">{{ pct0(r.s.loss) }}</td>
              <td class="num">{{ pct(r.eff) }} · {{ r.eff ? odds(1 / r.eff) : '—' }}</td>
              <td class="num">{{ r.fair ? odds(1 / r.fair) : '—' }}</td>
              <td class="num">{{ r.best ? odds(r.best.price) : '—' }} <span v-if="r.best" class="fb-muted fb-small">{{ r.best.title }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="fb-muted fb-small" style="margin: 8px 0 0">
        Computed from the model's score grid (0–6 goals, more folded into 6). Highlighted lines are priced by bookmakers. Quarter lines split the stake over the two neighbouring lines.
      </p>
    </template>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import { AH_LINES, ahSplit, effP, marketSel, pct, odds, line } from '../fb'

export default {
  name: 'AhSection',
  components: { FbSection },
  props: { a: { type: Object, required: true } },
  data() {
    return { side: 'home' }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    matrix() {
      return this.a.model?.score_matrix || []
    },
    sideName() {
      return this.side === 'home' ? this.f.home.name : this.f.away.name
    },
    otherName() {
      return this.side === 'home' ? this.f.away.name : this.f.home.name
    },
    winColor() {
      return this.side === 'home' ? 'var(--fb-home)' : 'var(--fb-away)'
    },
    lossColor() {
      return this.side === 'home' ? 'var(--fb-away)' : 'var(--fb-home)'
    },
    rows() {
      return AH_LINES.map((l) => {
        const s = ahSplit(this.matrix, l, this.side)
        const ms = marketSel(this.a.market, 'ah', this.side, l)
        return { l, s, eff: effP(s), fair: ms?.fair_p ?? null, best: ms?.best ?? null, priced: !!ms }
      })
    }
  },
  methods: {
    pct,
    odds,
    line,
    pct0(v) {
      return v > 0.00049 ? pct(v) : '—'
    }
  }
}
</script>

<style scoped>
.fbah__barc {
  min-width: 90px;
}
.fbah td,
.fbah th {
  padding-left: 6px;
  padding-right: 6px;
}
.fbah__bar {
  display: flex;
  gap: 2px;
  height: 10px;
  min-width: 80px;
}
.fbah__bar i {
  flex-basis: 0;
  min-width: 2px;
  border-radius: 3px;
  display: block;
}
</style>
