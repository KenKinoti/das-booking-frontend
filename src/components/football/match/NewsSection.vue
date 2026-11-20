<template>
  <FbSection id="team-news" title="Team news & news" :subtitle="subtitle">
    <p class="fb-honest fbn__rules">
      <i class="fa-solid fa-circle-info"></i>
      <span
        >{{ tn.rules_note || 'Found with keyword rules. Only confirmed facts change the model.' }}
        <span class="fbn__key"><span class="fb-fact fb-fact--confirmed"><i class="fa-solid fa-check"></i>Confirmed</span> used when it concerns a squad player</span>
        <span class="fbn__key"><span class="fb-fact fb-fact--reported"><i class="fa-regular fa-newspaper"></i>Reported</span> shown, never used on its own</span></span
      >
    </p>

    <div class="fbn__teams">
      <div v-for="t in teams" :key="t.side" class="fbn__team" :data-side="t.side">
        <div class="fbn__teamhead"><i class="fb-key" :style="{ background: t.color }"></i><strong>{{ t.name }}</strong><span class="fb-muted fb-small">{{ t.facts.length }} fact{{ t.facts.length === 1 ? '' : 's' }}</span></div>
        <p v-if="!t.facts.length" class="fb-muted fb-small fbn__none">No injuries, suspensions or coach news found.</p>
        <ul class="fbn__facts">
          <li v-for="f in t.facts" :key="f.id" class="fbn__fact" :class="{ 'is-dismissed': f.dismissed, 'is-expired': f.expired }" :data-fact="f.id" :data-confidence="f.dismissed ? 'dismissed' : f.confidence">
            <div class="fbn__line">
              <i class="fb-mark" :class="f.confidence === 'confirmed' && !f.dismissed ? 'fb-mark--confirmed' : 'fb-mark--reported'" aria-hidden="true"></i>
              <strong class="fbn__who">{{ f.role === 'coach' ? 'Coach' : f.player || 'Unnamed player' }}</strong>
              <span class="fbn__status">{{ STATUS[f.status] || f.status }}</span>
              <span v-if="f.dismissed" class="fb-fact fb-fact--dismissed" data-test="fb-fact-badge">Dismissed</span>
              <span v-else-if="f.confidence === 'confirmed'" class="fb-fact fb-fact--confirmed" data-test="fb-fact-badge"><i class="fa-solid fa-check" aria-hidden="true"></i>Confirmed</span>
              <span v-else class="fb-fact fb-fact--reported" data-test="fb-fact-badge"><i class="fa-regular fa-newspaper" aria-hidden="true"></i>Reported</span>
              <span v-if="f.used_in_model && !f.dismissed" class="fb-pill fb-pill--info fbn__used" title="Changes the model's missing-player adjustment">used by the model</span>
            </div>
            <div class="fb-small fbn__note">
              {{ f.confidence_note }}<template v-if="f.expired"> · expired</template> · seen {{ fmtShort(f.first_seen) }}<template v-if="f.last_seen && f.last_seen !== f.first_seen">–{{ fmtShort(f.last_seen) }}</template> ·
              expires {{ fmtShort(f.expires_at) }}
            </div>
            <ul class="fbn__srcs">
              <li v-for="(s, i) in f.sources" :key="i">
                <a v-if="s.url" :href="s.url" target="_blank" rel="noopener noreferrer nofollow" class="fbn__title">{{ s.title || s.domain }}</a>
                <span v-else class="fbn__title">{{ s.title || providerName(s.provider) }}</span>
                <span class="fb-muted fb-small">
                  {{ s.domain || providerName(s.provider) }} · <span class="fbn__lang">{{ (s.language || '').toUpperCase() }}</span> · {{ fmtShort(s.published_at) }} · {{ providerName(s.provider) }}<template v-if="s.reliability != null">
                    · confirmed {{ Math.round(s.reliability * 100) }}% of the time</template
                  >
                </span>
              </li>
            </ul>
            <div v-if="f.keywords && f.keywords.length" class="fbn__kws" aria-label="Matched keywords">
              <span v-for="k in f.keywords" :key="k" class="fbn__kw">{{ k }}</span>
            </div>
            <div v-if="f.review" class="fb-small fbn__review" data-test="fb-fact-review">
              <i :class="f.review.action === 'confirm' ? 'fa-solid fa-user-check' : 'fa-solid fa-user-xmark'" aria-hidden="true"></i>
              {{ f.review.action === 'confirm' ? 'Confirmed' : 'Dismissed' }} by {{ f.review.by }} · {{ fmtShort(f.review.at) }}<template v-if="f.review.scope === 'platform'"> · for every organisation</template
              ><template v-if="f.review.note"> · “{{ f.review.note }}”</template>
            </div>
            <div v-if="tn.can_review" class="fbn__acts">
              <template v-if="noteFor === f.id">
                <input v-model.trim="note" class="ui-input fbn__noteinput" maxlength="200" placeholder="Note (optional), e.g. club confirmed on its site" aria-label="Note" @keydown.enter.prevent="review(f, pending)" />
                <button type="button" class="ui-btn ui-btn--sm ui-btn--primary" :disabled="busy === f.id" data-test="fb-fact-save" @click="review(f, pending)"><i class="fa-solid fa-check"></i> {{ pending === 'confirm' ? 'Confirm' : 'Dismiss' }}</button>
                <button type="button" class="ui-btn ui-btn--sm" @click="noteFor = ''">Cancel</button>
              </template>
              <template v-else>
                <button v-if="!(f.review && f.review.action === 'confirm') && !(f.confidence === 'confirmed' && !f.review)" type="button" class="ui-btn ui-btn--sm" :disabled="busy === f.id" data-test="fb-fact-confirm" @click="ask(f, 'confirm')">
                  <i class="fa-solid fa-check"></i> Confirm
                </button>
                <button v-if="!f.dismissed" type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy === f.id" data-test="fb-fact-dismiss" @click="ask(f, 'dismiss')"><i class="fa-solid fa-xmark"></i> Dismiss</button>
                <button v-if="f.review" type="button" class="fb-linkbtn" :disabled="busy === f.id" data-test="fb-fact-clear" @click="review(f, 'clear')"><i class="fa-solid fa-rotate-left"></i> Undo my review</button>
              </template>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- News list -->
    <div class="fbn__newshead">
      <div>
        <div class="fb-fig__title">News</div>
        <div class="fb-fig__sub">
          {{ news.total || 0 }} headline{{ news.total === 1 ? '' : 's' }}<template v-if="providerText"> · {{ providerText }}</template><template v-if="news.fetched_at"> · fetched {{ ago(news.fetched_at, now) }}</template>
        </div>
      </div>
      <div class="fb-seg" role="radiogroup" aria-label="Show news">
        <button v-for="o in filters" :key="o.key" type="button" role="radio" :aria-checked="filter === o.key" :class="{ 'is-on': filter === o.key }" @click="filter = o.key">{{ o.label }}</button>
      </div>
    </div>
    <ul v-if="shownNews.length" class="fbn__news" data-test="fb-news-list">
      <li v-for="n in shownNews" :key="n.id" :data-news="n.id">
        <a :href="n.url" target="_blank" rel="noopener noreferrer nofollow" class="fbn__title">{{ n.title }}</a>
        <div class="fb-muted fb-small fbn__meta">
          <span class="fbn__domain">{{ n.domain }}</span> · <span class="fbn__lang">{{ (n.language || '').toUpperCase() }}</span> · {{ fmtShort(n.published_at) }} · {{ providerName(n.provider) }}
        </div>
        <p v-if="n.snippet" class="fbn__snip">{{ n.snippet }}</p>
        <div v-if="(n.matched_keywords || []).length || (n.players || []).length" class="fbn__kws">
          <span v-for="k in n.matched_keywords" :key="'k' + k" class="fbn__kw" title="Matched keyword">{{ k }}</span>
          <span v-for="p in n.players" :key="'p' + p" class="fbn__kw fbn__kw--p" title="Squad player named"><i class="fa-regular fa-user" aria-hidden="true"></i> {{ p }}</span>
        </div>
      </li>
    </ul>
    <p v-else class="fb-muted fb-small">No headlines for this filter.</p>
    <p class="fb-muted fb-small" style="margin: 8px 0 0">{{ news.note }}</p>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { ago, providerName } from '../fb'

const STATUS = { injured: 'Injured', suspended: 'Suspended', doubtful: 'Doubtful', returning: 'Returning', coach_change: 'Coach change' }

export default {
  name: 'NewsSection',
  components: { FbSection },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' },
    now: { type: String, default: '' }
  },
  emits: ['reviewed'],
  data() {
    return { STATUS, filter: 'all', busy: '', noteFor: '', pending: '', note: '', local: {} }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    tn() {
      return this.a.team_news || { home: [], away: [], counts: {} }
    },
    news() {
      return this.a.news || { items: [], total: 0 }
    },
    subtitle() {
      const c = this.tn.counts || {}
      return `${c.confirmed || 0} confirmed · ${c.reported || 0} reported · ${c.used_in_model || 0} used by the model · headlines with sources and dates`
    },
    teams() {
      const fix = (list) => (list || []).map((x) => this.local[x.id] || x)
      return [
        { side: 'home', name: this.f.home.name, color: 'var(--fb-home)', facts: fix(this.tn.home) },
        { side: 'away', name: this.f.away.name, color: 'var(--fb-away)', facts: fix(this.tn.away) }
      ]
    },
    providerText() {
      const p = this.news.providers || {}
      return Object.entries(p)
        .filter(([, n]) => n)
        .map(([k, n]) => `${providerName(k)} ${n}`)
        .join(', ')
    },
    filters() {
      return [
        { key: 'all', label: 'All' },
        { key: 'facts', label: 'Team news only' },
        { key: 'home', label: this.f.home.name },
        { key: 'away', label: this.f.away.name }
      ]
    },
    shownNews() {
      const items = this.news.items || []
      const hid = this.f.home.id
      const aid = this.f.away.id
      if (this.filter === 'facts') return items.filter((n) => (n.matched_keywords || []).length || (n.fact_ids || []).length)
      if (this.filter === 'home') return items.filter((n) => (n.team_ids || []).includes(hid))
      if (this.filter === 'away') return items.filter((n) => (n.team_ids || []).includes(aid))
      return items
    }
  },
  methods: {
    ago,
    providerName,
    fmtShort(iso) {
      if (!iso) return '—'
      return new Intl.DateTimeFormat(undefined, { timeZone: this.tz, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
    },
    ask(f, action) {
      this.noteFor = f.id
      this.pending = action
      this.note = ''
    },
    async review(f, action) {
      this.busy = f.id
      try {
        const r = await footballApi.reviewFact(f.id, { action, note: action === 'clear' ? undefined : this.note || undefined })
        if (r?.fact) this.local = { ...this.local, [f.id]: r.fact }
        this.noteFor = ''
        toast.success(action === 'confirm' ? 'Confirmed — the model now counts it for your organisation' : action === 'dismiss' ? 'Dismissed — it will not be used' : 'Review removed')
        this.$emit('reviewed', r?.fact)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the review'))
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.fbn__rules {
  margin: 0 0 14px;
}
.fbn__key {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 4px 12px 0 0;
  white-space: nowrap;
}
.fbn__teams {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.fbn__teamhead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.fbn__none {
  margin: 0;
}
.fbn__facts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.fbn__fact {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 5px;
  min-width: 0;
}
.fbn__fact.is-dismissed,
.fbn__fact.is-expired {
  background: var(--surface-2);
}
.fbn__fact.is-dismissed .fbn__who,
.fbn__fact.is-dismissed .fbn__status {
  color: var(--text-3);
}
.fbn__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}
.fbn__status {
  font-size: 13px;
  color: var(--text-2);
}
.fbn__used {
  height: 20px;
  font-size: 10.5px;
}
.fbn__note {
  color: var(--text-2);
}
.fbn__srcs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
}
.fbn__srcs li,
.fbn__news li {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
}
.fbn__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  overflow-wrap: anywhere;
}
a.fbn__title:hover {
  text-decoration: underline;
}
.fbn__lang {
  font-weight: 650;
  letter-spacing: 0.02em;
}
.fbn__kws {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.fbn__kw {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 7px;
  border-radius: 6px;
  font-size: 11.5px;
  background: var(--neutral-soft);
  color: var(--text-2);
}
.fbn__kw--p {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
.fbn__review {
  color: var(--text-2);
}
.fbn__acts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.fbn__noteinput {
  flex: 1 1 200px;
  min-width: 0;
  height: 32px;
  min-height: 32px;
  font-size: 12.5px;
}
.fbn__newshead {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  align-items: flex-end;
  margin: 22px 0 8px;
}
.fbn__news {
  list-style: none;
  margin: 0;
  padding: 0;
}
.fbn__news li {
  padding: 9px 0;
  border-top: 1px solid var(--border);
  gap: 3px;
}
.fbn__snip {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-2);
}
.fbn__domain {
  font-weight: 600;
  color: var(--text-2);
}
@media (max-width: 900px) {
  .fbn__teams {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
