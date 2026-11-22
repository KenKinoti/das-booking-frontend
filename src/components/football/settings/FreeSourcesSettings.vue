<template>
  <!-- System settings → Football data → Free sources (v2.17): OddsPapi and football-data.org keys, on/off per free
       source, budgets and usage, news rules (keywords per language), RSS/Atom feeds and news-source reliability. -->
  <div class="fbfs" data-test="fb-free-sources">
    <div class="fbfs__head">
      <div>
        <h3>Free sources &amp; news</h3>
        <p class="pf-muted pf-small">
          Near-free extras next to API-Football: Kenyan bookmakers' prices (OddsPapi), club ratings (ClubElo), results history with closing odds (football-data.co.uk), a cross-check of
          tables (football-data.org) and team news from headlines (Google News, GDELT, feeds) using keyword rules — no AI cost.
        </p>
      </div>
      <div class="fbfs__headbtns">
        <button type="button" class="ui-btn" :disabled="running" data-test="fb-free-run" @click="run"><i :class="running ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Fetch free sources now</button>
      </div>
    </div>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-if="!v && !loadError" class="ui-skeleton" style="height: 160px"></div>

    <template v-if="v">
      <div v-if="runResult" class="ui-alert" :class="runResult.failed ? 'ui-alert--warning' : 'ui-alert--success'" data-test="fb-free-run-result">
        <i :class="runResult.failed ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'"></i>
        <span>Done: {{ runResult.done }} tasks, {{ runResult.skipped }} skipped, {{ runResult.failed }} failed · requests {{ costText(runResult.cost) }}.</span>
      </div>

      <!-- Usage against budgets -->
      <FbFigure title="Usage against each source's budget" subtitle="Requests used this period (OddsPapi: this month; the others: today) · the bar turns amber near the budget and red at it" :table="usageTable" chart-id="free-usage">
        <FbMeterList :rows="usageRows" mode="meter" aria-label="Requests used against each free source's budget" data-test="fb-free-usage" />
      </FbFigure>

      <form class="fbfs__form" novalidate @submit.prevent="save">
        <div class="fbfs__cards">
          <div v-for="s in v.sources" :key="s.key" class="fbfs__card" :class="{ 'is-off': !d.enabled[s.key] }" :data-source="s.key">
            <div class="fbfs__cardhead">
              <label class="ui-switch fbfs__sw">
                <input v-model="d.enabled[s.key]" type="checkbox" :data-test="'fb-free-on-' + s.key" />
                <strong>{{ s.name }}</strong>
              </label>
              <span v-if="s.key === 'apifootball_pred'" class="ui-badge" :class="s.has_key ? 'ui-badge--paid' : 'ui-badge--overdue'">{{ s.has_key ? "Uses API-Football's key" : 'Needs the API-Football key' }}</span>
              <span v-else-if="s.needs_key" class="ui-badge" :class="s.has_key ? 'ui-badge--paid' : 'ui-badge--overdue'">{{ s.has_key ? 'Key saved' : 'Needs a key' }}</span>
              <span v-else class="ui-badge">No key needed</span>
            </div>
            <p class="pf-small fbfs__what">{{ s.what }}</p>
            <p class="pf-muted pf-small fbfs__tier">Free tier: {{ s.free_tier }}</p>
            <p v-if="s.key === 'apifootball_pred'" class="pf-muted pf-small fbfs__tier">The key is the API-Football key saved above; requests count in its daily budget at the lowest priority.</p>
            <div v-else-if="s.needs_key" class="fbfs__keyrow">
              <span v-if="s.has_key" class="pf-mono pf-small" :data-test="'fb-free-hint-' + s.key">{{ s.key_hint }}</span>
              <input
                v-model="keys[s.key]"
                class="ui-input"
                type="password"
                autocomplete="new-password"
                :placeholder="s.has_key ? 'Replace the key' : 'Paste the API key'"
                :aria-label="s.name + ' API key'"
                :data-test="'fb-free-key-' + s.key"
              />
            </div>
            <div class="fbfs__budget">
              <label class="pf-small" :for="'fbfs-b-' + s.key">Budget</label>
              <input :id="'fbfs-b-' + s.key" v-model.number="d.budgets[s.key]" class="ui-input" type="number" min="0" :data-test="'fb-free-budget-' + s.key" />
              <span class="pf-muted pf-small">requests a {{ s.period }}</span>
            </div>
            <div class="pf-small fbfs__status">
              <template v-if="s.last_error"><i class="fa-solid fa-circle-xmark pf-danger-text"></i> {{ s.last_error }}</template>
              <template v-else-if="s.last_ok_at"><i class="fa-solid fa-circle-check pf-success-text"></i> Last fetched {{ fmtDateTime(s.last_ok_at) }}</template>
              <template v-else><span class="pf-muted">Not fetched yet</span></template>
            </div>
            <div class="fbfs__cardacts">
              <button v-if="s.key !== 'feeds'" type="button" class="ui-btn ui-btn--sm" :disabled="testing[s.key]" :data-test="'fb-free-test-' + s.key" @click="test(s.key)">
                <i :class="testing[s.key] ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-plug'"></i> Test
              </button>
              <a v-if="s.docs" :href="s.docs" target="_blank" rel="noopener noreferrer" class="pf-small">Docs <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
            </div>
            <div v-if="tests[s.key]" class="pf-small" :class="tests[s.key].ok ? 'pf-success-text' : 'pf-danger-text'" :data-test="'fb-free-test-result-' + s.key">
              <i :class="tests[s.key].ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'"></i> {{ tests[s.key].message }}
            </div>
          </div>
        </div>

        <div class="fbfs__grid">
          <div class="ui-field">
            <label class="ui-label" for="fbfs-opb">OddsPapi bookmakers</label>
            <input id="fbfs-opb" v-model="d.oddspapi_bookmakers" class="ui-input" placeholder="betika,pinnacle" />
            <span class="ui-hint">Kenyan books seen so far: {{ (v.oddspapi && v.oddspapi.kenyan_known || []).join(', ') || 'none' }}</span>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbfs-fdc">football-data.co.uk extra countries</label>
            <input id="fbfs-fdc" v-model="d.fdcouk_new_countries" class="ui-input" placeholder="POL,AUT,DNK,ROU" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbfs-fds">Seasons of history</label>
            <input id="fbfs-fds" v-model.number="d.fdcouk_seasons" class="ui-input" type="number" min="1" max="10" />
            <span class="ui-hint">{{ v.fdcouk && v.fdcouk.matches ? v.fdcouk.matches.toLocaleString() + ' matches stored' : '' }}<template v-if="v.fdcouk && v.fdcouk.last_seed_at"> · seeded {{ fmtDateTime(v.fdcouk.last_seed_at) }}</template></span>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbfs-exp">Team news expires after (days)</label>
            <input id="fbfs-exp" v-model.number="d.news_expiry_days" class="ui-input" type="number" min="1" max="60" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbfs-dom">Sites needed to confirm a fact</label>
            <input id="fbfs-dom" v-model.number="d.news_confirm_domains" class="ui-input" type="number" min="2" max="5" />
            <span class="ui-hint">Independent sites within {{ v.news && v.news.confirm_window_days }} days</span>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="fbfs-hl">Google News edition (hl / gl / ceid)</label>
            <div class="fbfs__trio">
              <input id="fbfs-hl" v-model="d.news_google.hl" class="ui-input" aria-label="Language (hl)" placeholder="en-KE" />
              <input v-model="d.news_google.gl" class="ui-input" aria-label="Country (gl)" placeholder="KE" />
              <input v-model="d.news_google.ceid" class="ui-input" aria-label="Edition (ceid)" placeholder="KE:en" />
            </div>
          </div>
        </div>

        <fieldset class="fbfs__jp">
          <legend class="ui-label">Jackpot analyser defaults</legend>
          <div class="fbfs__weights">
            <label v-for="k in ['jackpot', 'market', 'clubelo', 'model']" :key="k" class="fbfs__w">
              <span class="pf-small"><i class="fbfs__sw2" :class="{ 'is-ring': k === 'jackpot' }" :style="swatch(k)"></i>{{ WEIGHT_LABEL[k] }}</span>
              <input v-model.number="d.jackpot_weights[k]" class="ui-input" type="number" step="0.05" min="0" max="1" :aria-label="WEIGHT_LABEL[k] + ' weight'" />
            </label>
            <label class="fbfs__w">
              <span class="pf-small">Tickets sold (sharing)</span>
              <input v-model.number="d.jackpot_sharing.tickets_sold" class="ui-input" type="number" min="0" step="1000" aria-label="Tickets sold" />
            </label>
            <label class="fbfs__w">
              <span class="pf-small">Favourite popularity</span>
              <input v-model.number="d.jackpot_sharing.popularity" class="ui-input" type="number" min="0.5" max="4" step="0.1" aria-label="Favourite popularity" />
            </label>
          </div>
          <span class="ui-hint">Weights are renormalised over the sources a game has (sum now {{ weightSum.toFixed(2) }}).</span>
        </fieldset>

        <!-- v2.18: the sources behind the picks' consensus chance -->
        <fieldset v-if="v.polymarket || v.openfootball || v.apifootball_pred" class="fbfs__jp fbfs__win" data-test="fb-win-sources">
          <legend class="ui-label">Sources for the picks (v2.18)</legend>
          <p class="pf-muted pf-small fbfs__p">
            Each match's pick blends the sharp market, all bookmakers, ClubElo, DASYIN's model and — when switched on above — Polymarket and API-Football's predictions; openfootball
            checks kick-offs and results and grades matches when API-Football is late. All three start switched off.
          </p>
          <div class="fbfs__grid">
            <div v-if="v.polymarket" class="ui-field" data-test="fb-win-polymarket">
              <label class="ui-label" for="fbfs-pml">Polymarket: least money in a market (US$)</label>
              <input id="fbfs-pml" v-model.number="d.polymarket_min_liquidity" class="ui-input" type="number" min="0" step="500" data-test="fb-win-pm-liquidity" />
              <span class="ui-hint">{{ v.polymarket.label }} · {{ v.polymarket.matched || 0 }} matches matched<template v-if="v.polymarket.last_discovery_at"> · looked {{ fmtDateTime(v.polymarket.last_discovery_at) }}</template></span>
            </div>
            <div v-if="v.polymarket" class="ui-field">
              <label class="ui-label" for="fbfs-pms">Polymarket: widest bid–ask spread</label>
              <input id="fbfs-pms" v-model.number="d.polymarket_max_spread" class="ui-input" type="number" min="0.005" max="0.5" step="0.005" data-test="fb-win-pm-spread" />
              <span class="ui-hint">0.04 = 4 points; wider markets are ignored</span>
            </div>
            <div v-if="v.polymarket" class="ui-field">
              <label class="ui-label" for="fbfs-pmg">Polymarket leagues (sport:competition id)</label>
              <input id="fbfs-pmg" v-model="d.polymarket_leagues" class="ui-input" placeholder="epl:39,lal:140" data-test="fb-win-pm-leagues" />
            </div>
            <div v-if="v.openfootball" class="ui-field" data-test="fb-win-openfootball">
              <label class="ui-label" for="fbfs-off">openfootball files</label>
              <input id="fbfs-off" v-model="d.openfootball_files" class="ui-input" placeholder="en.1,en.2,de.1,de.2,es.1,es.2,it.1,it.2,fr.1,fr.2" data-test="fb-win-of-files" />
              <span class="ui-hint"
                >Season {{ v.openfootball.season }} · {{ v.openfootball.licence }} · {{ (v.openfootball.matches || 0).toLocaleString() }} matches<template v-if="v.openfootball.last_fetch_at">
                  · fetched {{ fmtDateTime(v.openfootball.last_fetch_at) }}</template
                ></span
              >
            </div>
            <div v-if="v.apifootball_pred" class="ui-field" data-test="fb-win-apfpred">
              <span class="ui-label">API-Football predictions</span>
              <span class="pf-small">
                Upcoming matches in the next {{ v.apifootball_pred.window_hours }} h, once, plus one refresh about {{ Math.round((v.apifootball_pred.refresh_before_min || 180) / 60) }} h before
                kick-off · {{ v.apifootball_pred.stored || 0 }} stored
              </span>
            </div>
            <div v-if="consensusDefaults.length" class="ui-field" data-test="fb-win-weights">
              <span class="ui-label">Default weights</span>
              <span class="pf-small">{{ consensusDefaults.map(([k, w]) => `${consensusLabel(k)} ${Math.round(w * 100)}%`).join(' · ') }}</span>
              <span class="ui-hint"
                >Learned per competition group when enough graded matches beat the defaults — see the <router-link to="/football/model">model page</router-link>.</span
              >
            </div>
          </div>
          <div v-if="(v.not_used || []).length" class="fbfs__notused" data-test="fb-win-notused">
            <span class="ui-label">Not used, and why</span>
            <ul>
              <li v-for="x in v.not_used" :key="x.name"><strong>{{ x.name }}</strong> — {{ x.why }}</li>
            </ul>
          </div>
          <p v-if="v.history" class="pf-muted pf-small fbfs__p">
            Tier hit rates (Strong / Good / Close call / Coin-flip) come from
            <a v-if="v.history.url" :href="v.history.url" target="_blank" rel="noopener noreferrer">{{ v.history.source }}</a><template v-else>{{ v.history.source }}</template
            ><template v-if="v.history.n">, {{ Number(v.history.n).toLocaleString('en') }} matches</template>.
          </p>
        </fieldset>

        <div class="fbfs__actions">
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" data-test="fb-free-save"><i class="fa-solid fa-check"></i> Save free sources</button>
          <button type="button" class="ui-btn" :disabled="seeding" @click="seed"><i :class="seeding ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-database'"></i> Load results history now</button>
          <span v-if="seedResult" class="pf-small pf-muted">{{ seedResult }}</span>
        </div>
        <p class="pf-muted pf-small">{{ v.attribution }}</p>
      </form>

      <!-- Keyword rules per language -->
      <div class="fbfs__sec" data-test="fb-news-rules">
        <div class="fbfs__sechead">
          <h3>Team-news keywords</h3>
          <div class="fb-seg" role="tablist" aria-label="Language">
            <button v-for="l in languages" :key="l" type="button" role="tab" :aria-selected="lang === l" :class="{ 'is-on': lang === l }" :data-test="'fb-rules-lang-' + l" @click="lang = l">{{ LANG[l] || l }}</button>
          </div>
        </div>
        <p class="pf-muted pf-small">
          One keyword or phrase per line. Matching ignores case and accents and looks at word starts; end a stem with * (e.g. kontuzj*). “Not if” words stop a match (e.g. “wraca” = returns).
        </p>
        <div class="fbfs__rules">
          <div v-for="st in statuses" :key="st" class="ui-field fbfs__rule">
            <label class="ui-label" :for="'fbfs-r-' + st">{{ STATUS[st] || st }}</label>
            <textarea :id="'fbfs-r-' + st" v-model="ruleText[lang + '|' + st]" class="ui-input" rows="4" :data-test="`fb-rule-${lang}-${st}`"></textarea>
            <input v-model="negText[lang + '|' + st]" class="ui-input fbfs__neg" :aria-label="(STATUS[st] || st) + ': not if'" placeholder="Not if… (comma separated)" />
          </div>
        </div>
        <div class="fbfs__actions">
          <button type="button" class="ui-btn ui-btn--primary" :disabled="savingRules" data-test="fb-rules-save" @click="saveRules"><i class="fa-solid fa-check"></i> Save keywords</button>
          <button type="button" class="ui-btn ui-btn--ghost" :disabled="savingRules" @click="resetRules"><i class="fa-solid fa-rotate-left"></i> Back to the defaults</button>
          <span v-if="rulesChanged" class="pf-small pf-muted">Changed from the defaults</span>
        </div>
        <div class="fbfs__test">
          <label class="ui-label" for="fbfs-tt">Try a headline</label>
          <div class="fbfs__testrow">
            <input id="fbfs-tt" v-model="testText" class="ui-input" placeholder="e.g. Piast: Félix kontuzjowany, nie zagra z Koroną" data-test="fb-rules-test-text" />
            <button type="button" class="ui-btn" :disabled="!testText.trim()" data-test="fb-rules-test" @click="testRules">Test</button>
          </div>
          <div v-if="testOut" class="pf-small" data-test="fb-rules-test-result">
            Language {{ testOut.language || '—' }} ·
            <template v-if="(testOut.matches || []).length">matched {{ testOut.matches.map((m) => `${m.keyword} → ${STATUS[m.status] || m.status}`).join(', ') }}</template
            ><template v-else>no keyword matched</template>
            <template v-if="(testOut.players || []).length"> · players {{ testOut.players.map((p) => p.name).join(', ') }}</template>
            <template v-if="testOut.fact"> · fact: {{ testOut.fact.player || 'coach' }} {{ STATUS[testOut.fact.status] || testOut.fact.status }}</template>
          </div>
        </div>
      </div>

      <!-- Feeds -->
      <div class="fbfs__sec" data-test="fb-news-feeds">
        <h3>News feeds (RSS / Atom)</h3>
        <p class="pf-muted pf-small">
          Club sites, league sites and local sports press. Link each feed to a team or a competition (its id from the match page or the competitions list) so its headlines can be matched.
          Only titles, short snippets, links and dates are kept.
        </p>
        <div class="fb-scroll">
          <table class="fb-table">
            <thead>
              <tr>
                <th>On</th>
                <th>Feed</th>
                <th>Language</th>
                <th>For</th>
                <th class="num">Items</th>
                <th class="num">Confirmed</th>
                <th>Last fetched</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in feeds" :key="f.id" :data-feed="f.id">
                <td><input type="checkbox" :checked="f.enabled" :aria-label="'Feed ' + f.label + ' on'" @change="toggleFeed(f, $event.target.checked)" /></td>
                <td>
                  <div class="fbfs__feed">
                    <strong>{{ f.label }}</strong>
                    <span class="pf-muted pf-small fbfs__url">{{ f.url }}</span>
                    <span v-if="f.last_error" class="pf-danger-text pf-small">{{ f.last_error }}</span>
                  </div>
                </td>
                <td>{{ LANG[f.language] || f.language }}</td>
                <td class="pf-small">{{ f.team_id ? 'team ' + f.team_id : f.competition_id ? 'competition ' + f.competition_id : 'everything' }}</td>
                <td class="num">{{ f.items ?? 0 }}</td>
                <td class="num">{{ f.reliability != null ? Math.round(f.reliability * 100) + '%' : '—' }}</td>
                <td class="pf-small">{{ f.last_fetched_at ? fmtDateTime(f.last_fetched_at) : 'never' }}</td>
                <td class="num"><button type="button" class="fb-linkbtn" :aria-label="'Delete feed ' + f.label" @click="deleteFeed(f)"><i class="fa-regular fa-trash-can"></i></button></td>
              </tr>
              <tr v-if="!feeds.length">
                <td colspan="8" class="pf-muted">No feeds yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <form class="fbfs__feedform" novalidate @submit.prevent="addFeed">
          <input v-model.trim="nf.label" class="ui-input" placeholder="Name, e.g. Ekstraklasa news" aria-label="Feed name" data-test="fb-feed-label" />
          <input v-model.trim="nf.url" class="ui-input" type="url" placeholder="https://…/rss" aria-label="Feed address" data-test="fb-feed-url" />
          <select v-model="nf.language" class="ui-select" aria-label="Feed language" data-test="fb-feed-lang">
            <option v-for="l in languages" :key="l" :value="l">{{ LANG[l] || l }}</option>
          </select>
          <input v-model.number="nf.team_id" class="ui-input" type="number" placeholder="Team id" aria-label="Team id (a team or a competition is needed)" data-test="fb-feed-team" />
          <input v-model.number="nf.competition_id" class="ui-input" type="number" placeholder="or competition id" aria-label="Competition id (a team or a competition is needed)" data-test="fb-feed-comp" />
          <button type="submit" class="ui-btn" :disabled="!nf.url || !nf.label || !(nf.team_id || nf.competition_id)" data-test="fb-feed-add"><i class="fa-solid fa-plus"></i> Add feed</button>
        </form>
      </div>

      <!-- News sources' reliability -->
      <div v-if="newsSources.length" class="fbfs__sec" data-test="fb-news-sources">
        <h3>News sites — how often their facts were later confirmed</h3>
        <FbFigure title="Confirmed share per site" subtitle="Facts first reported by the site that were later confirmed (API-Football, a second site or a manager)" :table="relTable" chart-id="news-reliability">
          <FbMeterList :rows="relRows" mode="meter" color="var(--fb-home)" aria-label="Share of each site's facts that were later confirmed" />
        </FbFigure>
      </div>
    </template>
  </div>
</template>

<script>
import { footballAdminApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'
import { providerName, SOURCE_STYLE } from '@/components/football/fb'
import { consensusLabel } from '@/components/football/verdict/verdict'
import FbFigure from '@/components/football/charts/FbFigure.vue'
import FbMeterList from '@/components/football/charts/FbMeterList.vue'

const LANG = { en: 'English', pl: 'Polish', de: 'German', nl: 'Dutch', da: 'Danish', ro: 'Romanian', fr: 'French', sw: 'Swahili' }
const STATUS = { injured: 'Injured', suspended: 'Suspended', doubtful: 'Doubtful', returning: 'Returning', coach_change: 'Coach change' }
const WEIGHT_LABEL = { jackpot: 'Jackpot odds', market: 'Market', clubelo: 'ClubElo', model: 'DASYIN model' }
const splitList = (t) =>
  String(t || '')
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean)

export default {
  name: 'FreeSourcesSettings',
  components: { FbFigure, FbMeterList },
  data() {
    return {
      LANG,
      STATUS,
      WEIGHT_LABEL,
      v: null,
      d: { enabled: {}, budgets: {}, news_google: {}, jackpot_weights: {}, jackpot_sharing: {} },
      keys: { oddspapi: '', fdorg: '' },
      tests: {},
      testing: {},
      saving: false,
      running: false,
      runResult: null,
      seeding: false,
      seedResult: '',
      loadError: '',
      rules: [],
      statuses: Object.keys(STATUS),
      languages: Object.keys(LANG),
      lang: 'en',
      ruleText: {},
      negText: {},
      rulesChanged: false,
      savingRules: false,
      testText: '',
      testOut: null,
      feeds: [],
      nf: { label: '', url: '', language: 'en', team_id: null, competition_id: null },
      newsSources: []
    }
  },
  computed: {
    usageRows() {
      return (this.v?.sources || []).map((s) => {
        const u = s.usage || {}
        const used = Number(u.used) || 0
        const budget = Number(this.d.budgets[s.key] ?? s.budget) || 0
        return {
          key: s.key,
          label: s.name,
          sub: `${this.d.enabled[s.key] ? 'on' : 'off'} · per ${s.period}`,
          value: used,
          max: budget,
          valueText: `${used.toLocaleString()} / ${budget.toLocaleString()}`,
          tip: [
            ['Used', `${used} requests this ${s.period}`],
            ['Budget', `${budget} a ${s.period}`],
            ...(s.period === 'month' && u.daily_allowance != null ? [['Pace', `${u.daily_allowance} a day for the rest of the month`]] : [])
          ]
        }
      })
    },
    usageTable() {
      return { cols: [{ label: 'Source' }, { label: 'Period' }, { label: 'Used', num: true }, { label: 'Budget', num: true }], rows: this.usageRows.map((r) => [r.label, r.sub, r.value, r.max]) }
    },
    consensusDefaults() {
      const order = ['sharp', 'market', 'clubelo', 'model', 'polymarket', 'apifootball_pred']
      return Object.entries(this.v?.consensus?.defaults || {}).sort((a, b) => (order.indexOf(a[0]) + 99) % 99 - ((order.indexOf(b[0]) + 99) % 99))
    },
    weightSum() {
      return Object.values(this.d.jackpot_weights || {}).reduce((t, x) => t + (Number(x) || 0), 0)
    },
    relRows() {
      return this.newsSources.slice(0, 15).map((s) => ({
        key: s.domain,
        label: s.domain,
        sub: `${s.facts} fact${s.facts === 1 ? '' : 's'} · ${s.dismissed || 0} dismissed`,
        value: s.reliability ?? 0,
        max: 1,
        valueText: s.reliability != null ? `${Math.round(s.reliability * 100)}%` : '—',
        tip: [
          ['Facts', s.facts],
          ['Confirmed', s.confirmed],
          ['Dismissed', s.dismissed]
        ]
      }))
    },
    relTable() {
      return { cols: [{ label: 'Site' }, { label: 'Facts', num: true }, { label: 'Confirmed', num: true }, { label: 'Dismissed', num: true }, { label: 'Share', num: true }], rows: this.newsSources.map((s) => [s.domain, s.facts, s.confirmed, s.dismissed, s.reliability != null ? Math.round(s.reliability * 100) + '%' : '—']) }
    }
  },
  created() {
    this.load()
  },
  methods: {
    fmtDateTime: formatDateTime,
    consensusLabel,
    swatch(k) {
      const s = SOURCE_STYLE[k]
      return s.ring ? { boxShadow: `inset 0 0 0 2px ${s.color}` } : { background: s.color }
    },
    costText(c) {
      return (
        Object.entries(c || {})
          .map(([k, n]) => `${providerName(k)} ${n}`)
          .join(', ') || 'none'
      )
    },
    apply(v) {
      this.v = v
      const enabled = {}
      const budgets = {}
      for (const s of v.sources || []) {
        enabled[s.key] = !!s.enabled
        budgets[s.key] = s.budget
      }
      this.d = {
        enabled,
        budgets,
        oddspapi_bookmakers: (v.oddspapi?.bookmakers || []).join(','),
        fdcouk_new_countries: (v.fdcouk?.new_countries || []).join(','),
        fdcouk_seasons: v.fdcouk?.seasons ?? 3,
        news_expiry_days: v.news?.expiry_days ?? 14,
        news_confirm_domains: v.news?.confirm_domains ?? 2,
        news_google: { hl: v.news?.google?.hl || '', gl: v.news?.google?.gl || '', ceid: v.news?.google?.ceid || '' },
        jackpot_weights: { jackpot: 0.25, market: 0.45, clubelo: 0.15, model: 0.15, ...(v.jackpot?.weights || {}) },
        jackpot_sharing: { tickets_sold: 300000, popularity: 1.5, ...(v.jackpot?.sharing || {}) },
        // v2.18
        polymarket_min_liquidity: v.polymarket?.min_liquidity ?? 5000,
        polymarket_max_spread: v.polymarket?.max_spread ?? 0.04,
        polymarket_leagues: (v.polymarket?.leagues || []).map((l) => `${l.sport}:${l.competition_id}`).join(','),
        openfootball_files: (v.openfootball?.files || []).map((f) => f.code).join(',')
      }
      if (v.news?.languages?.length) this.languages = v.news.languages
    },
    async load() {
      this.loadError = ''
      try {
        this.apply(await footballAdminApi.sources())
        this.loadRules()
        this.loadFeeds()
        footballAdminApi
          .newsSources()
          .then((r) => (this.newsSources = r.sources || []))
          .catch(() => {})
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the free sources')
      }
    },
    async save() {
      const body = {
        enabled: { ...this.d.enabled },
        budgets: Object.fromEntries(Object.entries(this.d.budgets).map(([k, n]) => [k, Number(n) || 0])),
        oddspapi_bookmakers: this.d.oddspapi_bookmakers,
        fdcouk_new_countries: this.d.fdcouk_new_countries,
        fdcouk_seasons: Number(this.d.fdcouk_seasons) || 3,
        news_expiry_days: Number(this.d.news_expiry_days) || 14,
        news_confirm_domains: Number(this.d.news_confirm_domains) || 2,
        news_google: { ...this.d.news_google },
        jackpot_weights: Object.fromEntries(Object.entries(this.d.jackpot_weights).map(([k, n]) => [k, Number(n) || 0])),
        jackpot_sharing: { tickets_sold: Number(this.d.jackpot_sharing.tickets_sold) || 0, popularity: Number(this.d.jackpot_sharing.popularity) || 1 }
      }
      if (this.v?.polymarket) {
        body.polymarket_min_liquidity = Number(this.d.polymarket_min_liquidity) || 0
        body.polymarket_max_spread = Number(this.d.polymarket_max_spread) || 0.04
        body.polymarket_leagues = this.d.polymarket_leagues || ''
      }
      if (this.v?.openfootball) body.openfootball_files = this.d.openfootball_files || ''
      if (this.keys.oddspapi) body.oddspapi_key = this.keys.oddspapi
      if (this.keys.fdorg) body.fdorg_key = this.keys.fdorg
      this.saving = true
      try {
        this.apply(await footballAdminApi.saveSources(body))
        this.keys = { oddspapi: '', fdorg: '' }
        toast.success('Free sources saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.saving = false
      }
    },
    async test(provider) {
      if (this.keys[provider]) await this.save()
      this.testing = { ...this.testing, [provider]: true }
      try {
        this.tests = { ...this.tests, [provider]: await footballAdminApi.testSource(provider) }
      } catch (e) {
        this.tests = { ...this.tests, [provider]: { ok: false, message: apiErrorMessage(e, 'Test failed') } }
      } finally {
        this.testing = { ...this.testing, [provider]: false }
      }
    },
    async run() {
      this.running = true
      this.runResult = null
      try {
        this.runResult = await footballAdminApi.runSources({})
        this.apply(await footballAdminApi.sources())
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Fetch failed'))
      } finally {
        this.running = false
      }
    },
    async seed() {
      this.seeding = true
      this.seedResult = ''
      try {
        const r = await footballAdminApi.seedHistory({ seasons: Number(this.d.fdcouk_seasons) || 3 })
        this.seedResult = `${r.files} files, ${r.matches} matches (${r.inserted} new, ${r.merged} merged), ${r.odds} closing odds`
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load the history'))
      } finally {
        this.seeding = false
      }
    },
    // ---------- rules
    applyRules(r) {
      this.rules = r.rules || []
      if (r.statuses?.length) this.statuses = r.statuses
      if (r.languages?.length) this.languages = r.languages
      this.rulesChanged = !!r.defaults_changed
      const t = {}
      const n = {}
      for (const l of this.languages) for (const s of this.statuses) {
        t[l + '|' + s] = ''
        n[l + '|' + s] = ''
      }
      for (const x of this.rules) {
        t[x.language + '|' + x.status] = (x.keywords || []).join('\n')
        n[x.language + '|' + x.status] = (x.negative || []).join(', ')
      }
      this.ruleText = t
      this.negText = n
    },
    async loadRules() {
      try {
        this.applyRules(await footballAdminApi.newsRules())
      } catch {
        /* shown empty */
      }
    },
    collectRules() {
      const out = []
      for (const l of this.languages)
        for (const s of this.statuses) {
          const kw = splitList(this.ruleText[l + '|' + s])
          const neg = splitList(this.negText[l + '|' + s])
          if (kw.length) out.push(neg.length ? { language: l, status: s, keywords: kw, negative: neg } : { language: l, status: s, keywords: kw })
        }
      return out
    },
    async saveRules() {
      this.savingRules = true
      try {
        this.applyRules(await footballAdminApi.saveNewsRules({ rules: this.collectRules() }))
        toast.success('Keywords saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the keywords'))
      } finally {
        this.savingRules = false
      }
    },
    async resetRules() {
      if (!(await confirmDialog({ title: 'Go back to the default keywords?', message: 'Your changes to every language are replaced by the defaults.', confirmText: 'Reset' }))) return
      this.savingRules = true
      try {
        this.applyRules(await footballAdminApi.saveNewsRules({ reset: true }))
        toast.success('Default keywords restored')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not reset'))
      } finally {
        this.savingRules = false
      }
    },
    async testRules() {
      try {
        this.testOut = await footballAdminApi.testNewsRules({ text: this.testText, language: this.lang })
      } catch (e) {
        this.testOut = null
        toast.error(apiErrorMessage(e, 'Test failed'))
      }
    },
    // ---------- feeds
    async loadFeeds() {
      try {
        this.feeds = (await footballAdminApi.newsFeeds()).feeds || []
      } catch {
        this.feeds = []
      }
    },
    async addFeed() {
      try {
        const body = { url: this.nf.url, label: this.nf.label, language: this.nf.language, enabled: true }
        if (this.nf.team_id) body.team_id = this.nf.team_id
        if (this.nf.competition_id) body.competition_id = this.nf.competition_id
        await footballAdminApi.addNewsFeed(body)
        this.nf = { label: '', url: '', language: this.nf.language, team_id: null, competition_id: null }
        toast.success('Feed added')
        this.loadFeeds()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not add the feed'))
      }
    },
    async toggleFeed(f, on) {
      try {
        await footballAdminApi.updateNewsFeed(f.id, { url: f.url, label: f.label, language: f.language, team_id: f.team_id || undefined, competition_id: f.competition_id || undefined, enabled: on })
        this.loadFeeds()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the feed'))
      }
    },
    async deleteFeed(f) {
      if (!(await confirmDialog({ title: 'Delete this feed?', message: `${f.label} — ${f.url}`, confirmText: 'Delete', danger: true }))) return
      try {
        await footballAdminApi.deleteNewsFeed(f.id)
        this.loadFeeds()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the feed'))
      }
    }
  }
}
</script>

<style scoped>
.fbfs {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.fbfs__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px 16px;
}
.fbfs__head h3,
.fbfs__sec h3 {
  font-size: 15px;
  font-weight: 650;
  margin: 0 0 6px;
}
.fbfs__head p {
  margin: 0;
  max-width: 760px;
}
.fbfs__form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}
.fbfs__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.fbfs__card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  align-content: start;
  min-width: 0;
}
.fbfs__card.is-off {
  background: var(--surface-2);
}
.fbfs__cardhead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.fbfs__sw {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.fbfs__what,
.fbfs__tier {
  margin: 0;
}
.fbfs__keyrow {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
}
.fbfs__budget {
  display: grid;
  grid-template-columns: auto 90px auto;
  gap: 6px;
  align-items: center;
}
.fbfs__budget .ui-input {
  height: 32px;
  min-height: 32px;
}
.fbfs__status {
  overflow-wrap: anywhere;
}
.fbfs__cardacts {
  display: flex;
  align-items: center;
  gap: 10px;
}
.fbfs__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
}
.fbfs__grid .ui-field {
  margin: 0;
  min-width: 0;
}
.fbfs__trio {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.fbfs__jp {
  border: 0;
  margin: 0;
  padding: 0;
}
.fbfs__win {
  border-top: 1px solid var(--border);
  padding-top: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.fbfs__p {
  margin: 0;
}
.fbfs__notused ul {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-2);
}
.fbfs__weights {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px 12px;
}
.fbfs__w {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
}
.fbfs__sw2 {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 5px;
}
.fbfs__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
}
.fbfs__sec {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
.fbfs__sechead {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.fbfs__rules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}
.fbfs__rule {
  margin: 0;
}
.fbfs__rule textarea {
  width: 100%;
  resize: vertical;
  font-size: 13px;
}
.fbfs__neg {
  margin-top: 4px;
  height: 30px;
  min-height: 30px;
  font-size: 12px;
}
.fbfs__test {
  margin-top: 12px;
}
.fbfs__testrow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-bottom: 6px;
}
.fbfs__feed {
  display: flex;
  flex-direction: column;
  min-width: 180px;
  max-width: 420px;
}
.fbfs__url {
  overflow-wrap: anywhere;
}
.fbfs__feedform {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) 130px 140px 160px auto;
  gap: 8px;
  margin-top: 10px;
}
@media (max-width: 1100px) {
  .fbfs__weights {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .fbfs__feedform {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .fbfs__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .fbfs__grid,
  .fbfs__feedform {
    grid-template-columns: minmax(0, 1fr);
  }
  .fbfs__weights {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
