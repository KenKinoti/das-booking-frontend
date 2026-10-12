<template>
  <div class="cnt bar-ui" data-testid="count-screen">
    <!-- Top bar -->
    <header class="cnt__top">
      <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon big-ic" aria-label="Leave the count" data-testid="count-close" @click="leave"><i class="fa-solid fa-arrow-left"></i></button>
      <div class="cnt__title">
        <strong>{{ c ? `${typeLabel} · ${c.location || locationName(c.location_id)}` : 'Stock count' }}</strong>
        <small v-if="c">{{ c.number ? c.number + ' · ' : '' }}night of {{ formatDate(c.business_date) }}<template v-if="c.blind"> · blind</template></small>
      </div>
      <span class="sync" :class="'is-' + sync" :title="syncTitle" data-testid="count-sync" :data-state="sync" role="status">
        <i :class="syncIcon"></i><span class="sync__txt">{{ syncText }}</span>
      </span>
      <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon big-ic" :aria-label="night ? 'Switch to a light screen' : 'Switch to a dark screen'" :title="night ? 'Light screen' : 'Dark screen — easier on the eyes behind the bar'" data-testid="count-night" @click="toggleNight"><i :class="night ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i></button>
    </header>

    <div v-if="error && !c" class="cnt__msg">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      <button type="button" class="ui-btn" @click="load">Try again</button>
    </div>
    <div v-else-if="!c" class="cnt__msg"><div v-for="n in 6" :key="n" class="ui-skeleton" style="height: 72px; margin-bottom: 10px"></div></div>

    <!-- Finished / read-only -->
    <div v-else-if="done" class="cnt__done" data-testid="count-done">
      <div class="done__icon"><i class="fa-solid fa-circle-check"></i></div>
      <h2>{{ c.status === 'approved' ? 'Count approved' : 'Count submitted' }}</h2>
      <p v-if="c.status === 'approved'">This count is locked — stock was adjusted to what was counted.</p>
      <p v-else>{{ countedN }} of {{ lines.length }} items counted. {{ perm.approve ? 'Review the variance and approve it.' : 'A manager will review the variance.' }}</p>
      <div class="done__acts">
        <router-link v-if="perm.approve" :to="`/bar-stock?tab=counts&count=${c.id}`" class="ui-btn ui-btn--primary" data-testid="count-review">Review now</router-link>
        <router-link to="/bar-stock?tab=counts" class="ui-btn">Back to counts</router-link>
      </div>
    </div>

    <template v-else>
      <!-- Progress + search -->
      <div class="cnt__tools">
        <div class="prog" role="progressbar" :aria-valuenow="countedN" :aria-valuemax="lines.length" aria-label="Items counted">
          <span :style="{ width: pct + '%' }"></span>
        </div>
        <div class="prog__txt"><strong data-testid="count-progress">{{ countedN }} / {{ lines.length }}</strong> counted<template v-if="recountN"> · {{ recountN }} to recount</template></div>
        <div class="search">
          <div class="ui-input-group">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input ref="search" v-model="q" class="ui-input" type="search" placeholder="Find an item or scan" aria-label="Find an item" autocomplete="off" data-testid="count-search" @keydown.enter.prevent="onEnter" />
          </div>
          <button type="button" class="ui-btn scan-btn" aria-label="Scan a barcode" title="Scan a barcode" data-testid="count-scan" @click="scanning = true"><i class="fa-solid fa-barcode"></i></button>
        </div>
        <div class="filters" role="tablist" aria-label="Show">
          <button v-for="f in filters" :key="f.key" type="button" class="fchip" :class="{ 'is-active': filter === f.key }" role="tab" :aria-selected="filter === f.key" @click="filter = f.key">{{ f.label }} <span>{{ f.n }}</span></button>
        </div>
      </div>
      <div v-if="!online" class="offline"><i class="fa-solid fa-wifi"></i> Offline — your counts are kept on this phone and sent when you’re back online.</div>

      <!-- Lines -->
      <div class="cnt__list" data-testid="count-lines">
        <p v-if="!shown.length" class="none">{{ q ? `No item matches “${q}”.` : 'Nothing here.' }}</p>
        <template v-for="g in groups" :key="g.key">
          <h3 class="grp">{{ g.label }}</h3>
          <article
            v-for="l in g.lines"
            :key="l.product_id"
            :ref="(el) => setRowRef(l.product_id, el)"
            class="cline"
            :class="{ 'is-counted': isCounted(l), 'is-open': open === l.product_id, 'is-recount': l.recount, 'is-hit': hit === l.product_id, 'has-err': !!l.err }"
            :data-line="l.name"
          >
            <div class="row__head" @click="toggle(l)">
              <span class="row__check" :aria-label="isCounted(l) ? 'Counted' : 'Not counted'"><i :class="isCounted(l) ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'"></i></span>
              <div class="row__name">
                <strong>{{ l.name }}</strong>
                <small>{{ sizeText(l) }}<template v-if="l.recount"> · <b class="rc">recount</b></template><template v-if="showExpected(l)"> · expected {{ qtyText(l.expected, l) }}</template></small>
              </div>
              <div class="row__total" :data-total="l.product_id">
                <strong>{{ isCounted(l) ? totalText(l) : '—' }}</strong>
                <small v-if="isCounted(l) && isMl(l)">= {{ fmtNum(base(l), 1) }} ml</small>
              </div>
            </div>

            <div class="row__full">
              <span class="lbl">Full {{ plural(l.unit_label || (isMl(l) ? 'bottle' : 'unit'), 2) }}</span>
              <div class="stepper">
                <button type="button" :aria-label="`One less ${l.name}`" :disabled="!(l.full > 0)" @click="step(l, -1)"><i class="fa-solid fa-minus"></i></button>
                <input :value="l.full === null ? '' : l.full" type="number" min="0" step="1" inputmode="numeric" placeholder="0" :aria-label="`Full ${l.unit_label || 'units'} of ${l.name}`" :data-testid="'full-' + l.name" @focus="$event.target.select()" @input="setFull(l, $event.target.value)" />
                <button type="button" :aria-label="`One more ${l.name}`" @click="step(l, 1)"><i class="fa-solid fa-plus"></i></button>
              </div>
              <button v-if="isMl(l) && open !== l.product_id" type="button" class="ui-btn ui-btn--sm partial-btn" :data-testid="'partial-' + l.name" @click="openRow(l)">
                <i class="fa-solid fa-bottle-droplet"></i> {{ partialSummary(l) }}
              </button>
            </div>

            <div v-if="isMl(l) && open === l.product_id" class="row__partial">
              <div class="modes" role="radiogroup" aria-label="Partial measured as">
                <button type="button" :class="{ 'is-active': l.mode === 'tenths' }" role="radio" :aria-checked="l.mode === 'tenths'" :data-testid="'mode-tenths-' + l.name" @click="setMode(l, 'tenths')">Tenths</button>
                <button type="button" :class="{ 'is-active': l.mode === 'ml' }" role="radio" :aria-checked="l.mode === 'ml'" :data-testid="'mode-ml-' + l.name" @click="setMode(l, 'ml')">ml</button>
                <button type="button" :class="{ 'is-active': l.mode === 'weight' }" role="radio" :aria-checked="l.mode === 'weight'" :disabled="!canWeigh(l)" :title="canWeigh(l) ? 'Weigh the open bottle' : 'Set full & empty weights on the item to weigh'" :data-testid="'mode-weight-' + l.name" @click="setMode(l, 'weight')"><i class="fa-solid fa-scale-balanced"></i> Scale</button>
              </div>
              <div v-if="l.mode === 'tenths'" class="tenths">
                <button type="button" class="nudge" aria-label="One tenth less" :disabled="!(Number(l.value) > 0)" @click="nudge(l, -0.1)"><i class="fa-solid fa-minus"></i></button>
                <input :value="Number(l.value) || 0" type="range" min="0" max="1" step="0.1" :aria-label="`Tenths of an open ${l.unit_label || 'bottle'}`" :data-testid="'tenths-' + l.name" @input="setValue(l, Number($event.target.value))" />
                <button type="button" class="nudge" aria-label="One tenth more" :disabled="Number(l.value) >= 1" @click="nudge(l, 0.1)"><i class="fa-solid fa-plus"></i></button>
                <span class="tenths__v">{{ (Number(l.value) || 0).toFixed(1) }}</span>
              </div>
              <div v-else class="ml-in">
                <input :value="l.value" type="number" min="0" :step="l.mode === 'weight' ? 1 : 5" inputmode="decimal" :placeholder="l.mode === 'weight' ? `${fmtNum(l.empty_weight_g, 0)}–${fmtNum(l.full_weight_g, 0)}` : `0–${l.unit_size}`" :aria-label="l.mode === 'weight' ? 'Weight in grams' : 'Partial in ml'" :data-testid="(l.mode === 'weight' ? 'grams-' : 'ml-') + l.name" @focus="$event.target.select()" @input="setValue(l, $event.target.value === '' ? '' : Number($event.target.value))" />
                <span>{{ l.mode === 'weight' ? 'g' : 'ml' }}</span>
              </div>
              <div class="eq" :data-testid="'eq-' + l.name">
                <template v-if="l.err"><i class="fa-solid fa-triangle-exclamation"></i> {{ l.err }}</template>
                <template v-else>= <strong>{{ fmtNum(partialMl(l), 1) }} ml</strong> open · total {{ totalText(l) }}</template>
              </div>
              <button type="button" class="ui-btn ui-btn--sm done-btn" @click="open = ''">Done</button>
            </div>
          </article>
        </template>
      </div>

      <!-- Bottom bar -->
      <footer class="cnt__foot">
        <div class="foot__txt">
          <strong>{{ countedN }} of {{ lines.length }}</strong>
          <small>{{ lines.length - countedN ? `${lines.length - countedN} still to count` : 'everything counted' }}</small>
        </div>
        <button type="button" class="ui-btn ui-btn--primary submit" :disabled="submitting || !countedN" data-testid="count-submit" @click="submit">
          <i :class="submitting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-paper-plane'"></i> Submit count
        </button>
      </footer>
    </template>

    <BarcodeScanner v-if="scanning" @code="onCode" @close="scanning = false" />
  </div>
</template>

<script>
import { bar, loadBar, barPerms, locationName } from '@/components/bar/barContext'
import { barApi, arr } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate } from '@/utils/format'
import { access } from '@/composables/useAccess'
import { qtyText, isMl, plural, fmtNum, unitSize, mlText, canWeigh, partialToBase, round3, countTypeLabel, categoryLabel, CATEGORIES, mlToTenths } from '@/utils/barUnits'
import '@/components/bar/bar.css'
import BarcodeScanner from '@/components/bar/BarcodeScanner.vue'
import { useTheme, globalTheme } from '@/composables/useTheme'

const draftKey = (id) => `bar.count.draft.${id}.v1`
const readJSON = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null')
  } catch {
    return null
  }
}
const writeJSON = (k, v) => {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage full / private mode: the server copy still autosaves */
  }
}

export default {
  name: 'BarCount',
  components: { BarcodeScanner },
  props: { id: { type: String, required: true } },
  data() {
    return {
      c: null,
      lines: [],
      error: '',
      q: '',
      filter: 'all',
      open: '',
      hit: '',
      scanning: false,
      dirty: {},
      inflight: false,
      again: false,
      timer: null,
      retry: null,
      sync: 'saved',
      syncError: '',
      savedAt: null,
      online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
      submitting: false,
      submitted: false,
      rowRefs: {}
    }
  },
  computed: {
    perm() {
      void access.permissions
      return barPerms()
    },
    night() {
      return globalTheme.isDark.value
    },
    typeLabel() {
      return countTypeLabel(this.c?.type) || 'Count'
    },
    done() {
      return this.submitted || (this.c && this.c.status !== 'draft' && this.c.status !== 'recount')
    },
    countedN() {
      return this.lines.filter((l) => this.isCounted(l)).length
    },
    recountN() {
      return this.lines.filter((l) => l.recount).length
    },
    pct() {
      return this.lines.length ? Math.round((this.countedN / this.lines.length) * 100) : 0
    },
    filters() {
      const out = [
        { key: 'all', label: 'All', n: this.lines.length },
        { key: 'todo', label: 'To count', n: this.lines.length - this.countedN },
        { key: 'done', label: 'Counted', n: this.countedN }
      ]
      if (this.recountN) out.splice(1, 0, { key: 'recount', label: 'Recount', n: this.recountN })
      return out
    },
    shown() {
      const q = this.q.trim().toLowerCase()
      return this.lines.filter((l) => {
        if (this.filter === 'todo' && this.isCounted(l)) return false
        if (this.filter === 'done' && !this.isCounted(l)) return false
        if (this.filter === 'recount' && !l.recount) return false
        if (!q) return true
        return [l.name, l.sku, l.barcode].some((v) => v && String(v).toLowerCase().includes(q))
      })
    },
    groups() {
      const by = new Map()
      for (const l of this.shown) {
        const k = l.category || 'other'
        if (!by.has(k)) by.set(k, [])
        by.get(k).push(l)
      }
      const order = CATEGORIES.map((c) => c.key)
      return [...by.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([key, lines]) => ({ key, label: categoryLabel(key), lines }))
    },
    dirtyN() {
      return Object.keys(this.dirty).length
    },
    syncText() {
      if (this.sync === 'saving') return 'Saving…'
      if (this.sync === 'offline') return this.dirtyN ? `Offline · ${this.dirtyN} on phone` : 'Offline'
      if (this.sync === 'error') return 'Not saved'
      return this.dirtyN ? 'Unsaved' : 'Saved'
    },
    syncIcon() {
      return { saving: 'fa-solid fa-circle-notch fa-spin', offline: 'fa-solid fa-cloud-arrow-up', error: 'fa-solid fa-triangle-exclamation' }[this.sync] || 'fa-solid fa-cloud'
    },
    syncTitle() {
      if (this.sync === 'error') return this.syncError
      if (this.savedAt) return `Saved to the server at ${this.savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
      return ''
    }
  },
  async created() {
    if (!bar.loaded) loadBar()
    await this.load()
  },
  mounted() {
    window.addEventListener('online', this.onOnline)
    window.addEventListener('offline', this.onOffline)
    document.documentElement.classList.add('has-drawer-open')
    this.retry = setInterval(() => {
      if (this.dirtyN && !this.inflight && this.online) this.flush()
    }, 15000)
  },
  beforeUnmount() {
    window.removeEventListener('online', this.onOnline)
    window.removeEventListener('offline', this.onOffline)
    document.documentElement.classList.remove('has-drawer-open')
    clearInterval(this.retry)
    clearTimeout(this.timer)
    if (this.dirtyN && this.online) this.flush()
  },
  methods: {
    qtyText,
    isMl,
    plural,
    fmtNum,
    canWeigh,
    formatDate,
    locationName,
    setRowRef(id, el) {
      if (el) this.rowRefs[id] = el
    },
    sizeText(l) {
      return isMl(l) ? `${mlText(unitSize(l))} ${l.unit_label || 'bottle'}` : l.unit_label || 'unit'
    },
    // ---------- load ----------
    async load() {
      this.error = ''
      try {
        const d = await barApi.count(this.id)
        const c = d?.count || d
        this.c = c
        const draft = readJSON(draftKey(this.id))
        const local = draft?.lines || {}
        const dirty = {}
        this.lines = arr(d, 'lines').length ? arr(d, 'lines').map((x) => this.fromServer(x)) : arr(c, 'lines').map((x) => this.fromServer(x))
        // Changes made on this phone that never reached the server win.
        for (const l of this.lines) {
          const loc = local[l.product_id]
          if (loc && draft.dirty?.includes(l.product_id)) {
            l.full = loc.full
            l.mode = loc.mode || l.mode
            l.value = loc.value
            this.validate(l)
            dirty[l.product_id] = 1
          }
        }
        this.dirty = dirty
        this.loadCodes(c.location_id)
        if (this.dirtyN && !this.done) {
          toast.info(`${this.dirtyN} count${this.dirtyN === 1 ? '' : 's'} from this phone not yet saved — sending now`)
          this.flush()
        }
        if (this.done) writeJSON(draftKey(this.id), null)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not open the count')
        if (!e.response) this.online = false
      }
    },
    // Count lines carry no barcode / SKU: take them from the stock items (for scanning).
    async loadCodes(loc) {
      try {
        const items = await barApi.items({ location_id: loc })
        const by = Object.fromEntries(items.map((it) => [it.product_id, it]))
        for (const l of this.lines) {
          const it = by[l.product_id]
          if (it) {
            l.sku = l.sku || it.sku || ''
            l.barcode = l.barcode || it.barcode || ''
          }
        }
      } catch {
        /* search by name still works */
      }
    },
    fromServer(x) {
      const it = x.item || {}
      const ml = (x.base_unit || it.base_unit || 'ml') === 'ml'
      let mode = x.partial_mode || ''
      let value = x.partial_value ?? ''
      if (!mode) mode = 'tenths'
      if (mode === 'tenths' && (value === '' || value === null)) value = 0
      const l = {
        product_id: x.product_id,
        name: x.name || it.name || 'Item',
        sku: x.sku || it.sku || '',
        barcode: x.barcode || it.barcode || '',
        category: x.category || it.category || 'other',
        base_unit: x.base_unit || it.base_unit || 'ml',
        unit_size: Number(x.unit_size || it.unit_size) || (ml ? 750 : 1),
        unit_label: x.unit_label || it.unit_label || '',
        full_weight_g: x.full_weight_g ?? it.full_weight_g ?? null,
        empty_weight_g: x.empty_weight_g ?? it.empty_weight_g ?? null,
        expected: x.expected ?? null,
        recount: !!x.recount,
        full: x.full_units === null || x.full_units === undefined ? null : Number(x.full_units),
        mode,
        value,
        err: ''
      }
      if (x.counted !== null && x.counted !== undefined && l.full === null) l.full = Math.floor(Number(x.counted) / l.unit_size)
      return l
    },
    // ---------- maths ----------
    isCounted(l) {
      return l.full !== null && l.full !== undefined && l.full !== ''
    },
    partialMl(l) {
      if (!isMl(l)) return 0
      const r = partialToBase(l.mode, l.value, l)
      return r.ml || 0
    },
    base(l) {
      return round3((Number(l.full) || 0) * unitSize(l) + this.partialMl(l))
    },
    totalText(l) {
      return qtyText(this.base(l), l)
    },
    partialSummary(l) {
      const ml = this.partialMl(l)
      if (!ml) return 'Open bottle?'
      if (l.mode === 'tenths') return `+ ${(Number(l.value) || 0).toFixed(1)} (${fmtNum(ml, 0)} ml)`
      return `+ ${fmtNum(ml, 0)} ml`
    },
    showExpected(l) {
      return !this.c?.blind && l.expected !== null && l.expected !== undefined
    },
    validate(l) {
      if (!isMl(l)) {
        l.err = ''
        return true
      }
      const r = partialToBase(l.mode, l.value, l)
      l.err = r.error || ''
      return !r.error
    },
    // ---------- edits ----------
    touch(l) {
      this.validate(l)
      this.dirty = { ...this.dirty, [l.product_id]: (this.dirty[l.product_id] || 0) + 1 }
      this.persistDraft()
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.flush(), 700)
    },
    step(l, d) {
      const v = Math.max(0, (Number(l.full) || 0) + d)
      l.full = v
      this.touch(l)
    },
    setFull(l, raw) {
      if (raw === '') {
        l.full = null
      } else {
        const n = Math.max(0, Math.floor(Number(raw)))
        l.full = Number.isFinite(n) ? n : 0
      }
      this.touch(l)
    },
    setMode(l, m) {
      if (l.mode === m) return
      const ml = this.partialMl(l)
      l.mode = m
      // Carry the open bottle over to the new mode where it can be.
      if (m === 'tenths') l.value = mlToTenths(ml, l)
      else if (m === 'ml') l.value = ml ? round3(ml) : ''
      else l.value = ''
      if (l.full === null) l.full = 0
      this.touch(l)
    },
    setValue(l, v) {
      l.value = v
      if (l.full === null) l.full = 0
      this.touch(l)
    },
    nudge(l, d) {
      const v = Math.min(1, Math.max(0, Math.round(((Number(l.value) || 0) + d) * 10) / 10))
      this.setValue(l, v)
    },
    toggle(l) {
      if (!isMl(l)) return
      this.open = this.open === l.product_id ? '' : l.product_id
    },
    openRow(l) {
      this.open = l.product_id
    },
    // ---------- find / scan ----------
    onEnter() {
      const q = this.q.trim().toLowerCase()
      if (!q) return
      const exact = this.lines.find((l) => [l.barcode, l.sku].some((v) => v && String(v).toLowerCase() === q))
      const l = exact || (this.shown.length === 1 ? this.shown[0] : null)
      if (l) this.focusLine(l)
      else if (!this.shown.length) toast.warning(`No item in this count matches “${this.q}”`)
    },
    onCode(code) {
      this.scanning = false
      const c = String(code).trim().toLowerCase()
      const l = this.lines.find((x) => [x.barcode, x.sku].some((v) => v && String(v).toLowerCase() === c))
      if (!l) {
        toast.warning(`Barcode ${code} isn’t in this count`)
        return
      }
      this.focusLine(l)
    },
    focusLine(l) {
      this.q = ''
      this.filter = 'all'
      if (isMl(l)) this.open = l.product_id
      this.hit = l.product_id
      this.$nextTick(() => {
        const el = this.rowRefs[l.product_id]
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          if (this.hit === l.product_id) this.hit = ''
        }, 1600)
      })
    },
    // ---------- save ----------
    persistDraft() {
      const lines = {}
      for (const l of this.lines) if (this.dirty[l.product_id]) lines[l.product_id] = { full: l.full, mode: l.mode, value: l.value }
      writeJSON(draftKey(this.id), this.dirtyN ? { lines, dirty: Object.keys(this.dirty), at: new Date().toISOString() } : null)
    },
    payload(l) {
      if (!isMl(l)) return { product_id: l.product_id, full_units: l.full, partial_mode: '', partial_value: 0 }
      const v = Number(l.value) || 0
      return { product_id: l.product_id, full_units: l.full, partial_mode: v ? l.mode : '', partial_value: v }
    },
    async flush() {
      clearTimeout(this.timer)
      if (this.inflight) {
        this.again = true
        return false
      }
      const sending = this.lines.filter((l) => this.dirty[l.product_id] && !l.err)
      if (!sending.length) {
        if (!this.dirtyN) this.sync = 'saved'
        return true
      }
      if (!this.online) {
        this.sync = 'offline'
        return false
      }
      const versions = Object.fromEntries(sending.map((l) => [l.product_id, this.dirty[l.product_id]]))
      this.inflight = true
      this.sync = 'saving'
      let ok = false
      try {
        await barApi.saveCountLines(this.id, sending.map((l) => this.payload(l)))
        const left = { ...this.dirty }
        for (const [pid, v] of Object.entries(versions)) if (left[pid] === v) delete left[pid]
        this.dirty = left
        this.persistDraft()
        this.sync = this.dirtyN ? 'saving' : 'saved'
        this.savedAt = new Date()
        ok = true
      } catch (e) {
        if (!e.response) {
          this.online = false
          this.sync = 'offline'
        } else {
          this.sync = 'error'
          this.syncError = apiErrorMessage(e, 'Could not save the count')
          toast.error(this.syncError, { key: 'count-save' })
        }
      } finally {
        this.inflight = false
        if (this.again) {
          this.again = false
          this.flush()
        }
      }
      return ok
    },
    onOnline() {
      this.online = true
      if (this.dirtyN) this.flush()
      else this.sync = 'saved'
    },
    onOffline() {
      this.online = false
      this.sync = 'offline'
    },
    toggleNight() {
      // The app theme (remembered on this device): dark is easier on the eyes in a club.
      useTheme().toggleTheme()
    },
    async submit() {
      const bad = this.lines.find((l) => l.err)
      if (bad) {
        this.focusLine(bad)
        toast.error(`${bad.name}: ${bad.err}`)
        return
      }
      const left = this.lines.filter((l) => !this.isCounted(l))
      if (left.length) {
        const ok = await confirmDialog({
          title: `${left.length} item${left.length === 1 ? '' : 's'} not counted`,
          message: `${left
            .slice(0, 4)
            .map((l) => l.name)
            .join(', ')}${left.length > 4 ? '…' : ''} — none on the shelf? They are counted as 0 when you submit.`,
          confirmText: 'Count as 0 and submit'
        })
        if (!ok) {
          this.filter = 'todo'
          return
        }
        for (const l of left) {
          l.full = 0
          l.value = l.mode === 'tenths' ? 0 : ''
          this.touch(l)
        }
      }
      this.submitting = true
      try {
        await this.flush()
        if (this.dirtyN) {
          toast.warning(this.online ? 'Some counts could not be saved yet — try again in a moment' : 'You’re offline. The count is kept on this phone — submit when you’re back online.')
          return
        }
        await barApi.submitCount(this.id)
        writeJSON(draftKey(this.id), null)
        this.submitted = true
        this.c = { ...this.c, status: 'submitted' }
        toast.success('Count submitted')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not submit the count'))
      } finally {
        this.submitting = false
      }
    },
    async leave() {
      if (this.dirtyN && !(await this.flush())) {
        toast.info('Your counts are kept on this phone and sent when you’re back online')
      }
      if (window.history.state?.back) this.$router.back()
      else this.$router.push('/bar-stock?tab=counts')
    }
  }
}
</script>

<style scoped>
/* Full-screen layer over the app shell (sidebar, top bar, bottom nav). */
.cnt {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 15px;
}
.cnt__top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.big-ic {
  width: 44px;
  height: 44px;
  font-size: 17px;
}
.cnt__title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.cnt__title strong {
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cnt__title small {
  font-size: 12.5px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sync {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--success-soft);
  color: var(--success);
  white-space: nowrap;
}
.sync.is-saving {
  background: var(--info-soft);
  color: var(--info);
}
.sync.is-offline {
  background: var(--warning-soft);
  color: var(--warning);
}
.sync.is-error {
  background: var(--danger-soft);
  color: var(--danger);
}
.cnt__msg {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.cnt__tools {
  padding: 10px 14px 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.prog {
  height: 6px;
  border-radius: 99px;
  background: var(--border);
  overflow: hidden;
}
.prog span {
  display: block;
  height: 100%;
  background: var(--success);
  border-radius: 99px;
  transition: width 0.25s var(--ease);
}
.prog__txt {
  font-size: 13px;
  color: var(--text-3);
}
.prog__txt strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.search {
  display: flex;
  gap: 8px;
}
.search .ui-input-group {
  flex: 1;
}
.search .ui-input {
  height: 48px;
  font-size: 16px;
}
.scan-btn {
  width: 52px;
  height: 48px;
  font-size: 20px;
  padding: 0;
  justify-content: center;
}
.filters {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.fchip {
  flex-shrink: 0;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  border-radius: 999px;
  padding: 6px 12px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.fchip span {
  color: var(--text-3);
  margin-left: 2px;
  font-variant-numeric: tabular-nums;
}
.fchip.is-active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.offline {
  padding: 8px 14px;
  background: var(--warning-soft);
  color: var(--text);
  font-size: 13px;
}
.offline i {
  color: var(--warning);
  margin-right: 6px;
}
.cnt__list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 12px 24px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.none {
  text-align: center;
  color: var(--text-3);
  padding: 30px 0;
}
.grp {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  margin: 14px 4px 6px;
  font-weight: 700;
}
.cline {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  margin-bottom: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.cline.is-counted {
  border-color: color-mix(in srgb, var(--success) 45%, var(--border));
}
.cline.is-recount {
  border-color: var(--info);
}
.cline.has-err {
  border-color: var(--danger);
}
.cline.is-hit {
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.row__head {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.row__check {
  font-size: 20px;
  color: var(--text-3);
  width: 24px;
  text-align: center;
}
.is-counted .row__check {
  color: var(--success);
}
.row__name {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.row__name strong {
  font-size: 16px;
  line-height: 1.25;
}
.row__name small {
  font-size: 12.5px;
  color: var(--text-3);
}
.rc {
  color: var(--info);
}
.row__total {
  text-align: right;
  display: flex;
  flex-direction: column;
  font-variant-numeric: tabular-nums;
}
.row__total strong {
  font-size: 15px;
}
.row__total small {
  font-size: 11.5px;
  color: var(--text-3);
}
.row__full {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.lbl {
  font-size: 13px;
  color: var(--text-3);
  min-width: 82px;
}
.stepper {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface-2);
}
.stepper button {
  width: 52px;
  height: 52px;
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: 18px;
  cursor: pointer;
}
.stepper button:active {
  background: var(--surface-hover);
}
.stepper button:disabled {
  color: var(--text-3);
  opacity: 0.5;
}
.stepper input {
  width: 64px;
  border: 0;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}
.stepper input::-webkit-outer-spin-button,
.stepper input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.partial-btn {
  height: 40px;
  margin-left: auto;
}
.row__partial {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-strong);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.modes button {
  height: 44px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.modes button.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
}
.modes button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tenths {
  display: grid;
  grid-template-columns: 48px 1fr 48px 52px;
  gap: 8px;
  align-items: center;
}
.nudge {
  width: 48px;
  height: 48px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font-size: 16px;
  cursor: pointer;
}
.tenths input[type='range'] {
  width: 100%;
  height: 36px;
  accent-color: var(--accent);
}
.tenths__v {
  font-size: 22px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ml-in {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ml-in input {
  flex: 1;
  height: 52px;
  font-size: 22px;
  font-weight: 700;
  padding: 0 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.ml-in span {
  font-size: 16px;
  color: var(--text-3);
  width: 28px;
}
.eq {
  font-size: 15px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.eq strong {
  color: var(--text);
  font-size: 17px;
}
.has-err .eq {
  color: var(--danger);
}
.done-btn {
  align-self: flex-end;
}
.cnt__foot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  background: var(--surface);
  border-top: 1px solid var(--border);
}
.foot__txt {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.foot__txt strong {
  font-variant-numeric: tabular-nums;
}
.foot__txt small {
  color: var(--text-3);
  font-size: 12.5px;
}
.submit {
  height: 52px;
  padding: 0 22px;
  font-size: 16px;
}
.cnt__done {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  gap: 8px;
}
.done__icon {
  font-size: 54px;
  color: var(--success);
}
.cnt__done h2 {
  margin: 4px 0 0;
}
.cnt__done p {
  color: var(--text-2);
  max-width: 420px;
}
.done__acts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}
@media (min-width: 900px) {
  .cnt__list,
  .cnt__tools > * {
    width: 100%;
    max-width: 860px;
    margin-left: auto;
    margin-right: auto;
  }
  .cnt__tools {
    align-items: stretch;
  }
}
@media (max-width: 420px) {
  .sync__txt {
    display: none;
  }
  .sync.is-offline .sync__txt,
  .sync.is-error .sync__txt {
    display: inline;
  }
  .lbl {
    min-width: 0;
    width: 100%;
  }
  .partial-btn {
    margin-left: 0;
  }
}
</style>
