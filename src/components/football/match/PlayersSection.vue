<template>
  <FbSection id="players" title="Key players" subtitle="Season numbers, the last five games, availability and what a missing player does to the model">
    <div class="fb-grid-2">
      <div v-for="t in teams" :key="t.side" class="fbpl" :data-team="t.side">
        <div class="fbpl__head"><i class="fb-key" :style="{ background: t.color }"></i><strong>{{ t.name }}</strong></div>
        <div class="fb-scroll">
          <table class="fb-table fbpl__t">
            <thead>
              <tr>
                <th>Player</th>
                <th class="num" title="Starts / appearances">Apps</th>
                <th class="num">Min</th>
                <th class="num">G</th>
                <th class="num">A</th>
                <th class="num" title="Average match rating (API-Football)">Rating</th>
                <th class="num" title="Goals + assists, average rating — last 5 matches">Last 5</th>
                <th title="Expected in the starting line-up">XI</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in t.p.key || []" :key="p.id" :data-player="p.id" :data-availability="p.availability">
                <td class="fbpl__name">
                  <span>{{ p.name }}</span>
                  <span class="fb-muted fbpl__pos">{{ pos(p.position) }}<template v-if="p.age"> · {{ p.age }}</template></span>
                  <span v-if="p.availability && p.availability !== 'available'" class="fb-pill" :class="badge(p.availability).cls" :title="p.reason || ''">
                    <i :class="badge(p.availability).icon"></i>{{ badge(p.availability).text }}<template v-if="p.reason"> · {{ p.reason }}</template>
                  </span>
                </td>
                <td class="num">{{ p.season.lineups }}/{{ p.season.appearances }}</td>
                <td class="num">{{ p.season.minutes }}</td>
                <td class="num">{{ p.season.goals }}</td>
                <td class="num">{{ p.season.assists }}</td>
                <td class="num">{{ p.season.rating != null ? fixed(p.season.rating, 1) : '—' }}</td>
                <td class="num">
                  <template v-if="p.recent && p.recent.matches">{{ p.recent.goals + p.recent.assists }} · {{ p.recent.rating != null ? fixed(p.recent.rating, 1) : '—' }}</template><template v-else>—</template>
                </td>
                <td>
                  <span v-if="p.in_lineup === true" class="fb-pill fb-pill--good" title="In the published line-up"><i class="fa-solid fa-check"></i> Starts</span>
                  <span v-else-if="p.in_lineup === false && lineupsPublished" class="fb-pill" title="Not in the published starting XI">Bench/out</span>
                  <span v-else-if="p.expected_in_lineup" class="fb-muted fb-small" title="Expected to start">likely</span>
                  <span v-else class="fb-muted fb-small">no</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="fbpl__impact" :data-attack="t.p.impact ? t.p.impact.attack_mult : ''">
          <i class="fa-solid fa-user-slash" aria-hidden="true"></i>
          <div>
            <strong>{{ impactHeadline(t) }}</strong>
            <div class="fb-muted fb-small">{{ t.p.impact ? t.p.impact.why : '' }}</div>
          </div>
        </div>
      </div>
    </div>
    <p class="fb-muted fb-small" style="margin: 10px 0 0">
      Missing-player effects are a deliberately cautious rule of thumb (a replacement is assumed to recover 60% of a player's attacking output), not fitted from data. Player data fetched
      {{ fmtDateTime(a.players.home.fetched_at, tz) }}.
    </p>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import { fixed, fmtDateTime } from '../fb'

const BADGES = {
  injured: { text: 'Injured', cls: 'fb-pill--bad', icon: 'fa-solid fa-kit-medical' },
  suspended: { text: 'Suspended', cls: 'fb-pill--bad', icon: 'fa-solid fa-square' },
  doubtful: { text: 'Doubtful', cls: 'fb-pill--warn', icon: 'fa-solid fa-circle-question' }
}

export default {
  name: 'PlayersSection',
  components: { FbSection },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  computed: {
    lineupsPublished() {
      return !!this.a.lineups?.published
    },
    teams() {
      const f = this.a.fixture
      return [
        { side: 'home', name: f.home.name, color: 'var(--fb-home)', p: this.a.players?.home || {} },
        { side: 'away', name: f.away.name, color: 'var(--fb-away)', p: this.a.players?.away || {} }
      ]
    }
  },
  methods: {
    fixed,
    fmtDateTime,
    pos(p) {
      return { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Attacker: 'FWD' }[p] || p || ''
    },
    badge(a) {
      return BADGES[a] || { text: a, cls: '', icon: 'fa-solid fa-circle-info' }
    },
    impactHeadline(t) {
      const i = t.p.impact
      const miss = (t.p.missing || []).map((m) => m.name)
      if (!i || (!miss.length && i.attack_mult === 1 && i.defence_mult === 1)) return `${t.name}: no key absences listed`
      const parts = []
      if (i.attack_mult !== 1) parts.push(`expected goals ${i.attack_mult < 1 ? 'down' : 'up'} ${Math.abs(Math.round((1 - i.attack_mult) * 100))}%`)
      if (i.defence_mult !== 1) parts.push(`goals conceded ${i.defence_mult > 1 ? 'up' : 'down'} ${Math.abs(Math.round((i.defence_mult - 1) * 100))}%`)
      return `${t.name} without ${miss.join(', ') || 'listed players'}: ${parts.join(', ') || 'no change to the model'}`
    }
  }
}
</script>

<style scoped>
.fbpl {
  min-width: 0;
}
.fbpl__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  margin-bottom: 6px;
}
.fbpl__name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 6px;
  min-width: 150px;
}
.fbpl__pos {
  font-size: 11.5px;
}
.fbpl__t .fb-pill {
  height: 20px;
  font-size: 11px;
}
.fbpl__impact {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 13px;
}
.fbpl__impact i {
  color: var(--text-3);
  margin-top: 3px;
}
</style>
