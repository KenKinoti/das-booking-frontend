<template>
  <div class="ui-page ui-page--wide bs bar-ui" data-testid="bar-stock">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Inventory &amp; supply</div>
        <h1>Bar stock</h1>
        <p>Bottles and tots across your store and bars — counts and variance, transfers, wastage and purchasing.</p>
      </div>
      <div v-if="ready && hasSetup" class="ui-actions">
        <button v-if="perm.create" type="button" class="ui-btn" data-testid="act-wastage" @click="wastageOpen = true"><i class="fa-solid fa-wine-glass-empty"></i> <span class="hide-xs">Log wastage</span></button>
        <button v-if="perm.create" type="button" class="ui-btn" data-testid="act-transfer" @click="openTransfer()"><i class="fa-solid fa-right-left"></i> <span class="hide-xs">{{ perm.edit ? 'Transfer' : 'Request stock' }}</span></button>
        <button v-if="perm.edit" type="button" class="ui-btn" data-testid="act-receive" @click="deliveryOpen = {}"><i class="fa-solid fa-truck-ramp-box"></i> <span class="hide-xs">Receive delivery</span></button>
        <button v-if="perm.create" type="button" class="ui-btn ui-btn--primary" data-testid="act-count" @click="countOpen = true"><i class="fa-solid fa-clipboard-check"></i> Start count</button>
      </div>
    </header>

    <div v-if="bar.error && !bar.loaded" class="ui-alert ui-alert--danger">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{{ bar.error }} <a v-if="!bar.forbidden" href="#" @click.prevent="reloadAll">Try again</a></span>
    </div>

    <div v-else-if="!ready" class="bs__loading">
      <div class="ui-kpis"><div v-for="n in 4" :key="n" class="ui-kpi"><div class="ui-skeleton" style="height: 64px"></div></div></div>
      <div class="ui-skeleton" style="height: 360px; border-radius: var(--radius-lg)"></div>
    </div>

    <template v-else>
      <!-- First run: nothing set up yet -->
      <section v-if="!hasSetup" class="ui-card setup-guide" data-testid="bar-empty">
        <div class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-martini-glass-citrus"></i></div>
          <h3>Set up your bar stock</h3>
          <p v-if="perm.approve">Add your store and bars, then your stock items. Counts, transfers, wastage and purchasing follow from there.</p>
          <p v-else>Your manager hasn't set up the store and bars yet. Ask them to finish Bar stock → Setup.</p>
          <div v-if="perm.approve" class="setup-guide__actions">
            <button type="button" class="ui-btn ui-btn--primary" data-testid="go-setup" @click="setTab('setup')"><i class="fa-solid fa-sliders"></i> Set up bars &amp; store</button>
            <router-link v-if="isAdmin" to="/setup" class="ui-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Business setup wizard</router-link>
          </div>
        </div>
        <ol v-if="perm.approve" class="steps">
          <li :class="{ done: bar.locations.length }"><i class="fa-solid fa-warehouse"></i><span><strong>Store &amp; bars</strong><small>Where stock is kept and sold</small></span></li>
          <li><i class="fa-solid fa-bottle-droplet"></i><span><strong>Stock items</strong><small>Bottles, kegs, cans — from the starter list or your own</small></span></li>
          <li><i class="fa-solid fa-whiskey-glass"></i><span><strong>Tots &amp; menu items</strong><small>What the POS sells, with recipes</small></span></li>
          <li><i class="fa-solid fa-truck-ramp-box"></i><span><strong>First delivery</strong><small>Opening stock and costs</small></span></li>
          <li><i class="fa-solid fa-clipboard-check"></i><span><strong>First stock take</strong><small>Then variance night by night</small></span></li>
        </ol>
      </section>

      <!-- KPIs for the business date -->
      <div v-if="showKpis" class="kpi-head">
        <div class="kpi-head__date">
          <label class="ui-label" for="bs-date">Business date</label>
          <input id="bs-date" v-model="date" class="ui-input" type="date" :max="todayBiz" data-testid="biz-date" />
          <button v-if="date !== todayBiz" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="date = todayBiz">Tonight</button>
          <span class="muted hide-xs">Nights run until {{ cutoff }}</span>
        </div>
      </div>
      <BarKpis v-if="showKpis" :ov="ov" :loading="ovLoading" :show-money="perm.approve" @go="setTab" />
      <div v-if="ovError && showKpis" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ ovError }} <a href="#" @click.prevent="loadOverview">Try again</a></span></div>

      <section class="ui-card bs__main">
        <div class="tabs-row">
          <div class="ui-tabs" role="tablist" aria-label="Bar stock">
            <button v-for="t in tabs" :key="t.key" type="button" class="ui-tab" :class="{ 'is-active': tab === t.key }" role="tab" :aria-selected="tab === t.key" :data-tab="t.key" @click="setTab(t.key)">
              <i :class="t.icon"></i> {{ t.label }}<span v-if="t.count" class="count" :class="t.tone">{{ t.count }}</span>
            </button>
          </div>
        </div>
        <div class="ui-card__body bs__body">
          <BarOverview v-if="tab === 'overview'" :ov="ov" :loading="ovLoading" :perm="perm" :version="version" @go="setTab" @open-count="openCountReview" @open-transfer="openTransferDetail" @open-item="openItem" @transfer="openTransfer" />
          <BarHome v-else-if="tab === 'home'" :perm="perm" :version="version" @start-count="countOpen = true" @request="openTransfer" @wastage="wastageOpen = true" @open-transfer="openTransferDetail" @go="setTab" />
          <BarStockTab v-else-if="tab === 'stock'" :perm="perm" :version="version" @open-item="openItem" @changed="bump" @transfer="openTransfer" />
          <BarMenu v-else-if="tab === 'recipes'" :perm="perm" :version="version" @changed="bump" @go="setTab" />
          <BarCounts v-else-if="tab === 'counts'" :perm="perm" :version="version" @start="countOpen = true" @review="openCountReview" @changed="bump" />
          <BarTransfers v-else-if="tab === 'transfers'" :perm="perm" :version="version" @new="openTransfer" @open="openTransferDetail" />
          <BarWastage v-else-if="tab === 'wastage'" :perm="perm" :version="version" :date="date" @log="wastageOpen = true" @changed="bump" />
          <BarPurchasing v-else-if="tab === 'purchasing'" :perm="perm" :version="version" @receive="deliveryOpen = $event || {}" @changed="bump" />
          <BarReports v-else-if="tab === 'reports'" :perm="perm" :version="version" :date="date" @review="openCountReview" />
          <BarSetup v-else-if="tab === 'setup'" :perm="perm" :version="version" @changed="onSetupChanged" />
        </div>
      </section>
    </template>

    <StartCountModal v-if="countOpen" @close="countOpen = false" @started="onCountStarted" />
    <TransferModal v-if="transferOpen" :preset="transferOpen" :perm="perm" @close="transferOpen = null" @saved="onSaved('transfer')" />
    <WastageModal v-if="wastageOpen" :perm="perm" @close="wastageOpen = false" @saved="onSaved('wastage')" />
    <DeliveryModal v-if="deliveryOpen" :preset="deliveryOpen" @close="deliveryOpen = null" @saved="onSaved('delivery')" />
    <CountReview v-if="reviewId" :id="reviewId" :perm="perm" @close="closeReview" @changed="bump" />
    <TransferDrawer v-if="transferId" :id="transferId" :perm="perm" @close="transferId = ''" @changed="bump" />
    <ItemDrawer v-if="itemId" :id="itemId" :perm="perm" @close="closeItem" @changed="bump" />
  </div>
</template>

<script>
import '@/components/bar/bar.css'
import { bar, loadBar, barPerms, dayCutoff } from '@/components/bar/barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { access, loadAccess } from '@/composables/useAccess'
import { useAuthStore } from '@/stores/auth'
import { businessDate } from '@/utils/barUnits'
import { toast } from '@/composables/useToast'
import BarKpis from '@/components/bar/BarKpis.vue'
import BarOverview from '@/components/bar/BarOverview.vue'
import BarHome from '@/components/bar/BarHome.vue'
import BarStockTab from '@/components/bar/BarStockTab.vue'
import BarMenu from '@/components/bar/BarMenu.vue'
import BarCounts from '@/components/bar/BarCounts.vue'
import BarTransfers from '@/components/bar/BarTransfers.vue'
import BarWastage from '@/components/bar/BarWastage.vue'
import BarPurchasing from '@/components/bar/BarPurchasing.vue'
import BarReports from '@/components/bar/BarReports.vue'
import BarSetup from '@/components/bar/BarSetup.vue'
import StartCountModal from '@/components/bar/StartCountModal.vue'
import TransferModal from '@/components/bar/TransferModal.vue'
import WastageModal from '@/components/bar/WastageModal.vue'
import DeliveryModal from '@/components/bar/DeliveryModal.vue'
import CountReview from '@/components/bar/CountReview.vue'
import TransferDrawer from '@/components/bar/TransferDrawer.vue'
import ItemDrawer from '@/components/bar/ItemDrawer.vue'

const ALL_TABS = ['overview', 'home', 'stock', 'recipes', 'counts', 'transfers', 'wastage', 'purchasing', 'reports', 'setup']

export default {
  name: 'BarStock',
  components: { BarKpis, BarOverview, BarHome, BarStockTab, BarMenu, BarCounts, BarTransfers, BarWastage, BarPurchasing, BarReports, BarSetup, StartCountModal, TransferModal, WastageModal, DeliveryModal, CountReview, TransferDrawer, ItemDrawer },
  data() {
    return {
      bar,
      tab: '',
      date: '',
      ov: null,
      ovLoading: false,
      ovError: '',
      ovSeq: 0,
      version: 0,
      countOpen: false,
      transferOpen: null,
      wastageOpen: false,
      deliveryOpen: null,
      reviewId: String(this.$route.query.count || ''),
      transferId: '',
      itemId: String(this.$route.query.item || ''),
      accessTick: 0
    }
  },
  computed: {
    perm() {
      void access.permissions
      void this.accessTick
      return barPerms()
    },
    isAdmin() {
      return useAuthStore().isSuperAdmin || access.isAdmin
    },
    ready() {
      return bar.loaded
    },
    hasSetup() {
      return bar.locations.length > 0
    },
    cutoff() {
      return dayCutoff()
    },
    // The night's figures sit above every tab except Setup and the bartender's "My bar" (actions first on a phone).
    showKpis() {
      return this.hasSetup && this.tab !== 'setup' && this.tab !== 'home'
    },
    todayBiz() {
      // The server's business date (organisation time zone + day cutoff), else this device's clock.
      return bar.settings?.business_date || businessDate(this.cutoff)
    },
    // Bartenders (view + create, no edit) get "My bar" as home; managers the overview.
    homeTab() {
      return this.perm.edit || this.perm.approve ? 'overview' : 'home'
    },
    tabs() {
      const p = this.perm
      const ov = this.ov || {}
      const pendT = Number(ov.pending_transfers?.total) || 0
      const out = []
      if (p.edit || p.approve) out.push({ key: 'overview', label: 'Overview', icon: 'fa-solid fa-gauge-high' })
      else out.push({ key: 'home', label: 'My bar', icon: 'fa-solid fa-martini-glass-citrus' })
      out.push({ key: 'stock', label: 'Stock', icon: 'fa-solid fa-bottle-droplet' })
      if (p.edit || p.approve) out.push({ key: 'recipes', label: 'Menu & recipes', icon: 'fa-solid fa-whiskey-glass' })
      out.push({ key: 'counts', label: 'Counts', icon: 'fa-solid fa-clipboard-check', count: p.approve ? Number(ov.pending_approvals?.counts) || 0 : Number(ov.open_counts) || 0, tone: 'warn' })
      out.push({ key: 'transfers', label: 'Transfers', icon: 'fa-solid fa-right-left', count: pendT, tone: 'warn' })
      out.push({ key: 'wastage', label: 'Wastage', icon: 'fa-solid fa-wine-glass-empty', count: p.approve ? Number(ov.pending_approvals?.wastage) || 0 : 0, tone: 'warn' })
      if (p.edit || p.approve) out.push({ key: 'purchasing', label: 'Purchasing', icon: 'fa-solid fa-cart-flatbed' })
      if (p.edit || p.approve) out.push({ key: 'reports', label: 'Reports', icon: 'fa-solid fa-chart-column' })
      if (p.approve) out.push({ key: 'setup', label: 'Setup', icon: 'fa-solid fa-sliders' })
      return out
    }
  },
  watch: {
    date(v, old) {
      if (old && v) this.loadOverview()
    },
    '$route.query.tab'(t) {
      const k = this.validTab(String(t || ''))
      if (k !== this.tab) this.tab = k
    }
  },
  async created() {
    await Promise.all([loadBar(true), access.loaded ? null : loadAccess()])
    this.accessTick++
    this.date = this.todayBiz
    this.tab = this.validTab(String(this.$route.query.tab || ''))
    if (!bar.locations.length && this.perm.approve && !this.$route.query.tab) this.tab = 'setup'
    if (bar.locations.length) this.loadOverview()
    this.revealTab()
  },
  methods: {
    num(v) {
      if (Array.isArray(v)) return v.length
      if (v && typeof v === 'object') return Object.values(v).reduce((s, x) => s + (Number(x) || 0), 0)
      return Number(v) || 0
    },
    validTab(t) {
      const allowed = this.tabs.map((x) => x.key)
      if (t === 'item') return 'stock'
      if (ALL_TABS.includes(t) && allowed.includes(t)) return t
      if (t === 'overview' && allowed.includes('home')) return 'home'
      if (t === 'home' && allowed.includes('overview')) return 'overview'
      return this.homeTab
    },
    revealTab() {
      // keep the active tab visible in the scrolling tab strip (phones)
      this.$nextTick(() => {
        const row = this.$el?.querySelector?.('.tabs-row')
        const el = row?.querySelector('.ui-tab.is-active')
        if (!row || !el) return
        for (const sc of [row, row.querySelector('.ui-tabs')]) {
          if (!sc || sc.scrollWidth <= sc.clientWidth) continue
          const a = el.getBoundingClientRect()
          const b = sc.getBoundingClientRect()
          sc.scrollLeft += a.left - b.left - (sc.clientWidth - a.width) / 2
        }
      })
    },
    setTab(t) {
      const k = this.validTab(t)
      this.tab = k
      this.revealTab()
      const q = { ...this.$route.query, tab: k === this.homeTab ? undefined : k }
      this.$router.replace({ query: q }).catch(() => {})
    },
    async loadOverview() {
      if (!this.date) return
      const seq = ++this.ovSeq
      this.ovLoading = true
      this.ovError = ''
      try {
        const o = await barApi.overview(this.date)
        if (seq === this.ovSeq) this.ov = o || {}
      } catch (e) {
        if (seq === this.ovSeq) this.ovError = apiErrorMessage(e, 'Could not load tonight’s figures')
      } finally {
        if (seq === this.ovSeq) this.ovLoading = false
      }
    },
    async reloadAll() {
      await loadBar(true)
      if (bar.locations.length) this.loadOverview()
    },
    bump() {
      this.version++
      this.loadOverview()
    },
    async onSetupChanged() {
      const had = bar.locations.length
      await loadBar(true)
      this.version++
      if (bar.locations.length) this.loadOverview()
      if (!had && bar.locations.length) toast.info('Next: add your stock items on the Stock tab')
    },
    onSaved(kind) {
      if (kind === 'transfer') this.transferOpen = null
      if (kind === 'wastage') this.wastageOpen = false
      if (kind === 'delivery') this.deliveryOpen = null
      this.bump()
    },
    openTransfer(preset) {
      this.transferOpen = preset && typeof preset === 'object' && !(preset instanceof Event) ? preset : {}
    },
    openTransferDetail(id) {
      this.transferId = id
    },
    openCountReview(id) {
      this.reviewId = id
      this.$router.replace({ query: { ...this.$route.query, count: id } }).catch(() => {})
    },
    closeReview() {
      this.reviewId = ''
      const q = { ...this.$route.query }
      delete q.count
      this.$router.replace({ query: q }).catch(() => {})
    },
    openItem(id) {
      this.itemId = id
      this.$router.replace({ query: { ...this.$route.query, item: id } }).catch(() => {})
    },
    closeItem() {
      this.itemId = ''
      const q = { ...this.$route.query }
      delete q.item
      this.$router.replace({ query: q }).catch(() => {})
    },
    onCountStarted(c) {
      this.countOpen = false
      this.$router.push(`/bar-stock/count/${c.id}`)
    }
  }
}
</script>

<style scoped>
.bs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bs > .ui-page-head,
.bs .ui-kpis {
  margin-bottom: 0;
}
@media (min-width: 641px) {
  .bs > .ui-page-head > div:first-child {
    flex: 1 1 320px;
    min-width: 0;
  }
}
.bs__loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tabs-row {
  padding: 6px 14px 0;
  overflow-x: auto;
  scrollbar-width: thin;
}
.tabs-row .ui-tabs {
  flex-wrap: nowrap;
}
.tabs-row .ui-tab {
  white-space: nowrap;
}
.count.warn {
  background: var(--warning-soft);
  color: var(--warning);
}
.bs__body {
  min-height: 240px;
}
.kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: -6px;
}
.kpi-head__date {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.kpi-head__date .ui-label {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-3);
  font-weight: 600;
}
.kpi-head__date .ui-input {
  width: auto;
  min-width: 150px;
  height: 34px;
  padding-top: 4px;
  padding-bottom: 4px;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.setup-guide .ui-empty {
  padding-bottom: 8px;
}
.setup-guide__actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 14px;
}
.steps {
  list-style: none;
  margin: 0;
  padding: 8px 20px 22px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  counter-reset: s;
}
.steps li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  min-width: 0;
}
.steps li > i {
  color: var(--accent);
  margin-top: 3px;
}
.steps li.done > i {
  color: var(--success);
}
.steps span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.steps strong {
  font-size: 13.5px;
}
.steps small {
  font-size: 12px;
  color: var(--text-3);
}
@media (max-width: 1100px) {
  .steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 480px) {
  .hide-xs {
    display: none;
  }
  .steps {
    grid-template-columns: 1fr;
    padding: 8px 14px 16px;
  }
  .bs > .ui-page-head .ui-actions {
    width: 100%;
  }
  .bs > .ui-page-head .ui-actions .ui-btn--primary {
    margin-left: auto;
  }
}
</style>
