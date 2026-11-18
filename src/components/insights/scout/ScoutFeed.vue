<template>
  <div data-testid="scout-feed">
    <section class="ui-card mb">
      <div class="tools">
        <div class="ui-input-group search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            v-model="f.q"
            class="ui-input"
            type="search"
            placeholder="Search opportunities…"
            aria-label="Search opportunities"
            data-testid="scout-search"
            @input="debounced"
          />
        </div>
        <select
          v-model="f.type"
          class="ui-select"
          aria-label="Type"
          data-testid="scout-type"
          @change="load()"
        >
          <option value="">All types</option>
          <option v-for="t in feed ? feed.types : []" :key="t.key" :value="t.key">
            {{ t.label }} ({{ t.count }})
          </option>
        </select>
        <select
          v-model="f.country"
          class="ui-select"
          aria-label="Country"
          data-testid="scout-country"
          @change="load()"
        >
          <option value="">All countries</option>
          <option v-for="c in feed ? feed.countries : []" :key="c.key" :value="c.key">
            {{ c.label }} ({{ c.count }})
          </option>
        </select>
        <select
          v-model="f.deadline"
          class="ui-select"
          aria-label="Deadline"
          data-testid="scout-deadline-filter"
          @change="load()"
        >
          <option value="">Any deadline</option>
          <option value="7">Closing within 7 days</option>
          <option value="30">Within 30 days</option>
          <option value="90">Within 90 days</option>
          <option value="none">No fixed deadline</option>
        </select>
        <select
          v-model="f.sort"
          class="ui-select"
          aria-label="Order"
          data-testid="scout-sort"
          @change="load()"
        >
          <option value="fit">Best fit first</option>
          <option value="deadline">Deadline soonest</option>
          <option value="newest">Newest first</option>
          <option value="value">Highest value</option>
        </select>
      </div>
      <div class="chips" role="group" aria-label="Status">
        <button
          v-for="s in STATUSES"
          :key="s.key"
          type="button"
          class="tchip"
          :class="{ on: f.status === s.key }"
          :data-status-filter="s.key"
          @click="setStatus(s.key)"
        >
          <i v-if="s.icon" :class="s.icon"></i> {{ s.label }}
          <span v-if="countOf(s.key) !== null">{{ countOf(s.key) }}</span>
        </button>
      </div>
    </section>

    <div v-if="error" class="ui-alert ui-alert--danger mb">
      <i class="fa-solid fa-circle-exclamation"></i
      ><span>{{ error }} <a href="#" @click.prevent="load()">Try again</a></span>
    </div>
    <div v-if="!feed" class="ui-skeleton" style="height: 260px"></div>

    <div v-else-if="!feed.items.length" class="ui-card">
      <div class="ui-empty small" data-testid="scout-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-binoculars"></i></div>
        <h3>{{ emptyTitle }}</h3>
        <p v-if="filtered">
          Try another filter. <a href="#" @click.prevent="clearFilters">Clear filters</a>
        </p>
        <p v-else-if="enabled">
          Opportunities appear here after the next scan — or use “Scan now”.
        </p>
        <p v-else>
          Set up the scout and switch it on to start finding tenders, grants, partners and leads.
        </p>
      </div>
    </div>

    <div v-else class="items" :class="{ busy: loading }">
      <ScoutCard
        v-for="o in feed.items"
        :key="o.id"
        :o="o"
        :today="feed.today"
        :home="feed.currency"
        :can-edit="canEdit"
        :busy="busy === o.id"
        :focused="focus === o.id"
        :reasons="reasons"
        @pursue="pursue"
        @save="save"
        @dismiss="dismissing = $event"
        @remind="remind"
        @restore="restore"
        @notes="saveNotes"
      />
      <div v-if="feed.items.length < feed.total" class="more">
        <button class="ui-btn" type="button" :disabled="loading" @click="more">
          Show more ({{ feed.total - feed.items.length }} left)
        </button>
      </div>
    </div>

    <!-- Dismiss with a reason -->
    <div v-if="dismissing" class="ui-modal-backdrop" @mousedown.self="dismissing = null">
      <form
        class="ui-modal"
        style="max-width: 480px"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sd-title"
        data-testid="scout-dismiss-modal"
        @submit.prevent="dismiss"
      >
        <div class="ui-modal__head">
          <h2 id="sd-title">Not a fit?</h2>
          <button
            class="ui-btn ui-btn--icon ui-btn--ghost"
            type="button"
            aria-label="Close"
            @click="dismissing = null"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="ui-modal__body">
          <p class="lead">“{{ dismissing.title }}”</p>
          <p class="ui-hint">
            Your reason is sent with the next scans as “not interested”, so the scout stops
            suggesting things like this.
          </p>
          <fieldset class="reasons">
            <legend class="sr">Why it is not a fit</legend>
            <label
              v-for="r in reasons"
              :key="r.key"
              class="reason"
              :class="{ on: dReason === r.key }"
            >
              <input
                v-model="dReason"
                type="radio"
                name="dismiss-reason"
                :value="r.key"
                :data-reason="r.key"
              />
              {{ r.label }}
            </label>
          </fieldset>
          <div class="ui-field">
            <label for="sd-note">Anything to add? (optional)</label>
            <input
              id="sd-note"
              v-model="dNote"
              class="ui-input"
              maxlength="300"
              placeholder="e.g. we don't sell hardware"
              data-testid="scout-dismiss-note"
            />
          </div>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn" type="button" @click="dismissing = null">Cancel</button>
          <button
            class="ui-btn ui-btn--primary"
            type="submit"
            :disabled="!dReason || !!busy"
            data-action="dismiss-confirm"
          >
            Dismiss
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import ScoutCard from './ScoutCard.vue'
import { scoutApi } from '@/services/scout'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const PAGE = 25
const STATUSES = [
  { key: 'active', label: 'Open', icon: 'fa-solid fa-inbox' },
  { key: 'saved', label: 'Saved', icon: 'fa-solid fa-bookmark' },
  { key: 'pursued', label: 'Pursued', icon: 'fa-solid fa-diagram-project' },
  { key: 'dismissed', label: 'Dismissed', icon: 'fa-regular fa-eye-slash' },
  { key: 'expired', label: 'Expired', icon: 'fa-regular fa-calendar-xmark' },
  { key: 'all', label: 'All' },
]

export default {
  name: 'ScoutFeed',
  components: { ScoutCard },
  props: {
    canEdit: { type: Boolean, default: false },
    enabled: { type: Boolean, default: false },
    reasons: { type: Array, default: () => [] },
    focusId: { type: String, default: '' },
    version: { type: Number, default: 0 },
  },
  emits: ['changed'],
  data() {
    return {
      STATUSES,
      feed: null,
      error: '',
      loading: false,
      busy: '',
      f: { q: '', type: '', country: '', deadline: '', sort: 'fit', status: 'active' },
      limit: PAGE,
      seq: 0,
      timer: null,
      focus: '',
      dismissing: null,
      dReason: '',
      dNote: '',
    }
  },
  computed: {
    filtered() {
      return !!(this.f.q || this.f.type || this.f.country || this.f.deadline)
    },
    emptyTitle() {
      if (this.filtered) return 'Nothing matches these filters'
      const s = this.f.status
      if (s === 'saved') return 'No saved opportunities'
      if (s === 'pursued') return 'Nothing pursued yet'
      if (s === 'dismissed') return 'Nothing dismissed'
      if (s === 'expired') return 'Nothing expired'
      return 'No open opportunities yet'
    },
  },
  watch: {
    version() {
      this.load(true)
    },
    dismissing(v) {
      if (v) {
        this.dReason = ''
        this.dNote = ''
      }
    },
  },
  created() {
    this.load().then(() => this.focusCard())
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    countOf(k) {
      const s = this.feed?.statuses
      if (!s) return null
      if (k === 'active') return (s.new || 0) + (s.saved || 0)
      if (k === 'all') return null
      return s[k] || 0
    },
    params() {
      return { ...this.f, limit: this.limit }
    },
    async load(keepLimit = false) {
      if (!keepLimit) this.limit = PAGE
      const seq = ++this.seq
      this.loading = true
      try {
        const r = await scoutApi.list(this.params())
        if (seq !== this.seq) return
        this.feed = r.feed
        this.error = ''
      } catch (e) {
        if (seq === this.seq) this.error = apiErrorMessage(e, 'Could not load the opportunities.')
      } finally {
        if (seq === this.seq) this.loading = false
      }
    },
    async focusCard() {
      const id = this.focusId
      if (!id || !this.feed) return
      if (!this.feed.items.some((o) => o.id === id)) {
        try {
          const o = await scoutApi.get(id)
          this.feed.items.unshift(o)
        } catch {
          return
        }
      }
      this.focus = id
      this.$nextTick(() => {
        const el = document.querySelector(`[data-opp="${id}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      setTimeout(() => (this.focus = ''), 4000)
    },
    debounced() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.load(), 300)
    },
    setStatus(s) {
      this.f.status = s
      this.load()
    },
    clearFilters() {
      this.f = { ...this.f, q: '', type: '', country: '', deadline: '' }
      this.load()
    },
    more() {
      this.limit += PAGE
      this.load(true)
    },
    async act(o, fn, msg) {
      this.busy = o.id
      try {
        const r = await fn()
        if (msg) toast.success(typeof msg === 'function' ? msg(r) : msg)
        await this.load(true)
        this.$emit('changed')
        return r
      } catch (e) {
        toast.error(apiErrorMessage(e, 'That did not work'))
        return null
      } finally {
        this.busy = ''
      }
    },
    save(o) {
      const on = o.status !== 'saved'
      this.act(o, () => scoutApi.update(o.id, { saved: on }), on ? 'Saved' : 'Removed from saved')
    },
    async pursue(o) {
      const r = await this.act(
        o,
        () => scoutApi.pursue(o.id),
        (x) => `Added to the CRM as a ${x.kind} — with the source links`,
      )
      if (r) toast.info(`Open the CRM ${r.kind === 'lead' ? 'leads' : 'pipeline'} to follow it up.`)
    },
    remind(o, date) {
      this.act(
        o,
        () => scoutApi.remind(o.id, date),
        date ? 'Reminder set — you will get a notification that morning' : 'Reminder cleared',
      )
    },
    restore(o) {
      this.act(o, () => scoutApi.update(o.id, { restore: true }), 'Back in the feed')
    },
    saveNotes(o, notes) {
      this.act(o, () => scoutApi.update(o.id, { notes }), 'Note saved')
    },
    async dismiss() {
      const o = this.dismissing
      if (!o || !this.dReason) return
      const r = await this.act(
        o,
        () => scoutApi.dismiss(o.id, this.dReason, this.dNote),
        'Dismissed — later scans will skip things like this',
      )
      if (r) this.dismissing = null
    },
  },
}
</script>

<style scoped>
.mb {
  margin-bottom: 14px;
}

.tools {
  display: grid;
  grid-template-columns: minmax(200px, 2fr) repeat(4, minmax(0, 1fr));
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

.tchip i {
  font-size: 11px;
}

.tchip span {
  font-size: 11px;
  background: var(--bg-subtle);
  border-radius: 999px;
  padding: 1px 7px;
}

.tchip.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.items.busy {
  opacity: 0.75;
}

.more {
  display: flex;
  justify-content: center;
  padding: 6px 0 2px;
}

.lead {
  margin: 0 0 6px;
  font-weight: 600;
  color: var(--text);
}

.reasons {
  border: 0;
  padding: 0;
  margin: 12px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.reason {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 13px;
  color: var(--text-2);
  cursor: pointer;
}

.reason input {
  accent-color: var(--accent);
  margin: 0;
}

.reason.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text);
}

@media (max-width: 980px) {
  .tools {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tools .search {
    grid-column: 1 / -1;
  }
}
</style>
