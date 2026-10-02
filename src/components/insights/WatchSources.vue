<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 900px" role="dialog" aria-modal="true" aria-labelledby="ws-title" data-testid="watch-sources-modal">
      <div class="ui-modal__head">
        <h2 id="ws-title">Sources</h2>
        <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-if="!d" class="ui-skeleton" style="height: 260px"></div>
        <template v-else>
          <!-- Add a source -->
          <section v-if="canEdit" class="blk">
            <h3>Add a source</h3>
            <form class="addrow" @submit.prevent="check">
              <div class="ui-input-group grow">
                <i class="fa-solid fa-rss"></i>
                <input v-model.trim="add.url" class="ui-input" type="text" inputmode="url" placeholder="https://example.com/feed/" aria-label="Feed address" data-testid="feed-url" @input="resetPreview" />
              </div>
              <button class="ui-btn" type="submit" :disabled="add.checking || !add.url" data-testid="feed-check"><i :class="add.checking ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-magnifying-glass'"></i> Check</button>
            </form>
            <span class="ui-hint">The address of an RSS or Atom feed (https only). It is fetched once to check it before it is added.</span>
            <div v-if="add.error" class="ui-alert ui-alert--danger mt" data-testid="feed-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ add.error }}</span></div>
            <div v-if="add.preview" class="preview" data-testid="feed-preview">
              <div class="preview__head">
                <strong>{{ add.preview.title || 'Untitled feed' }}</strong>
                <span class="ui-badge ui-badge--success"><i class="fa-solid fa-check"></i> {{ add.preview.kind.toUpperCase() }} · {{ add.preview.count }} item{{ add.preview.count === 1 ? '' : 's' }}</span>
              </div>
              <p v-if="add.preview.note" class="ui-hint">{{ add.preview.note }}</p>
              <ol class="latest">
                <li v-for="(it, i) in add.preview.latest" :key="i">
                  <span>{{ it.title }}</span>
                  <small>{{ it.published_at ? ago(it.published_at) : 'no date' }}</small>
                </li>
              </ol>
              <div class="fields">
                <div class="ui-field">
                  <label for="ws-name">Name</label>
                  <input id="ws-name" v-model.trim="add.title" class="ui-input" maxlength="200" data-testid="feed-name" />
                </div>
                <div class="ui-field">
                  <label for="ws-country">About one country?</label>
                  <select id="ws-country" v-model="add.country" class="ui-select" data-testid="feed-country">
                    <option value="">No — international</option>
                    <option v-for="c in d.countries" :key="c.iso2" :value="c.iso2">{{ c.name }}</option>
                  </select>
                </div>
              </div>
              <div class="ui-field">
                <label>File every item under (optional)</label>
                <div class="topics">
                  <label v-for="t in d.topics" :key="t.key" class="topic" :class="{ on: add.topics.includes(t.key) }">
                    <input v-model="add.topics" type="checkbox" :value="t.key" /> {{ t.label }}
                  </label>
                </div>
              </div>
              <button class="ui-btn ui-btn--primary" type="button" :disabled="add.saving" data-testid="feed-add" @click="saveNew"><i v-if="add.saving" class="fa-solid fa-spinner fa-spin"></i> Add source</button>
            </div>
          </section>

          <!-- Followed sources -->
          <section class="blk">
            <h3>Your sources <small>{{ d.feeds.length }} of {{ d.max }}</small></h3>
            <div v-if="!d.feeds.length" class="ui-empty small"><p>No sources yet. Add a feed above or pick from the suggestions below.</p></div>
            <ul v-else class="feeds">
              <li v-for="f in d.feeds" :key="f.id" class="feed" :class="{ off: !f.enabled }" :data-feed="f.title">
                <div class="feed__main">
                  <strong>{{ f.title }}</strong>
                  <small class="url">{{ f.url }}</small>
                  <div class="feed__meta">
                    <span class="ui-badge" :class="status(f).cls">{{ status(f).label }}</span>
                    <span>{{ f.items }} stored</span>
                    <span v-if="f.last_fetched_at">checked {{ ago(f.last_fetched_at) }}</span>
                    <span v-if="f.country">{{ f.country }}</span>
                    <span v-for="t in f.topics" :key="t" class="tag">{{ topicLabel(t) }}</span>
                  </div>
                  <p v-if="f.last_status === 'error'" class="err" data-testid="feed-last-error"><i class="fa-solid fa-triangle-exclamation"></i> {{ f.last_error }}<template v-if="f.failures > 1"> ({{ f.failures }} times in a row)</template></p>
                </div>
                <div v-if="canEdit" class="feed__act">
                  <label class="ui-switch" :title="f.enabled ? 'Switched on' : 'Switched off'">
                    <input type="checkbox" :checked="f.enabled" :disabled="busy === f.id" :aria-label="'Follow ' + f.title" data-action="toggle" @change="toggle(f, $event)" />
                  </label>
                  <button class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" type="button" :disabled="busy === f.id" :aria-label="'Refresh ' + f.title" title="Fetch now" data-action="refresh" @click="refreshOne(f)">
                    <i class="fa-solid fa-rotate" :class="{ 'fa-spin': busy === f.id }"></i>
                  </button>
                  <button class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" type="button" :aria-label="'Remove ' + f.title" title="Remove" data-action="remove" @click="remove(f)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </li>
            </ul>
          </section>

          <!-- Suggestions -->
          <section v-if="d.suggested.length" class="blk" data-testid="watch-suggested">
            <div class="blk__head">
              <h3>Suggested sources <small>{{ d.suggested.length }}</small></h3>
              <button v-if="canEdit" class="ui-btn ui-btn--sm" type="button" :disabled="addingAll" data-testid="suggested-add-all" @click="addAll"><i :class="addingAll ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-list-check'"></i> Check &amp; add all</button>
            </div>
            <p class="ui-hint">{{ d.note }} These addresses have not been confirmed yet, so some may have moved.</p>
            <div v-for="g in groups" :key="g.key" class="grp">
              <h4>{{ g.label }}</h4>
              <ul class="sugg">
                <li v-for="s in g.items" :key="s.key" :data-suggested="s.key">
                  <div class="feed__main">
                    <strong>{{ s.title }}</strong>
                    <small>{{ s.about }}</small>
                    <small class="url">{{ s.url }}</small>
                    <p v-if="failed[s.key]" class="err"><i class="fa-solid fa-triangle-exclamation"></i> Not added: {{ failed[s.key] }}</p>
                  </div>
                  <button v-if="canEdit" class="ui-btn ui-btn--sm" type="button" :disabled="busy === s.key || addingAll" data-action="add-suggested" @click="addOne(s)">
                    <i :class="busy === s.key ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plus'"></i> Add
                  </button>
                </li>
              </ul>
            </div>
          </section>
        </template>
      </div>
      <div class="ui-modal__foot">
        <button class="ui-btn ui-btn--primary" type="button" data-testid="sources-done" @click="$emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<script>
import { watchApi, ago } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const blank = () => ({ url: '', checking: false, saving: false, error: '', preview: null, title: '', country: '', topics: [] })

export default {
  name: 'WatchSources',
  props: { canEdit: { type: Boolean, default: false } },
  emits: ['close', 'changed'],
  data() {
    return { d: null, error: '', add: blank(), busy: '', addingAll: false, failed: {} }
  },
  computed: {
    groups() {
      if (!this.d) return []
      return this.d.groups.map((g) => ({ key: g.Key, label: g.Label, items: this.d.suggested.filter((s) => s.group === g.Key) })).filter((g) => g.items.length)
    }
  },
  created() {
    this.load()
  },
  methods: {
    ago,
    async load() {
      try {
        this.d = await watchApi.feeds()
        this.error = ''
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the sources.')
      }
    },
    topicLabel(k) {
      return (this.d.topics.find((t) => t.key === k) || {}).label || k
    },
    status(f) {
      if (!f.enabled) return { label: 'Off', cls: 'ui-badge--draft' }
      if (f.last_status === 'error') return { label: 'Error', cls: 'ui-badge--danger' }
      if (f.last_status === 'ok' || f.last_status === 'not_modified') return { label: 'OK', cls: 'ui-badge--success' }
      return { label: 'Not fetched yet', cls: 'ui-badge--info' }
    },
    resetPreview() {
      this.add.preview = null
      this.add.error = ''
    },
    async check() {
      this.add.checking = true
      this.add.error = ''
      this.add.preview = null
      try {
        const p = await watchApi.preview(this.add.url)
        this.add.preview = p
        this.add.url = p.url
        this.add.title = p.title || ''
      } catch (e) {
        this.add.error = apiErrorMessage(e, 'Could not read that address.')
      } finally {
        this.add.checking = false
      }
    },
    async saveNew() {
      this.add.saving = true
      this.add.error = ''
      try {
        const r = await watchApi.addFeed({ url: this.add.url, title: this.add.title, country: this.add.country, topics: this.add.topics })
        toast.success(`${r.feed.title} added · ${r.run.new} headline${r.run.new === 1 ? '' : 's'} stored`)
        this.add = blank()
        await this.load()
        this.$emit('changed')
      } catch (e) {
        this.add.error = apiErrorMessage(e, 'Could not add the source.')
      } finally {
        this.add.saving = false
      }
    },
    async toggle(f, ev) {
      const on = ev.target.checked
      this.busy = f.id
      try {
        await watchApi.updateFeed(f.id, { enabled: on })
        toast.success(`${f.title} switched ${on ? 'on' : 'off'}`)
      } catch (e) {
        ev.target.checked = !on
        toast.error(apiErrorMessage(e, 'Could not change the source'))
      } finally {
        this.busy = ''
        await this.load()
        this.$emit('changed')
      }
    },
    async refreshOne(f) {
      this.busy = f.id
      try {
        const r = await watchApi.refresh(f.id)
        const run = r.feeds[0] || {}
        if (run.status === 'error') toast.error(`${f.title}: ${run.error}`)
        else toast.success(`${f.title}: ${run.new || 0} new item${run.new === 1 ? '' : 's'}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not fetch the source'))
      } finally {
        this.busy = ''
        await this.load()
        this.$emit('changed')
      }
    },
    async remove(f) {
      const okay = await confirmDialog({
        title: `Remove ${f.title}?`,
        message: `Its ${f.items} stored headline${f.items === 1 ? '' : 's'} will be deleted, except the ones you saved.`,
        confirmText: 'Remove',
        danger: true
      })
      if (!okay) return
      try {
        await watchApi.removeFeed(f.id)
        toast.success(`${f.title} removed`)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the source'))
      }
    },
    async addOne(s) {
      this.busy = s.key
      try {
        const r = await watchApi.addFeed({ catalog_key: s.key })
        const rest = { ...this.failed }
        delete rest[s.key]
        this.failed = rest
        toast.success(`${r.feed.title} added · ${r.run.new} headline${r.run.new === 1 ? '' : 's'} stored`)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        this.failed = { ...this.failed, [s.key]: apiErrorMessage(e, 'the address did not answer with a feed') }
      } finally {
        this.busy = ''
      }
    },
    async addAll() {
      this.addingAll = true
      try {
        const r = await watchApi.addSuggested([])
        const failed = {}
        r.failed.forEach((x) => (failed[x.key] = x.error))
        this.failed = failed
        if (r.added.length) toast.success(`${r.added.length} source${r.added.length === 1 ? '' : 's'} added · ${r.new_items} headlines stored`)
        if (r.failed.length) toast.warning(`${r.failed.length} did not answer with a feed and ${r.failed.length === 1 ? 'was' : 'were'} not added`)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not check the suggested sources'))
      } finally {
        this.addingAll = false
      }
    }
  }
}
</script>

<style scoped>
.blk {
  margin-bottom: 22px;
}

.blk:last-child {
  margin-bottom: 0;
}

.blk h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.blk h3 small,
.grp h4 {
  font-weight: 500;
  color: var(--text-3);
  font-size: 12px;
}

.blk__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.blk__head h3 {
  margin: 0;
}

.grp h4 {
  margin: 14px 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
}

.addrow {
  display: flex;
  gap: 8px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.mt {
  margin-top: 10px;
}

.preview {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.preview__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.latest {
  margin: 10px 0 12px;
  padding-left: 20px;
  font-size: 13px;
  color: var(--text);
}

.latest li {
  margin-bottom: 4px;
}

.latest small {
  display: block;
  color: var(--text-3);
  font-size: 11.5px;
}

.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.topics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.topic {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
  background: var(--surface);
}

.topic.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text);
}

.topic input {
  margin: 0;
}

.feeds,
.sugg {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.feeds > li,
.sugg > li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}

.feeds > li:first-child,
.sugg > li:first-child {
  border-top: 0;
}

.feed.off .feed__main > strong {
  color: var(--text-3);
}

.feed__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.feed__main small {
  color: var(--text-3);
  font-size: 12px;
}

.url {
  overflow-wrap: anywhere;
}

.feed__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 3px;
}

.tag {
  padding: 0 7px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-2);
}

.err {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--danger);
}

.feed__act {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

@media (max-width: 560px) {
  .addrow {
    flex-direction: column;
  }

  .fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .feeds > li,
  .sugg > li {
    flex-direction: column;
  }
}
</style>
