<template>
  <FbSection id="reference" title="Reference: API-Football's prediction" subtitle="Third-party — shown for comparison only, not part of DASYIN's model">
    <div v-if="!p" class="fb-muted">API-Football has no prediction for this match.</div>
    <template v-else>
      <FbStack :rows="[{ key: 'af', label: 'API-Football', sub: 'third-party estimate', h: p.home, d: p.draw, a: p.away }]" :names="[f.home.name, 'Draw', f.away.name]" />
      <dl class="fbref">
        <div v-if="p.winner"><dt>Their pick</dt><dd>{{ p.winner }}</dd></div>
        <div v-if="p.advice"><dt>Their advice</dt><dd>{{ p.advice }}</dd></div>
        <div v-if="p.under_over"><dt>Goals</dt><dd>{{ p.under_over }}</dd></div>
        <div><dt>Fetched</dt><dd>{{ fmtDateTime(p.fetched_at, tz) }}</dd></div>
      </dl>
      <p class="fb-muted fb-small" style="margin: 6px 0 0">{{ a.reference.note }} Its method isn't published, so its accuracy can't be checked here.</p>
    </template>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import FbStack from '../charts/FbStack.vue'
import { fmtDateTime } from '../fb'

export default {
  name: 'ReferenceSection',
  components: { FbSection, FbStack },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    p() {
      return this.a.reference?.apifootball_prediction || null
    }
  },
  methods: { fmtDateTime }
}
</script>

<style scoped>
.fbref {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin: 12px 0 0;
}
.fbref dt {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbref dd {
  margin: 0;
  font-size: 13px;
}
</style>
