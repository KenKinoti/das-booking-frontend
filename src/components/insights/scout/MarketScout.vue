<template>
  <div data-testid="scout">
    <div class="bar">
      <p class="lead">
        An AI scout that searches the web for tenders, grants, partnerships, leads, new markets and
        things to add to what you sell — ranked by how well each fits your business, with the pages
        it found them on. It looks outward;
        <router-link to="/insights">Opportunities</router-link> reads your own data.
      </p>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger mb">
      <i class="fa-solid fa-circle-exclamation"></i
      ><span>{{ error }} <a href="#" @click.prevent="load()">Try again</a></span>
    </div>
    <div v-if="!st" class="ui-skeleton" style="height: 120px"></div>

    <template v-else>
      <!-- Status -->
      <section class="ui-card status" data-testid="scout-status">
        <div class="status__main">
          <div class="line1">
            <span class="ui-badge" :class="st.settings.enabled ? 'ui-badge--success' : ''">{{
              st.settings.enabled ? 'On' : 'Off'
            }}</span>
            <strong v-if="st.settings.enabled && st.budget_reached"
              >Paused until {{ nextMonth }} — monthly budget reached</strong
            >
            <strong v-else-if="st.settings.enabled">{{ nextText }}</strong>
            <strong v-else>Not running — set it up and turn it on to start.</strong>
          </div>
          <p class="sub">
            <template v-if="lastDone"
              >Last scan {{ ago(lastDone.started_at) }}:
              {{ lastDone.message || statusLabel(lastDone.status) }}</template
            >
            <template v-else>No scans yet.</template>
          </p>
        </div>
        <div
          class="spend"
          :title="`${usd(st.spent_usd)} of ${usd(st.settings.monthly_budget_usd)} this month`"
        >
          <span class="k">This month</span>
          <strong data-testid="scout-spend"
            >{{ usd(st.spent_usd) }}
            <small>of {{ usd(st.settings.monthly_budget_usd) }}</small></strong
          >
          <div class="meter" :class="{ full: st.budget_reached }">
            <span :style="{ width: pct + '%' }"></span>
          </div>
        </div>
        <div v-if="st.can_edit" class="acts">
          <button
            class="ui-btn ui-btn--primary"
            type="button"
            :disabled="!canScan"
            data-action="scout-scan"
            @click="scan('light')"
          >
            <i
              :class="
                scanning ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-magnifying-glass-chart'
              "
            ></i>
            {{ scanning ? 'Scanning…' : 'Scan now' }}
          </button>
          <button
            class="ui-btn"
            type="button"
            :disabled="!canScan"
            :title="`Deep scan: up to ${st.settings.weekly_searches} searches`"
            data-action="scout-scan-deep"
            @click="scan('deep')"
          >
            <i class="fa-solid fa-layer-group"></i> Deep scan
          </button>
        </div>
      </section>

      <div v-if="scanning" class="ui-alert mb running" data-testid="scout-running">
        <i class="fa-solid fa-satellite-dish fa-beat-fade"></i>
        <span v-if="running"
          >Searching the web ({{ running.kind === 'deep' ? 'deep scan' : 'light scan' }}, up to
          {{ running.max_searches }} searches, at most {{ usd(running.estimate_usd) }})… this
          usually takes a minute or two. You can leave this page.</span
        >
        <span v-else>Starting the scan…</span>
      </div>
      <div
        v-else-if="st.budget_reached"
        class="ui-alert ui-alert--danger mb"
        data-testid="scout-budget-reached"
      >
        <i class="fa-solid fa-circle-stop"></i>
        <span>
          <strong>Monthly budget reached.</strong> {{ usd(st.spent_usd) }} of
          {{ usd(st.settings.monthly_budget_usd) }} spent — scans are stopped until {{ nextMonth
          }}<template v-if="st.can_enable"
            >, or <a href="#" @click.prevent="setView('setup')">raise the budget</a></template
          >.
        </span>
      </div>
      <div v-else-if="!st.key_ok && st.settings.enabled" class="ui-alert ui-alert--warning mb">
        <i class="fa-solid fa-key"></i
        ><span
          >{{ st.key_problem || 'No Anthropic API key is saved, so scans cannot run.' }}
          <router-link v-if="st.can_enable" to="/system-settings?tab=ai"
            >System settings → AI assistant</router-link
          ></span
        >
      </div>
      <div
        v-else-if="lastError"
        class="ui-alert ui-alert--warning mb"
        data-testid="scout-last-error"
      >
        <i class="fa-solid fa-triangle-exclamation"></i
        ><span>The last scan did not finish: {{ st.last_run.message }}</span>
      </div>

      <div class="ui-tabs views" role="tablist" aria-label="Market scout">
        <button
          v-for="v in VIEWS"
          :key="v.key"
          type="button"
          role="tab"
          class="ui-tab"
          :class="{ 'is-active': view === v.key }"
          :aria-selected="view === v.key"
          :data-view="v.key"
          @click="setView(v.key)"
        >
          <i :class="v.icon"></i> {{ v.label
          }}<span v-if="v.key === 'feed' && openCount" class="count">{{ openCount }}</span>
        </button>
      </div>

      <ScoutFeed
        v-if="view === 'feed'"
        :can-edit="st.can_edit"
        :enabled="st.settings.enabled"
        :reasons="st.dismiss_reasons"
        :focus-id="focusId"
        :version="version"
        @changed="load(true)"
      />
      <ScoutMarkets v-else-if="view === 'markets'" :can-edit="st.can_edit" :version="version" />
      <ScoutRuns v-else-if="view === 'runs'" :version="version" />
      <ScoutSetup v-else :st="st" @changed="onSetup" />
    </template>
  </div>
</template>

<script>
import ScoutFeed from './ScoutFeed.vue'
import ScoutMarkets from './ScoutMarkets.vue'
import ScoutRuns from './ScoutRuns.vue'
import ScoutSetup from './ScoutSetup.vue'
import { scoutApi, usd } from '@/services/scout'
import { ago } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const VIEWS = [
  { key: 'feed', label: 'Opportunities', icon: 'fa-solid fa-binoculars' },
  { key: 'markets', label: 'Markets', icon: 'fa-solid fa-earth-africa' },
  { key: 'runs', label: 'Scans & cost', icon: 'fa-solid fa-receipt' },
  { key: 'setup', label: 'Set up', icon: 'fa-solid fa-sliders' },
]

export default {
  name: 'MarketScout',
  components: { ScoutFeed, ScoutMarkets, ScoutRuns, ScoutSetup },
  data() {
    return { VIEWS, st: null, error: '', running: null, starting: false, poll: null, version: 0 }
  },
  computed: {
    view() {
      const v = this.$route.query.view
      if (VIEWS.some((x) => x.key === v)) return v
      return this.st && !this.st.settings.enabled && !this.openCount && !this.st.last_run
        ? 'setup'
        : 'feed'
    },
    focusId() {
      return String(this.$route.query.opp || '')
    },
    scanning() {
      return this.starting || !!this.running
    },
    canScan() {
      return (
        this.st &&
        this.st.settings.enabled &&
        this.st.key_ok &&
        !this.scanning &&
        !this.st.budget_reached
      )
    },
    openCount() {
      const c = this.st?.counts || {}
      return (c.new || 0) + (c.saved || 0)
    },
    pct() {
      const b = Number(this.st?.settings.monthly_budget_usd) || 0
      return b ? Math.min(100, Math.round((Number(this.st.spent_usd) / b) * 100)) : 0
    },
    lastError() {
      return this.st?.last_run && this.st.last_run.status === 'error'
    },
    // The status line shows the last scan that ran (a refused one is in the budget alert).
    lastDone() {
      const r = this.st?.last_run
      return r && r.status !== 'budget' ? r : this.st?.last_scan || null
    },
    nextText() {
      const n = this.st.next?.[0]
      if (!n) return 'No scheduled scans — use “Scan now”.'
      const when = new Date(n.at)
      const day = when.toLocaleDateString(undefined, {
        weekday: 'long',
        timeZone: this.st.timezone,
      })
      const time = when.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: this.st.timezone,
      })
      return `Next: ${n.kind === 'deep' ? 'weekly deep scan' : 'light scan'} ${day} at ${time}`
    },
    nextMonth() {
      const [y, m] = String(this.st.month || '')
        .split('-')
        .map(Number)
      if (!y) return 'next month'
      return new Date(y, m, 1).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
    },
  },
  created() {
    this.load()
  },
  mounted() {
    // On a phone the Insights tab strip scrolls: keep this tab in view.
    this.$nextTick(() =>
      document
        .querySelector('.ui-tab[data-tab="scout"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'center' }),
    )
  },
  beforeUnmount() {
    clearTimeout(this.poll)
  },
  methods: {
    usd,
    ago,
    statusLabel(s) {
      return { ok: 'done', error: 'failed', budget: 'stopped by the budget' }[s] || s
    },
    setView(v) {
      this.$router.replace({
        query: {
          ...this.$route.query,
          tab: 'scout',
          view: v === 'feed' ? undefined : v,
          opp: undefined,
        },
      })
    },
    async load(bump = false) {
      try {
        this.st = await scoutApi.status()
        this.error = ''
        if (this.st.running && !this.running) {
          this.running = this.st.running
          this.watchRun()
        }
        if (bump) this.version++
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the market scout.')
      }
    },
    onSetup(st) {
      if (st && st.settings) this.st = st
      else this.load()
    },
    async scan(kind) {
      this.starting = true
      try {
        const r = await scoutApi.scan(kind)
        if (r.status === 'running') {
          this.running = r
          this.watchRun()
        } else {
          toast.warning(r.message || 'The scan did not run')
          await this.load(true)
        }
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not start the scan'))
      } finally {
        this.starting = false
      }
    },
    watchRun() {
      clearTimeout(this.poll)
      this.poll = setTimeout(async () => {
        if (!this.running) return
        try {
          const r = await scoutApi.run(this.running.id)
          if (r.status === 'running') return this.watchRun()
          this.running = null
          if (r.status === 'ok')
            toast.success(
              `Scan done — ${r.kept} new opportunit${r.kept === 1 ? 'y' : 'ies'}${r.updated ? `, ${r.updated} seen before` : ''} (${usd(r.cost_usd)})`,
            )
          else toast.warning(r.message || 'The scan did not finish')
          await this.load(true)
        } catch {
          this.watchRun()
        }
      }, 1500)
    },
  },
}
</script>

<style scoped>
.mb {
  margin-bottom: 14px;
}

.bar {
  margin-bottom: 12px;
}

.lead {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  max-width: 820px;
}

.status {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px auto;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 14px;
}

.line1 {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.line1 strong {
  font-size: 14px;
  color: var(--text);
}

.sub {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--text-3);
}

.k {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}

.spend strong {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.spend small {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
}

.meter {
  height: 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
  margin-top: 5px;
}

.meter span {
  display: block;
  height: 100%;
  background: var(--accent);
}

.meter.full span {
  background: var(--danger);
}

.acts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.running {
  background: var(--info-soft);
}

.views {
  margin-bottom: 14px;
  overflow-x: auto;
  flex-wrap: nowrap;
  max-width: 100%;
}

.views .ui-tab {
  white-space: nowrap;
}

@media (max-width: 860px) {
  .status {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

  .acts {
    justify-content: stretch;
  }

  .acts .ui-btn {
    flex: 1 1 auto;
  }
}
</style>
