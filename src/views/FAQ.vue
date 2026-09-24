<template>
  <div class="mp ui-page ui-page--wide">
    <header class="hero ui-card">
      <div class="ui-eyebrow">Help centre</div>
      <h1>How can we help?</h1>
      <p>Answers for every part of DASYIN ERP — invoicing, point of sale, bookings, meetings, projects, HR and more.</p>
      <div class="ui-input-group hero__search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input ref="search" v-model="q" class="ui-input" type="search" placeholder="Search help, e.g. “recurring invoice” or “pay run”" aria-label="Search help articles" @input="syncQuery" />
      </div>
      <div class="chips" role="tablist" aria-label="Topics">
        <button class="chip" :class="{ 'is-active': !topic }" @click="setTopic('')">All topics</button>
        <button v-for="t in topics" :key="t.id" class="chip" :class="{ 'is-active': topic === t.id }" @click="setTopic(t.id)"><i :class="t.icon"></i> {{ t.label }}</button>
      </div>
    </header>

    <div class="layout">
      <div class="articles">
        <p v-if="q" class="muted result-count">{{ results.length }} result{{ results.length === 1 ? '' : 's' }} for “{{ q }}”</p>

        <div v-if="!results.length" class="ui-card ui-empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-circle-question"></i></div>
          <h3>No articles match</h3>
          <p>Try fewer or different words, or ask your team in Messages.</p>
          <button class="ui-btn" style="margin-top: 12px" @click="clear"><i class="fa-solid fa-xmark"></i> Clear search</button>
        </div>

        <section v-for="group in grouped" :key="group.topic.id" class="ui-card group">
          <div class="ui-card__head">
            <h2><span class="group__icon"><i :class="group.topic.icon"></i></span> {{ group.topic.label }}</h2>
            <router-link v-if="group.topic.to" :to="group.topic.to" class="ui-btn ui-btn--ghost ui-btn--sm">Open {{ group.topic.label.toLowerCase() }} <i class="fa-solid fa-arrow-right"></i></router-link>
          </div>
          <div class="qa-list">
            <div v-for="a in group.items" :id="a.id" :key="a.id" class="qa" :class="{ 'is-open': open[a.id] }">
              <button class="qa__q" :aria-expanded="!!open[a.id]" :aria-controls="`${a.id}-body`" @click="toggle(a.id)">
                <span v-html="highlight(a.q)"></span>
                <i class="fa-solid fa-chevron-down"></i>
              </button>
              <div v-show="open[a.id]" :id="`${a.id}-body`" class="qa__a">
                <p v-for="(para, i) in a.a" :key="i" v-html="highlight(para)"></p>
                <router-link v-if="a.link" :to="a.link.to" class="ui-btn ui-btn--sm"><i class="fa-solid fa-arrow-up-right-from-square"></i> {{ a.link.label }}</router-link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside class="side">
        <div class="ui-card side__card">
          <h3>Still stuck?</h3>
          <p class="muted">Message a teammate or book a quick call — both are built in.</p>
          <router-link to="/messages" class="ui-btn ui-btn--primary"><i class="fa-regular fa-message"></i> Open messages</router-link>
          <router-link to="/meetings" class="ui-btn"><i class="fa-solid fa-calendar-plus"></i> Schedule a call</router-link>
        </div>
        <div class="ui-card side__card">
          <h3>Popular</h3>
          <ul class="popular">
            <li v-for="p in popular" :key="p.id"><a :href="`#${p.id}`" @click.prevent="jump(p.id)">{{ p.q }}</a></li>
          </ul>
        </div>
        <div class="ui-card side__card">
          <h3>Keyboard shortcuts</h3>
          <dl class="keys">
            <div><dt><kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>Search the app</dd></div>
            <div><dt><kbd>/</kbd></dt><dd>Search these help articles</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>Close a dialog</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import '@/styles/module-page.css'

const TOPICS = [
  { id: 'start', label: 'Getting started', icon: 'fa-solid fa-rocket', to: '/dashboard' },
  { id: 'invoicing', label: 'Invoices & quotes', icon: 'fa-solid fa-file-invoice', to: '/invoices' },
  { id: 'pos', label: 'Point of sale', icon: 'fa-solid fa-cash-register', to: '/pos' },
  { id: 'bookings', label: 'Bookings & events', icon: 'fa-solid fa-calendar-days', to: '/bookings' },
  { id: 'meetings', label: 'Meetings & messages', icon: 'fa-solid fa-video', to: '/meetings' },
  { id: 'projects', label: 'Projects & Jira', icon: 'fa-solid fa-diagram-project', to: '/projects' },
  { id: 'operations', label: 'Inventory & manufacturing', icon: 'fa-solid fa-boxes-stacked', to: '/inventory' },
  { id: 'hr', label: 'HR & payroll', icon: 'fa-solid fa-id-card', to: '/hcm' },
  { id: 'store', label: 'Online store', icon: 'fa-solid fa-store', to: '/ecommerce' },
  { id: 'account', label: 'Account, plans & security', icon: 'fa-solid fa-shield-halved', to: '/settings' }
]

const ARTICLES = [
  // Getting started
  { id: 'find-things', topic: 'start', q: 'How do I find my way around?', a: ['The sidebar groups the app by area: Sales & Invoicing, Customers, Bookings & Services, Inventory & Supply, Finance, People & Projects and Communication. Groups only show the modules included in your plan.', 'Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or click Search at the top of the sidebar) to jump to any page. The <strong>Create</strong> button in the top bar starts a new invoice, booking, customer and more from anywhere.'] },
  { id: 'dark-mode', topic: 'start', q: 'How do I switch to dark mode?', a: ['Click the moon / sun button in the top bar. Your choice is remembered on this device. Every page supports both light and dark themes.'] },
  { id: 'currencies', topic: 'start', q: 'Which currencies are supported?', a: ['23 currencies across major, Asia-Pacific, Middle East and African markets — including AUD, USD, EUR, GBP, NZD, SGD, AED, ZAR, NGN and KES. Set your default in Settings → Regional & formats. Invoices, quotes, employees and pay runs can each use their own currency.'], link: { to: '/settings', label: 'Open settings' } },
  { id: 'dashboard', topic: 'start', q: 'What does the dashboard show?', a: ['Your key numbers for the selected period — sales, outstanding invoices, bookings and more — with comparisons to the previous period. Analytics and Reports (under Overview) go deeper.'] },

  // Invoicing
  { id: 'create-invoice', topic: 'invoicing', q: 'How do I create and send an invoice?', a: ['Go to Invoices → <strong>New invoice</strong>. Add the client, line items (quantity, price, discount and tax) and choose a due date — totals update as you type. Use <strong>Save draft</strong> to finish later or <strong>Save & send</strong>.', 'When sending you can email the invoice (if email is configured on the server), <strong>Copy link</strong> to share a public page your client can view, or <strong>Mark as sent</strong> if you delivered it another way.'], link: { to: '/invoices/new', label: 'New invoice' } },
  { id: 'record-payment', topic: 'invoicing', q: 'How do I record a payment?', a: ['Open the invoice and click <strong>Record payment</strong>. Enter the amount (or choose Full balance), date and method. Part payments set the status to Partially paid; when the balance reaches zero it becomes Paid.'] },
  { id: 'recurring', topic: 'invoicing', q: 'Can invoices repeat automatically?', a: ['Yes. In the invoice editor turn on <strong>Repeat this invoice</strong> and choose how often. Recurring invoices are marked with a repeat icon in the list and can be filtered with the Recurring tab.'] },
  { id: 'quotes', topic: 'invoicing', q: 'How do quotes work?', a: ['Create a quote under Quotes. Send it like an invoice; when the client accepts, click <strong>Convert to invoice</strong> to create the invoice with the same lines. Quotes past their valid-until date show as Expired.'], link: { to: '/quotes', label: 'Open quotes' } },
  { id: 'overdue', topic: 'invoicing', q: 'How do I see who owes me money?', a: ['The Invoicing overview and the KPI cards on the Invoices page show Outstanding and Overdue totals. Click a card to filter the list. Overdue rows show how many days late they are.'] },
  { id: 'invoice-branding', topic: 'invoicing', q: 'How do I add my logo, tax number and bank details?', a: ['Invoice settings lets you set your business name, logo, accent colour, tax label (e.g. ABN, VAT, KRA PIN), numbering prefixes, default due days and payment instructions shown on every invoice.'], link: { to: '/invoices/settings', label: 'Invoice settings' } },
  { id: 'void', topic: 'invoicing', q: 'How do I cancel an invoice I already sent?', a: ['Open it and choose <strong>Void</strong>. Voided invoices stay in your records (for an audit trail) but no longer count towards amounts owed. Use <strong>Duplicate</strong> to start a corrected copy.'] },
  { id: 'export-invoices', topic: 'invoicing', q: 'Can I export invoices to a spreadsheet?', a: ['Yes — click <strong>Export</strong> on the Invoices or Quotes page to download a CSV you can open in Excel, Numbers or Google Sheets.'] },

  // POS
  { id: 'pos-sale', topic: 'pos', q: 'How do I ring up a sale?', a: ['Open Point of sale, tap products (or scan a barcode) to add them to the cart, adjust quantities, then take payment. Products and prices come from Inventory, and stock is reduced automatically.'], link: { to: '/pos', label: 'Open POS' } },
  { id: 'pos-products', topic: 'pos', q: 'Why are no products showing in POS?', a: ['POS lists active products that have a selling price. Add or edit them in Inventory.'] },
  { id: 'pos-history', topic: 'pos', q: 'Where can I see past sales and receipts?', a: ['POS transactions lists every sale with its items, payment method and totals, and lets you reprint or view a receipt.'], link: { to: '/pos-transactions', label: 'POS transactions' } },

  // Bookings
  { id: 'booking-create', topic: 'bookings', q: 'How do I create a booking?', a: ['Go to Bookings and click <strong>New booking</strong>, or switch to the calendar and click a free slot. Choose the customer, service, staff member and time; the duration comes from the service.'], link: { to: '/bookings', label: 'Open bookings' } },
  { id: 'booking-invoice', topic: 'bookings', q: 'Can I invoice a finished booking?', a: ['Yes. Once the work is done, open the booking and turn it into an invoice — the service and price are copied across.'] },
  { id: 'services', topic: 'bookings', q: 'How do I set up services and prices?', a: ['Services lists what you offer with duration and price; Service categories keeps them organised. These are used by Bookings, Scheduling and the booking page.'], link: { to: '/services', label: 'Open services' } },
  { id: 'events', topic: 'bookings', q: 'How do I run an event with registrations?', a: ['Events lets you create an event with date, venue and capacity, publish it, and track registrations from its detail page.'], link: { to: '/events', label: 'Open events' } },

  // Meetings & messages
  { id: 'meeting-schedule', topic: 'meetings', q: 'How do I schedule a meeting and invite people?', a: ['Open Meetings & calls → <strong>Schedule</strong>. Add a title, time, time zone and participants (teammates or any email address). Everyone receives a calendar invite (.ics) that works with Google, Outlook and Apple Calendar.', 'If email isn’t configured on the server, you’ll get the .ics file and a pre-filled email to send yourself.'], link: { to: '/meetings', label: 'Open meetings' } },
  { id: 'meeting-transcript', topic: 'meetings', q: 'Can meetings be transcribed?', a: ['Yes. During a call in the meeting room, live captions are captured into a transcript that is saved with the meeting, along with a short summary you can review later.'] },
  { id: 'messages', topic: 'meetings', q: 'How do I message a teammate?', a: ['Open Messages and click <strong>New conversation</strong>, then pick one or more people from your organisation. Unread conversations are highlighted with a count; messages arrive in real time.'], link: { to: '/messages', label: 'Open messages' } },
  { id: 'video-no-camera', topic: 'meetings', q: 'My camera or microphone isn’t working in a call', a: ['Allow camera and microphone access when the browser asks (look for the camera icon in the address bar). If you have no camera you can still join with audio only, or with neither and use chat. Close other apps that might be using the camera.'] },

  // Projects
  { id: 'projects', topic: 'projects', q: 'How do projects work?', a: ['Create a project, add issues (tasks, bugs, stories), assign people and move them across the board as work progresses. Each project shows progress and what’s overdue.'], link: { to: '/projects', label: 'Open projects' } },
  { id: 'jira', topic: 'projects', q: 'Can I connect Jira?', a: ['Yes. Connect Jira Cloud from the Projects page with your site address, email and an API token. Your Jira projects and issues are brought in and kept in sync, so the team can work in either place.'] },

  // Operations
  { id: 'inventory', topic: 'operations', q: 'How do I add products and track stock?', a: ['In Inventory add products with SKU, cost and selling price, category and reorder level. Use stock adjustments to receive or write off stock; every change is recorded as a movement. Products at or below their reorder point are flagged.'], link: { to: '/inventory', label: 'Open inventory' } },
  { id: 'purchase-orders', topic: 'operations', q: 'How do I order from suppliers?', a: ['Suppliers keeps supplier details and purchase orders. Receiving a purchase order adds the stock to inventory.'], link: { to: '/suppliers', label: 'Open suppliers' } },
  { id: 'bom', topic: 'operations', q: 'What is a bill of materials?', a: ['A bill of materials (BOM) is a recipe: which inventory components, and how many of each, make a finished product. Create one in Production → <strong>New bill of materials</strong>. The material cost per unit is worked out from your component cost prices.'], link: { to: '/production', label: 'Open production' } },
  { id: 'work-orders', topic: 'operations', q: 'How do work orders change my stock?', a: ['A work order says how many units to build from a BOM. It shows whether you have enough of each component. When you <strong>Complete</strong> it, the components are deducted from stock and the finished units are added — all recorded as inventory movements with the work order number as the reference. Nothing changes in stock while it is Planned or In progress.'] },

  // HR
  { id: 'employees', topic: 'hr', q: 'How do I add employees?', a: ['In HR & payroll → Employees click <strong>Add employee</strong>. Record their role, department, employment type, start date and pay: an hourly rate, or an annual salary, in any supported currency. You can optionally link them to an app user.'], link: { to: '/hcm', label: 'Open HR & payroll' } },
  { id: 'leave', topic: 'hr', q: 'How do leave requests work?', a: ['Anyone can record a leave request (annual, sick, personal, parental, unpaid or other). Working days are counted automatically, excluding weekends, and overlapping requests for the same person are blocked. Managers approve or reject from the Leave tab.'] },
  { id: 'timesheets', topic: 'hr', q: 'How do timesheets feed into pay?', a: ['Log hours per person per day in Timesheets. Managers approve them (one by one or in bulk). Only <strong>approved</strong> hours in the pay period are paid for hourly staff, and once a pay run is marked paid those timesheets are locked so they can’t be paid twice.'] },
  { id: 'pay-runs', topic: 'hr', q: 'How is a pay run calculated?', a: ['Choose a frequency (weekly, fortnightly or monthly), the period start and currency. Hourly staff: gross = approved hours × hourly rate. Salaried staff: gross = annual salary ÷ 52, 26 or 12. Deductions are a flat percentage you set for the run (for tax, super or pension), and net = gross − deductions. Amounts are rounded to the currency’s smallest unit.', 'Review the preview, create the draft, recalculate if timesheets change, then <strong>Mark as paid</strong>. Export any pay run to CSV for your bank or accountant. DASYIN doesn’t file tax returns or move money for you.'] },

  // Store
  { id: 'connect-store', topic: 'store', q: 'How do I connect Shopify or WooCommerce?', a: ['Open Online store → <strong>Connect store</strong>. For Shopify use your .myshopify.com address and an Admin API access token with the read_orders scope. For WooCommerce use your site’s https address and a REST API key with Read permission.', 'Keys are encrypted at rest and only the last four characters are shown. We test the connection straight away and tell you what’s wrong if it fails.'], link: { to: '/ecommerce', label: 'Open online store' } },
  { id: 'import-orders', topic: 'store', q: 'What happens when I import orders?', a: ['Orders are copied from your store into DASYIN (read-only) with customer, items, totals and status. Importing again updates existing orders and adds new ones — there are no duplicates. Nothing in your store is changed; fulfil orders in your store as usual.'] },

  // Account
  { id: 'change-password', topic: 'account', q: 'How do I change my password?', a: ['Go to My profile → Password. Enter your current password, then the new one twice (at least 8 characters).'], link: { to: '/profile', label: 'My profile' } },
  { id: 'org-details', topic: 'account', q: 'Where do I change the business name, address or time zone?', a: ['Settings → Business details and Regional & formats. Only admins and managers can change them.'], link: { to: '/settings', label: 'Open settings' } },
  { id: 'plans', topic: 'account', q: 'What’s included in my plan?', a: ['Plan & billing shows your current plan, trial status, which modules are included and the price in the currency you choose. Modules not in your plan are hidden from the sidebar.'], link: { to: '/plan', label: 'Plan & billing' } },
  { id: 'add-users', topic: 'account', q: 'How do I give a teammate access?', a: ['Admins can add staff under People & Projects → Staff. They sign in with their email; you can set a password or have one generated.'], link: { to: '/staff', label: 'Open staff' } },
  { id: 'data-safety', topic: 'account', q: 'Is my data private to my organisation?', a: ['Yes. Every record is scoped to your organisation and only people in it can see it. Passwords are hashed, and third-party API keys (such as store tokens) are encrypted.'] }
]

export default {
  name: 'FAQ',
  data() {
    return {
      q: this.$route.query.q || '',
      topic: TOPICS.some((t) => t.id === this.$route.query.topic) ? this.$route.query.topic : '',
      open: {},
      topics: TOPICS
    }
  },
  computed: {
    terms() {
      return this.q.toLowerCase().split(/\s+/).filter((w) => w.length > 1)
    },
    results() {
      return ARTICLES.filter((a) => {
        if (this.topic && a.topic !== this.topic) return false
        if (!this.terms.length) return true
        const hay = (a.q + ' ' + a.a.join(' ')).replace(/<[^>]+>/g, '').toLowerCase()
        return this.terms.every((t) => hay.includes(t))
      })
    },
    grouped() {
      return TOPICS.map((t) => ({ topic: t, items: this.results.filter((a) => a.topic === t.id) })).filter((g) => g.items.length)
    },
    popular() {
      return ['create-invoice', 'pay-runs', 'meeting-schedule', 'work-orders', 'connect-store', 'change-password'].map((id) => ARTICLES.find((a) => a.id === id))
    }
  },
  watch: {
    terms(t) {
      // Open matching answers while searching.
      if (t.length) this.open = Object.fromEntries(this.results.slice(0, 6).map((a) => [a.id, true]))
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
    const hash = (this.$route.hash || '').slice(1)
    if (hash && ARTICLES.some((a) => a.id === hash)) this.jump(hash)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) {
        e.preventDefault()
        this.$refs.search && this.$refs.search.focus()
      }
    },
    toggle(id) {
      this.open = { ...this.open, [id]: !this.open[id] }
    },
    setTopic(t) {
      this.topic = t
      this.syncQuery()
    },
    clear() {
      this.q = ''
      this.topic = ''
      this.syncQuery()
    },
    syncQuery() {
      const query = {}
      if (this.q) query.q = this.q
      if (this.topic) query.topic = this.topic
      this.$router.replace({ query })
    },
    jump(id) {
      this.q = ''
      this.topic = ''
      this.open = { ...this.open, [id]: true }
      this.$nextTick(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    escape(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    },
    highlight(html) {
      if (!this.terms.length) return html
      const re = new RegExp(`(${this.terms.map(this.escape).join('|')})`, 'gi')
      // Only highlight text outside tags. Content is static and trusted.
      return html.replace(/(^|>)([^<]+)/g, (m, open, text) => open + text.replace(re, '<mark>$1</mark>'))
    }
  }
}
</script>

<style scoped>
.hero {
  padding: 36px 32px 24px;
  margin-bottom: 24px;
  text-align: center;
  background: var(--surface);
}

.hero h1 {
  font-size: 30px;
  font-weight: 750;
  letter-spacing: -0.025em;
  margin: 6px 0 4px;
}

.hero p {
  color: var(--text-3);
  margin: 0 auto;
  max-width: 640px;
}

.hero__search {
  max-width: 640px;
  margin: 22px auto 18px;
}

.hero__search .ui-input {
  height: 48px;
  font-size: 15px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
}

.chip i {
  font-size: 12px;
  color: var(--text-3);
}

.chip:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.chip.is-active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.chip.is-active i {
  color: var(--accent);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  align-items: start;
}

.articles {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-count {
  margin: 0;
}

.group__icon {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  margin-right: 6px;
}

.ui-card__head h2 {
  display: flex;
  align-items: center;
}

.qa {
  border-bottom: 1px solid var(--border);
  scroll-margin-top: 100px;
}

.qa:last-child {
  border-bottom: 0;
}

.qa__q {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: none;
  border: 0;
  text-align: left;
  font: inherit;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}

.qa__q:hover {
  background: var(--surface-hover);
}

.qa__q i {
  color: var(--text-3);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.qa.is-open .qa__q i {
  transform: rotate(180deg);
}

.qa__a {
  padding: 0 20px 18px;
  color: var(--text-2);
  line-height: 1.65;
}

.qa__a p {
  margin: 0 0 10px;
}

.qa__a :deep(mark),
.qa__q :deep(mark) {
  background: var(--warning-soft);
  color: inherit;
  border-radius: 3px;
  padding: 0 2px;
}

.qa__a :deep(kbd),
.keys kbd {
  font-family: var(--font-mono);
  font-size: 11.5px;
  padding: 1px 6px;
  border-radius: 5px;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  color: var(--text);
}

.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 88px;
}

.side__card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.side__card h3 {
  font-size: 15px;
  font-weight: 650;
  margin: 0;
}

.side__card p {
  margin: 0 0 4px;
  font-size: 13.5px;
}

.side__card .ui-btn {
  justify-content: center;
}

.popular {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.popular a {
  color: var(--text-2);
  text-decoration: none;
  font-size: 13.5px;
}

.popular a:hover {
  color: var(--accent);
}

.keys {
  margin: 0;
  display: grid;
  gap: 8px;
  font-size: 13px;
}

.keys div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.keys dd {
  margin: 0;
  color: var(--text-3);
}

@media (max-width: 1000px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .side {
    position: static;
  }
}

@media (max-width: 600px) {
  .hero {
    padding: 24px 16px 18px;
  }
  .hero h1 {
    font-size: 24px;
  }
  .chips {
    justify-content: flex-start;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .chip {
    flex-shrink: 0;
  }
  .ui-card__head .ui-btn {
    display: none;
  }
}
</style>
