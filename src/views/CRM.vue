<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Customers</div>
        <h1>CRM pipeline</h1>
        <p>Track leads, move deals through your sales stages and forecast revenue.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" @click="openLead()"><i class="fa-solid fa-user-plus"></i> New lead</button>
        <button class="ui-btn ui-btn--primary" @click="openDeal()"><i class="fa-solid fa-plus"></i> New deal</button>
      </div>
    </header>

    <div class="ui-kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-filter-circle-dollar"></i></span>Open pipeline</div>
        <div class="ui-kpi__value"><span v-if="!dash" class="ui-skeleton sk-val"></span><template v-else>{{ money(dash.total_pipeline_value, true) }}</template></div>
        <div class="ui-kpi__meta">{{ dash?.open_opportunities || 0 }} open deal{{ dash?.open_opportunities === 1 ? '' : 's' }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-scale-balanced"></i></span>Weighted forecast</div>
        <div class="ui-kpi__value"><span v-if="!dash" class="ui-skeleton sk-val"></span><template v-else>{{ money(dash.weighted_pipeline_value, true) }}</template></div>
        <div class="ui-kpi__meta">Value × probability</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-trophy"></i></span>Won this month</div>
        <div class="ui-kpi__value"><span v-if="!dash" class="ui-skeleton sk-val"></span><template v-else>{{ money(dash.won_this_month, true) }}</template></div>
        <div class="ui-kpi__meta">Win rate {{ pct(dash?.win_rate) }} · {{ dash?.won_count || 0 }} won / {{ dash?.lost_count || 0 }} lost</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-user-clock"></i></span>Open leads</div>
        <div class="ui-kpi__value"><span v-if="!dash" class="ui-skeleton sk-val"></span><template v-else>{{ dash.open_leads }}</template></div>
        <div class="ui-kpi__meta">{{ dash?.new_leads_this_month || 0 }} new this month · {{ pct(dash?.conversion_rate) }} converted</div>
      </div>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-tabs" role="tablist">
          <button class="ui-tab" :class="{ 'is-active': tab === 'pipeline' }" role="tab" :aria-selected="tab === 'pipeline'" @click="setTab('pipeline')">
            <i class="fa-solid fa-table-columns"></i> Pipeline <span class="count">{{ openDeals }}</span>
          </button>
          <button class="ui-tab" :class="{ 'is-active': tab === 'leads' }" role="tab" :aria-selected="tab === 'leads'" @click="setTab('leads')">
            <i class="fa-solid fa-address-card"></i> Leads <span class="count">{{ leads.length }}</span>
          </button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" :placeholder="tab === 'pipeline' ? 'Search deals…' : 'Search leads…'" :aria-label="tab === 'pipeline' ? 'Search deals' : 'Search leads'" />
          </div>
          <template v-if="tab === 'leads'">
            <select v-model="leadStatus" class="ui-select sel" aria-label="Lead status">
              <option value="open">Open leads</option>
              <option value="all">All statuses</option>
              <option v-for="s in leadStatuses" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
            <select v-model="rating" class="ui-select sel-sm" aria-label="Rating">
              <option value="">Any rating</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </template>
          <label v-else class="ui-switch compact"><input v-model="showClosed" type="checkbox" /> Show won &amp; lost <span class="count-pill">{{ closedCount }}</span></label>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="loadAll">Try again</a></span></div>
      </div>

      <!-- Pipeline -->
      <div v-else-if="tab === 'pipeline'" class="board-wrap">
        <div class="board" :class="{ 'is-loading': loading }">
          <section
            v-for="col in columns"
            :key="col.stage"
            class="col"
            :class="[`col--${col.stage}`, { 'is-drop': dropStage === col.stage }]"
            :aria-label="col.label"
            @dragover.prevent="dropStage = col.stage"
            @dragleave.self="dropStage = null"
            @drop.prevent="onDrop(col.stage)"
          >
            <header class="col__head">
              <div class="col__title">
                <span class="col__dot"></span>
                <h3>{{ col.label }}</h3>
                <span class="col__count">{{ col.deals.length }}</span>
              </div>
              <div class="col__sum">
                <strong>{{ money(col.total, true) }}</strong>
                <small v-if="!col.closed">{{ col.prob }}% · {{ money(col.weighted, true) }} weighted</small>
              </div>
            </header>
            <div class="col__body">
              <div v-if="loading && !loaded" class="ui-skeleton" style="height: 88px; border-radius: 10px"></div>
              <article
                v-for="d in col.deals"
                :key="d.id"
                class="deal"
                draggable="true"
                tabindex="0"
                :aria-label="`${d.name}, ${money(d.value)}`"
                @dragstart="dragging = d"
                @dragend="dragging = null; dropStage = null"
                @click="openDeal(d)"
                @keydown.enter="openDeal(d)"
              >
                <div class="deal__top">
                  <strong class="deal__name">{{ d.name }}</strong>
                  <span class="deal__value">{{ money(d.value, true) }}</span>
                </div>
                <div v-if="d.company || d.contact_name" class="deal__who"><i class="fa-regular fa-building"></i> {{ [d.company, d.contact_name].filter(Boolean).join(' · ') }}</div>
                <div class="deal__meta">
                  <span v-if="d.expected_close_date && !col.closed" :class="{ late: isPast(d.expected_close_date) }"><i class="fa-regular fa-calendar"></i> {{ date(d.expected_close_date, 'short') }}</span>
                  <span v-else-if="d.actual_close_date"><i class="fa-regular fa-calendar-check"></i> {{ date(d.actual_close_date, 'short') }}</span>
                  <span v-if="!col.closed" class="prob"><span class="prob__bar"><span :style="{ width: d.probability + '%' }"></span></span>{{ d.probability }}%</span>
                  <span v-if="d.stage === 'closed_lost' && d.lost_reason" class="lost">{{ d.lost_reason }}</span>
                </div>
              </article>
              <p v-if="loaded && !col.deals.length" class="col__empty">{{ dragging ? 'Drop here' : 'No deals' }}</p>
              <button v-if="!col.closed" class="col__add" @click="openDeal(null, col.stage)"><i class="fa-solid fa-plus"></i> Add deal</button>
            </div>
          </section>
        </div>
        <div v-if="dragging && !showClosed" class="closing-bar">
          <div
            v-for="st in ['closed_won', 'closed_lost']"
            :key="st"
            class="closing-zone"
            :class="[`col--${st}`, { 'is-drop': dropStage === st }]"
            @dragover.prevent="dropStage = st"
            @dragleave="dropStage = dropStage === st ? null : dropStage"
            @drop.prevent="onDrop(st)"
          >
            <i :class="st === 'closed_won' ? 'fa-solid fa-trophy' : 'fa-solid fa-circle-xmark'"></i> Drop to mark as {{ st === 'closed_won' ? 'won' : 'lost' }}
          </div>
        </div>
        <p v-if="loaded && !deals.length" class="board-hint"><i class="fa-regular fa-lightbulb"></i> Create a deal, or convert a qualified lead into one. Drag cards between stages to update them.</p>
      </div>

      <!-- Leads -->
      <template v-else>
        <div v-if="loading && !loaded" class="ui-card__body">
          <div v-for="n in 6" :key="n" class="sk-row">
            <div class="ui-skeleton" style="flex: 2"></div>
            <div class="ui-skeleton" style="flex: 1"></div>
            <div class="ui-skeleton" style="width: 80px"></div>
          </div>
        </div>
        <div v-else-if="!filteredLeads.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-address-card"></i></div>
          <h3>{{ leads.length ? 'No leads match your filters' : 'No leads yet' }}</h3>
          <p>{{ leads.length ? 'Try another status, rating or search.' : 'Capture enquiries here, qualify them, then convert them into customers and deals.' }}</p>
          <button v-if="!leads.length" class="ui-btn ui-btn--primary" style="margin-top: 14px" @click="openLead()"><i class="fa-solid fa-user-plus"></i> New lead</button>
          <button v-else class="ui-btn" style="margin-top: 14px" @click="clearLeadFilters">Clear filters</button>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th class="hide-md">Contact</th>
                <th class="hide-xl">Source</th>
                <th>Rating</th>
                <th class="num hide-sm">Est. value</th>
                <th>Status</th>
                <th class="hide-lg">Added</th>
                <th class="actions-col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in filteredLeads" :key="l.id" class="is-clickable" @click="openLead(l)">
                <td>
                  <div class="person">
                    <span class="avatar">{{ initials(l) }}</span>
                    <span class="person__text">
                      <strong>{{ leadName(l) }}</strong>
                      <small>{{ [l.job_title, l.company].filter(Boolean).join(' · ') || '—' }}</small>
                    </span>
                  </div>
                </td>
                <td class="hide-md">
                  <a v-if="l.email" :href="`mailto:${l.email}`" class="link" @click.stop>{{ l.email }}</a>
                  <small v-if="l.phone" class="block muted">{{ l.phone }}</small>
                  <span v-if="!l.email && !l.phone" class="muted">—</span>
                </td>
                <td class="hide-xl muted">{{ sourceLabel(l.source) }}</td>
                <td><span v-if="l.rating" class="rating" :class="`rating--${l.rating}`"><i :class="ratingIcon(l.rating)"></i> {{ cap(l.rating) }}</span><span v-else class="muted">—</span></td>
                <td class="num hide-sm">{{ l.estimated_value ? money(l.estimated_value, true) : '—' }}</td>
                <td @click.stop>
                  <span v-if="l.status === 'converted'" class="ui-badge ui-badge--converted">Converted</span>
                  <select v-else class="ui-select status-sel" :value="l.status || 'new'" :aria-label="`Status for ${leadName(l)}`" @change="setLeadStatus(l, $event.target.value)">
                    <option v-for="s in leadStatuses.filter((x) => x.value !== 'converted')" :key="s.value" :value="s.value">{{ s.label }}</option>
                  </select>
                </td>
                <td class="hide-lg muted nowrap">{{ date(l.created_at) }}</td>
                <td class="actions-col" @click.stop>
                  <div class="row-actions">
                    <button v-if="l.status !== 'converted'" class="ui-btn ui-btn--sm convert-btn" title="Convert to customer and deal" @click="openConvert(l)"><i class="fa-solid fa-right-left"></i><span class="hide-sm"> Convert</span></button>
                    <router-link v-else-if="l.customer_id" :to="`/customers?customer=${l.customer_id}`" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Open customer" aria-label="Open customer"><i class="fa-solid fa-address-book"></i></router-link>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit lead" aria-label="Edit lead" @click="openLead(l)"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger" title="Delete lead" aria-label="Delete lead" @click="removeLead(l)"><i class="fa-regular fa-trash-can"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <!-- Lead modal -->
    <div v-if="leadForm" class="ui-modal-backdrop" @mousedown.self="leadForm = null">
      <form class="ui-modal" style="max-width: 700px" role="dialog" aria-modal="true" :aria-label="leadForm.id ? 'Edit lead' : 'New lead'" @submit.prevent="saveLead">
        <div class="ui-modal__head">
          <div>
            <h2>{{ leadForm.id ? 'Edit lead' : 'New lead' }}</h2>
            <p class="sub">A person or business that might buy from you.</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="leadForm = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="formError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label for="ld-first">First name <span class="req">*</span></label>
              <input id="ld-first" ref="leadFirst" v-model.trim="leadForm.first_name" class="ui-input" :class="{ 'is-invalid': errors.first_name }" />
              <span v-if="errors.first_name" class="field-error">{{ errors.first_name }}</span>
            </div>
            <div class="ui-field">
              <label for="ld-last">Last name</label>
              <input id="ld-last" v-model.trim="leadForm.last_name" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="ld-email">Email</label>
              <input id="ld-email" v-model.trim="leadForm.email" type="email" class="ui-input" :class="{ 'is-invalid': errors.email }" />
              <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
            </div>
            <div class="ui-field">
              <label for="ld-phone">Phone</label>
              <input id="ld-phone" v-model.trim="leadForm.phone" type="tel" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="ld-company">Company</label>
              <input id="ld-company" v-model.trim="leadForm.company" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="ld-title">Job title</label>
              <input id="ld-title" v-model.trim="leadForm.job_title" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="ld-source">Source</label>
              <select id="ld-source" v-model="leadForm.source" class="ui-select">
                <option value="">Unknown</option>
                <option v-for="s in sources" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="ld-value">Estimated value</label>
              <div class="ui-input-group">
                <i class="fa-solid fa-dollar-sign"></i>
                <input id="ld-value" v-model.number="leadForm.estimated_value" type="number" min="0" step="1" class="ui-input" />
              </div>
            </div>
            <div class="ui-field">
              <label>Rating</label>
              <div class="seg" role="radiogroup" aria-label="Rating">
                <button v-for="r in ['hot', 'warm', 'cold']" :key="r" type="button" class="seg__btn" :class="[{ 'is-on': leadForm.rating === r }, `seg--${r}`]" role="radio" :aria-checked="leadForm.rating === r" @click="leadForm.rating = leadForm.rating === r ? '' : r">
                  <i :class="ratingIcon(r)"></i> {{ cap(r) }}
                </button>
              </div>
            </div>
            <div class="ui-field">
              <label for="ld-status">Status</label>
              <select id="ld-status" v-model="leadForm.status" class="ui-select" :disabled="leadForm.status === 'converted'">
                <option v-for="s in leadStatuses" :key="s.value" :value="s.value" :disabled="s.value === 'converted'">{{ s.label }}</option>
              </select>
            </div>
          </div>
          <div class="ui-field" style="margin-top: 16px">
            <label for="ld-notes">Notes</label>
            <textarea id="ld-notes" v-model="leadForm.notes" class="ui-textarea" rows="3" placeholder="What are they interested in? Next step?"></textarea>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button v-if="leadForm.id && leadForm.status !== 'converted'" type="button" class="ui-btn" style="margin-right: auto" @click="openConvert(leadForm)"><i class="fa-solid fa-right-left"></i> Convert</button>
          <button type="button" class="ui-btn" @click="leadForm = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ leadForm.id ? 'Save lead' : 'Create lead' }}</button>
        </div>
      </form>
    </div>

    <!-- Convert modal -->
    <div v-if="converting" class="ui-modal-backdrop" style="z-index: 2100" @mousedown.self="converting = null">
      <form class="ui-modal" style="max-width: 560px" role="dialog" aria-modal="true" aria-label="Convert lead" @submit.prevent="convert">
        <div class="ui-modal__head">
          <div>
            <h2>Convert {{ leadName(converting.lead) }}</h2>
            <p class="sub">Mark the lead as won and carry it into your customers and pipeline.</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="converting = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <label class="check">
            <input v-model="converting.create_customer" type="checkbox" />
            <span><strong>Create a customer</strong><small>Adds them to Customers (or links the existing customer with the same email).</small></span>
          </label>
          <label class="check">
            <input v-model="converting.create_opportunity" type="checkbox" />
            <span><strong>Create a deal</strong><small>Starts in the Qualification stage of your pipeline.</small></span>
          </label>
          <div v-if="converting.create_opportunity" class="ui-grid-2" style="margin-top: 14px">
            <div class="ui-field" style="grid-column: 1 / -1">
              <label for="cv-name">Deal name</label>
              <input id="cv-name" v-model.trim="converting.opportunity_name" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="cv-value">Value</label>
              <div class="ui-input-group">
                <i class="fa-solid fa-dollar-sign"></i>
                <input id="cv-value" v-model.number="converting.value" type="number" min="0" class="ui-input" />
              </div>
            </div>
            <div class="ui-field">
              <label for="cv-close">Expected close</label>
              <input id="cv-close" v-model="converting.expected_close_date" type="date" class="ui-input" />
            </div>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="converting = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--success" :disabled="saving"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-right-left'"></i> Convert lead</button>
        </div>
      </form>
    </div>

    <!-- Deal modal -->
    <div v-if="dealForm" class="ui-modal-backdrop" @mousedown.self="dealForm = null">
      <form class="ui-modal" style="max-width: 700px" role="dialog" aria-modal="true" :aria-label="dealForm.id ? 'Edit deal' : 'New deal'" @submit.prevent="saveDeal">
        <div class="ui-modal__head">
          <div>
            <h2>{{ dealForm.id ? 'Edit deal' : 'New deal' }}</h2>
            <p class="sub">{{ dealForm.id ? `Created ${date(dealForm.created_at)}` : 'An opportunity you are working to win.' }}</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="dealForm = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="formError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>
          <div class="stage-picker" role="radiogroup" aria-label="Stage">
            <button v-for="s in stages" :key="s.value" type="button" class="stage-step" :class="[`col--${s.value}`, { 'is-on': dealForm.stage === s.value }]" role="radio" :aria-checked="dealForm.stage === s.value" @click="setDealStage(s.value)">
              {{ s.short }}
            </button>
          </div>
          <div class="ui-grid-2" style="margin-top: 16px">
            <div class="ui-field" style="grid-column: 1 / -1">
              <label for="dl-name">Deal name <span class="req">*</span></label>
              <input id="dl-name" ref="dealName" v-model.trim="dealForm.name" class="ui-input" :class="{ 'is-invalid': errors.name }" placeholder="e.g. Fleet servicing contract" />
              <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
            </div>
            <div class="ui-field">
              <label for="dl-company">Company</label>
              <input id="dl-company" v-model.trim="dealForm.company" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="dl-contact">Contact</label>
              <input id="dl-contact" v-model.trim="dealForm.contact_name" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="dl-customer">Customer</label>
              <select id="dl-customer" v-model="dealForm.customer_id" class="ui-select">
                <option value="">Not linked</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">{{ `${c.first_name} ${c.last_name}`.trim() }}{{ c.email ? ` · ${c.email}` : '' }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="dl-value">Value <span class="req">*</span></label>
              <div class="ui-input-group">
                <i class="fa-solid fa-dollar-sign"></i>
                <input id="dl-value" v-model.number="dealForm.value" type="number" min="0" step="1" class="ui-input" :class="{ 'is-invalid': errors.value }" />
              </div>
              <span v-if="errors.value" class="field-error">{{ errors.value }}</span>
            </div>
            <div class="ui-field">
              <label for="dl-prob">Probability: {{ dealForm.probability }}%</label>
              <input id="dl-prob" v-model.number="dealForm.probability" type="range" min="0" max="100" step="5" class="range" />
            </div>
            <div class="ui-field">
              <label for="dl-close">Expected close</label>
              <input id="dl-close" v-model="dealForm.expected_close_date" type="date" class="ui-input" />
            </div>
            <div v-if="dealForm.stage === 'closed_lost'" class="ui-field" style="grid-column: 1 / -1">
              <label for="dl-lost">Why was it lost?</label>
              <input id="dl-lost" v-model.trim="dealForm.lost_reason" class="ui-input" list="dl-reasons" />
              <datalist id="dl-reasons">
                <option value="Price" />
                <option value="Went with a competitor" />
                <option value="No budget" />
                <option value="No response" />
                <option value="Timing" />
              </datalist>
            </div>
            <div class="ui-field" style="grid-column: 1 / -1">
              <label for="dl-notes">Notes</label>
              <textarea id="dl-notes" v-model="dealForm.notes" class="ui-textarea" rows="3"></textarea>
            </div>
          </div>
          <p v-if="dealForm.lead" class="ui-hint" style="margin-top: 10px"><i class="fa-solid fa-link"></i> From lead {{ leadName(dealForm.lead) }}</p>
        </div>
        <div class="ui-modal__foot">
          <button v-if="dealForm.id" type="button" class="ui-btn ui-btn--ghost danger-text" style="margin-right: auto" @click="removeDeal(dealForm)"><i class="fa-regular fa-trash-can"></i> Delete</button>
          <router-link v-if="dealForm.id && dealForm.stage === 'closed_won'" :to="invoiceLinkFor(dealForm)" class="ui-btn"><i class="fa-solid fa-file-invoice-dollar"></i> Invoice</router-link>
          <button type="button" class="ui-btn" @click="dealForm = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ dealForm.id ? 'Save deal' : 'Create deal' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import api, { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatMoney, formatDate, isoDate, addDays } from '@/utils/format'

const STAGES = [
  { value: 'prospecting', label: 'Prospecting', short: 'Prospect', prob: 10 },
  { value: 'qualification', label: 'Qualification', short: 'Qualify', prob: 25 },
  { value: 'proposal', label: 'Proposal', short: 'Proposal', prob: 50 },
  { value: 'negotiation', label: 'Negotiation', short: 'Negotiate', prob: 75 },
  { value: 'closed_won', label: 'Won', short: 'Won', prob: 100 },
  { value: 'closed_lost', label: 'Lost', short: 'Lost', prob: 0 }
]
const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'unqualified', label: 'Unqualified' },
  { value: 'converted', label: 'Converted' }
]
const SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social media' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'event', label: 'Event' },
  { value: 'cold_outreach', label: 'Cold outreach' },
  { value: 'walk_in', label: 'Walk-in / phone' },
  { value: 'other', label: 'Other' }
]

export default {
  name: 'CRM',
  data() {
    return {
      tab: this.$route.query.tab === 'leads' ? 'leads' : 'pipeline',
      leads: [],
      deals: [],
      customers: [],
      dash: null,
      loaded: false,
      loading: false,
      error: '',
      q: '',
      leadStatus: 'open',
      rating: '',
      showClosed: false,
      dragging: null,
      dropStage: null,
      leadForm: null,
      dealForm: null,
      converting: null,
      errors: {},
      formError: '',
      saving: false,
      stages: STAGES,
      leadStatuses: LEAD_STATUSES,
      sources: SOURCES
    }
  },
  computed: {
    closedCount() {
      return this.deals.length - this.openDeals
    },
    openDeals() {
      return this.deals.filter((d) => !d.stage.startsWith('closed')).length
    },
    columns() {
      const q = this.q.trim().toLowerCase()
      const list = this.deals.filter((d) => !q || [d.name, d.company, d.contact_name, d.notes].some((v) => String(v || '').toLowerCase().includes(q)))
      return STAGES.filter((s) => this.showClosed || !s.value.startsWith('closed')).map((s) => {
        const deals = list.filter((d) => d.stage === s.value)
        return {
          stage: s.value,
          label: s.label,
          prob: s.prob,
          closed: s.value.startsWith('closed'),
          deals,
          total: deals.reduce((t, d) => t + Number(d.value || 0), 0),
          weighted: deals.reduce((t, d) => t + (Number(d.value || 0) * Number(d.probability || 0)) / 100, 0)
        }
      })
    },
    filteredLeads() {
      const q = this.q.trim().toLowerCase()
      return this.leads.filter((l) => {
        if (this.leadStatus === 'open' && ['converted', 'unqualified'].includes(l.status)) return false
        if (!['open', 'all'].includes(this.leadStatus) && (l.status || 'new') !== this.leadStatus) return false
        if (this.rating && l.rating !== this.rating) return false
        if (q && ![this.leadName(l), l.email, l.company, l.phone].some((v) => String(v || '').toLowerCase().includes(q))) return false
        return true
      })
    }
  },
  created() {
    this.loadAll()
  },
  methods: {
    money(v, compact = false) {
      return formatMoney(v, 'AUD', { compact })
    },
    date: formatDate,
    pct(v) {
      return `${Math.round(Number(v) || 0)}%`
    },
    cap(s) {
      return s ? s[0].toUpperCase() + s.slice(1) : ''
    },
    leadName(l) {
      return `${l?.first_name || ''} ${l?.last_name || ''}`.trim() || l?.email || 'Unnamed lead'
    },
    initials(l) {
      return ((l.first_name?.[0] || '') + (l.last_name?.[0] || '')).toUpperCase() || '?'
    },
    sourceLabel(s) {
      return SOURCES.find((x) => x.value === s)?.label || (s ? this.cap(s.replace(/_/g, ' ')) : '—')
    },
    ratingIcon(r) {
      return { hot: 'fa-solid fa-fire', warm: 'fa-solid fa-sun', cold: 'fa-regular fa-snowflake' }[r] || ''
    },
    isPast(d) {
      return String(d).slice(0, 10) < isoDate()
    },
    invoiceLinkFor(d) {
      const q = new URLSearchParams({ client_name: d.company || d.contact_name || d.name })
      if (d.customer_id) q.set('customer_id', d.customer_id)
      return `/invoices/new?${q.toString()}`
    },
    setTab(t) {
      this.tab = t
      this.q = ''
      this.$router.replace({ query: t === 'leads' ? { tab: 'leads' } : {} }).catch(() => {})
    },
    clearLeadFilters() {
      this.q = ''
      this.leadStatus = 'all'
      this.rating = ''
    },
    async loadAll() {
      this.loading = true
      this.error = ''
      try {
        const [l, o] = await Promise.all([api.get('/crm/leads'), api.get('/crm/opportunities')])
        this.leads = l.data?.data || []
        this.deals = o.data?.data || []
        this.loaded = true
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the CRM')
      } finally {
        this.loading = false
      }
      this.loadDash()
    },
    async loadDash() {
      try {
        const r = await api.get('/crm/dashboard', { params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })
        this.dash = r.data?.data || {}
      } catch {
        this.dash = {}
      }
    },
    async loadCustomers() {
      if (this.customers.length) return
      try {
        const r = await api.get('/customers', { params: { status: 'active', sort: 'name' } })
        this.customers = r.data?.customers || []
      } catch {
        this.customers = []
      }
    },
    // ----- Leads -----
    openLead(l = null) {
      this.errors = {}
      this.formError = ''
      this.leadForm = l
        ? { ...l, status: l.status || 'new', estimated_value: l.estimated_value || '' }
        : { first_name: '', last_name: '', email: '', phone: '', company: '', job_title: '', source: '', rating: 'warm', status: 'new', estimated_value: '', notes: '' }
      this.$nextTick(() => this.$refs.leadFirst?.focus())
    },
    async saveLead() {
      const f = this.leadForm
      const e = {}
      if (!f.first_name) e.first_name = 'First name is required'
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email address'
      this.errors = e
      if (Object.keys(e).length) return
      this.saving = true
      this.formError = ''
      try {
        const payload = {
          first_name: f.first_name,
          last_name: f.last_name,
          email: f.email,
          phone: f.phone,
          company: f.company,
          job_title: f.job_title,
          source: f.source,
          rating: f.rating,
          notes: f.notes,
          estimated_value: Number(f.estimated_value) || 0
        }
        if (f.status !== 'converted') payload.status = f.status
        if (f.id) await api.put(`/crm/leads/${f.id}`, payload)
        else await api.post('/crm/leads', payload)
        toast.success(f.id ? 'Lead updated' : 'Lead created')
        this.leadForm = null
        await this.loadAll()
      } catch (err) {
        this.formError = apiErrorMessage(err, 'Could not save the lead')
      } finally {
        this.saving = false
      }
    },
    async setLeadStatus(l, status) {
      const prev = l.status
      l.status = status
      try {
        await api.put(`/crm/leads/${l.id}`, { status })
        toast.success(`${this.leadName(l)} marked ${LEAD_STATUSES.find((s) => s.value === status)?.label.toLowerCase()}`)
        this.loadDash()
      } catch (e) {
        l.status = prev
        toast.error(apiErrorMessage(e, 'Could not update the lead'))
      }
    },
    async removeLead(l) {
      const ok = await confirmDialog({ title: `Delete ${this.leadName(l)}?`, message: 'The lead is removed. Deals created from it are kept.', confirmText: 'Delete lead', danger: true })
      if (!ok) return
      try {
        await api.delete(`/crm/leads/${l.id}`)
        toast.success('Lead deleted')
        await this.loadAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the lead'))
      }
    },
    openConvert(l) {
      this.converting = {
        lead: l,
        create_customer: true,
        create_opportunity: true,
        opportunity_name: l.company || this.leadName(l),
        value: l.estimated_value || 0,
        expected_close_date: addDays(isoDate(), 30)
      }
    },
    async convert() {
      const c = this.converting
      this.saving = true
      try {
        const r = await api.post(`/crm/leads/${c.lead.id}/convert`, {
          create_customer: c.create_customer,
          create_opportunity: c.create_opportunity,
          opportunity_name: c.opportunity_name,
          value: Number(c.value) || 0,
          expected_close_date: c.expected_close_date
        })
        const res = r.data?.data || {}
        this.converting = null
        this.leadForm = null
        const parts = ['Lead converted']
        if (res.customer) parts.push('customer added')
        if (res.opportunity) parts.push('deal created')
        toast.success(parts.join(' · '), res.customer ? { action: { label: 'Open customer', run: () => this.$router.push(`/customers?customer=${res.customer.id}`) } } : undefined)
        await this.loadAll()
        if (res.opportunity) this.setTab('pipeline')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not convert the lead'))
      } finally {
        this.saving = false
      }
    },
    // ----- Deals -----
    openDeal(d = null, stage = 'prospecting') {
      this.errors = {}
      this.formError = ''
      this.loadCustomers()
      this.dealForm = d
        ? { ...d, customer_id: d.customer_id || '', expected_close_date: d.expected_close_date ? isoDate(d.expected_close_date) : '', value: d.value ?? 0 }
        : { name: '', company: '', contact_name: '', customer_id: '', value: '', stage, probability: STAGES.find((s) => s.value === stage).prob, expected_close_date: addDays(isoDate(), 30), lost_reason: '', notes: '' }
      this.$nextTick(() => this.$refs.dealName?.focus())
    },
    setDealStage(stage) {
      this.dealForm.stage = stage
      this.dealForm.probability = STAGES.find((s) => s.value === stage).prob
    },
    async saveDeal() {
      const f = this.dealForm
      const e = {}
      if (!f.name) e.name = 'Give the deal a name'
      if (f.value === '' || Number(f.value) < 0) e.value = 'Enter a value (0 or more)'
      this.errors = e
      if (Object.keys(e).length) return
      this.saving = true
      this.formError = ''
      try {
        const payload = {
          name: f.name,
          company: f.company,
          contact_name: f.contact_name,
          customer_id: f.customer_id || '',
          value: Number(f.value),
          stage: f.stage,
          probability: Number(f.probability),
          expected_close_date: f.expected_close_date || '',
          lost_reason: f.stage === 'closed_lost' ? f.lost_reason || '' : '',
          notes: f.notes
        }
        if (f.id) await api.put(`/crm/opportunities/${f.id}`, payload)
        else await api.post('/crm/opportunities', payload)
        toast.success(f.id ? 'Deal updated' : 'Deal created')
        this.dealForm = null
        await this.loadAll()
      } catch (err) {
        this.formError = apiErrorMessage(err, 'Could not save the deal')
      } finally {
        this.saving = false
      }
    },
    async removeDeal(d) {
      const ok = await confirmDialog({ title: `Delete “${d.name}”?`, message: 'The deal will be removed from your pipeline and reports.', confirmText: 'Delete deal', danger: true })
      if (!ok) return
      try {
        await api.delete(`/crm/opportunities/${d.id}`)
        toast.success('Deal deleted')
        this.dealForm = null
        await this.loadAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the deal'))
      }
    },
    async onDrop(stage) {
      const d = this.dragging
      this.dropStage = null
      this.dragging = null
      if (!d || d.stage === stage) return
      const prev = { stage: d.stage, probability: d.probability }
      d.stage = stage
      d.probability = STAGES.find((s) => s.value === stage).prob
      try {
        const r = await api.patch(`/crm/opportunities/${d.id}`, { stage })
        Object.assign(d, r.data?.data || {})
        toast.success(`“${d.name}” moved to ${STAGES.find((s) => s.value === stage).label}`)
        this.loadDash()
      } catch (e) {
        Object.assign(d, prev)
        toast.error(apiErrorMessage(e, 'Could not move the deal'))
      }
    }
  }
}
</script>

<style scoped>
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }

.sk-val {
  display: inline-block;
  width: 90px;
  height: 26px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.toolbar__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.search {
  width: 260px;
}

.sel {
  width: 160px;
}

.sel-sm {
  width: 140px;
}

.compact {
  font-size: 13px;
}

.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}

/* ----- Kanban ----- */
.board-wrap {
  overflow-x: auto;
  padding: 16px;
}

.board {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(230px, 1fr);
  gap: 12px;
  min-height: 420px;
}

.board.is-loading {
  opacity: 0.7;
}

.col {
  --stage: var(--info);
  display: flex;
  flex-direction: column;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  min-width: 0;
  transition: border-color 0.12s, background 0.12s;
}

.col--prospecting { --stage: var(--text-3); }
.col--qualification { --stage: var(--info); }
.col--proposal { --stage: var(--accent); }
.col--negotiation { --stage: var(--warning); }
.col--closed_won { --stage: var(--success); }
.col--closed_lost { --stage: var(--danger); }

.col.is-drop {
  border-color: var(--stage);
  background: var(--surface-hover);
}

.col__head {
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border);
  border-top: 3px solid var(--stage);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.col__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.col__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--stage);
}

.col__title h3 {
  font-size: 13.5px;
  font-weight: 650;
  margin: 0;
}

.col__count {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0 8px;
}

.col__sum {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  font-variant-numeric: tabular-nums;
}

.col__sum strong {
  font-size: 17px;
  letter-spacing: -0.01em;
}

.col__sum small {
  font-size: 11.5px;
  color: var(--text-3);
}

.col__body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.col__empty {
  margin: 0;
  padding: 18px 8px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-3);
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
}

.col__add {
  margin-top: auto;
  border: 1px dashed transparent;
  background: none;
  color: var(--text-3);
  font: inherit;
  font-size: 12.5px;
  padding: 7px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
}

.col__add:hover {
  color: var(--accent);
  border-color: var(--border-strong);
  background: var(--surface);
}

.deal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: var(--shadow-xs);
  cursor: grab;
  transition: box-shadow 0.12s, border-color 0.12s, transform 0.12s;
}

.deal:hover,
.deal:focus-visible {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
  outline: none;
}

.deal:active {
  cursor: grabbing;
}

.deal__top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}

.deal__name {
  font-size: 13.5px;
  line-height: 1.35;
}

.deal__value {
  font-weight: 700;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.deal__who {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deal__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--text-3);
}

.deal__meta .late {
  color: var(--danger);
  font-weight: 600;
}

.prob {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.prob__bar {
  width: 42px;
  height: 4px;
  border-radius: 4px;
  background: var(--neutral-soft);
  overflow: hidden;
}

.prob__bar span {
  display: block;
  height: 100%;
  background: var(--stage);
}

.lost {
  color: var(--danger);
}

.closing-bar {
  position: sticky;
  left: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

.closing-zone {
  --stage: var(--success);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 64px;
  border: 2px dashed var(--stage);
  border-radius: var(--radius-lg);
  color: var(--stage);
  font-weight: 650;
  background: var(--surface);
  transition: background 0.12s;
}

.closing-zone.col--closed_lost {
  --stage: var(--danger);
}

.closing-zone.is-drop.col--closed_won {
  background: var(--success-soft);
}

.closing-zone.is-drop.col--closed_lost {
  background: var(--danger-soft);
}

.count-pill {
  font-size: 11px;
  background: var(--neutral-soft);
  color: var(--text-3);
  padding: 1px 7px;
  border-radius: 999px;
}

.board-hint {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

/* ----- Leads ----- */
.person {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.person__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.person__text small {
  color: var(--text-3);
  font-size: 12.5px;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.link {
  color: var(--accent);
  text-decoration: none;
}

.block {
  display: block;
}

.muted {
  color: var(--text-3);
}

.nowrap {
  white-space: nowrap;
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
}

.rating--hot { background: var(--danger-soft); color: var(--danger); }
.rating--warm { background: var(--warning-soft); color: var(--warning); }
.rating--cold { background: var(--info-soft); color: var(--info); }

.status-sel {
  min-height: 32px;
  height: 32px;
  padding: 4px 30px 4px 10px;
  font-size: 13px;
  width: 140px;
}

.convert-btn {
  color: var(--success);
}

.actions-col {
  width: 1%;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  align-items: center;
}

.danger:hover,
.danger-text {
  color: var(--danger);
}

/* ----- Modals ----- */
.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13.5px;
}

.seg {
  display: flex;
  gap: 6px;
}

.seg__btn {
  flex: 1;
  height: 38px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-2);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.seg__btn.is-on.seg--hot { background: var(--danger-soft); border-color: var(--danger); color: var(--danger); }
.seg__btn.is-on.seg--warm { background: var(--warning-soft); border-color: var(--warning); color: var(--warning); }
.seg__btn.is-on.seg--cold { background: var(--info-soft); border-color: var(--info); color: var(--info); }

.check {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 8px;
  cursor: pointer;
}

.check input {
  margin-top: 3px;
  accent-color: var(--accent);
}

.check strong {
  display: block;
}

.check small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
}

.stage-picker {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.stage-step {
  --stage: var(--info);
  height: 34px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
  border-radius: 8px;
}

.stage-step.is-on {
  background: var(--stage);
  border-color: var(--stage);
  color: #fff;
}

.range {
  width: 100%;
  accent-color: var(--accent);
  margin-top: 10px;
}

.req {
  color: var(--danger);
}

.field-error {
  font-size: 12px;
  color: var(--danger);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 1440px) {
  .hide-xl {
    display: none;
  }
}

@media (max-width: 1200px) {
  .hide-lg {
    display: none;
  }
}

@media (max-width: 960px) {
  .hide-md {
    display: none;
  }
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .search,
  .sel,
  .sel-sm {
    width: 100%;
  }
  .toolbar__right {
    width: 100%;
  }
  .board {
    grid-auto-columns: 82%;
  }
  .stage-picker {
    grid-template-columns: repeat(3, 1fr);
  }
  .status-sel {
    width: 120px;
  }
  .person {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .ui-kpis {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__value {
    font-size: 20px;
  }
  .ui-kpi__meta {
    display: none;
  }
}
</style>
