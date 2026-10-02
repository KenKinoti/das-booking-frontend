<template>
  <section v-if="d && d.feeds" class="ui-card ilc" data-testid="industry-latest">
    <div class="ui-card__head">
      <div>
        <h2>Latest in your industry</h2>
        <span class="sub">{{ sub }}</span>
      </div>
      <router-link to="/insights?tab=watch" class="ui-btn ui-btn--ghost ui-btn--sm" data-testid="industry-latest-link">Industry watch <i class="fa-solid fa-arrow-right"></i></router-link>
    </div>
    <div v-if="!d.items.length" class="ui-empty small"><p>No headlines stored yet — they are fetched once a day.</p></div>
    <ul v-else class="ilc__list">
      <li v-for="it in d.items" :key="it.id" :data-item="it.id">
        <span class="ilc__score" :title="'Relevance ' + it.score + ' of 100'">{{ Math.round(it.score) }}</span>
        <div class="ilc__main">
          <a v-if="safe(it.link)" :href="it.link" target="_blank" rel="noopener noreferrer">{{ it.title }}</a>
          <span v-else>{{ it.title }}</span>
          <small>{{ it.source }} · {{ ago(it.published_at || it.first_seen_at) }}<template v-if="it.reasons.length"> · {{ it.reasons.slice(0, 2).map((r) => r.label).join(', ') }}</template></small>
        </div>
      </li>
    </ul>
  </section>
</template>

<script>
import { watchApi, ago } from '@/services/insights'

// Dashboard card: the three most relevant stored headlines. Hidden until the
// organisation follows at least one source; never blocks the dashboard.
export default {
  name: 'IndustryLatestCard',
  data() {
    return { d: null }
  },
  computed: {
    sub() {
      if (!this.d) return ''
      const u = this.d.unread
      const span = this.d.days ? `most relevant of the last ${this.d.days} days` : 'most recent'
      return `${span}${u ? ` · ${u} unread` : ''}`
    }
  },
  async created() {
    try {
      this.d = await watchApi.latest(3)
    } catch {
      this.d = null
    }
  },
  methods: {
    ago,
    safe(link) {
      return /^https?:\/\//i.test(link || '')
    }
  }
}
</script>

<style scoped>
.ilc {
  margin-bottom: 16px;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.ilc__list {
  list-style: none;
  margin: 0;
  padding: 0 16px 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 20px;
}

.ilc__list li {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 6px 0;
}

.ilc__score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  color: var(--text-2);
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.ilc__main {
  min-width: 0;
  font-size: 13.5px;
  line-height: 1.4;
}

.ilc__main a {
  color: var(--text);
  font-weight: 600;
  text-decoration: none;
}

.ilc__main a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.ilc__main small {
  display: block;
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--text-3);
}

@media (max-width: 900px) {
  .ilc__list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
