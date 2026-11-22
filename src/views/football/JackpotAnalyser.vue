<template>
  <div class="ui-page fb fbja" data-test="fb-jackpot">
    <FbNoAccess v-if="forbidden" :reason="forbidden" />
    <template v-else>
      <!-- New jackpot -->
      <template v-if="isNew">
        <header class="ui-page-head">
          <div>
            <router-link to="/football/jackpot" class="fbja__back"><i class="fa-solid fa-arrow-left"></i> Jackpots</router-link>
            <h1>New jackpot</h1>
            <p>Enter the jackpot's details, paste its games, check the matches, then save to see the analysis.</p>
          </div>
        </header>
        <JackpotEditor :currency="currency" :tz="tz" :bookmakers="bookmakers" :add-fixture-id="$route.query.fixture || null" @saved="onCreated" />
        <FbFootnote />
      </template>

      <template v-else>
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px">
          <i class="fa-solid fa-circle-exclamation"></i
          ><span>{{ error }} <a href="#" @click.prevent="load()">Try again</a> · <router-link to="/football/jackpot">Back to your jackpots</router-link></span>
        </div>
        <div v-if="!v && !error">
          <div class="ui-skeleton" style="height: 120px; margin-bottom: 16px"></div>
          <div v-for="k in 3" :key="k" class="ui-skeleton" style="height: 220px; margin-bottom: 16px"></div>
        </div>

        <template v-if="v">
          <header class="fb-panel fbja__head" data-section="header">
            <div class="fbja__top">
              <router-link to="/football/jackpot" class="fbja__back"><i class="fa-solid fa-arrow-left"></i> Jackpots</router-link>
              <span class="fb-pill" :class="statusClass">{{ statusText }}</span>
            </div>
            <h1 class="fbja__title" data-test="fb-jp-title">{{ j.name }}</h1>
            <dl class="fbja__facts">
              <div>
                <dt>Bookmaker</dt>
                <dd>{{ j.bookmaker || '—' }}</dd>
              </div>
              <div>
                <dt>Top prize</dt>
                <dd>{{ money(j.prize, cur) }}</dd>
              </div>
              <div>
                <dt>Ticket</dt>
                <dd>{{ money(j.ticket_price, cur) }}</dd>
              </div>
              <div v-if="j.bonuses && j.bonuses.length">
                <dt>Bonuses</dt>
                <dd>{{ j.bonuses.map((b) => `${b.correct} right ${money(b.amount, cur)}`).join(' · ') }}</dd>
              </div>
              <div>
                <dt>{{ closed ? 'Closed' : 'Closes' }}</dt>
                <dd>{{ j.closes_at ? fmtClose(j.closes_at, tz) : 'not set' }}<span v-if="!closed && j.closes_at" class="fb-muted"> · {{ countdown }}</span></dd>
              </div>
              <div>
                <dt>Games</dt>
                <dd>{{ v.games.length }} · {{ matchedCount }} matched</dd>
              </div>
            </dl>
            <div class="fbja__actions">
              <button type="button" class="ui-btn ui-btn--sm" data-test="fb-jp-edit-games" @click="editing = !editing"><i class="fa-solid fa-list-ol"></i> {{ editing ? 'Close the games editor' : 'Edit games' }}</button>
              <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="formOpen = true"><i class="fa-regular fa-pen-to-square"></i> Edit details</button>
              <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy" data-test="fb-jp-duplicate" @click="duplicate"><i class="fa-regular fa-clone"></i> Duplicate</button>
              <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="remove"><i class="fa-regular fa-trash-can"></i> Delete</button>
            </div>
          </header>

          <div v-if="editing" class="fbja__editor">
            <JackpotEditor :jackpot="j" :games="v.games" :currency="cur" :tz="tz" :bookmakers="bookmakers" :add-fixture-id="$route.query.add || null" @saved="applySaved" @cancel="editing = false" />
          </div>

          <div v-if="unmatched.length && !editing" class="ui-alert ui-alert--warning fbja__alert" data-test="fb-jp-unmatched">
            <i class="fa-solid fa-link-slash"></i>
            <span>
              {{ unmatched.length === 1 ? 'Game' : 'Games' }} {{ unmatched.map((g) => g.n).join(', ') }} {{ unmatched.length === 1 ? "isn't" : "aren't" }} matched to a fixture, so only the
              jackpot's own odds are used there. <a href="#" @click.prevent="editing = true">Pick the fixture</a>
            </span>
          </div>

          <template v-if="an">
            <div class="fbja__layout">
              <nav class="fbja__nav" aria-label="Sections of this page">
                <a v-for="s in nav" :key="s.id" :href="'#' + s.id" :class="{ 'is-on': active === s.id }" @click.prevent="jump(s.id)">{{ s.label }}</a>
              </nav>
              <div class="fbja__main">
                <JpReview v-if="review" ref="review" :review="review" :n-games="an.nGames" :complete="review.complete !== false" :tz="tz" />
                <JpTickets ref="tickets" :an="an" :jackpot-id="j.id" :currency="cur" :tickets="v.tickets" @changed="applySaved" />
                <JpGames ref="games" :an="an" :tz="tz" :plan="plan" :results="v.games" :grading="v.grading" :review="review" />
                <JpCover ref="cover" :an="an" :price="j.ticket_price || 0" :currency="cur" :plan="plan" :jackpot-id="j.id" @plan="plan = $event" @changed="applySaved" />
                <JpPlanner ref="planner" :jackpot-id="j.id" :an="an" :price="j.ticket_price || 0" :currency="cur" :bonuses="j.bonuses || []" :results="v.games" @changed="applySaved" />
                <JpChances ref="chances" :an="an" :bonuses="j.bonuses || []" :currency="cur" />
                <JpEv ref="value" :key="'ev' + evKey" :an="an" :currency="cur" :jackpot-id="j.id" :sharing="j.sharing" @changed="applySaved" />
                <JpGrading ref="results" :jackpot-id="j.id" :games="v.games" :tickets="v.tickets" :grading="v.grading" :currency="cur" :tz="tz" @changed="applySaved" />
                <section v-if="an.notes.length" class="fb-panel" data-test="fb-jp-notes">
                  <div class="fb-panel__head"><h2>Notes</h2></div>
                  <div class="fb-panel__body">
                    <ul class="fbja__notes">
                      <li v-for="(n, i) in an.notes" :key="i">{{ n }}</li>
                    </ul>
                    <p class="fb-muted fb-small" style="margin: 8px 0 0">Analysed {{ fmtDateTime(an.asOf, tz) }}.</p>
                  </div>
                </section>
                <p class="fb-honest" data-test="fb-jp-disclaimer"><i class="fa-solid fa-circle-info"></i><span>{{ an.disclaimer || '18+ only. Probabilities are estimates, never certainties — no ticket is a sure win.' }}</span></p>
              </div>
            </div>
          </template>
          <div v-else-if="!editing" class="ui-empty fb-panel">
            <div class="ui-empty__icon"><i class="fa-solid fa-ticket"></i></div>
            <h3>No analysis yet</h3>
            <p>Add at least two games with their odds.</p>
            <button type="button" class="ui-btn ui-btn--primary" @click="editing = true">Add games</button>
          </div>
        </template>
        <FbFootnote />
      </template>
    </template>

    <JackpotForm v-if="formOpen && v" :jackpot="{ ...j, games: v.games }" :currency="cur" :tz="tz" @close="formOpen = false" @saved="detailsSaved" />
  </div>
</template>

<script>
import '@/components/football/football.css'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { fb, loadMeta, forbiddenReason, apiNow } from '@/components/football/fbState'
import { DEFAULT_TZ, money, fmtDateTime } from '@/components/football/fb'
import FbNoAccess from '@/components/football/FbNoAccess.vue'
import FbFootnote from '@/components/football/FbFootnote.vue'
import JackpotEditor from '@/components/football/jackpot/JackpotEditor.vue'
import JackpotForm from '@/components/football/jackpot/JackpotForm.vue'
import JpGames from '@/components/football/jackpot/JpGames.vue'
import JpTickets from '@/components/football/jackpot/JpTickets.vue'
import JpCover from '@/components/football/jackpot/JpCover.vue'
import JpChances from '@/components/football/jackpot/JpChances.vue'
import JpEv from '@/components/football/jackpot/JpEv.vue'
import JpGrading from '@/components/football/jackpot/JpGrading.vue'
import JpReview from '@/components/football/jackpot/JpReview.vue'
import JpPlanner from '@/components/football/jackpot/JpPlanner.vue'
import { BOOKMAKERS, fmtClose } from '@/components/football/jackpot/jp'
import { normView } from '@/components/football/jackpot/jpApi'

export default {
  name: 'JackpotAnalyser',
  components: { FbNoAccess, FbFootnote, JackpotEditor, JackpotForm, JpGames, JpTickets, JpCover, JpChances, JpEv, JpGrading, JpReview, JpPlanner },
  props: { id: { type: String, required: true } },
  data() {
    return { v: null, error: '', forbidden: '', tz: DEFAULT_TZ, editing: false, formOpen: false, busy: false, plan: null, active: 'tickets', io: null, bookmakers: BOOKMAKERS, evKey: 0 }
  },
  computed: {
    isNew() {
      return this.id === 'new'
    },
    j() {
      return this.v?.jackpot || {}
    },
    an() {
      return this.v?.analysis || null
    },
    cur() {
      return this.j.currency || this.currency
    },
    currency() {
      return fb.meta?.currency || 'KES'
    },
    closed() {
      return !!this.j.closes_at && new Date(this.j.closes_at) <= apiNow()
    },
    countdown() {
      const ms = new Date(this.j.closes_at) - apiNow()
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      if (h >= 48) return `in ${Math.round(h / 24)} days`
      return h ? `in ${h} h ${m} min` : `in ${m} min`
    },
    statusText() {
      const s = this.j.status
      if (s === 'graded') return 'Graded'
      if (s === 'draft') return 'Draft'
      return this.closed ? 'Closed' : 'Open'
    },
    statusClass() {
      return this.j.status === 'graded' ? 'fb-pill--good' : this.closed ? '' : 'fb-pill--info'
    },
    matchedCount() {
      return (this.v?.games || []).filter((g) => g.fixture_id).length
    },
    unmatched() {
      return (this.v?.games || []).filter((g) => !g.fixture_id)
    },
    /** v2.18 review after grading (grading.review, or the view's review). */
    review() {
      return this.v?.grading?.review || this.v?.review || this.v?.analysis?.review || null
    },
    nav() {
      return [
        ...(this.review ? [['review', 'How it went']] : []),
        ['tickets', 'Tickets'],
        ['games', 'Each game'],
        ['cover', 'Doubles & triples'],
        ['planner', 'Budget planner'],
        ['chances', 'How many right'],
        ['value', 'Ticket value'],
        ['results', 'Results']
      ].map(([id, label]) => ({ id, label }))
    }
  },
  watch: {
    id() {
      this.v = null
      this.plan = null
      this.editing = false
      if (!this.isNew) this.load()
    }
  },
  async created() {
    await loadMeta(true)
    if (fb.forbidden) {
      this.forbidden = fb.forbidden
      return
    }
    if (fb.meta?.timezone) this.tz = fb.meta.timezone
    footballApi
      .jackpotMeta()
      .then((m) => {
        if (m?.bookmakers?.length) this.bookmakers = m.bookmakers
      })
      .catch(() => {})
    if (!this.isNew) {
      await this.load()
      if (this.$route.query.add) this.editing = true
    }
  },
  beforeUnmount() {
    this.io?.disconnect()
  },
  methods: {
    money,
    fmtClose,
    fmtDateTime,
    async load() {
      this.error = ''
      try {
        this.apply(await footballApi.jackpot(this.id))
      } catch (e) {
        this.forbidden = forbiddenReason(e)
        if (!this.forbidden) this.error = e?.response?.status === 404 ? 'This jackpot was not found (you only see your own).' : apiErrorMessage(e, 'Could not load the jackpot')
      }
    },
    apply(raw) {
      this.v = normView(raw)
      if (this.plan && this.v.analysis) this.plan = this.v.analysis.plans.find((p) => p.label === this.plan.label) || null
      document.title = `${this.v.jackpot?.name || 'Jackpot'} · DASYIN ERP`
      this.$nextTick(this.observe)
    },
    applySaved(raw) {
      if (!raw) return
      this.apply(raw)
      this.evKey++
      if (this.editing) {
        this.editing = false
        if (this.$route.query.add) this.$router.replace({ query: {} }).catch(() => {})
        toast.success('Games saved and analysed')
      }
    },
    onCreated(raw) {
      const id = raw?.jackpot?.id
      if (!id) return
      toast.success('Jackpot saved')
      this.$router.replace(`/football/jackpot/${id}`)
    },
    detailsSaved(raw) {
      this.formOpen = false
      this.apply(raw)
      this.evKey++
      toast.success('Details saved')
    },
    async duplicate() {
      this.busy = true
      try {
        const r = await footballApi.duplicateJackpot(this.j.id, { name: `${this.j.name} (copy)` })
        toast.success('Duplicated')
        this.$router.push(`/football/jackpot/${r.jackpot.id}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not duplicate'))
      } finally {
        this.busy = false
      }
    },
    async remove() {
      if (!(await confirmDialog({ title: 'Delete this jackpot?', message: `${this.j.name} and its saved tickets will be deleted.`, confirmText: 'Delete', danger: true }))) return
      try {
        await footballApi.deleteJackpot(this.j.id)
        toast.success('Jackpot deleted')
        this.$router.push('/football/jackpot')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete'))
      }
    },
    jump(id) {
      const el = document.getElementById(id)
      const c = this.$refs[id]
      const sectionComp = c?.$?.subTree?.component?.proxy
      if (sectionComp && typeof sectionComp.reveal === 'function') sectionComp.reveal()
      this.$nextTick(() => {
        el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
        this.active = id
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
.fbja__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-2);
  text-decoration: none;
  font-weight: 550;
  font-size: 12.5px;
}
.fbja__back:hover {
  color: var(--text);
}
.fbja__head {
  padding: 14px 20px 16px;
}
.fbja__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.fbja__title {
  margin: 8px 0 10px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}
.fbja__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.fbja__facts dt {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbja__facts dd {
  margin: 0;
  font-size: 13px;
}
.fbja__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.fbja__editor {
  margin-top: 16px;
}
.fbja__alert {
  margin: 16px 0 0;
}
.fbja__layout {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 20px;
  margin-top: 16px;
  align-items: start;
}
.fbja__nav {
  position: sticky;
  top: calc(var(--topbar-h, 64px) + 12px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
}
.fbja__nav a {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-2);
  text-decoration: none;
  border-left: 2px solid transparent;
}
.fbja__nav a:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.fbja__nav a.is-on {
  color: var(--text);
  font-weight: 650;
  background: var(--surface);
  border-left-color: var(--accent);
}
.fbja__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}
.fbja__notes {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-2);
}
@media (max-width: 1199px) {
  .fbja__layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .fbja__nav {
    top: var(--topbar-h, 64px);
    z-index: 5;
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 8px 0;
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: blur(8px);
    scrollbar-width: none;
  }
  .fbja__nav a {
    flex: 0 0 auto;
    border: 1px solid var(--border);
    background: var(--surface);
    white-space: nowrap;
  }
  .fbja__nav a.is-on {
    border-color: var(--accent);
  }
}
@media (max-width: 640px) {
  .fbja__nav {
    position: static;
  }
  .fbja__head {
    padding: 12px 14px 14px;
  }
}
</style>
