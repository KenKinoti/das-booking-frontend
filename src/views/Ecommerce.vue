<template>
  <div class="mp ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Sales channels</div>
        <h1>Online store</h1>
        <p>Connect your Shopify or WooCommerce store and bring its orders into DASYIN (read-only import).</p>
      </div>
      <div class="ui-actions">
        <button v-if="connections.length" class="ui-btn" :disabled="syncingAll" @click="syncAll">
          <i :class="syncingAll ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-rotate'"></i> Import from all
        </button>
        <button class="ui-btn ui-btn--primary" @click="openConnect()"><i class="fa-solid fa-plug"></i> Connect store</button>
      </div>
    </header>

    <div class="ui-kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-store"></i></span>Connected stores</div>
        <div class="ui-kpi__value tnum">{{ summary ? summary.connections : '–' }}</div>
        <div class="ui-kpi__meta">{{ summary && summary.last_sync_at ? `Last import ${dateTime(summary.last_sync_at)}` : 'No imports yet' }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-bag-shopping"></i></span>Orders · 30 days</div>
        <div class="ui-kpi__value tnum">{{ summary ? summary.orders_30d : '–' }}</div>
        <div class="ui-kpi__meta">{{ summary ? `${summary.orders} imported in total` : ' ' }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-sack-dollar"></i></span>Sales · 30 days</div>
        <div class="ui-kpi__value tnum">{{ revenueMain }}</div>
        <div class="ui-kpi__meta">{{ revenueOther || 'Excludes cancelled and refunded' }}</div>
      </div>
      <button class="ui-kpi kpi-btn" @click="setStatus('open')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-truck-fast"></i></span>To fulfil</div>
        <div class="ui-kpi__value tnum">{{ summary ? summary.open_orders : '–' }}</div>
        <div class="ui-kpi__meta">Pending or processing in the store</div>
      </button>
    </div>

    <!-- Stores -->
    <section class="stores-wrap">
      <div v-if="loadingConns && !connections.length" class="stores">
        <div v-for="n in 2" :key="n" class="ui-card store"><div class="ui-skeleton" style="height: 120px"></div></div>
      </div>
      <div v-else-if="!connections.length" class="ui-card">
        <div class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-plug"></i></div>
          <h3>No store connected yet</h3>
          <p>Connect Shopify or WooCommerce with an API key. We only read orders — nothing in your store is changed.</p>
          <div class="ui-actions" style="justify-content: center; margin-top: 14px">
            <button class="ui-btn" @click="openConnect('shopify')"><i class="fa-brands fa-shopify"></i> Connect Shopify</button>
            <button class="ui-btn" @click="openConnect('woocommerce')"><i class="fa-brands fa-wordpress"></i> Connect WooCommerce</button>
          </div>
        </div>
      </div>
      <div v-else class="stores">
        <article v-for="c in connections" :key="c.id" class="ui-card store">
          <div class="store__head">
            <span class="store__logo" :class="`logo-${c.platform}`"><i :class="c.platform === 'shopify' ? 'fa-brands fa-shopify' : 'fa-brands fa-wordpress'"></i></span>
            <div class="store__title">
              <h3>{{ c.name }}</h3>
              <a :href="c.store_url" target="_blank" rel="noopener noreferrer" class="muted small">{{ c.store_url.replace(/^https?:\/\//, '') }} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
            </div>
            <span class="ui-badge" :class="statusBadge(c.status)">{{ statusLabel(c.status) }}</span>
          </div>
          <dl class="store__meta">
            <div><dt>Platform</dt><dd>{{ c.platform === 'shopify' ? 'Shopify' : 'WooCommerce' }}</dd></div>
            <div><dt>API key</dt><dd class="mono">{{ c.key_hint || '—' }}</dd></div>
            <div><dt>Orders imported</dt><dd class="tnum">{{ c.orders_imported }}</dd></div>
            <div><dt>Last import</dt><dd>{{ c.last_sync_at ? dateTime(c.last_sync_at) : 'Never' }}</dd></div>
          </dl>
          <div v-if="c.status === 'error' && c.last_error" class="ui-alert ui-alert--danger store__err"><i class="fa-solid fa-circle-exclamation"></i><span>{{ c.last_error }}</span></div>
          <div class="store__actions">
            <button class="ui-btn ui-btn--sm ui-btn--primary" :disabled="!!busy[c.id]" @click="sync(c)"><i :class="busy[c.id] === 'sync' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-download'"></i> Import orders</button>
            <button class="ui-btn ui-btn--sm" :disabled="!!busy[c.id]" @click="test(c)"><i :class="busy[c.id] === 'test' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-stethoscope'"></i> Test</button>
            <span class="spacer"></span>
            <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${c.name}`" title="Edit" @click="openEdit(c)"><i class="fa-regular fa-pen-to-square"></i></button>
            <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Disconnect ${c.name}`" title="Disconnect" @click="disconnect(c)"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </article>
      </div>
    </section>

    <!-- Orders -->
    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in statusTabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" @click="setStatus(t.value)">{{ t.label }}</button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search order, customer, email…" aria-label="Search orders" @input="debounced" />
          </div>
          <select v-if="connections.length > 1" v-model="storeId" class="ui-select filter" aria-label="Store" @change="loadOrders(1)">
            <option value="">All stores</option>
            <option v-for="c in connections" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </div>

      <div v-if="ordersError" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ ordersError }} <a href="#" @click.prevent="loadOrders()">Try again</a></span></div>
      </div>
      <div v-else-if="loadingOrders && !orders.length" class="ui-card__body">
        <div v-for="n in 5" :key="n" class="sk-row"><div class="ui-skeleton" style="width: 80px"></div><div class="ui-skeleton" style="flex: 1"></div><div class="ui-skeleton" style="width: 90px"></div></div>
      </div>
      <div v-else-if="!orders.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-bag-shopping"></i></div>
        <h3>{{ q || status !== 'all' ? 'No orders match' : 'No orders imported yet' }}</h3>
        <p>{{ connections.length ? 'Use “Import orders” on a store to pull in its orders.' : 'Connect a store to see its orders here.' }}</p>
      </div>
      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loadingOrders }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th class="hide-md">Store</th>
              <th class="hide-sm">Placed</th>
              <th class="num hide-sm">Items</th>
              <th class="num">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id" class="is-clickable" @click="openOrder(o)">
              <td><strong>{{ o.number }}</strong></td>
              <td>
                <span class="strong">{{ o.customer_name || 'Guest' }}</span>
                <small class="muted block">{{ o.customer_email || '—' }}</small>
              </td>
              <td class="hide-md">
                <i :class="o.platform === 'shopify' ? 'fa-brands fa-shopify' : 'fa-brands fa-wordpress'" class="muted"></i> {{ o.store_name }}
              </td>
              <td class="hide-sm nowrap">{{ dateTime(o.placed_at) }}</td>
              <td class="num hide-sm tnum">{{ o.items_count }}</td>
              <td class="num tnum"><strong>{{ money(o.total, o.currency) }}</strong></td>
              <td>
                <span class="ui-badge" :class="orderBadge(o.status)">{{ cap(o.status) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer v-if="total > perPage" class="pager">
        <span class="muted">{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} of {{ total }}</span>
        <div class="ui-actions">
          <button class="ui-btn ui-btn--sm" :disabled="page <= 1" @click="loadOrders(page - 1)"><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <button class="ui-btn ui-btn--sm" :disabled="page * perPage >= total" @click="loadOrders(page + 1)">Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </footer>
    </section>

    <!-- Connect / edit store -->
    <div v-if="modal" class="ui-modal-backdrop" @mousedown.self="closeModal">
      <form class="ui-modal" style="max-width: 640px" novalidate autocomplete="off" @submit.prevent="saveConnection">
        <div class="ui-modal__head">
          <h2>{{ form.id ? 'Edit store connection' : 'Connect a store' }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="closeModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="!form.id" class="platforms" role="radiogroup" aria-label="Platform">
            <button type="button" class="platform" :class="{ 'is-selected': form.platform === 'shopify' }" role="radio" :aria-checked="form.platform === 'shopify'" @click="form.platform = 'shopify'">
              <span class="store__logo logo-shopify"><i class="fa-brands fa-shopify"></i></span>
              <span><strong>Shopify</strong><small>Admin API access token</small></span>
            </button>
            <button type="button" class="platform" :class="{ 'is-selected': form.platform === 'woocommerce' }" role="radio" :aria-checked="form.platform === 'woocommerce'" @click="form.platform = 'woocommerce'">
              <span class="store__logo logo-woocommerce"><i class="fa-brands fa-wordpress"></i></span>
              <span><strong>WooCommerce</strong><small>REST API consumer key</small></span>
            </button>
          </div>

          <div v-if="formError" class="ui-alert ui-alert--danger" style="margin: 16px 0 0"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>

          <div class="form-grid" style="margin-top: 16px">
            <label class="ui-field span-2">
              <span class="ui-label">Store address *</span>
              <input v-model.trim="form.store_url" name="store_url" class="ui-input" :class="{ 'is-invalid': errors.store_url }" :placeholder="form.platform === 'shopify' ? 'your-store.myshopify.com' : 'https://shop.example.com'" />
              <span v-if="errors.store_url" class="field-error">{{ errors.store_url }}</span>
              <span v-else class="ui-hint">{{ form.platform === 'shopify' ? 'Use the .myshopify.com address (Shopify admin → Settings → Domains).' : 'The https address of your WordPress site.' }}</span>
            </label>
            <label class="ui-field span-2">
              <span class="ui-label">Display name</span>
              <input v-model.trim="form.name" name="name" class="ui-input" maxlength="160" placeholder="Defaults to the store address" />
            </label>
            <label class="ui-field" :class="{ 'span-2': form.platform === 'shopify' }">
              <span class="ui-label">{{ form.platform === 'shopify' ? 'Admin API access token' : 'Consumer key' }}{{ form.id ? '' : ' *' }}</span>
              <input v-model.trim="form.api_key" name="api_key" type="password" class="ui-input mono" :class="{ 'is-invalid': errors.api_key }" autocomplete="new-password" :placeholder="form.id ? `Saved (${form.key_hint}) — leave blank to keep` : form.platform === 'shopify' ? 'shpat_…' : 'ck_…'" />
              <span v-if="errors.api_key" class="field-error">{{ errors.api_key }}</span>
            </label>
            <label v-if="form.platform === 'woocommerce'" class="ui-field">
              <span class="ui-label">Consumer secret{{ form.id ? '' : ' *' }}</span>
              <input v-model.trim="form.api_secret" name="api_secret" type="password" class="ui-input mono" :class="{ 'is-invalid': errors.api_secret }" autocomplete="new-password" :placeholder="form.id && form.has_secret ? 'Saved — leave blank to keep' : 'cs_…'" />
              <span v-if="errors.api_secret" class="field-error">{{ errors.api_secret }}</span>
            </label>
          </div>

          <details class="howto">
            <summary><i class="fa-regular fa-circle-question"></i> Where do I find these?</summary>
            <ol v-if="form.platform === 'shopify'">
              <li>In Shopify admin open <strong>Settings → Apps and sales channels → Develop apps</strong>.</li>
              <li>Create an app and give it the <code>read_orders</code> Admin API scope.</li>
              <li>Install the app and copy the <strong>Admin API access token</strong> (starts with <code>shpat_</code>).</li>
            </ol>
            <ol v-else>
              <li>In WordPress open <strong>WooCommerce → Settings → Advanced → REST API</strong>.</li>
              <li>Add a key with <strong>Read</strong> permission.</li>
              <li>Copy the consumer key (<code>ck_…</code>) and consumer secret (<code>cs_…</code>).</li>
            </ol>
            <p class="muted small">Keys are encrypted at rest and only the last four characters are ever shown again. Only https store addresses on the public internet are accepted.</p>
          </details>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="closeModal">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-plug'"></i> {{ form.id ? 'Save & test' : 'Connect & test' }}</button>
        </div>
      </form>
    </div>

    <!-- Order detail -->
    <div v-if="order" class="ui-modal-backdrop" @mousedown.self="order = null">
      <div class="ui-modal" style="max-width: 680px" role="dialog" :aria-label="`Order ${order.number}`">
        <div class="ui-modal__head">
          <h2>Order {{ order.number }} <span class="ui-badge" :class="orderBadge(order.status)" style="margin-left: 8px; vertical-align: middle">{{ cap(order.status) }}</span></h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="order = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <dl class="stat-list">
            <div><dt>Customer</dt><dd class="text">{{ order.customer_name || 'Guest' }}<small class="muted block">{{ order.customer_email }}</small></dd></div>
            <div><dt>Placed</dt><dd class="text">{{ dateTime(order.placed_at) }}</dd></div>
            <div><dt>Payment</dt><dd class="text">{{ cap(order.payment_status || '—') }}</dd></div>
          </dl>
          <div class="ui-table-wrap items">
            <table class="ui-table">
              <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Total</th></tr></thead>
              <tbody>
                <tr v-for="(it, i) in order.items || []" :key="i">
                  <td>{{ it.name }}<small v-if="it.sku" class="muted block">SKU {{ it.sku }}</small></td>
                  <td class="num tnum">{{ it.quantity }}</td>
                  <td class="num tnum">{{ money(it.total, order.currency) }}</td>
                </tr>
                <tr v-if="!(order.items || []).length"><td colspan="3" class="muted">No line items</td></tr>
              </tbody>
            </table>
          </div>
          <dl class="totals">
            <div><dt>Subtotal</dt><dd>{{ money(order.subtotal, order.currency) }}</dd></div>
            <div><dt>Shipping</dt><dd>{{ money(order.shipping, order.currency) }}</dd></div>
            <div><dt>Tax</dt><dd>{{ money(order.tax, order.currency) }}</dd></div>
            <div class="grand"><dt>Total</dt><dd>{{ money(order.total, order.currency) }}</dd></div>
          </dl>
          <p class="muted small" style="margin-bottom: 0">
            From {{ order.store_name }} ({{ order.platform === 'shopify' ? 'Shopify' : 'WooCommerce' }} status: {{ order.platform_status || '—' }}) · imported {{ dateTime(order.imported_at) }}. Manage fulfilment in your store.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import '@/styles/module-page.css'
import api, { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'Ecommerce',
  data() {
    return {
      summary: null,
      connections: [],
      loadingConns: true,
      orders: [],
      total: 0,
      page: 1,
      perPage: 25,
      status: 'all',
      storeId: '',
      q: '',
      loadingOrders: true,
      ordersError: '',
      timer: null,
      busy: {},
      syncingAll: false,
      modal: false,
      form: {},
      errors: {},
      formError: '',
      saving: false,
      order: null,
      statusTabs: [
        { value: 'all', label: 'All' },
        { value: 'open', label: 'To fulfil' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'refunded', label: 'Refunded' }
      ]
    }
  },
  computed: {
    revenueMain() {
      const r = (this.summary && this.summary.revenue_30d) || []
      return r.length ? formatMoney(r[0].total, r[0].currency) : this.summary ? formatMoney(0, orgCurrency()) : '–'
    },
    revenueOther() {
      const r = (this.summary && this.summary.revenue_30d) || []
      return r.length > 1 ? '+ ' + r.slice(1).map((x) => formatMoney(x.total, x.currency)).join(' + ') : ''
    }
  },
  created() {
    this.loadAll()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    money: formatMoney,
    dateTime: formatDateTime,
    cap: (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : ''),
    statusLabel(s) {
      return { connected: 'Connected', error: 'Needs attention', untested: 'Not tested' }[s] || s
    },
    statusBadge(s) {
      return { connected: 'ui-badge--success', error: 'ui-badge--danger', untested: 'ui-badge--draft' }[s]
    },
    orderBadge(s) {
      return { pending: 'ui-badge--warning', processing: 'ui-badge--info', completed: 'ui-badge--success', cancelled: 'ui-badge--void', refunded: 'ui-badge--danger' }[s] || 'ui-badge--draft'
    },
    loadAll() {
      this.loadSummary()
      this.loadConnections()
      this.loadOrders(1)
    },
    async loadSummary() {
      try {
        const { data } = await api.get('/ecom/summary')
        this.summary = data.data
      } catch {
        this.summary = null
      }
    },
    async loadConnections() {
      this.loadingConns = true
      try {
        const { data } = await api.get('/ecom/connections')
        this.connections = data.data.connections || []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load store connections'))
      } finally {
        this.loadingConns = false
      }
    },
    async loadOrders(page = this.page) {
      this.loadingOrders = true
      this.ordersError = ''
      try {
        const { data } = await api.get('/ecom/orders', { params: { status: this.status, q: this.q || undefined, connection_id: this.storeId || undefined, page, per_page: this.perPage } })
        this.orders = data.data.orders || []
        this.total = data.data.total || 0
        this.page = page
      } catch (e) {
        this.ordersError = apiErrorMessage(e, 'Could not load orders')
      } finally {
        this.loadingOrders = false
      }
    },
    setStatus(s) {
      this.status = s
      this.loadOrders(1)
    },
    debounced() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.loadOrders(1), 280)
    },
    openConnect(platform = 'shopify') {
      this.form = { id: '', platform, name: '', store_url: '', api_key: '', api_secret: '' }
      this.errors = {}
      this.formError = ''
      this.modal = true
    },
    openEdit(c) {
      this.form = { ...c, api_key: '', api_secret: '' }
      this.errors = {}
      this.formError = ''
      this.modal = true
    },
    closeModal() {
      if (!this.saving) this.modal = false
    },
    validate() {
      const e = {}
      const url = this.form.store_url
      if (!url) e.store_url = 'Enter your store address'
      if (!this.form.id) {
        if (!this.form.api_key) e.api_key = 'Required'
        if (this.form.platform === 'woocommerce' && !this.form.api_secret) e.api_secret = 'Required'
      } else if (this.form.api_key && this.form.platform === 'woocommerce' && !this.form.api_secret && !this.form.has_secret) {
        e.api_secret = 'Required'
      }
      this.errors = e
      return !Object.keys(e).length
    },
    async saveConnection() {
      if (!this.validate()) return
      this.saving = true
      this.formError = ''
      const body = { platform: this.form.platform, name: this.form.name, store_url: this.form.store_url, api_key: this.form.api_key, api_secret: this.form.api_secret }
      try {
        const { data } = this.form.id ? await api.put(`/ecom/connections/${this.form.id}`, body) : await api.post('/ecom/connections', body)
        const { connection, test } = data.data
        this.loadConnections()
        this.loadSummary()
        if (test.ok) {
          toast.success(test.message)
          this.modal = false
        } else {
          // Saved, but the test failed: stay in the form as an edit so the user can fix it.
          this.form = { ...connection, api_key: '', api_secret: '' }
          this.formError = `Saved, but the connection test failed: ${test.message}`
        }
      } catch (e) {
        this.formError = apiErrorMessage(e, 'Could not save the store connection')
      } finally {
        this.saving = false
      }
    },
    async test(c) {
      this.busy = { ...this.busy, [c.id]: 'test' }
      try {
        const { data } = await api.post(`/ecom/connections/${c.id}/test`)
        if (data.data.test.ok) toast.success(data.data.test.message)
        else toast.error(data.data.test.message)
        this.loadConnections()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Test failed'))
      } finally {
        this.busy = { ...this.busy, [c.id]: '' }
      }
    },
    async sync(c, quiet = false) {
      this.busy = { ...this.busy, [c.id]: 'sync' }
      try {
        const { data } = await api.post(`/ecom/connections/${c.id}/sync`)
        const { created, updated } = data.data
        if (!quiet) toast.success(`Imported from ${c.name}: ${created} new, ${updated} updated`)
        return true
      } catch (e) {
        toast.error(`${c.name}: ${apiErrorMessage(e, 'Import failed')}`)
        return false
      } finally {
        this.busy = { ...this.busy, [c.id]: '' }
        if (!quiet) this.loadAll()
      }
    },
    async syncAll() {
      this.syncingAll = true
      let ok = 0
      for (const c of this.connections) if (await this.sync(c, true)) ok++
      this.syncingAll = false
      if (ok) toast.success(`Imported orders from ${ok} store${ok === 1 ? '' : 's'}`)
      this.loadAll()
    },
    async disconnect(c) {
      const okd = await confirmDialog({
        title: `Disconnect ${c.name}?`,
        message: `The saved API key is deleted and the ${c.orders_imported} imported order(s) from this store are removed from DASYIN. Nothing changes in your store.`,
        confirmText: 'Disconnect',
        danger: true
      })
      if (!okd) return
      try {
        await api.delete(`/ecom/connections/${c.id}`)
        toast.success(`${c.name} disconnected`)
        if (this.storeId === c.id) this.storeId = ''
        this.loadAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not disconnect'))
      }
    },
    async openOrder(o) {
      this.order = { ...o, items: null }
      try {
        const { data } = await api.get(`/ecom/orders/${o.id}`)
        this.order = data.data
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load order'))
      }
    }
  }
}
</script>

<style scoped>
.block {
  display: block;
  font-size: 12px;
}

.mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.stores-wrap {
  margin-bottom: 24px;
}

.stores {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
}

.store {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.store__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.store__logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
  flex-shrink: 0;
}

.logo-shopify {
  background: var(--success-soft);
  color: var(--success);
}

.logo-woocommerce {
  background: var(--accent-soft);
  color: var(--accent);
}

.store__title {
  flex: 1;
  min-width: 0;
}

.store__title h3 {
  font-size: 15px;
  font-weight: 650;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store__title a {
  text-decoration: none;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 0;
}

.store__meta dt {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 500;
}

.store__meta dd {
  margin: 0;
  font-weight: 600;
}

.store__err {
  margin: 0;
}

.store__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.spacer {
  flex: 1;
}

.platforms {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.platform {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  text-align: left;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.platform small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.platform:hover {
  border-color: var(--border-strong);
}

.platform.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.howto {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 13px;
}

.howto summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--text-2);
}

.howto ol {
  margin: 10px 0 6px;
  padding-left: 20px;
  line-height: 1.7;
}

.howto code {
  background: var(--bg-subtle);
  padding: 1px 5px;
  border-radius: 4px;
}

.items {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.totals {
  margin: 14px 0;
  margin-left: auto;
  max-width: 280px;
}

.totals div {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-variant-numeric: tabular-nums;
}

.totals dt {
  color: var(--text-3);
  font-weight: 500;
}

.totals dd {
  margin: 0;
}

.totals .grand {
  border-top: 1px solid var(--border);
  margin-top: 6px;
  padding-top: 8px;
  font-weight: 700;
  font-size: 15px;
}

.totals .grand dt {
  color: var(--text);
  font-weight: 700;
}

.stat-list dd.text {
  font-size: 14px;
}

@media (max-width: 720px) {
  .stores {
    grid-template-columns: 1fr;
  }
  .platforms {
    grid-template-columns: 1fr;
  }
}
</style>
