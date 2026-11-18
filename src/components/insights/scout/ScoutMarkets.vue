<template>
  <div data-testid="scout-markets">
    <p class="lead">
      What the scans noticed about your markets — regulation, funding, demand — grouped by country,
      with the sector and the sources. Signals from the last {{ days }} days.
    </p>
    <div v-if="error" class="ui-alert ui-alert--danger mb">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span>
    </div>
    <div v-if="!groups" class="ui-skeleton" style="height: 220px"></div>
    <div v-else-if="!groups.length" class="ui-card">
      <div class="ui-empty small">
        <div class="ui-empty__icon"><i class="fa-solid fa-earth-africa"></i></div>
        <h3>No market signals yet</h3>
        <p>
          Each scan notes the most important changes in your markets. The weekly deep scan finds the
          most.
        </p>
      </div>
    </div>
    <div v-else class="groups">
      <section
        v-for="g in groups"
        :key="g.country || '-'"
        class="ui-card grp"
        :data-market="g.country || 'global'"
      >
        <header class="grp__head">
          <h3>
            <span v-if="g.country" class="flag">{{ flag(g.country) }}</span> {{ g.name }}
          </h3>
          <div class="sectors">
            <span v-for="s in g.sectors" :key="s" class="sector">{{ s }}</span>
          </div>
        </header>
        <ul class="sigs">
          <li v-for="s in g.signals" :key="s.id" class="sig" data-testid="scout-signal">
            <div class="sig__main">
              <p class="what">{{ s.signal }}</p>
              <p v-if="s.so_what" class="so"><strong>So what:</strong> {{ s.so_what }}</p>
              <div class="meta">
                <span v-if="s.sector" class="sector">{{ s.sector }}</span>
                <span>{{ seen(s) }}</span>
                <a
                  v-for="(src, i) in s.sources"
                  :key="i"
                  :href="link(src.url)"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  referrerpolicy="no-referrer"
                  class="src"
                >
                  {{ src.domain || src.title }}
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
              </div>
            </div>
            <button
              v-if="canEdit"
              type="button"
              class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm"
              aria-label="Hide this signal"
              title="Hide"
              @click="hide(s)"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script>
import { scoutApi, safeLink } from '@/services/scout'
import { countryFlag } from '@/utils/currencies'
import { ago } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

export default {
  name: 'ScoutMarkets',
  props: { canEdit: { type: Boolean, default: false }, version: { type: Number, default: 0 } },
  data() {
    return { groups: null, error: '', days: 90 }
  },
  watch: {
    version() {
      this.load()
    },
  },
  created() {
    this.load()
  },
  methods: {
    flag: countryFlag,
    link(u) {
      return safeLink(u) || undefined
    },
    seen(s) {
      return s.seen_count > 1
        ? `seen ${s.seen_count}× · last ${ago(s.last_seen_at)}`
        : `found ${ago(s.first_seen_at)}`
    },
    async load() {
      try {
        const r = await scoutApi.markets(this.days)
        this.groups = r.markets
        this.error = ''
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the market signals.')
        this.groups = this.groups || []
      }
    },
    async hide(s) {
      try {
        await scoutApi.hideSignal(s.id)
        toast.info('Signal hidden')
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not hide it'))
      }
    },
  },
}
</script>

<style scoped>
.lead {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-2);
  max-width: 760px;
}

.mb {
  margin-bottom: 12px;
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
  gap: 12px;
  align-items: start;
}

.grp {
  margin: 0;
}

.grp {
  padding: 14px 16px;
}

.grp__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
  margin-bottom: 8px;
}

.grp__head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.flag {
  margin-right: 4px;
}

.sectors {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.sector {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--text-2);
  font-size: 11.5px;
}

.sigs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.sig {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 0;
  border-top: 1px solid var(--border);
}

.sig:first-child {
  border-top: 0;
  padding-top: 2px;
}

.sig__main {
  flex: 1;
  min-width: 0;
}

.what {
  margin: 0 0 4px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.45;
}

.so {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 12px;
  color: var(--text-3);
}

.src {
  color: var(--accent);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.src i {
  font-size: 9px;
}
</style>
