<template>
  <header class="fb-panel fbmh" data-section="header">
    <div class="fbmh__top">
      <router-link to="/football" class="fbmh__back"><i class="fa-solid fa-arrow-left"></i> Match centre</router-link>
      <span class="fbmh__comp">
        <FbCrest :src="f.competition.logo" :name="f.competition.name" :size="18" />
        {{ f.competition.name }}<template v-if="f.competition.country && f.competition.country !== 'World'"> · {{ f.competition.country }}</template>
        <template v-if="f.competition.round"> · {{ roundText }}</template>
      </span>
    </div>
    <h1 class="sr-only">{{ f.home.name }} v {{ f.away.name }}</h1>
    <div class="fbmh__teams">
      <div class="fbmh__team fbmh__team--home">
        <FbCrest :src="f.home.logo" :name="f.home.name" :code="f.home.code" :size="44" />
        <div>
          <div class="fbmh__name">{{ f.home.name }}</div>
          <span class="fbmh__side"><i class="fb-key" style="background: var(--fb-home)"></i>Home<template v-if="homeRank"> · {{ ordinal(homeRank) }}</template></span>
        </div>
      </div>
      <div class="fbmh__mid">
        <template v-if="hasScore">
          <div class="fbmh__score fb-num" data-test="fb-score">{{ f.score.home ?? 0 }}<span>–</span>{{ f.score.away ?? 0 }}</div>
          <span v-if="live" class="fb-pill fb-pill--live" data-test="fb-minute"><span class="fb-livedot"></span>{{ statusText(f) }}</span>
          <span v-else class="fb-pill">{{ statusText(f) || f.status_long }}</span>
          <span v-if="f.score.ht_home != null" class="fb-muted fb-small">Half time {{ f.score.ht_home }}–{{ f.score.ht_away }}</span>
        </template>
        <template v-else>
          <div class="fbmh__ko fb-num">{{ fmtTime(f.kickoff, tz) }}</div>
          <span class="fb-muted fb-small">{{ fmtDay(f.kickoff, tz, { weekday: 'long', day: 'numeric', month: 'long' }) }}</span>
          <span v-if="['PST', 'CANC', 'ABD'].includes(f.status)" class="fb-pill fb-pill--warn">{{ f.status_long }}</span>
          <span v-else class="fb-pill">{{ countdown }}</span>
        </template>
      </div>
      <div class="fbmh__team fbmh__team--away">
        <div>
          <div class="fbmh__name">{{ f.away.name }}</div>
          <span class="fbmh__side">Away<template v-if="awayRank"> · {{ ordinal(awayRank) }}</template><i class="fb-key" style="background: var(--fb-away)"></i></span>
        </div>
        <FbCrest :src="f.away.logo" :name="f.away.name" :code="f.away.code" :size="44" />
      </div>
    </div>
    <dl class="fbmh__facts">
      <div>
        <dt>Kick-off</dt>
        <dd>{{ fmtDateTime(f.kickoff, tz) }}</dd>
      </div>
      <div v-if="f.venue">
        <dt>Venue</dt>
        <dd>{{ f.venue }}<template v-if="f.city"> · {{ f.city }}</template></dd>
      </div>
      <div v-if="f.referee">
        <dt>Referee</dt>
        <dd>{{ f.referee }}</dd>
      </div>
      <div>
        <dt>Data as of</dt>
        <dd data-test="fb-as-of">
          {{ fmtDateTime(asOf, tz) }}
          <span v-if="stale" class="fb-pill fb-pill--warn" :title="staleItems.join('\n')"><i class="fa-solid fa-triangle-exclamation"></i> Some data is stale</span>
        </dd>
      </div>
    </dl>
    <div class="fbmh__actions">
      <button type="button" class="ui-btn ui-btn--sm" data-test="fb-sources-btn" @click="$emit('sources')"><i class="fa-solid fa-link"></i> Sources ({{ sourcesCount }})</button>
      <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :aria-pressed="watched" @click="$emit('watch')">
        <i :class="watched ? 'fa-solid fa-star' : 'fa-regular fa-star'"></i> {{ watched ? 'Watching' : 'Watch' }}
      </button>
      <button v-if="canRefresh" type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="refreshing" @click="$emit('refresh')">
        <i :class="refreshing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Refresh from providers
      </button>
    </div>
  </header>
</template>

<script>
import FbCrest from '../FbCrest.vue'
import { fmtTime, fmtDay, fmtDateTime, statusText, isLive } from '../fb'

export default {
  name: 'MatchHeader',
  components: { FbCrest },
  props: {
    f: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' },
    now: { type: String, default: '' },
    asOf: { type: String, default: '' },
    stale: { type: Boolean, default: false },
    staleItems: { type: Array, default: () => [] },
    sourcesCount: { type: Number, default: 0 },
    homeRank: { type: Number, default: null },
    awayRank: { type: Number, default: null },
    watched: { type: Boolean, default: false },
    canRefresh: { type: Boolean, default: false },
    refreshing: { type: Boolean, default: false }
  },
  emits: ['sources', 'watch', 'refresh'],
  computed: {
    live() {
      return isLive(this.f.status)
    },
    hasScore() {
      return this.f.score && this.f.score.home != null && (this.live || this.f.is_finished || ['FT', 'AET', 'PEN'].includes(this.f.status))
    },
    roundText() {
      return String(this.f.competition.round || '').replace('Regular Season - ', 'Matchday ')
    },
    countdown() {
      const ms = new Date(this.f.kickoff) - new Date(this.now || Date.now())
      if (!(ms > 0)) return 'Kick-off due'
      const h = Math.floor(ms / 3600000)
      const m = Math.round((ms % 3600000) / 60000)
      if (h >= 48) return `in ${Math.round(h / 24)} days`
      return h ? `in ${h} h ${m} min` : `in ${m} min`
    }
  },
  methods: {
    fmtTime,
    fmtDay,
    fmtDateTime,
    statusText,
    ordinal(n) {
      const s = ['th', 'st', 'nd', 'rd']
      const v = n % 100
      return n + (s[(v - 20) % 10] || s[v] || s[0])
    }
  }
}
</script>

<style scoped>
.fbmh {
  padding: 14px 20px 16px;
}
.fbmh__top {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  color: var(--text-3);
}
.fbmh__back {
  color: var(--text-2);
  text-decoration: none;
  font-weight: 550;
}
.fbmh__back:hover {
  color: var(--text);
}
.fbmh__comp {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.fbmh__teams {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  margin: 16px 0 12px;
}
.fbmh__team {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.fbmh__team--away {
  justify-content: flex-end;
  text-align: right;
}
.fbmh__name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.fbmh__side {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-3);
}
.fbmh__mid {
  display: grid;
  justify-items: center;
  gap: 4px;
  text-align: center;
}
.fbmh__score {
  font-size: 34px;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1;
}
.fbmh__score span {
  margin: 0 8px;
  color: var(--text-3);
  font-weight: 500;
}
.fbmh__ko {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
.fbmh__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.fbmh__facts dt {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbmh__facts dd {
  margin: 0;
  font-size: 13px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.fbmh__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
@media (max-width: 640px) {
  .fbmh {
    padding: 12px 14px 14px;
  }
  .fbmh__teams {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .fbmh__team--away {
    justify-content: flex-start;
    text-align: left;
    flex-direction: row-reverse;
  }
  .fbmh__team--away .fbmh__side {
    flex-direction: row-reverse;
  }
  .fbmh__mid {
    order: -1;
    justify-items: start;
    text-align: left;
    grid-auto-flow: column;
    justify-content: start;
    align-items: center;
    gap: 10px;
  }
  .fbmh__name {
    font-size: 18px;
  }
  .fbmh__score {
    font-size: 28px;
  }
  .fbmh__ko {
    font-size: 22px;
  }
}
</style>
