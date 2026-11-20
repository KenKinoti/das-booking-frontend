<template>
  <FbSection id="lineups" title="Line-ups" :subtitle="published ? 'Published ' + fmtDateTime(lu.fetched_at, tz) : 'Not published yet'">
    <div v-if="!published" class="fb-muted" data-test="fb-lineups-pending">
      Line-ups are usually published about an hour before kick-off. Until then the “likely” column in Key players shows who is expected to start.
    </div>
    <div v-else class="fb-grid-2" data-test="fb-lineups">
      <div v-for="t in teams" :key="t.side" class="fblu">
        <div class="fblu__head">
          <i class="fb-key" :style="{ background: t.color }"></i><strong>{{ t.name }}</strong>
          <span class="fb-pill">{{ t.lu.formation || '—' }}</span>
          <span v-if="t.lu.coach" class="fb-muted fb-small">Coach {{ t.lu.coach }}</span>
        </div>
        <ol class="fblu__xi">
          <li v-for="p in t.lu.start_xi" :key="p.id">
            <span class="fblu__no fb-num">{{ p.number }}</span><span class="fblu__name">{{ p.name }}</span><span class="fb-muted fblu__pos">{{ p.pos }}</span>
          </li>
        </ol>
        <div v-if="t.lu.substitutes && t.lu.substitutes.length" class="fblu__subs fb-small">
          <span class="fb-muted">Substitutes:</span> {{ t.lu.substitutes.map((p) => `${p.number} ${p.name}`).join(' · ') }}
        </div>
      </div>
    </div>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import { fmtDateTime } from '../fb'

export default {
  name: 'LineupsSection',
  components: { FbSection },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  computed: {
    lu() {
      return this.a.lineups || {}
    },
    published() {
      return !!this.lu.published && !!this.lu.home
    },
    teams() {
      const f = this.a.fixture
      return [
        { side: 'home', name: f.home.name, color: 'var(--fb-home)', lu: this.lu.home || {} },
        { side: 'away', name: f.away.name, color: 'var(--fb-away)', lu: this.lu.away || {} }
      ]
    }
  },
  methods: { fmtDateTime }
}
</script>

<style scoped>
.fblu__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.fblu__xi {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 12px;
}
.fblu__xi li {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 13px;
  min-width: 0;
}
.fblu__no {
  width: 20px;
  text-align: right;
  color: var(--text-3);
  font-size: 12px;
  flex-shrink: 0;
}
.fblu__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fblu__pos {
  font-size: 11px;
  margin-left: auto;
}
.fblu__subs {
  margin-top: 8px;
  color: var(--text-2);
}
</style>
