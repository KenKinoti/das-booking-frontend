<template>
  <div data-testid="watch">
    <div class="bar">
      <p class="lead">
        News and developments from the sources you follow, stored here with history
        <template v-if="l">({{ l.retention_days }} days; saved items are kept)</template>. Every item is tagged and scored against your business with keyword rules you can read and change.
      </p>
      <div class="actions">
        <button v-if="canEdit && l && l.feeds" class="ui-btn ui-btn--sm" type="button" :disabled="refreshing" data-testid="watch-refresh" @click="refresh()">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': refreshing }"></i> Refresh now
        </button>
        <button class="ui-btn ui-btn--sm" type="button" data-testid="watch-sources" @click="showSources = true"><i class="fa-solid fa-rss"></i> Sources<template v-if="l"> ({{ l.feeds }})</template></button>
        <button class="ui-btn ui-btn--sm" type="button" data-testid="watch-rules" @click="showRules = true"><i class="fa-solid fa-sliders"></i> Keyword rules</button>
      </div>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load()">Try again</a></span></div>
    <div v-if="l && l.feeds_failing" class="ui-alert ui-alert--warning mb" data-testid="watch-failing">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span>{{ l.feeds_failing }} source{{ l.feeds_failing === 1 ? '' : 's' }} could not be read at the last refresh. <a href="#" @click.prevent="showSources = true">See what went wrong</a></span>
    </div>

    <div v-if="!l" class="ui-skeleton" style="height: 320px"></div>

    <!-- No sources yet -->
    <section v-else-if="!l.feeds" class="ui-card" data-testid="watch-empty">
      <div class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-rss"></i></div>
        <h3>Follow your industry</h3>
        <p>
          Add the news feeds (RSS / Atom) of the tech press, regulators, platform vendors and trade bodies you care about. Headlines are fetched once a day and kept here; nothing but the
          feed's own title and summary is stored.
        </p>
        <div v-if="canEdit" class="empty-actions">
          <button class="ui-btn ui-btn--primary" type="button" :disabled="addingAll" data-testid="watch-add-suggested" @click="addSuggested()">
            <i :class="addingAll ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-wand-magic-sparkles'"></i> Check &amp; add the {{ l.suggested }} suggested sources
          </button>
          <button class="ui-btn" type="button" @click="showSources = true"><i class="fa-solid fa-plus"></i> Add a source</button>
        </div>
        <p class="ui-hint">Each suggested source is tested first: one that does not answer with a readable feed is not added.</p>
      </div>
    </section>

    <template v-else>
      <p class="status" data-testid="watch-status">
        <i class="fa-regular fa-clock"></i>
        <template v-if="l.last_run">Last refreshed {{ ago(l.last_run) }} — {{ l.last_status }}.</template>
        <template v-else>Not refreshed yet.</template>
        {{ l.feeds_enabled }} of {{ l.feeds }} source{{ l.feeds === 1 ? '' : 's' }} switched on; refreshed automatically once a day.
      </p>

      <section class="ui-card mb">
        <div class="tools">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="f.q" class="ui-input" type="search" placeholder="Search headlines…" aria-label="Search headlines" data-testid="watch-search" @input="debounced" />
          </div>
          <select v-model="f.topic" class="ui-select" aria-label="Topic" data-testid="watch-topic" @change="load()">
            <option value="">All topics</option>
            <option v-for="t in l.topics" :key="t.key" :value="t.key">{{ t.label }} ({{ t.count }})</option>
          </select>
          <select v-model="f.country" class="ui-select" aria-label="Country" data-testid="watch-country" @change="load()">
            <option value="">All countries</option>
            <option v-for="c in l.countries" :key="c.key" :value="c.key">{{ c.label }} ({{ c.count }})</option>
          </select>
          <select v-model="f.source" class="ui-select" aria-label="Source" data-testid="watch-source" @change="load()">
            <option value="">All sources</option>
            <option v-for="s in l.sources" :key="s.key" :value="s.key">{{ s.label }} ({{ s.count }})</option>
          </select>
          <select v-model.number="f.days" class="ui-select" aria-label="Period" data-testid="watch-days" @change="load()">
            <option :value="7">Last 7 days</option>
            <option :value="30">Last 30 days</option>
            <option :value="90">Last 90 days</option>
            <option :value="0">All stored</option>
          </select>
          <select v-model="f.sort" class="ui-select" aria-label="Order" data-testid="watch-sort" @change="load()">
            <option value="relevance">Most relevant first</option>
            <option value="newest">Newest first</option>
          </select>
        </div>
        <div class="chips">
          <button type="button" class="tchip" :class="{ on: view === 'all' }" data-view="all" @click="setView('all')">All <span>{{ l.all }}</span></button>
          <button type="button" class="tchip" :class="{ on: view === 'unread' }" data-view="unread" @click="setView('unread')"><i class="fa-solid fa-circle dot"></i> Unread <span>{{ l.unread }}</span></button>
          <button type="button" class="tchip" :class="{ on: view === 'saved' }" data-view="saved" @click="setView('saved')"><i class="fa-solid fa-bookmark"></i> Saved <span>{{ l.saved }}</span></button>
          <button type="button" class="tchip" :class="{ on: view === 'dismissed' }" data-view="dismissed" @click="setView('dismissed')"><i class="fa-regular fa-eye-slash"></i> Dismissed</button>
          <span class="grow"></span>
          <button v-if="l.unread" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-testid="watch-read-all" @click="readAll"><i class="fa-solid fa-check-double"></i> Mark all read</button>
        </div>
      </section>

      <div v-if="!l.items.length" class="ui-card">
        <div class="ui-empty small" data-testid="watch-none">
          <div class="ui-empty__icon"><i class="fa-regular fa-newspaper"></i></div>
          <h3>{{ l.all ? 'Nothing matches these filters' : 'No headlines yet' }}</h3>
          <p v-if="l.all">Try a longer period or clear the filters. <a href="#" @click.prevent="clearFilters">Clear filters</a></p>
          <p v-else>Use “Refresh now” to fetch your sources.</p>
        </div>
      </div>
      <div v-else class="items" :class="{ busy: loading }">
        <article v-for="it in l.items" :key="it.id" class="ui-card item" :class="{ unread: !it.read_at }" :data-item="it.id" :data-score="it.score">
          <div class="score" :class="scoreClass(it.score)" :title="'Relevance ' + it.score + ' of 100'">
            <strong>{{ Math.round(it.score) }}</strong>
            <small>relevance</small>
          </div>
          <div class="item__main">
            <h3>
              <a v-if="safe(it.link)" :href="it.link" target="_blank" rel="noopener noreferrer" data-action="open" @click="markRead(it)">{{ it.title }} <i class="fa-solid fa-arrow-up-right-from-square ext"></i></a>
              <span v-else>{{ it.title }}</span>
            </h3>
            <div class="meta">
              <span class="src">{{ it.source }}</span>
              <span>{{ when(it) }}</span>
              <span v-for="c in it.countries" :key="c" class="cc">{{ countryName(c) }}</span>
            </div>
            <p v-if="it.summary" class="sum">{{ it.summary }}</p>
            <div v-if="it.reasons.length" class="why" aria-label="Why it's relevant">
              <span class="why__label">Why it's relevant</span>
              <button v-for="r in it.reasons" :key="r.kind + r.key" type="button" class="reason" :class="'k-' + r.kind" :title="r.detail" @click="toggleWhy(it.id)">
                <i :class="r.kind === 'country' ? 'fa-solid fa-location-dot' : 'fa-solid fa-tag'"></i> {{ r.label }} <b>+{{ r.points }}</b>
              </button>
            </div>
            <ul v-if="whyOpen[it.id]" class="whylist">
              <li v-for="r in it.reasons" :key="'d' + r.kind + r.key"><strong>{{ r.label }}</strong> (+{{ r.points }}): {{ r.detail }}</li>
            </ul>
          </div>
          <div class="item__act">
            <button class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" :class="{ on: it.saved }" type="button" :aria-pressed="it.saved" :aria-label="it.saved ? 'Remove from saved' : 'Save'" :title="it.saved ? 'Saved — click to remove' : 'Save'" data-action="save" @click="patch(it, { saved: !it.saved })">
              <i :class="it.saved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'"></i>
            </button>
            <button class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" type="button" :aria-label="it.read_at ? 'Mark as unread' : 'Mark as read'" :title="it.read_at ? 'Mark as unread' : 'Mark as read'" data-action="read" @click="patch(it, { read: !it.read_at })">
              <i :class="it.read_at ? 'fa-regular fa-envelope-open' : 'fa-regular fa-envelope'"></i>
            </button>
            <button class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" type="button" :aria-label="it.dismissed ? 'Restore' : 'Dismiss'" :title="it.dismissed ? 'Restore' : 'Dismiss — not relevant'" data-action="dismiss" @click="patch(it, { dismissed: !it.dismissed })">
              <i :class="it.dismissed ? 'fa-solid fa-rotate-left' : 'fa-solid fa-xmark'"></i>
            </button>
          </div>
        </article>
        <div v-if="l.items.length < l.total" class="more">
          <button class="ui-btn" type="button" :disabled="loading" data-testid="watch-more" @click="more">Show more ({{ l.total - l.items.length }} left)</button>
        </div>
      </div>
    </template>

    <WatchSources v-if="showSources" :can-edit="canEdit" @close="closeSources" @changed="load()" />
    <WatchRules v-if="showRules" :can-edit="canEdit" @close="showRules = false" @saved="load()" />
  </div>
</template>

<script>
import WatchSources from './WatchSources.vue'
import WatchRules from './WatchRules.vue'
import { watchApi, ago } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const PAGE = 20

export default {
  name: 'IndustryWatch',
  components: { WatchSources, WatchRules },
  data() {
    return {
      l: null,
      canEdit: false,
      error: '',
      loading: false,
      refreshing: false,
      addingAll: false,
      showSources: false,
      showRules: false,
      view: 'all',
      f: { q: '', topic: '', country: '', source: '', days: 30, sort: 'relevance' },
      limit: PAGE,
      whyOpen: {},
      timer: null,
      seq: 0
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    ago,
    params() {
      return {
        q: this.f.q.trim(),
        topic: this.f.topic,
        country: this.f.country,
        source: this.f.source,
        days: this.view === 'saved' ? 0 : this.f.days,
        sort: this.f.sort,
        saved: this.view === 'saved' ? 1 : '',
        unread: this.view === 'unread' ? 1 : '',
        dismissed: this.view === 'dismissed' ? 1 : '',
        limit: this.limit
      }
    },
    async load(keepLimit = false) {
      if (!keepLimit) this.limit = PAGE
      // Filters can change while a request is in flight: only the latest answer is shown.
      const seq = ++this.seq
      this.loading = true
      try {
        const r = await watchApi.list(this.params())
        if (seq !== this.seq) return
        this.l = r.list
        this.canEdit = !!r.can_edit
        this.error = ''
      } catch (e) {
        if (seq === this.seq) this.error = apiErrorMessage(e, 'Could not load the industry watch.')
      } finally {
        if (seq === this.seq) this.loading = false
      }
    },
    debounced() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.load(), 300)
    },
    setView(v) {
      this.view = v
      this.load()
    },
    clearFilters() {
      this.f = { q: '', topic: '', country: '', source: '', days: 0, sort: this.f.sort }
      this.view = 'all'
      this.load()
    },
    more() {
      this.limit += PAGE
      this.load(true)
    },
    when(it) {
      return ago(it.published_at || it.first_seen_at)
    },
    countryName(c) {
      const hit = (this.l?.countries || []).find((x) => x.key === c)
      return hit ? hit.label : c
    },
    safe(link) {
      return /^https?:\/\//i.test(link || '')
    },
    scoreClass(s) {
      return s >= 50 ? 'hi' : s >= 20 ? 'mid' : 'lo'
    },
    toggleWhy(id) {
      this.whyOpen = { ...this.whyOpen, [id]: !this.whyOpen[id] }
    },
    async patch(it, p) {
      try {
        const u = await watchApi.setItem(it.id, p)
        if ('saved' in p) toast.success(u.saved ? 'Saved — kept beyond the 180 days' : 'Removed from saved')
        if ('dismissed' in p) toast.info(u.dismissed ? 'Dismissed' : 'Restored')
        await this.load(true)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the item'))
      }
    },
    markRead(it) {
      if (it.read_at) return
      watchApi
        .setItem(it.id, { read: true })
        .then(() => this.load(true))
        .catch(() => {})
    },
    async readAll() {
      try {
        const r = await watchApi.readAll()
        toast.success(`${r.marked} item${r.marked === 1 ? '' : 's'} marked as read`)
        this.load(true)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not mark the items as read'))
      }
    },
    async refresh() {
      this.refreshing = true
      try {
        const r = await watchApi.refresh()
        const msg = `${r.checked} source${r.checked === 1 ? '' : 's'} checked · ${r.new} new item${r.new === 1 ? '' : 's'}`
        if (r.errors) toast.warning(`${msg} · ${r.errors} could not be read`)
        else toast.success(msg)
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not refresh the sources'))
      } finally {
        this.refreshing = false
      }
    },
    async addSuggested() {
      this.addingAll = true
      try {
        const r = await watchApi.addSuggested([])
        if (r.added.length) toast.success(`${r.added.length} source${r.added.length === 1 ? '' : 's'} added · ${r.new_items} headlines stored`)
        if (r.failed.length) {
          toast.warning(`${r.failed.length} suggested source${r.failed.length === 1 ? '' : 's'} did not answer with a feed — see Sources`)
          if (!r.added.length) this.showSources = true
        }
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not check the suggested sources'))
      } finally {
        this.addingAll = false
      }
    },
    closeSources() {
      this.showSources = false
      this.load()
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.bar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.lead {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  max-width: 760px;
}

.actions,
.empty-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.empty-actions {
  justify-content: center;
  margin: 14px 0 10px;
}

.status {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--text-3);
}

.tools {
  display: grid;
  grid-template-columns: minmax(200px, 2fr) repeat(5, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 14px 0;
}

.tools .ui-select,
.tools .ui-input {
  min-width: 0;
  width: 100%;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px 14px 12px;
}

.grow {
  flex: 1;
}

.tchip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
}

.tchip span {
  font-size: 11px;
  background: var(--bg-subtle);
  border-radius: 999px;
  padding: 1px 7px;
  color: var(--text-2);
}

.tchip.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text);
}

.tchip .dot {
  font-size: 7px;
  color: var(--accent);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.items.busy {
  opacity: 0.7;
}

.item {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 14px;
  padding: 14px 16px;
  align-items: start;
}

.item.unread {
  border-left: 3px solid var(--accent);
  padding-left: 13px;
}

.score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  color: var(--text-2);
  line-height: 1.1;
}

.score strong {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.score small {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

.score.hi {
  background: var(--success-soft);
}

.score.mid {
  background: var(--info-soft);
}

.item h3 {
  margin: 0 0 4px;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 600;
}

.item.unread h3 {
  font-weight: 700;
}

.item h3 a {
  color: var(--text);
  text-decoration: none;
}

.item h3 a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.ext {
  font-size: 10px;
  color: var(--text-3);
  margin-left: 2px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 12px;
  color: var(--text-3);
  margin-bottom: 6px;
}

.meta .src {
  color: var(--text-2);
  font-weight: 600;
}

.meta .cc {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-2);
}

.sum {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}

.why {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.why__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
  margin-right: 2px;
}

.reason {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 11.5px;
  cursor: pointer;
}

.reason i {
  font-size: 9.5px;
  color: var(--text-3);
}

.reason b {
  font-weight: 650;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.reason.k-country {
  border-color: var(--border-strong);
}

.whylist {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}

.item__act {
  display: flex;
  gap: 2px;
}

.item__act .on {
  color: var(--accent);
}

.more {
  display: flex;
  justify-content: center;
  padding: 6px 0 2px;
}

@media (max-width: 980px) {
  .tools {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tools .search {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .item {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 10px;
    padding: 12px;
  }

  .item.unread {
    padding-left: 9px;
  }

  .score {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-start;
    gap: 6px;
    padding: 4px 10px;
    width: max-content;
  }

  .score strong {
    font-size: 15px;
  }

  .item__act {
    flex-direction: column;
  }
}
</style>
