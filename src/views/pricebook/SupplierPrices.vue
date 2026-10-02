<template>
  <div class="ui-page ui-page--wide sp dviz">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Finance</div>
        <h1>Supplier prices</h1>
        <p>Compare suppliers for a domain + hosting combo and set your price.</p>
      </div>
      <div v-if="o && canEdit" class="ui-actions">
        <button type="button" class="ui-btn" :disabled="filling" title="Hosting plan prices from your Synergy statements, domain prices from the Synergy API" data-testid="autofill-synergy" @click="autofill">
          <i :class="filling ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-wand-magic-sparkles'"></i> <span class="hide-xs">Auto-fill Synergy</span>
        </button>
        <button type="button" class="ui-btn" data-testid="import-csv" @click="importOpen = true"><i class="fa-solid fa-file-import"></i> <span class="hide-xs">Import CSV</span></button>
        <button type="button" class="ui-btn ui-btn--icon" :disabled="!o.items.length" title="Export the price lists (CSV, the same format as the import)" aria-label="Export CSV" data-testid="export-csv" @click="exportCsv"><i class="fa-solid fa-download"></i></button>
        <button type="button" class="ui-btn ui-btn--primary" data-testid="add-price" @click="itemModal = { item: null, supplierId: '' }"><i class="fa-solid fa-plus"></i> Add price</button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a v-if="!forbidden" href="#" @click.prevent="load">Try again</a></span></div>

    <div v-if="fill" class="ui-alert" :class="fill.created || fill.updated ? 'ui-alert--success' : 'ui-alert--warning'" data-testid="autofill-result">
      <i :class="fill.created || fill.updated ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info'"></i>
      <span>
        {{ fill.message }}
        <template v-for="(n, i) in fill.notes" :key="i"><br /><small>{{ n }}</small></template>
      </span>
      <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon x" aria-label="Dismiss" @click="fill = null"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <template v-if="!forbidden">
      <div class="ui-kpis" data-testid="sp-kpis">
        <KpiCard label="Cheapest to supply" icon="fa-solid fa-trophy" tone="success" :loading="!ready" :value="best ? cur(best.first_year_home, home, { whole: true }) : '—'" :meta="bestMeta" :show-delta="false" data-kpi="cheapest" />
        <KpiCard label="Then each year" icon="fa-solid fa-rotate" :tone="best && best.promo_trap ? 'warning' : 'info'" :loading="!ready" :value="best ? cur(best.ongoing_home, home, { whole: true }) : '—'" :meta="ongoingMeta" :show-delta="false" data-kpi="ongoing" />
        <KpiCard label="Suggested retail" icon="fa-solid fa-tag" tone="accent" :loading="!ready" :value="retailPrice ? cur(retailPrice.yearly.price, retailPrice.market.currency, { whole: true }) : '—'" :meta="retailMeta" :show-delta="false" data-kpi="retail" />
        <KpiCard label="Price lists" icon="fa-solid fa-list-check" :tone="o && o.kpis.stale ? 'warning' : 'info'" :loading="!o" :value="o ? `${o.kpis.prices} price${o.kpis.prices === 1 ? '' : 's'}` : ''" :meta="listMeta" :show-delta="false" data-kpi="lists" />
      </div>

      <ComboCompare v-if="o" :input="input" :result="result" :loading="comparing" :error="compareError" :home="home" :tiers="tiers" :tld-options="o.tlds" :suppliers="o.suppliers" :known-sites="o.context.known_sites || 0" :known-sites-source="o.context.known_sites_source || ''" :selected-key="effectiveKey" :can-edit="canEdit"
        v-model:active-tld="activeTld" @change="onInput" @select="selectedKey = $event" @edit-tiers="openTiers" @import="importOpen = true" />
      <div v-else-if="!loadError" class="ui-skeleton" style="height: 320px"></div>

      <RetailHelper v-if="o" :compare-input="input" :tld="combo ? combo.tld : ''" :option-key="effectiveKey" :option="option" :context="o.context" :home="home" :tiers="tiers" :preset="retailPreset" :today="o.today"
        @priced="priced = $event" @save-scenario="saveScenario" />

      <section v-if="o" class="ui-card">
        <div class="tabs-row">
          <div class="ui-tabs" role="tablist" aria-label="Supplier price details">
            <button v-for="t in tabs" :key="t.key" class="ui-tab" :class="{ 'is-active': tab === t.key }" role="tab" :aria-selected="tab === t.key" :data-tab="t.key" @click="setTab(t.key)">
              <i :class="t.icon"></i> {{ t.label }}<span v-if="t.count" class="count" :class="t.tone">{{ t.count }}</span>
            </button>
          </div>
        </div>
        <div class="ui-card__body">
          <PriceList v-if="tab === 'prices'" :items="o.items" :suppliers="o.suppliers" :can-edit="canEdit" :stale-days="o.context.stale_days" :today="o.today" :filter-supplier="listSupplier"
            @changed="reload" @edit="itemModal = { item: $event, supplierId: '' }" @history="historyItem = $event" @import="importOpen = true" @add="itemModal = { item: null, supplierId: '' }" />
          <SuppliersPanel v-else-if="tab === 'suppliers'" :suppliers="o.suppliers" :can-edit="canEdit" @add="supplierModal = { supplier: null }" @edit="supplierModal = { supplier: $event }"
            @show="showSupplier" @add-price="itemModal = { item: null, supplierId: $event.id }" @changed="reload" />
          <SelfHostedModel v-else-if="tab === 'server'" :suppliers="o.suppliers" :tiers="tiers" :home="home" :can-edit="canEdit" :start-tier="input.tier" :version="modelVersion" @changed="reload"
            @add-server="supplierModal = { supplier: null, type: 'self_hosted' }" />
          <ScenarioList v-else :list="scenarios" :error="scenariosError" :can-edit="canEdit" @load="loadScenario" @changed="loadScenarios" />
        </div>
      </section>
    </template>

    <ItemModal v-if="itemModal" :item="itemModal.item" :supplier-id="itemModal.supplierId" :suppliers="o.suppliers" :today="o.today" @close="itemModal = null" @saved="onSaved('item')" />
    <SupplierModal v-if="supplierModal" :supplier="supplierModal.supplier" :preset-type="supplierModal.type || ''" :home="home" @close="supplierModal = null" @saved="onSaved('supplier')" />
    <ImportModal v-if="importOpen" :header="o.context.csv_header" :docs="o.context.csv_docs" @close="importOpen = false" @imported="onImported" />
    <HistoryModal v-if="historyItem" :item="historyItem" @close="historyItem = null" />

    <!-- Hosting tiers -->
    <div v-if="tiersModal" class="ui-modal-backdrop" @mousedown.self="tiersModal = null">
      <form class="ui-modal" style="max-width: 520px" role="dialog" aria-modal="true" aria-labelledby="tiers-title" data-testid="tiers-modal" @submit.prevent="saveTiers">
        <div class="ui-modal__head">
          <h2 id="tiers-title">Hosting tiers</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="tiersModal = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <p class="ui-hint">A tier is the least a customer's hosting must offer. The comparison picks each supplier's cheapest plan that meets it.</p>
          <div v-for="(t, i) in tiersModal.tiers" :key="t.key" class="tier">
            <label class="ui-field"><span class="ui-label">Name</span><input v-model.trim="t.label" class="ui-input" required maxlength="40" /></label>
            <label class="ui-field"><span class="ui-label">Disk, at least (GB)</span><input v-model.number="t.min_disk_gb" class="ui-input" type="number" min="0" step="0.5" :data-testid="'tier-disk-' + i" /></label>
            <label class="ui-field"><span class="ui-label">Sites</span><input v-model.number="t.min_sites" class="ui-input" type="number" min="1" step="1" /></label>
          </div>
          <div v-if="tiersModal.error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ tiersModal.error }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="tiersModal = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="tiersModal.busy" data-testid="tiers-save">Save tiers</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import ComboCompare from '@/components/pricebook/ComboCompare.vue'
import RetailHelper from '@/components/pricebook/RetailHelper.vue'
import PriceList from '@/components/pricebook/PriceList.vue'
import SuppliersPanel from '@/components/pricebook/SuppliersPanel.vue'
import SelfHostedModel from '@/components/pricebook/SelfHostedModel.vue'
import ScenarioList from '@/components/pricebook/ScenarioList.vue'
import ItemModal from '@/components/pricebook/ItemModal.vue'
import SupplierModal from '@/components/pricebook/SupplierModal.vue'
import ImportModal from '@/components/pricebook/ImportModal.vue'
import HistoryModal from '@/components/pricebook/HistoryModal.vue'
import { pricebookApi, cur } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { downloadBlob } from '@/utils/format'
import '@/components/dashboard/dashviz.css'

const STORE = 'pricebook.compare.v1'
const TABS = ['prices', 'suppliers', 'server', 'saved']
const blankInput = () => ({ tlds: [], tier: 'starter', min_disk_gb: 0, min_sites: 1, term_years: 1, domain_action: 'register', no_hosting: false, include_ssl: false, mailboxes: 0, share_sites: 1, self_hosted_basis: 'current', domain_from: '', hosting_from: '', rates: {} })

export default {
  name: 'SupplierPrices',
  components: { KpiCard, ComboCompare, RetailHelper, PriceList, SuppliersPanel, SelfHostedModel, ScenarioList, ItemModal, SupplierModal, ImportModal, HistoryModal },
  data() {
    const qt = String(this.$route.query.tab || '')
    return {
      o: null,
      loadError: '',
      forbidden: false,
      input: blankInput(),
      result: null,
      comparing: false,
      compareError: '',
      compared: false,
      activeTld: '',
      selectedKey: '',
      priced: null,
      retailPreset: null,
      tab: TABS.includes(qt) ? qt : 'prices',
      itemModal: null,
      supplierModal: null,
      importOpen: false,
      historyItem: null,
      tiersModal: null,
      scenarios: null,
      scenariosError: '',
      filling: false,
      fill: null,
      modelVersion: 0,
      listSupplier: '',
      timer: null,
      seq: 0
    }
  },
  computed: {
    home() {
      return this.o?.home || 'AUD'
    },
    canEdit() {
      return !!this.o
    },
    tiers() {
      return this.o?.context?.tiers || []
    },
    ready() {
      return !!this.o && this.compared
    },
    combo() {
      const c = this.result?.combos || []
      return c.find((x) => x.tld === this.activeTld) || c[0] || null
    },
    options() {
      if (!this.combo) return []
      return [this.combo.mix, this.combo.mix_ongoing, ...this.combo.options].filter(Boolean)
    },
    effectiveKey() {
      if (!this.combo) return ''
      const mix = this.combo.mix
      // A mix that ends up with one supplier is that supplier's own option.
      if (this.selectedKey === 'mix' && mix && mix.same_supplier) return 's:' + mix.supplier_id
      if (this.selectedKey && this.options.some((o) => o.key === this.selectedKey)) return this.selectedKey
      // By default price the cheapest option — unless it is only cheap for an
      // introductory year: then the one that is cheapest to renew.
      const best = this.options.find((o) => o.key === this.combo.best)
      if (best && best.promo_trap && this.combo.best_ongoing) return this.combo.best_ongoing
      return this.combo.best || this.combo.options.find((o) => o.hosting || o.domain)?.key || ''
    },
    option() {
      return this.options.find((o) => o.key === this.effectiveKey) || null
    },
    best() {
      if (!this.combo || !this.combo.best) return null
      return this.options.find((o) => o.key === this.combo.best) || null
    },
    bestMeta() {
      if (!this.ready) return ''
      if (!this.best) return this.o.kpis.prices ? 'no supplier covers this combo' : 'add prices to compare'
      return `${this.best.supplier_name} · ${this.combo.label}, first year`
    },
    ongoingMeta() {
      if (!this.ready || !this.best) return ''
      const first = this.best.first_year_home - this.best.setup_home
      if (!(first > 0)) return 'at the regular prices'
      const d = (this.best.ongoing_home / first - 1) * 100
      if (Math.abs(d) < 0.5) return 'same as the first year'
      return `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(0)}% vs the first year${this.best.promo_trap ? ' · intro price ends' : ''}`
    },
    retailPrice() {
      return this.priced?.result?.markets?.find((m) => m.yearly) || null
    },
    retailMeta() {
      if (!this.ready) return ''
      const p = this.retailPrice
      if (!p) return 'pick an option to price'
      return `a year · margin ${p.yearly.margin_pct.toFixed(1)}% = ${cur(p.yearly.profit_home, this.home, { whole: true })}`
    },
    listMeta() {
      if (!this.o) return ''
      const k = this.o.kpis
      const sup = `${k.suppliers} supplier${k.suppliers === 1 ? '' : 's'}`
      return k.stale ? `${sup} · ${k.stale} to check` : `${sup} · all checked within ${this.o.context.stale_days} days`
    },
    tabs() {
      const k = this.o?.kpis || {}
      return [
        { key: 'prices', label: 'Price lists', icon: 'fa-solid fa-tags', count: k.stale || 0, tone: 'warn' },
        { key: 'suppliers', label: 'Suppliers', icon: 'fa-solid fa-warehouse', count: this.o?.suppliers.length || 0 },
        { key: 'server', label: 'Self-hosted cost', icon: 'fa-solid fa-hard-drive' },
        { key: 'saved', label: 'Saved comparisons', icon: 'fa-regular fa-bookmark', count: this.scenarios?.length || 0 }
      ]
    }
  },
  async mounted() {
    await this.load()
    if (!this.o) return
    this.restore()
    this.compare()
    this.loadScenarios()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    cur,
    async load() {
      this.loadError = ''
      try {
        this.o = await pricebookApi.overview()
      } catch (e) {
        this.forbidden = e?.response?.status === 403 || e?.response?.status === 402
        this.loadError = apiErrorMessage(e, 'Could not load the supplier prices')
      }
    },
    restore() {
      let saved = null
      try {
        saved = JSON.parse(localStorage.getItem(STORE) || 'null')
      } catch {
        saved = null
      }
      const inp = blankInput()
      if (saved && typeof saved === 'object' && Array.isArray(saved.tlds)) {
        Object.assign(inp, saved, { rates: {} })
        this.activeTld = inp.tlds[0] || ''
      } else if (this.o.tlds.length) {
        inp.tlds = [this.o.tlds[0]]
        this.activeTld = inp.tlds[0]
      }
      if (inp.tier && !this.tiers.some((t) => t.key === inp.tier)) inp.tier = this.tiers[0]?.key || ''
      // A supplier that was deleted since cannot be pinned.
      for (const k of ['domain_from', 'hosting_from']) if (inp[k] && !this.o.suppliers.some((x) => x.id === inp[k])) inp[k] = ''
      this.input = inp
    },
    persist() {
      try {
        localStorage.setItem(STORE, JSON.stringify({ ...this.input, rates: {} }))
      } catch {
        /* per-viewer convenience only */
      }
    },
    onInput(patch) {
      this.input = { ...this.input, ...patch }
      // Choosing where a half comes from is choosing the mix to price.
      if ('domain_from' in patch || 'hosting_from' in patch) this.selectedKey = this.input.domain_from || this.input.hosting_from ? 'mix' : ''
      this.persist()
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.compare(), 150)
    },
    async compare() {
      const seq = ++this.seq
      this.comparing = true
      try {
        const r = await pricebookApi.compare(this.input)
        if (seq !== this.seq) return
        this.result = r
        this.compareError = ''
        if (!r.combos.some((c) => c.tld === this.activeTld)) this.activeTld = r.combos[0]?.tld || ''
      } catch (e) {
        if (seq !== this.seq) return
        this.compareError = apiErrorMessage(e, 'Could not run the comparison')
      } finally {
        if (seq === this.seq) {
          this.comparing = false
          this.compared = true
        }
      }
    },
    async reload() {
      await this.load()
      this.modelVersion++
      await this.compare()
    },
    setTab(t) {
      this.tab = t
      this.$router.replace({ query: { ...this.$route.query, tab: t === 'prices' ? undefined : t } }).catch(() => {})
    },
    showSupplier(s) {
      this.listSupplier = s.id
      this.setTab(s.type === 'self_hosted' && !s.items ? 'server' : 'prices')
    },
    onSaved(what) {
      if (what === 'item') this.itemModal = null
      else this.supplierModal = null
      this.reload()
    },
    onImported() {
      this.reload()
    },
    async autofill() {
      this.filling = true
      try {
        const r = await pricebookApi.autofillSynergy()
        this.fill = r
        if (r.created || r.updated) toast.success(`Synergy price list: ${r.created} added, ${r.updated} updated`)
        await this.reload()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not auto-fill the Synergy prices'))
      } finally {
        this.filling = false
      }
    },
    async exportCsv() {
      try {
        downloadBlob(await pricebookApi.exportCsv(), `supplier-prices-${this.o.today}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      }
    },
    async loadScenarios() {
      this.scenariosError = ''
      try {
        this.scenarios = (await pricebookApi.scenarios()).scenarios || []
      } catch (e) {
        this.scenariosError = apiErrorMessage(e, 'Could not load the saved comparisons')
      }
    },
    async saveScenario({ name, retail, result }) {
      const opt = this.option
      const body = {
        name,
        input: { compare: { ...this.input }, tld: this.combo?.tld || '', key: this.effectiveKey, retail },
        snapshot: {
          home: this.home,
          need: this.result?.need || '',
          combo: this.combo?.label || '',
          label: opt ? (opt.key.startsWith('mix') ? opt.label : opt.supplier_name) : '',
          first_year_home: opt?.first_year_home ?? null,
          ongoing_home: opt?.ongoing_home ?? null,
          cost_home: result?.cost_home ?? null,
          prices: (result?.markets || []).filter((m) => m.yearly).map((m) => ({ currency: m.market.currency, yearly: m.yearly.price, monthly: m.monthly?.price ?? null, margin_pct: m.yearly.margin_pct })),
          rates: (this.result?.rates || []).map((r) => ({ currency: r.currency, rate: r.rate, source: r.source })),
          saved_on: this.o.today
        }
      }
      try {
        await pricebookApi.saveScenario('', body)
        toast.success(`“${name}” saved`)
        await this.loadScenarios()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the comparison'))
      }
    },
    loadScenario(s) {
      const inp = { ...blankInput(), ...(s.input?.compare || {}) }
      if (!Array.isArray(inp.tlds)) inp.tlds = []
      this.input = inp
      this.activeTld = s.input?.tld || inp.tlds[0] || ''
      this.selectedKey = s.input?.key || ''
      this.retailPreset = s.input?.retail ? { ...s.input.retail } : null
      this.persist()
      this.compare()
      toast.info(`“${s.name}” opened with today's prices`)
      this.$nextTick(() => this.$el.querySelector('[data-testid="combo-compare"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    },
    openTiers() {
      this.tiersModal = { tiers: this.tiers.map((t) => ({ ...t })), busy: false, error: '' }
    },
    async saveTiers() {
      const m = this.tiersModal
      m.busy = true
      m.error = ''
      try {
        await pricebookApi.saveTiers(m.tiers)
        this.tiersModal = null
        toast.success('Tiers saved')
        await this.reload()
      } catch (e) {
        m.error = apiErrorMessage(e, 'Could not save the tiers')
      } finally {
        m.busy = false
      }
    }
  }
}
</script>

<style scoped>
.sp {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sp > .ui-page-head,
.sp > .ui-kpis {
  margin-bottom: 0;
}
@media (min-width: 641px) {
  .sp > .ui-page-head > div:first-child {
    flex: 1 1 280px;
    min-width: 0;
  }
}
.sp > .ui-alert {
  position: relative;
  padding-right: 44px;
}
.sp > .ui-alert .x {
  position: absolute;
  right: 6px;
  top: 6px;
}
.tabs-row {
  padding: 6px 14px 0;
  overflow-x: auto;
}
.count.warn {
  background: var(--warning-soft);
  color: var(--warning);
}
.tier {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.8fr;
  gap: 10px;
  margin-top: 10px;
}
@media (max-width: 480px) {
  .hide-xs {
    display: none;
  }
  .tier {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
