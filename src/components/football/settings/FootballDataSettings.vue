<template>
  <!-- System settings → Football data (super admin): provider keys, plan & budgets, usage, competitions, bookmakers, refresh, fetch log, aliases. -->
  <div class="fb fbset" data-test="fb-settings">
    <div class="fbset__head">
      <div>
        <h2>Football data</h2>
        <p class="pf-muted">
          API-Football (fixtures, results, statistics, line-ups, injuries, players, standings, some odds) and The Odds API (more bookmakers, including Pinnacle), plus the free sources
          below. Data is fetched once for every organisation; the keys and their costs are the platform's.
        </p>
      </div>
      <button type="button" class="ui-btn ui-btn--primary" :disabled="refreshing" data-test="fb-refresh-now" @click="refresh">
        <i :class="refreshing ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Refresh now
      </button>
    </div>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-if="!v && !loadError">
      <div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 48px; margin-bottom: 12px; max-width: 720px"></div>
    </div>

    <template v-if="v">
      <div v-if="runResult" class="ui-alert" :class="runResult.failed ? 'ui-alert--warning' : 'ui-alert--success'" data-test="fb-run-result">
        <i :class="runResult.failed ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'"></i>
        <span>
          Refresh done in {{ (runResult.duration_ms / 1000).toFixed(1) }} s: {{ runResult.done }} tasks, {{ runResult.skipped }} skipped, {{ runResult.failed }} failed · cost
          {{ costText(runResult.cost) }} · {{ runResult.predicted }} predictions, {{ runResult.frozen }} frozen, {{ runResult.graded }} graded, {{ runResult.settled }} bets settled.
        </span>
      </div>

      <!-- Providers -->
      <div class="fbset__providers">
        <div v-for="u in v.usage" :key="u.provider" class="fbset__prov" :data-provider="u.provider">
          <div class="fbset__provhead">
            <strong>{{ u.name }}</strong>
            <span class="ui-badge" :class="u.has_key ? 'ui-badge--paid' : 'ui-badge--overdue'">{{ u.has_key ? 'Key saved' : 'No key' }}</span>
            <span v-if="u.backoff_until" class="ui-badge ui-badge--overdue" :title="u.last_error">Paused until {{ fmtDateTime(u.backoff_until) }}</span>
          </div>
          <dl class="pf-kv fbset__kv">
            <dt>Key</dt>
            <dd>
              <span v-if="u.has_key" class="pf-mono" data-test="fb-key-hint">{{ u.key_hint }}</span><span v-else class="pf-muted">not set</span>
            </dd>
            <dt>{{ u.period === 'day' ? 'Today' : 'This month' }}</dt>
            <dd>
              <span class="fb-num">{{ u.used }} / {{ u.budget }}</span> {{ u.provider === 'oddsapi' ? 'credits' : 'requests' }} (DASYIN's budget)
              <span class="fbset__meter"><i :style="{ width: Math.min(100, (u.used / Math.max(1, u.budget)) * 100) + '%' }" :class="{ 'is-high': u.used / Math.max(1, u.budget) > 0.85 }"></i></span>
            </dd>
            <dt>Provider says</dt>
            <dd>
              <template v-if="u.reported_remaining != null">{{ u.reported_remaining }} left<template v-if="u.reported_limit"> of {{ u.reported_limit }}</template></template><span v-else class="pf-muted">not known yet</span>
            </dd>
            <template v-if="u.provider === 'oddsapi'">
              <dt>Pace</dt>
              <dd>{{ u.daily_allowance }} credits a day for the rest of the month · {{ v.odds_call_cost }} per call ({{ v.settings.odds_markets.split(',').length }} markets × {{ v.settings.odds_regions.split(',').length }} regions)</dd>
            </template>
            <template v-if="u.last_error">
              <dt>Last error</dt>
              <dd class="pf-danger-text">{{ u.last_error }}</dd>
            </template>
          </dl>
          <div class="fbset__keyrow">
            <input v-model="keys[u.provider]" class="ui-input" type="password" autocomplete="new-password" :placeholder="u.has_key ? 'Replace the key' : 'Paste the API key'" :aria-label="u.name + ' API key'" :data-test="'fb-key-' + u.provider" />
            <button type="button" class="ui-btn" :disabled="testing[u.provider]" :data-test="'fb-test-' + u.provider" @click="test(u.provider)">
              <i :class="testing[u.provider] ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-plug'"></i> Test connection
            </button>
          </div>
          <div v-if="tests[u.provider]" class="fbset__test" :class="tests[u.provider].ok ? 'pf-success-text' : 'pf-danger-text'" :data-test="'fb-test-result-' + u.provider">
            <i :class="tests[u.provider].ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'"></i> {{ tests[u.provider].message }}
            <ul v-if="!tests[u.provider].ok && (tests[u.provider].key_hint || tests[u.provider].key_shape || tests[u.provider].http_status)" class="fbset__diag" :data-test="'fb-test-diag-' + u.provider">
              <li v-if="tests[u.provider].key_hint">Key we used: <code>{{ tests[u.provider].key_hint }}</code> — compare the last 4 characters with your dashboard.</li>
              <li v-if="tests[u.provider].key_shape">{{ tests[u.provider].key_shape }}</li>
              <li v-if="tests[u.provider].http_status">Answer from <code>{{ tests[u.provider].host }}</code>: HTTP {{ tests[u.provider].http_status }}<template v-if="tests[u.provider].provider_code"> · {{ tests[u.provider].provider_code }}</template></li>
            </ul>
          </div>
          <a :href="u.provider === 'apifootball' ? v.endpoints.apifootball_docs : v.endpoints.oddsapi_docs" target="_blank" rel="noopener noreferrer" class="fb-small">Documentation <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
        </div>
      </div>

      <!-- Plan, budgets, policy -->
      <form class="fbset__sec" novalidate @submit.prevent="save">
        <h3>Plan, budgets &amp; refresh policy</h3>
        <div class="fbset__grid">
          <div class="ui-field">
            <label class="ui-label" for="fbs-plan">API-Football plan</label>
            <select id="fbs-plan" v-model="d.apifootball_plan" class="ui-select">
              <option v-for="(q, k) in v.plan_quota" :key="k" :value="k">{{ k[0].toUpperCase() + k.slice(1) }} — {{ q.toLocaleString() }} requests/day</option>
            </select>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-afb">API-Football daily budget</label>
            <input id="fbs-afb" v-model.number="d.apifootball_daily_budget" class="ui-input" type="number" min="1" data-test="fb-af-budget" />
            <span class="ui-hint">Keep some of the plan's {{ (v.plan_quota[d.apifootball_plan] || 0).toLocaleString() }} for manual refreshes</span>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-oab">The Odds API monthly budget (credits)</label>
            <input id="fbs-oab" v-model.number="d.oddsapi_monthly_budget" class="ui-input" type="number" min="1" />
            <span class="ui-hint">Free plan: 500 credits a month; each call costs markets × regions</span>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-reg">Odds regions</label>
            <input id="fbs-reg" v-model="d.odds_regions" class="ui-input" placeholder="uk,eu" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-mkts">Odds markets</label>
            <input id="fbs-mkts" v-model="d.odds_markets" class="ui-input" placeholder="h2h,totals,spreads" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-snap">Odds snapshots (minutes before kick-off)</label>
            <input id="fbs-snap" v-model="d.odds_snapshots" class="ui-input" placeholder="1440,360,60,10" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-look">Look ahead (days)</label>
            <input id="fbs-look" v-model.number="d.lookahead_days" class="ui-input" type="number" min="1" max="14" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-live">Live polling every (seconds)</label>
            <input id="fbs-live" v-model.number="d.live_interval_sec" class="ui-input" type="number" min="15" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-edge">Value threshold (model − fair)</label>
            <input id="fbs-edge" v-model.number="d.min_edge" class="ui-input" type="number" step="0.005" min="0" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-kf">Kelly fraction</label>
            <input id="fbs-kf" v-model.number="d.kelly_fraction" class="ui-input" type="number" step="0.05" min="0" max="1" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbs-kc">Kelly cap (share of bankroll)</label>
            <input id="fbs-kc" v-model.number="d.kelly_cap" class="ui-input" type="number" step="0.005" min="0" max="0.1" />
          </div>
        </div>
        <div class="fbset__switches">
          <label class="ui-switch"><input v-model="d.scheduler_on" type="checkbox" /> Fetch automatically (scheduler)</label>
          <label class="ui-switch"><input v-model="d.live_polling" type="checkbox" /> Poll live matches</label>
        </div>
        <div class="fbset__actions">
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" data-test="fb-settings-save"><i class="fa-solid fa-check"></i> Save settings</button>
          <span class="pf-muted pf-small">Last run {{ v.settings.last_run_at ? fmtDateTime(v.settings.last_run_at) : 'never' }}<template v-if="v.settings.last_run && v.settings.last_run.trigger"> ({{ v.settings.last_run.trigger }})</template></span>
        </div>
      </form>

      <!-- Usage charts -->
      <div class="fbset__sec">
        <h3>Usage per day</h3>
        <div class="fb-grid-2">
          <FbFigure
            v-for="u in v.usage"
            :key="'chart' + u.provider"
            :title="u.name"
            :subtitle="u.provider === 'oddsapi' ? 'Credits per day · line = pace for the rest of the month' : 'Requests per day · line = daily budget'"
            :table="{ cols: [{ label: 'Day' }, { label: 'Cost', num: true }, { label: 'Requests', num: true }, { label: 'Errors', num: true }], rows: (u.history || []).map((h) => [h.day, h.cost, h.requests, h.errors]) }"
            :chart-id="'usage-' + u.provider"
          >
            <FbColumns
              v-if="(u.history || []).length"
              :items="(u.history || []).map((h) => ({ key: h.day, label: h.day.slice(5), tipTitle: h.day, value: h.cost, tip: [['Requests', h.requests], ['Errors', h.errors]] }))"
              :height="170"
              color="var(--fb-home)"
              :ref-lines="[{ y: u.provider === 'oddsapi' ? u.daily_allowance : u.budget, label: u.provider === 'oddsapi' ? 'pace' : 'budget' }]"
              :format-y="(x) => compact(x)"
              :format-value="(x) => String(x)"
              :value-name="u.provider === 'oddsapi' ? 'Credits' : 'Requests'"
              :aria-label="u.name + ' usage per day'"
            />
            <div v-else class="pf-muted pf-small">No calls yet.</div>
          </FbFigure>
        </div>
      </div>

      <!-- v2.17 free sources, news rules, feeds -->
      <div class="fbset__sec">
        <FreeSourcesSettings />
      </div>

      <!-- Competitions -->
      <div class="fbset__sec">
        <h3>Competitions</h3>
        <p class="pf-muted pf-small">Switched-on competitions are fetched and shown in the match centre. Each costs requests: keep Kenyan &amp; African football, the big European leagues and UEFA, and add what your customers bet on.</p>
        <div class="fbset__comps">
          <div class="fbset__complist">
            <div v-for="g in compGroups" :key="g.key" class="fbset__cg">
              <div class="fbset__cgh">{{ g.label }}</div>
              <label v-for="c in g.items" :key="c.id" class="fbset__comp" :data-comp="c.id">
                <input v-model="enabled" type="checkbox" :value="c.id" />
                <span>{{ c.name }} <span class="pf-muted pf-small">{{ c.country }}<template v-if="c.season"> · {{ c.season }}</template></span></span>
                <span><span v-if="c.coverage && c.coverage.odds" class="fb-pill" title="API-Football has odds for this competition">odds</span></span>
                <input v-model="sportKeys[c.id]" class="ui-input fbset__sk" placeholder="Odds API key" :aria-label="'The Odds API sport key for ' + c.name" :title="'The Odds API sport key (empty = not covered)'" />
              </label>
            </div>
          </div>
          <div class="fbset__compsearch">
            <input v-model="compQ" class="ui-input" placeholder="Search API-Football's competitions (e.g. Tanzania, FA Cup)" aria-label="Search competitions" @input="searchComps" />
            <ul>
              <li v-for="c in compResults" :key="c.id">
                <span>{{ c.name }} <span class="pf-muted pf-small">{{ c.country }}</span></span>
                <button type="button" class="ui-btn ui-btn--sm" :disabled="enabled.includes(c.id)" @click="addComp(c)">{{ enabled.includes(c.id) ? 'Added' : 'Add' }}</button>
              </li>
            </ul>
          </div>
        </div>
        <div class="fbset__actions">
          <button type="button" class="ui-btn ui-btn--primary" :disabled="saving" data-test="fb-comps-save" @click="saveComps"><i class="fa-solid fa-check"></i> Save competitions ({{ enabled.length }})</button>
        </div>
      </div>

      <!-- Bookmakers -->
      <div class="fbset__sec" data-test="fb-bookmaker-coverage">
        <h3>Bookmaker coverage</h3>
        <div class="fb-scroll">
          <table class="fb-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Bookmakers</th>
                <th>Operating in Kenya</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>API-Football</td>
                <td>{{ (v.bookmakers.apifootball || []).join(', ') || '—' }}</td>
                <td>{{ (v.bookmakers.kenyan_in_apifootball || []).join(', ') || 'none' }}</td>
              </tr>
              <tr>
                <td>The Odds API (seen)</td>
                <td>{{ (v.bookmakers.oddsapi_seen || []).join(', ') || '—' }}</td>
                <td>{{ (v.bookmakers.kenyan_in_oddsapi || []).join(', ') || 'none' }}</td>
              </tr>
              <tr>
                <td>Typed in by people</td>
                <td colspan="2">{{ (meta && meta.bookmakers ? meta.bookmakers : []).join(', ') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="pf-muted pf-small">{{ v.bookmakers.note }}</p>
      </div>

      <!-- Unmatched + aliases -->
      <div class="fbset__sec">
        <h3>Team names: unmatched events &amp; aliases</h3>
        <p class="pf-muted pf-small">The Odds API spells teams its own way. Events it couldn't match to an API-Football fixture are listed here; link a name to the right team and it is matched next time.</p>
        <div class="fb-grid-2">
          <div>
            <div class="fb-fig__title">Unmatched events ({{ unmatched.length }})</div>
            <ul class="fbset__list" data-test="fb-unmatched">
              <li v-for="e in unmatched" :key="e.event_id">
                <span><strong>{{ e.home }}</strong> v <strong>{{ e.away }}</strong> <span class="pf-muted pf-small">{{ e.sport_key }} · {{ fmtDateTime(e.commence) }} · seen {{ e.seen }}×</span></span>
                <span class="fbset__alias">
                  <button type="button" class="ui-btn ui-btn--sm" @click="startAlias(e.home)">Link “{{ e.home }}”</button>
                  <button type="button" class="ui-btn ui-btn--sm" @click="startAlias(e.away)">Link “{{ e.away }}”</button>
                </span>
              </li>
              <li v-if="!unmatched.length" class="pf-muted pf-small">Everything matched.</li>
            </ul>
            <form v-if="aliasName" class="fbset__aliasform" novalidate @submit.prevent="saveAlias">
              <div class="pf-small">Link <strong>{{ aliasName }}</strong> to:</div>
              <input v-model="teamQ" class="ui-input" placeholder="Search a team" aria-label="Search a team" @input="searchTeams" />
              <select v-model.number="aliasTeam" class="ui-select" aria-label="Team" size="5">
                <option v-for="t in teamResults" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <div class="fbset__actions">
                <button type="submit" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="!aliasTeam">Save alias</button>
                <button type="button" class="ui-btn ui-btn--sm" @click="aliasName = ''">Cancel</button>
              </div>
            </form>
          </div>
          <div>
            <div class="fb-fig__title">Aliases ({{ aliases.length }})</div>
            <div class="fb-scroll fbset__aliases">
              <table class="fb-table" data-test="fb-aliases">
                <thead>
                  <tr>
                    <th>Name used</th>
                    <th>Team</th>
                    <th>Source</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="a in aliases" :key="a.alias">
                    <td>{{ a.name }}</td>
                    <td>{{ a.team }}</td>
                    <td><span class="fb-pill">{{ a.source }}</span></td>
                    <td class="num"><button type="button" class="fb-linkbtn" :aria-label="'Delete alias ' + a.name" @click="deleteAlias(a)"><i class="fa-regular fa-trash-can"></i></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Fetch log -->
      <div class="fbset__sec">
        <div class="fbset__loghead">
          <h3>Fetch log</h3>
          <select v-model="logProvider" class="ui-select" aria-label="Provider" @change="loadLog">
            <option value="">Both providers</option>
            <option value="apifootball">API-Football</option>
            <option value="oddsapi">The Odds API</option>
          </select>
        </div>
        <div class="fb-scroll fbset__log">
          <table class="fb-table" data-test="fb-fetch-log">
            <thead>
              <tr>
                <th>When</th>
                <th>Provider</th>
                <th>Endpoint</th>
                <th class="num">Status</th>
                <th class="num">Cost</th>
                <th class="num">Results</th>
                <th class="num">ms</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in log" :key="l.id">
                <td class="fb-small">{{ fmtDateTime(l.at) }}</td>
                <td>{{ l.provider === 'oddsapi' ? 'The Odds API' : 'API-Football' }}</td>
                <td class="fbset__ep"><span class="pf-mono">{{ l.endpoint }}</span> <span class="pf-muted pf-small">{{ (l.params || '').slice(0, 60) }}{{ (l.params || '').length > 60 ? '…' : '' }}</span></td>
                <td class="num" :class="l.ok ? '' : 'pf-danger-text'">{{ l.status }}</td>
                <td class="num">{{ l.cost }}</td>
                <td class="num">{{ l.results }}</td>
                <td class="num">{{ l.duration_ms }}</td>
              </tr>
              <tr v-if="!log.length">
                <td colspan="7" class="pf-muted">No calls yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import '@/components/football/football.css'
import { footballAdminApi, footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'
import { fb, loadMeta } from '@/components/football/fbState'
import { compact } from '@/components/football/fb'
import FbFigure from '@/components/football/charts/FbFigure.vue'
import FbColumns from '@/components/football/charts/FbColumns.vue'
import FreeSourcesSettings from '@/components/football/settings/FreeSourcesSettings.vue'

const POLICY = ['apifootball_plan', 'apifootball_daily_budget', 'oddsapi_monthly_budget', 'odds_regions', 'odds_markets', 'odds_snapshots', 'lookahead_days', 'live_interval_sec', 'min_edge', 'kelly_fraction', 'kelly_cap', 'scheduler_on', 'live_polling']
const GROUPS = [
  ['africa', 'Kenya & Africa'],
  ['europe_top', 'Top European leagues'],
  ['uefa', 'UEFA competitions'],
  ['international', 'International'],
  ['other', 'Other']
]

export default {
  name: 'FootballDataSettings',
  components: { FbFigure, FbColumns, FreeSourcesSettings },
  data() {
    return {
      v: null,
      d: {},
      keys: { apifootball: '', oddsapi: '' },
      tests: {},
      testing: {},
      saving: false,
      refreshing: false,
      runResult: null,
      loadError: '',
      enabled: [],
      sportKeys: {},
      extraComps: [],
      compQ: '',
      compResults: [],
      unmatched: [],
      aliases: [],
      aliasName: '',
      aliasTeam: null,
      teamQ: '',
      teamResults: [],
      log: [],
      logProvider: '',
      timer: null
    }
  },
  computed: {
    meta() {
      return fb.meta
    },
    compGroups() {
      const all = [...(this.v?.competitions || []), ...this.extraComps.filter((c) => !(this.v?.competitions || []).some((x) => x.id === c.id))]
      return GROUPS.map(([key, label]) => ({ key, label, items: all.filter((c) => (c.group || 'other') === key) }))
        .concat([{ key: 'more', label: 'More', items: all.filter((c) => !GROUPS.some(([k]) => k === (c.group || 'other'))) }])
        .filter((g) => g.items.length)
    }
  },
  created() {
    loadMeta()
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    compact,
    fmtDateTime: formatDateTime,
    costText(c) {
      return Object.entries(c || {})
        .map(([k, n]) => `${k === 'oddsapi' ? 'The Odds API' : 'API-Football'} ${n}`)
        .join(', ') || 'nothing'
    },
    apply(v) {
      this.v = v
      const d = {}
      for (const k of POLICY) d[k] = v.settings[k]
      this.d = d
      this.enabled = (v.competitions || []).filter((c) => c.enabled).map((c) => c.id)
      const sk = {}
      for (const c of v.competitions || []) sk[c.id] = c.odds_sport_key || ''
      this.sportKeys = sk
    },
    async load() {
      this.loadError = ''
      try {
        this.apply(await footballAdminApi.settings())
        this.loadSide()
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the football data settings')
      }
    },
    async loadSide() {
      const [u, a] = await Promise.allSettled([footballAdminApi.unmatched(), footballAdminApi.aliases()])
      if (u.status === 'fulfilled') this.unmatched = u.value.events || []
      if (a.status === 'fulfilled') this.aliases = a.value.aliases || []
      this.loadLog()
    },
    async loadLog() {
      try {
        this.log = (await footballAdminApi.fetchLog({ provider: this.logProvider, limit: 50 })).log || []
      } catch {
        this.log = []
      }
    },
    async save() {
      // Returns true when saved, so a connection test never runs on an old key.
      const body = { ...this.d }
      if (this.keys.apifootball) body.apifootball_key = this.keys.apifootball
      if (this.keys.oddsapi) body.oddsapi_key = this.keys.oddsapi
      this.saving = true
      try {
        this.apply(await footballAdminApi.save(body))
        this.keys = { apifootball: '', oddsapi: '' }
        toast.success('Football data settings saved')
        loadMeta(true)
        return true
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
        return false
      } finally {
        this.saving = false
      }
    },
    async test(provider) {
      // A typed key is saved first so the test uses it.
      if (this.keys[provider] && !(await this.save())) {
        this.tests = { ...this.tests, [provider]: { ok: false, message: 'The key was not saved, so it was not tested. Fix the key and try again.' } }
        return
      }
      this.testing = { ...this.testing, [provider]: true }
      try {
        const r = await footballAdminApi.test(provider)
        this.tests = { ...this.tests, [provider]: r }
        this.apply(await footballAdminApi.settings())
      } catch (e) {
        this.tests = { ...this.tests, [provider]: { ok: false, message: apiErrorMessage(e, 'Test failed') } }
      } finally {
        this.testing = { ...this.testing, [provider]: false }
      }
    },
    async refresh() {
      this.refreshing = true
      this.runResult = null
      try {
        this.runResult = await footballAdminApi.refresh({})
        this.apply(await footballAdminApi.settings())
        this.loadSide()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Refresh failed'))
      } finally {
        this.refreshing = false
      }
    },
    searchComps() {
      clearTimeout(this.timer)
      this.timer = setTimeout(async () => {
        if (this.compQ.trim().length < 2) {
          this.compResults = []
          return
        }
        try {
          this.compResults = ((await footballAdminApi.competitions({ q: this.compQ.trim() })).competitions || []).slice(0, 20)
        } catch {
          this.compResults = []
        }
      }, 250)
    },
    addComp(c) {
      if (!this.enabled.includes(c.id)) this.enabled.push(c.id)
      if (!this.extraComps.some((x) => x.id === c.id)) this.extraComps.push(c)
      if (this.sportKeys[c.id] === undefined) this.sportKeys[c.id] = c.odds_sport_key || ''
    },
    async saveComps() {
      this.saving = true
      try {
        const sk = {}
        for (const [id, k] of Object.entries(this.sportKeys)) sk[id] = (k || '').trim()
        this.apply(await footballAdminApi.save({ enabled_competitions: this.enabled, sport_keys: sk }))
        this.extraComps = []
        toast.success(`${this.enabled.length} competitions switched on`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the competitions'))
      } finally {
        this.saving = false
      }
    },
    startAlias(name) {
      this.aliasName = name
      this.aliasTeam = null
      this.teamQ = name.replace(/\b(FC|Utd|Ath)\b/gi, '').trim()
      this.searchTeams()
    },
    searchTeams() {
      clearTimeout(this.timer)
      this.timer = setTimeout(async () => {
        try {
          const now = new Date(this.meta?.now || Date.now())
          const from = new Date(now.getTime() - 400 * 86400000).toISOString()
          const to = new Date(now.getTime() + 30 * 86400000).toISOString()
          const d = await footballApi.fixtures({ q: this.teamQ.trim(), from, to, limit: 300 })
          const m = new Map()
          for (const f of d.fixtures || []) for (const t of [f.home, f.away]) if (!this.teamQ.trim() || t.name.toLowerCase().includes(this.teamQ.trim().toLowerCase())) m.set(t.id, t)
          this.teamResults = [...m.values()].sort((x, y) => x.name.localeCompare(y.name))
        } catch {
          this.teamResults = []
        }
      }, 250)
    },
    async saveAlias() {
      try {
        await footballAdminApi.setAlias(this.aliasName, this.aliasTeam)
        toast.success(`“${this.aliasName}” linked`)
        this.aliasName = ''
        this.loadSide()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the alias'))
      }
    },
    async deleteAlias(a) {
      if (!(await confirmDialog({ title: 'Delete this alias?', message: `${a.name} → ${a.team}`, confirmText: 'Delete', danger: true }))) return
      try {
        await footballAdminApi.deleteAlias(a.alias)
        this.loadSide()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the alias'))
      }
    }
  }
}
</script>

<style scoped>
.fbset {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
}
.fbset__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.fbset__head h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.fbset__head p {
  margin: 0;
  max-width: 760px;
}
.fbset__providers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.fbset__prov {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  align-content: start;
  min-width: 0;
}
.fbset__provhead {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.fbset__kv {
  margin: 0;
}
.fbset__meter {
  display: inline-block;
  width: 90px;
  height: 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  vertical-align: middle;
  margin-left: 6px;
  overflow: hidden;
}
.fbset__meter i {
  display: block;
  height: 100%;
  background: var(--fb-good);
  border-radius: 999px;
}
.fbset__meter i.is-high {
  background: var(--fb-bad);
}
.fbset__keyrow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
.fbset__diag {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--text-secondary, inherit);
}
.fbset__diag code {
  font-size: 12px;
}
.fbset__test {
  font-size: 13px;
}
.fbset__sec {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
.fbset__sec h3 {
  font-size: 15px;
  font-weight: 650;
  margin: 0 0 10px;
}
.fbset__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
}
.fbset__grid .ui-field {
  margin: 0;
}
.fbset__switches {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 12px;
}
.fbset__sw {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 13.5px;
}
.fbset__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}
.fbset__comps {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
}
.fbset__cgh {
  font-size: 12px;
  font-weight: 650;
  color: var(--text-3);
  margin: 8px 0 4px;
}
.fbset__comp {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto 150px;
  gap: 8px;
  align-items: center;
  padding: 4px 0;
  font-size: 13.5px;
}
.fbset__comp input[type='checkbox'] {
  accent-color: var(--accent);
}
.fbset__sk {
  height: 30px;
  min-height: 30px;
  font-size: 12px;
  padding: 4px 8px;
}
.fbset__compsearch ul,
.fbset__list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}
.fbset__compsearch li,
.fbset__list li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 10px;
  align-items: center;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}
.fbset__alias {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.fbset__aliasform {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.fbset__aliases,
.fbset__log {
  max-height: 340px;
  overflow-y: auto;
}
.fbset__loghead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.fbset__loghead .ui-select {
  width: auto;
}
.fbset__ep {
  max-width: 420px;
}
@media (max-width: 900px) {
  .fbset__providers,
  .fbset__comps {
    grid-template-columns: minmax(0, 1fr);
  }
  .fbset__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .fbset__grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .fbset__comp {
    grid-template-columns: 18px minmax(0, 1fr) auto;
  }
  .fbset__sk {
    grid-column: 2 / -1;
  }
}
</style>
