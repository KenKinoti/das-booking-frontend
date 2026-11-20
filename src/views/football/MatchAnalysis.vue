<template>
  <div class="ui-page fb fbma" data-test="fb-match">
    <FbNoAccess v-if="forbidden" :reason="forbidden" />
    <template v-else>
      <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px">
        <i class="fa-solid fa-circle-exclamation"></i
        ><span
          >{{ error }} <a href="#" @click.prevent="load()">Try again</a> · <router-link to="/football">Back to the match centre</router-link></span
        >
      </div>
      <div v-if="!a && !error" class="fbma__skel">
        <div class="ui-skeleton" style="height: 150px; margin-bottom: 16px"></div>
        <div v-for="n in 3" :key="n" class="ui-skeleton" style="height: 220px; margin-bottom: 16px"></div>
      </div>

      <template v-if="a">
        <MatchHeader
          :f="a.fixture"
          :tz="tz"
          :now="now"
          :as-of="a.as_of"
          :stale="a.stale"
          :stale-items="a.stale_items || []"
          :sources-count="(a.sources || []).length"
          :home-rank="a.standings && a.standings.home ? a.standings.home.rank : null"
          :away-rank="a.standings && a.standings.away ? a.standings.away.rank : null"
          :watched="!!watchItem"
          :can-refresh="isSuper"
          :refreshing="refreshing"
          :source-check="a.source_check || null"
          @jump="jump"
          @sources="sourcesOpen = true"
          @watch="toggleWatch"
          @refresh="refreshFixture"
        />

        <div class="fbma__layout">
          <nav class="fbma__nav" aria-label="Sections of this page">
            <a v-for="s in nav" :key="s.id" :href="'#' + s.id" :class="{ 'is-on': active === s.id }" :aria-current="active === s.id ? 'true' : null" @click.prevent="jump(s.id)">
              <span v-if="s.id === 'live' && live" class="fb-livedot"></span>{{ s.label }}
            </a>
          </nav>

          <div class="fbma__main">
            <a v-if="live" href="#live" class="fbma__jumplive" @click.prevent="jump('live')"><span class="fb-livedot"></span> In play — jump to the live block</a>
            <ProbSection ref="probabilities" :a="a" :tz="tz" />
            <NewsSection v-if="a.team_news || a.news" ref="team-news" :a="a" :tz="tz" :now="now" @reviewed="load(true)" />
            <PriceCheck ref="price-check" :a="a" :meta="meta" :limits="limits" :tz="tz" @recorded="afterRecord" @saved="load(true)" />
            <ScoreSection ref="scores" :a="a" />
            <GoalsSection ref="goals" :a="a" />
            <AhSection ref="asian-handicap" :a="a" />
            <FormSection ref="form" :a="a" :tz="tz" />
            <LeagueSection ref="league" :a="a" :tz="tz" />
            <H2HSection ref="h2h" :a="a" :tz="tz" />
            <PlayersSection ref="players" :a="a" :tz="tz" />
            <LineupsSection ref="lineups" :a="a" :tz="tz" />
            <OddsSection ref="odds" :a="a" :tz="tz" :now="now" />
            <LiveSection v-if="a.live" ref="live" :a="a" :tz="tz" :now="now" />
            <TrackSection ref="track-record" :a="a" />
            <SourceCheckPanel v-if="a.source_check" ref="source-check" :a="a" :tz="tz" />
            <ReferenceSection ref="reference" :a="a" :tz="tz" />
            <section id="sources" class="fb-panel fbma__sources" data-section="sources">
              <div class="fb-panel__head">
                <div>
                  <h2>Sources</h2>
                  <p>{{ (a.sources || []).length }} sources · data as of {{ fmtDateTime(a.as_of, tz) }}<template v-if="a.stale"> · some data is stale</template></p>
                </div>
                <button type="button" class="ui-btn ui-btn--sm" @click="sourcesOpen = true"><i class="fa-solid fa-link"></i> Show all sources</button>
              </div>
              <div class="fb-panel__body">
                <div class="fb-scroll">
                  <table class="fb-table" data-test="fb-sources-table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>What</th>
                        <th>Fetched</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(s, i) in a.sources" :key="i">
                        <td>{{ providerName(s.provider) }}</td>
                        <td>{{ s.object }}<span v-if="s.endpoint" class="fb-muted fb-small"> · {{ s.endpoint }}</span></td>
                        <td class="fb-small">{{ ago(s.fetched_at, now) }}</td>
                        <td><span class="fb-pill" :class="s.stale ? 'fb-pill--warn' : 'fb-pill--good'">{{ s.stale ? 'Stale' : 'Fresh' }}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
            <p class="fb-muted fb-small fbma__disc">{{ a.disclaimer }}</p>
          </div>
        </div>
        <SourcesPanel :open="sourcesOpen" :sources="a.sources || []" :tz="tz" :now="now" @close="sourcesOpen = false" />
      </template>
      <FbFootnote />
    </template>
  </div>
</template>

<script>
import '@/components/football/football.css'
import { footballApi, footballAdminApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import { fb, loadMeta, forbiddenReason } from '@/components/football/fbState'
import { DEFAULT_TZ, fmtDateTime, ago, isLive } from '@/components/football/fb'
import FbNoAccess from '@/components/football/FbNoAccess.vue'
import FbFootnote from '@/components/football/FbFootnote.vue'
import MatchHeader from '@/components/football/match/MatchHeader.vue'
import SourcesPanel from '@/components/football/match/SourcesPanel.vue'
import ProbSection from '@/components/football/match/ProbSection.vue'
import PriceCheck from '@/components/football/match/PriceCheck.vue'
import ScoreSection from '@/components/football/match/ScoreSection.vue'
import GoalsSection from '@/components/football/match/GoalsSection.vue'
import AhSection from '@/components/football/match/AhSection.vue'
import FormSection from '@/components/football/match/FormSection.vue'
import LeagueSection from '@/components/football/match/LeagueSection.vue'
import H2HSection from '@/components/football/match/H2HSection.vue'
import PlayersSection from '@/components/football/match/PlayersSection.vue'
import LineupsSection from '@/components/football/match/LineupsSection.vue'
import OddsSection from '@/components/football/match/OddsSection.vue'
import LiveSection from '@/components/football/match/LiveSection.vue'
import TrackSection from '@/components/football/match/TrackSection.vue'
import ReferenceSection from '@/components/football/match/ReferenceSection.vue'
import NewsSection from '@/components/football/match/NewsSection.vue'
import SourceCheckPanel from '@/components/football/match/SourceCheckPanel.vue'
import { providerName } from '@/components/football/fb'

export default {
  name: 'MatchAnalysis',
  components: {
    FbNoAccess,
    FbFootnote,
    MatchHeader,
    SourcesPanel,
    ProbSection,
    PriceCheck,
    ScoreSection,
    GoalsSection,
    AhSection,
    FormSection,
    LeagueSection,
    H2HSection,
    PlayersSection,
    LineupsSection,
    OddsSection,
    LiveSection,
    TrackSection,
    ReferenceSection,
    NewsSection,
    SourceCheckPanel
  },
  props: { id: { type: [String, Number], required: true } },
  data() {
    return { a: null, limits: null, watch: [], error: '', forbidden: '', tz: DEFAULT_TZ, now: '', sourcesOpen: false, active: 'probabilities', io: null, poll: null, refreshing: false, loading: false }
  },
  computed: {
    meta() {
      return fb.meta
    },
    isSuper() {
      return useAuthStore().isSuperAdmin
    },
    live() {
      return !!this.a && isLive(this.a.fixture.status)
    },
    watchItem() {
      return this.watch.find((w) => w.kind === 'fixture' && Number(w.ref_id) === Number(this.id)) || null
    },
    nav() {
      const n = [
        ['probabilities', 'Probabilities'],
        ['team-news', 'Team news & news'],
        ['price-check', 'Price check'],
        ['scores', 'Scores'],
        ['goals', 'Over/under & BTTS'],
        ['asian-handicap', 'Asian handicap'],
        ['form', 'Form'],
        ['league', 'League position'],
        ['h2h', 'Head to head'],
        ['players', 'Key players'],
        ['lineups', 'Line-ups'],
        ['odds', 'Odds'],
        ['live', this.live ? 'Live' : 'Match events'],
        ['track-record', 'Track record'],
        ['source-check', 'Source check'],
        ['reference', 'Reference'],
        ['sources', 'Sources']
      ]
      const has = { live: !!(this.a && this.a.live), 'team-news': !!(this.a && (this.a.team_news || this.a.news)), 'source-check': !!(this.a && this.a.source_check) }
      return n.filter(([id]) => has[id] !== false).map(([id, label]) => ({ id, label }))
    }
  },
  watch: {
    id() {
      this.a = null
      this.load()
    }
  },
  async created() {
    await loadMeta(true)
    if (fb.forbidden) {
      this.forbidden = fb.forbidden
      return
    }
    await this.load()
    this.loadSide()
    this.poll = setInterval(() => {
      if (document.visibilityState === 'visible' && this.live) this.load(true)
    }, 60000)
  },
  beforeUnmount() {
    clearInterval(this.poll)
    this.io?.disconnect()
  },
  methods: {
    fmtDateTime,
    ago,
    providerName,
    async load(quiet = false) {
      if (!quiet) this.error = ''
      this.loading = true
      try {
        const [a, fx] = await Promise.all([footballApi.analysis(this.id), this.tz === DEFAULT_TZ && !this.now ? footballApi.fixtures({ limit: 1 }).catch(() => null) : Promise.resolve(null)])
        if (fx?.timezone) this.tz = fx.timezone
        this.a = a
        this.now = a.generated_at
        document.title = `${a.fixture.home.name} v ${a.fixture.away.name} · DASYIN ERP`
        this.$nextTick(this.observe)
      } catch (e) {
        this.forbidden = forbiddenReason(e)
        if (!this.forbidden) this.error = e?.response?.status === 404 ? 'This match was not found.' : apiErrorMessage(e, 'Could not load the match')
      } finally {
        this.loading = false
      }
    },
    async loadSide() {
      const [l, w] = await Promise.allSettled([footballApi.limits(), footballApi.watchlist()])
      if (l.status === 'fulfilled') this.limits = l.value
      if (w.status === 'fulfilled') this.watch = w.value.items || []
    },
    async afterRecord() {
      await Promise.all([this.load(true), this.loadSide()])
    },
    async toggleWatch() {
      try {
        if (this.watchItem) await footballApi.unwatch(this.watchItem.id)
        else await footballApi.watch({ kind: 'fixture', ref_id: Number(this.id) })
        this.watch = (await footballApi.watchlist()).items || []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update your watchlist'))
      }
    },
    async refreshFixture() {
      this.refreshing = true
      try {
        await footballAdminApi.refreshFixture(this.id)
        await this.load(true)
        toast.success('Refreshed from API-Football (1 request)')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not refresh this match'))
      } finally {
        this.refreshing = false
      }
    },
    jump(id) {
      // Open a collapsed section on phones (the section component is the root of each part), then scroll to it.
      const el = document.getElementById(id)
      const c = this.$refs[id]
      const sectionComp = c?.$?.subTree?.component?.proxy
      if (sectionComp && typeof sectionComp.reveal === 'function') sectionComp.reveal()
      this.$nextTick(() => {
        el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
        this.active = id
        history.replaceState(history.state, '', '#' + id)
      })
    },
    observe() {
      if (this.io || typeof IntersectionObserver === 'undefined') return
      this.io = new IntersectionObserver(
        (entries) => {
          const vis = entries.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)
          if (vis[0]) this.active = vis[0].target.id
        },
        { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
      )
      for (const s of this.nav) {
        const el = document.getElementById(s.id)
        if (el) this.io.observe(el)
      }
    }
  }
}
</script>

<style scoped>
.fbma__layout {
  display: grid;
  grid-template-columns: 188px minmax(0, 1fr);
  gap: 20px;
  margin-top: 16px;
  align-items: start;
}
.fbma__nav {
  position: sticky;
  top: calc(var(--topbar-h, 64px) + 12px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
  max-height: calc(100vh - var(--topbar-h, 64px) - 24px);
  overflow-y: auto;
}
.fbma__nav a {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-2);
  text-decoration: none;
  border-left: 2px solid transparent;
}
.fbma__nav a:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.fbma__nav a.is-on {
  color: var(--text);
  font-weight: 650;
  background: var(--surface);
  border-left-color: var(--accent);
}
.fbma__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}
.fbma__jumplive {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 600;
  text-decoration: none;
  justify-self: start;
}
.fbma__sources {
  scroll-margin-top: calc(var(--topbar-h, 64px) + 64px);
}
.fbma__disc {
  margin: 0;
}
@media (max-width: 1199px) {
  .fbma__layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .fbma__nav {
    top: var(--topbar-h, 64px);
    z-index: 5;
    display: flex;
    gap: 4px;
    overflow-x: auto;
    max-height: none;
    padding: 8px 0;
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: blur(8px);
    scrollbar-width: none;
  }
  .fbma__nav a {
    flex: 0 0 auto;
    border-left: 0;
    border: 1px solid var(--border);
    background: var(--surface);
    white-space: nowrap;
  }
  .fbma__nav a.is-on {
    border-color: var(--accent);
  }
}
@media (max-width: 640px) {
  .fbma__nav {
    position: static;
    padding: 4px 0;
  }
}
</style>
