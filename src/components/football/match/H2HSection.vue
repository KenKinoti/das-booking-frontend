<template>
  <FbSection id="h2h" title="Head to head" :subtitle="subtitle">
    <div v-if="!s.n" class="fb-muted">These teams haven't met in the data we have.</div>
    <template v-else>
      <FbFigure
        title="Results between them"
        :subtitle="`Last ${s.n} meeting${s.n === 1 ? '' : 's'}, home or away`"
        :legend="[
          { name: f.home.name + ' won', color: 'var(--fb-home)' },
          { name: 'Draw', color: 'var(--fb-draw)' },
          { name: f.away.name + ' won', color: 'var(--fb-away)' }
        ]"
        :table="{ cols: [{ label: 'Outcome' }, { label: 'Meetings', num: true }], rows: [[f.home.name + ' won', s.home_team_wins], ['Draw', s.draws], [f.away.name + ' won', s.away_team_wins]] }"
        chart-id="h2h-summary"
      >
        <div class="fbhh__bar" role="img" :aria-label="`${f.home.name} won ${s.home_team_wins}, ${s.draws} draws, ${f.away.name} won ${s.away_team_wins}`">
          <span v-if="s.home_team_wins" :style="{ flexGrow: s.home_team_wins, background: 'var(--fb-home)' }" :title="`${f.home.name} won ${s.home_team_wins}`">{{ s.home_team_wins }}</span>
          <span v-if="s.draws" :style="{ flexGrow: s.draws, background: 'var(--fb-draw)' }" :title="`${s.draws} draws`">{{ s.draws }}</span>
          <span v-if="s.away_team_wins" :style="{ flexGrow: s.away_team_wins, background: 'var(--fb-away)' }" :title="`${f.away.name} won ${s.away_team_wins}`">{{ s.away_team_wins }}</span>
        </div>
        <dl class="fbhh__stats">
          <div><dt>Goals</dt><dd class="fb-num">{{ s.home_team_goals }}–{{ s.away_team_goals }}</dd></div>
          <div><dt>Average goals</dt><dd class="fb-num">{{ fixed(s.avg_goals, 1) }}</dd></div>
          <div><dt>Both scored</dt><dd class="fb-num">{{ pct(s.btts_rate, 0) }}</dd></div>
          <div><dt>Over 2.5</dt><dd class="fb-num">{{ pct(s.over_2_5_rate, 0) }}</dd></div>
        </dl>
      </FbFigure>
      <div class="fb-scroll" style="margin-top: 12px">
        <table class="fb-table" data-test="fb-h2h-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Competition</th>
              <th>Home</th>
              <th class="num">Score</th>
              <th>Away</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in a.h2h.matches" :key="m.fixture_id">
              <td>{{ fmtDay(m.date, tz, { day: 'numeric', month: 'short', year: 'numeric' }) }}</td>
              <td class="fb-muted">{{ m.competition }}</td>
              <td :class="{ 'fbhh__win': m.hg > m.ag }">{{ m.home.name }}</td>
              <td class="num"><strong>{{ m.hg }}–{{ m.ag }}</strong></td>
              <td :class="{ 'fbhh__win': m.ag > m.hg }">{{ m.away.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="fb-muted fb-small" style="margin: 8px 0 0">Head-to-head records are small samples; the model doesn't use them directly. Fetched {{ fmtDateTime(a.h2h.fetched_at, tz) }}.</p>
    </template>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import { pct, fixed, fmtDay, fmtDateTime } from '../fb'

export default {
  name: 'H2HSection',
  components: { FbSection, FbFigure },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    s() {
      return this.a.h2h?.summary || { n: 0 }
    },
    subtitle() {
      return this.s.n ? `${this.f.home.name} ${this.s.home_team_wins} · draws ${this.s.draws} · ${this.f.away.name} ${this.s.away_team_wins}` : ''
    }
  },
  methods: { pct, fixed, fmtDay, fmtDateTime }
}
</script>

<style scoped>
.fbhh__bar {
  display: flex;
  gap: 2px;
  height: 28px;
  max-width: 560px;
}
.fbhh__bar span {
  flex-basis: 0;
  min-width: 26px;
  border-radius: 4px;
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  padding: 0 9px;
}
.fbhh__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin: 12px 0 0;
}
.fbhh__stats dt {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbhh__stats dd {
  margin: 0;
  font-weight: 650;
  font-size: 15px;
}
.fbhh__win {
  font-weight: 650;
}
</style>
