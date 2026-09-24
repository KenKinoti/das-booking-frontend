<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Organisations</h1>
        <p>Create, manage, suspend and sign in to every business on the platform.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="exporting || !total" @click="exportCsv">
          <i :class="exporting ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-download'"></i> Export
        </button>
        <button class="ui-btn ui-btn--primary" @click="openCreate"><i class="fa-solid fa-plus"></i> New organisation</button>
      </div>
    </header>

    <section class="ui-card">
      <div class="pf-toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value)">
            {{ t.label }}
          </button>
        </div>
        <div class="pf-toolbar__right">
          <div class="ui-input-group pf-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search name, email or ABN…" aria-label="Search organisations" @input="debouncedLoad" />
          </div>
          <select v-model="businessType" class="ui-select pf-select" aria-label="Business type" @change="reload">
            <option value="">All business types</option>
            <option v-for="t in typeOptions" :key="t" :value="t">{{ typeLabel(t) }}</option>
          </select>
          <select v-model="sort" class="ui-select pf-select" aria-label="Sort" @change="reload">
            <option value="">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="users">Most users</option>
            <option value="last_active">Recently active</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !rows.length" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="pf-sk-row">
          <div class="ui-skeleton" style="width: 34px; height: 34px; border-radius: 10px"></div>
          <div class="ui-skeleton" style="flex: 1"></div>
          <div class="ui-skeleton" style="width: 80px"></div>
          <div class="ui-skeleton" style="width: 100px"></div>
        </div>
      </div>

      <div v-else-if="!rows.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-building"></i></div>
        <h3>{{ filtered ? 'No organisations match your filters' : 'No organisations yet' }}</h3>
        <p>{{ filtered ? 'Try a different search or filter.' : 'Create the first organisation and its admin user.' }}</p>
        <button v-if="!filtered" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openCreate"><i class="fa-solid fa-plus"></i> New organisation</button>
      </div>

      <div v-else class="ui-table-wrap" :class="{ 'pf-is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Organisation</th>
              <th class="pf-hide-md">Type</th>
              <th class="pf-hide-md">Plan</th>
              <th class="num" title="Active users / all users">Active / users</th>
              <th class="num pf-hide-md" title="Invoices of every status, drafts included">Invoices</th>
              <th class="pf-hide-sm">Last active</th>
              <th class="pf-hide-md">Created</th>
              <th>Status</th>
              <th style="width: 96px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in rows" :key="o.id" class="is-clickable" @click="openDrawer(o)">
              <td>
                <div class="pf-cell">
                  <span class="pf-avatar">{{ initials(o.name) }}</span>
                  <span class="pf-cell__text">
                    <span class="pf-cell__title">{{ o.name }}</span>
                    <span class="pf-cell__sub">{{ o.email || o.admin_email || 'No contact email' }}</span>
                  </span>
                </div>
              </td>
              <td class="pf-hide-md">{{ typeLabel(o.business_type) }}</td>
              <td class="pf-hide-md">
                <span v-if="o.plan_name" class="plan">{{ tierLabel(o.plan_name) }}<small v-if="o.plan_status && o.plan_status !== 'active'" class="pf-muted"> · {{ o.plan_status }}</small></span>
                <span v-else class="pf-muted">—</span>
              </td>
              <td class="num">{{ o.active_users }}<span class="pf-muted">/{{ o.users }}</span></td>
              <td class="num pf-hide-md">{{ o.invoices }}</td>
              <td class="pf-hide-sm pf-nowrap" :class="{ 'pf-muted': !o.last_active }">{{ timeAgo(o.last_active) }}</td>
              <td class="pf-hide-md pf-nowrap pf-muted">{{ formatDate(o.created_at) }}</td>
              <td><span class="ui-badge" :class="o.status === 'suspended' ? 'ui-badge--danger' : 'ui-badge--success'">{{ o.status === 'suspended' ? 'Suspended' : 'Active' }}</span></td>
              <td @click.stop>
                <div class="pf-row-actions">
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :title="`Log in as ${o.name}`" :aria-label="`Log in as ${o.name}`" :disabled="o.status === 'suspended' || !!busy[o.id]" @click="loginAs(o)">
                    <i :class="busy[o.id] === 'login' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-right-to-bracket'"></i>
                  </button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${o.name}`" title="Edit details" @click="openEdit(o)"><i class="fa-regular fa-pen-to-square"></i></button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Open ${o.name}`" title="Open" @click="openDrawer(o)"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="total > perPage" class="pf-pager">
        <span class="pf-muted">{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} of {{ total }}</span>
        <div class="ui-actions">
          <button class="ui-btn ui-btn--sm" :disabled="page <= 1" @click="go(page - 1)"><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <button class="ui-btn ui-btn--sm" :disabled="page * perPage >= total" @click="go(page + 1)">Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </footer>
    </section>

    <!-- Detail drawer -->
    <div v-if="drawer.open" class="pf-drawer-backdrop" @mousedown.self="closeDrawer">
      <aside class="pf-drawer" role="dialog" aria-modal="true" aria-labelledby="org-drawer-title">
        <div class="pf-drawer__head">
          <div class="pf-cell">
            <span class="pf-avatar pf-avatar--lg">{{ initials(drawerOrg ? drawerOrg.name : '') }}</span>
            <div class="pf-cell__text">
              <h2 id="org-drawer-title">{{ drawerOrg ? drawerOrg.name : 'Loading…' }}</h2>
              <span v-if="drawerOrg" class="pf-muted pf-small">
                <span class="ui-badge" :class="drawerOrg.status === 'suspended' ? 'ui-badge--danger' : 'ui-badge--success'">{{ drawerOrg.status === 'suspended' ? 'Suspended' : 'Active' }}</span>
                &nbsp;Joined {{ formatDate(drawerOrg.created_at) }}
              </span>
            </div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="closeDrawer"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="drawer-tabs">
          <div class="ui-tabs">
            <button v-for="t in drawerTabs" :key="t.value" class="ui-tab" :class="{ 'is-active': drawer.tab === t.value }" @click="setDrawerTab(t.value)">
              {{ t.label }}<span v-if="t.count != null" class="count">{{ t.count }}</span>
            </button>
          </div>
        </div>

        <div class="pf-drawer__body">
          <div v-if="drawer.error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ drawer.error }}</span></div>
          <div v-else-if="!drawer.detail">
            <div v-for="n in 6" :key="n" class="ui-skeleton" style="height: 18px; margin-bottom: 14px"></div>
          </div>

          <template v-else-if="drawer.tab === 'overview'">
            <div v-if="drawerOrg.status === 'suspended'" class="ui-alert ui-alert--warning" style="margin-bottom: 20px">
              <i class="fa-solid fa-ban"></i>
              <span>Sign-in is blocked for this organisation.<template v-if="drawerOrg.status_reason"> Reason: {{ drawerOrg.status_reason }}</template></span>
            </div>
            <div class="pf-section">
              <h3 class="pf-section__title">Usage</h3>
              <div class="pf-stat-grid">
                <div class="pf-stat"><small>Users</small><strong>{{ drawerOrg.users }}</strong><span class="pf-muted pf-small"> · {{ drawerOrg.active_users }} active</span></div>
                <div v-for="u in drawer.detail.usage" :key="u.key" class="pf-stat"><small>{{ u.label }}</small><strong>{{ u.count }}</strong></div>
              </div>
            </div>
            <div v-if="drawer.detail.revenue.length" class="pf-section">
              <h3 class="pf-section__title">Invoicing</h3>
              <ul class="pf-list">
                <li v-for="r in drawer.detail.revenue" :key="r.currency">
                  <span><strong>{{ r.currency }}</strong> <span class="pf-muted pf-small">· {{ r.count }} invoice{{ r.count === 1 ? '' : 's' }}</span></span>
                  <span class="num-col">{{ formatMoney(r.invoiced, r.currency) }} <small class="pf-muted">invoiced · {{ formatMoney(r.collected, r.currency) }} collected</small></span>
                </li>
              </ul>
            </div>
            <div class="pf-section">
              <h3 class="pf-section__title">Details <button class="ui-btn ui-btn--ghost ui-btn--sm" @click="openEdit(drawerOrg)"><i class="fa-regular fa-pen-to-square"></i> Edit</button></h3>
              <dl class="pf-kv">
                <dt>Business type</dt><dd>{{ typeLabel(drawerOrg.business_type) }}</dd>
                <dt>Plan</dt><dd>{{ drawerOrg.plan_name ? tierLabel(drawerOrg.plan_name) : '—' }}<span v-if="drawerOrg.plan_status" class="pf-muted"> · {{ drawerOrg.plan_status }}</span> <router-link to="/super-admin/plans" class="pf-small">Manage plans</router-link></dd>
                <dt>Email</dt><dd>{{ drawerOrg.email || '—' }}</dd>
                <dt>Phone</dt><dd>{{ drawerOrg.phone || '—' }}</dd>
                <dt>Website</dt><dd><a v-if="drawerOrg.website" :href="websiteHref(drawerOrg.website)" target="_blank" rel="noopener">{{ drawerOrg.website }}</a><span v-else>—</span></dd>
                <dt>ABN</dt><dd>{{ drawerOrg.abn || '—' }}</dd>
                <dt>Address</dt><dd>{{ address(drawerOrg) || '—' }}</dd>
                <dt>Last active</dt><dd>{{ timeAgo(drawerOrg.last_active) }}</dd>
                <dt>Organisation ID</dt><dd class="pf-mono">{{ drawerOrg.id }}</dd>
              </dl>
              <p v-if="drawerOrg.description" class="desc">{{ drawerOrg.description }}</p>
            </div>
            <div class="pf-section">
              <div class="pf-danger-zone">
                <h4>Delete organisation</h4>
                <p>Removes the organisation from the platform and deactivates all {{ drawerOrg.users }} of its users. This cannot be undone from the app.</p>
                <button class="ui-btn ui-btn--danger ui-btn--sm" @click="openDelete(drawerOrg)"><i class="fa-regular fa-trash-can"></i> Delete organisation</button>
              </div>
            </div>
          </template>

          <template v-else-if="drawer.tab === 'users'">
            <div v-if="!drawer.detail.users.length" class="ui-empty small"><p>This organisation has no users.</p></div>
            <ul v-else class="pf-list">
              <li v-for="u in drawer.detail.users" :key="u.id">
                <div class="pf-cell">
                  <span class="pf-avatar pf-avatar--round">{{ initials(`${u.first_name} ${u.last_name}`) }}</span>
                  <span class="pf-cell__text">
                    <span class="pf-cell__title">{{ u.first_name }} {{ u.last_name }}</span>
                    <span class="pf-cell__sub">{{ u.email }} · {{ roleLabel(u.role) }}</span>
                  </span>
                </div>
                <div class="user-right">
                  <span v-if="!u.is_active" class="ui-badge">Inactive</span>
                  <small v-else class="pf-muted pf-nowrap">{{ u.last_login_at ? timeAgo(u.last_login_at) : 'Never signed in' }}</small>
                </div>
              </li>
            </ul>
            <router-link :to="`/users-admin?organization_id=${drawerOrg.id}`" class="ui-btn ui-btn--sm" style="margin-top: 14px"><i class="fa-solid fa-users-gear"></i> Manage these users</router-link>
          </template>

          <template v-else-if="drawer.tab === 'activity'">
            <div v-if="drawer.activityLoading" class="ui-skeleton" style="height: 120px"></div>
            <div v-else-if="!drawer.activity.length" class="ui-empty small"><p>No recorded activity for this organisation yet.</p></div>
            <ul v-else class="timeline">
              <li v-for="a in drawer.activity" :key="a.source + a.id">
                <span class="dot"></span>
                <div>
                  <div><strong>{{ actionLabel(a.action) }}</strong> <span v-if="a.summary" class="pf-muted">— {{ a.summary }}</span></div>
                  <small class="pf-muted">{{ a.user_name || a.user_email || 'System' }} · {{ formatDateTime(a.created_at) }}</small>
                </div>
              </li>
            </ul>
            <router-link :to="`/audit-logs?organization_id=${drawerOrg.id}`" class="ui-btn ui-btn--sm" style="margin-top: 14px"><i class="fa-solid fa-clock-rotate-left"></i> Full audit log</router-link>
          </template>
        </div>

        <div v-if="drawerOrg" class="pf-drawer__foot">
          <button class="ui-btn ui-btn--primary" :disabled="drawerOrg.status === 'suspended' || !!busy[drawerOrg.id]" @click="loginAs(drawerOrg)">
            <i :class="busy[drawerOrg.id] === 'login' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-right-to-bracket'"></i> Log in as organisation
          </button>
          <button class="ui-btn" @click="openEdit(drawerOrg)"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
          <button v-if="drawerOrg.status === 'suspended'" class="ui-btn ui-btn--success" :disabled="!!busy[drawerOrg.id]" @click="activate(drawerOrg)">
            <i :class="busy[drawerOrg.id] === 'activate' ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-circle-check'"></i> Reactivate
          </button>
          <button v-else class="ui-btn" :disabled="drawerOrg.id === ownOrgId" :title="drawerOrg.id === ownOrgId ? 'You cannot suspend your own organisation' : ''" @click="openSuspend(drawerOrg)">
            <i class="fa-solid fa-ban"></i> Suspend
          </button>
        </div>
      </aside>
    </div>

    <!-- Create / edit -->
    <div v-if="form.open" class="ui-modal-backdrop" @mousedown.self="closeForm">
      <form class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" aria-labelledby="org-form-title" novalidate @submit.prevent="saveForm">
        <div class="ui-modal__head">
          <h2 id="org-form-title">{{ form.id ? 'Edit organisation' : 'New organisation' }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="closeForm"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="form.error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ form.error }}</span></div>
          <div class="pf-form-grid">
            <div class="pf-form-section">Business</div>
            <div class="ui-field span-2">
              <label for="of-name">Organisation name *</label>
              <input id="of-name" ref="firstField" v-model.trim="form.data.name" class="ui-input" maxlength="255" required autocomplete="organization" />
            </div>
            <div class="ui-field">
              <label for="of-type">Business type</label>
              <select id="of-type" v-model="form.data.business_type" class="ui-select">
                <option v-for="t in allTypes" :key="t" :value="t">{{ typeLabel(t) }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="of-abn">ABN</label>
              <input id="of-abn" v-model.trim="form.data.abn" class="ui-input" inputmode="numeric" maxlength="14" placeholder="11 digits" />
            </div>
            <div class="ui-field">
              <label for="of-email">Contact email</label>
              <input id="of-email" v-model.trim="form.data.email" class="ui-input" type="email" autocomplete="email" />
            </div>
            <div class="ui-field">
              <label for="of-phone">Phone</label>
              <input id="of-phone" v-model.trim="form.data.phone" class="ui-input" type="tel" maxlength="20" />
            </div>
            <div class="ui-field span-2">
              <label for="of-web">Website</label>
              <input id="of-web" v-model.trim="form.data.website" class="ui-input" placeholder="https://" />
            </div>
            <div class="ui-field span-2">
              <label for="of-street">Street address</label>
              <input id="of-street" v-model.trim="form.data.address.street" class="ui-input" autocomplete="street-address" />
            </div>
            <div class="ui-field">
              <label for="of-suburb">Suburb / city</label>
              <input id="of-suburb" v-model.trim="form.data.address.suburb" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="of-state">State</label>
              <input id="of-state" v-model.trim="form.data.address.state" class="ui-input" maxlength="50" />
            </div>
            <div class="ui-field">
              <label for="of-post">Postcode</label>
              <input id="of-post" v-model.trim="form.data.address.postcode" class="ui-input" maxlength="10" />
            </div>
            <div class="ui-field">
              <label for="of-country">Country</label>
              <input id="of-country" v-model.trim="form.data.address.country" class="ui-input" maxlength="100" />
            </div>
            <div class="ui-field span-2">
              <label for="of-desc">Notes</label>
              <textarea id="of-desc" v-model="form.data.description" class="ui-textarea" rows="2"></textarea>
            </div>

            <template v-if="!form.id">
              <div class="pf-form-section">First admin user</div>
              <div class="ui-field">
                <label for="oa-first">First name *</label>
                <input id="oa-first" v-model.trim="form.admin.first_name" class="ui-input" required autocomplete="off" />
              </div>
              <div class="ui-field">
                <label for="oa-last">Last name *</label>
                <input id="oa-last" v-model.trim="form.admin.last_name" class="ui-input" required autocomplete="off" />
              </div>
              <div class="ui-field">
                <label for="oa-email">Email *</label>
                <input id="oa-email" v-model.trim="form.admin.email" class="ui-input" type="email" required autocomplete="off" />
              </div>
              <div class="ui-field">
                <label for="oa-phone">Phone</label>
                <input id="oa-phone" v-model.trim="form.admin.phone" class="ui-input" type="tel" maxlength="20" autocomplete="off" />
              </div>
              <div class="ui-field span-2">
                <label class="ui-switch"><input v-model="form.generatePassword" type="checkbox" /> Generate a temporary password</label>
                <span class="ui-hint">You'll see it once after creating the organisation.</span>
              </div>
              <div v-if="!form.generatePassword" class="ui-field span-2">
                <label for="oa-pass">Password *</label>
                <input id="oa-pass" v-model="form.admin.password" class="ui-input" type="password" autocomplete="new-password" minlength="8" />
                <span class="ui-hint">At least 8 characters with upper-case, lower-case and a number.</span>
              </div>
            </template>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="closeForm">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="form.saving">
            <i v-if="form.saving" class="fa-solid fa-circle-notch spin"></i>
            {{ form.id ? 'Save changes' : 'Create organisation' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Suspend -->
    <div v-if="suspend.open" class="ui-modal-backdrop" @mousedown.self="suspend.open = false">
      <form class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="sus-title" @submit.prevent="doSuspend">
        <div class="ui-modal__head">
          <h2 id="sus-title">Suspend {{ suspend.org.name }}?</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="suspend.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <p class="modal-p">All {{ suspend.org.active_users }} active user{{ suspend.org.active_users === 1 ? '' : 's' }} will be deactivated and their sessions revoked. Reactivating restores exactly these users. No data is deleted.</p>
          <div class="ui-field">
            <label for="sus-reason">Reason (shown to platform admins)</label>
            <textarea id="sus-reason" v-model="suspend.reason" class="ui-textarea" rows="3" placeholder="e.g. Unpaid subscription"></textarea>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="suspend.open = false">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--danger" :disabled="suspend.saving"><i v-if="suspend.saving" class="fa-solid fa-circle-notch spin"></i> Suspend organisation</button>
        </div>
      </form>
    </div>

    <!-- Delete -->
    <div v-if="del.open" class="ui-modal-backdrop" @mousedown.self="del.open = false">
      <form class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="del-title" @submit.prevent="doDelete">
        <div class="ui-modal__head">
          <h2 id="del-title">Delete organisation</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="del.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="ui-alert ui-alert--danger" style="margin-bottom: 16px">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span><strong>{{ del.org.name }}</strong> will be removed and its {{ del.org.users }} user{{ del.org.users === 1 ? '' : 's' }} can no longer sign in.</span>
          </div>
          <div class="ui-field">
            <label for="del-name">Type <strong>{{ del.org.name }}</strong> to confirm</label>
            <input id="del-name" v-model="del.confirm" class="ui-input" autocomplete="off" spellcheck="false" />
          </div>
          <div v-if="del.error" class="ui-alert ui-alert--danger" style="margin-top: 12px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ del.error }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="del.open = false">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--danger" :disabled="del.confirm.trim() !== del.org.name || del.saving">
            <i v-if="del.saving" class="fa-solid fa-circle-notch spin"></i> Delete permanently
          </button>
        </div>
      </form>
    </div>

    <OneTimeSecret
      v-if="secret"
      title="Organisation created"
      :message="`${secret.org} is ready. Sign-in details for ${secret.email}:`"
      :secret="secret.password"
      :who="secret.email"
      @close="secret = null"
    />
  </div>
</template>

<script>
import '@/components/platform/platform.css'
import OneTimeSecret from '@/components/platform/OneTimeSecret.vue'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate, formatDateTime, formatMoney, downloadBlob } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { platformAPI, initials, timeAgo, roleLabel, startImpersonation, ensurePlatformSession, auditActionLabel } from '@/services/platform'

const TYPES = ['general', 'retail', 'hospitality', 'automotive', 'beauty', 'healthcare', 'professional', 'construction', 'events', 'manufacturing', 'education', 'nonprofit']
const TYPE_LABELS = {
  general: 'General business', retail: 'Retail', hospitality: 'Hospitality', automotive: 'Automotive', garage: 'Automotive (garage)',
  beauty: 'Beauty & wellness', salon: 'Salon', healthcare: 'Healthcare', professional: 'Professional services', construction: 'Construction & trades',
  events: 'Events & venues', manufacturing: 'Manufacturing', education: 'Education', nonprofit: 'Non-profit'
}
const TIER_LABELS = { small: 'Small', sme: 'SME', large: 'Large' }

const emptyOrg = () => ({ name: '', business_type: 'general', abn: '', email: '', phone: '', website: '', description: '', address: { street: '', suburb: '', state: '', postcode: '', country: 'Australia' } })
const emptyAdmin = () => ({ first_name: '', last_name: '', email: '', phone: '', password: '' })

export default {
  name: 'SuperAdminOrganizations',
  components: { OneTimeSecret },
  data() {
    const q = this.$route.query
    return {
      rows: [],
      total: 0,
      page: 1,
      perPage: 25,
      q: q.search || '',
      status: ['active', 'suspended'].includes(q.status) ? q.status : 'all',
      sort: q.sort || '',
      businessType: '',
      knownTypes: [],
      loading: false,
      exporting: false,
      error: '',
      busy: {},
      tabs: [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' }
      ],
      drawer: { open: false, id: null, detail: null, error: '', tab: 'overview', activity: [], activityLoading: false },
      form: { open: false, id: null, data: emptyOrg(), admin: emptyAdmin(), generatePassword: true, saving: false, error: '' },
      suspend: { open: false, org: null, reason: '', saving: false },
      del: { open: false, org: null, confirm: '', saving: false, error: '' },
      secret: null,
      timer: null
    }
  },
  computed: {
    filtered() {
      return !!(this.q || this.status !== 'all' || this.businessType)
    },
    typeOptions() {
      return Array.from(new Set([...this.knownTypes].filter(Boolean))).sort()
    },
    allTypes() {
      const cur = this.form.data.business_type
      return cur && !TYPES.includes(cur) ? [...TYPES, cur] : TYPES
    },
    drawerOrg() {
      return this.drawer.detail?.organization || this.rows.find((r) => r.id === this.drawer.id) || null
    },
    drawerTabs() {
      return [
        { value: 'overview', label: 'Overview' },
        { value: 'users', label: 'Users', count: this.drawer.detail ? this.drawer.detail.users.length : null },
        { value: 'activity', label: 'Activity' }
      ]
    },
    ownOrgId() {
      return useAuthStore().user?.organization_id || ''
    }
  },
  created() {
    if (ensurePlatformSession()) {
      window.location.reload()
      return
    }
    this.load()
    const q = this.$route.query
    if (q.new) this.openCreate()
    if (q.open) this.openDrawer({ id: String(q.open) })
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
    clearTimeout(this.timer)
  },
  methods: {
    initials,
    timeAgo,
    roleLabel,
    formatDate,
    formatDateTime,
    formatMoney,
    typeLabel(t) {
      if (!t) return '—'
      return TYPE_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')
    },
    tierLabel(t) {
      return TIER_LABELS[t] || t
    },
    address(o) {
      return [o.address_street, o.address_suburb, [o.address_state, o.address_postcode].filter(Boolean).join(' '), o.address_country].filter(Boolean).join(', ')
    },
    websiteHref(w) {
      return /^https?:\/\//i.test(w) ? w : `https://${w}`
    },
    actionLabel: auditActionLabel,
    onKey(e) {
      if (e.key !== 'Escape') return
      if (this.secret) this.secret = null
      else if (this.del.open) this.del.open = false
      else if (this.suspend.open) this.suspend.open = false
      else if (this.form.open) this.closeForm()
      else if (this.drawer.open) this.closeDrawer()
    },
    params(extra = {}) {
      return {
        page: this.page,
        limit: this.perPage,
        search: this.q || undefined,
        status: this.status === 'all' ? undefined : this.status,
        business_type: this.businessType || undefined,
        sort: this.sort || undefined,
        ...extra
      }
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const res = await platformAPI.organizations(this.params())
        this.rows = res.organizations || []
        this.total = res.total || 0
        this.knownTypes = res.business_types || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load organisations')
      } finally {
        this.loading = false
      }
    },
    reload() {
      this.page = 1
      this.load()
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.reload, 300)
    },
    setStatus(s) {
      this.status = s
      this.reload()
    },
    go(p) {
      this.page = p
      this.load()
    },
    async exportCsv() {
      this.exporting = true
      try {
        const all = []
        let page = 1
        for (;;) {
          const res = await platformAPI.organizations(this.params({ page, limit: 200 }))
          all.push(...(res.organizations || []))
          if (all.length >= res.total || !(res.organizations || []).length) break
          page++
        }
        const cols = ['id', 'name', 'status', 'business_type', 'plan_name', 'email', 'phone', 'website', 'abn', 'users', 'active_users', 'invoices', 'admin_email', 'last_active', 'created_at']
        const esc = (v) => {
          const s = v == null ? '' : String(v)
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        }
        const csv = [cols.join(','), ...all.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `organisations-${new Date().toISOString().slice(0, 10)}.csv`)
        toast.success(`Exported ${all.length} organisation${all.length === 1 ? '' : 's'}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      } finally {
        this.exporting = false
      }
    },

    // Drawer
    async openDrawer(o) {
      this.drawer = { open: true, id: o.id, detail: null, error: '', tab: 'overview', activity: [], activityLoading: false }
      await this.loadDetail()
    },
    async loadDetail() {
      const id = this.drawer.id
      try {
        const detail = await platformAPI.organization(id)
        if (this.drawer.id === id) this.drawer.detail = detail
      } catch (e) {
        if (this.drawer.id === id) this.drawer.error = apiErrorMessage(e, 'Could not load this organisation')
      }
    },
    closeDrawer() {
      this.drawer.open = false
      if (this.$route.query.open) this.$router.replace({ query: { ...this.$route.query, open: undefined } })
    },
    async setDrawerTab(t) {
      this.drawer.tab = t
      if (t === 'activity' && !this.drawer.activity.length) {
        this.drawer.activityLoading = true
        try {
          const res = await platformAPI.audit({ organization_id: this.drawer.id, limit: 20 })
          this.drawer.activity = res.entries || []
        } catch (e) {
          toast.error(apiErrorMessage(e, 'Could not load activity'))
        } finally {
          this.drawer.activityLoading = false
        }
      }
    },
    patchRow(org) {
      if (!org) return
      const i = this.rows.findIndex((r) => r.id === org.id)
      if (i >= 0) this.rows.splice(i, 1, org)
      if (this.drawer.detail && this.drawer.id === org.id) this.drawer.detail.organization = org
    },

    // Create / edit
    openCreate() {
      this.form = { open: true, id: null, data: emptyOrg(), admin: emptyAdmin(), generatePassword: true, saving: false, error: '' }
      this.$nextTick(() => this.$refs.firstField?.focus())
    },
    openEdit(o) {
      this.form = {
        open: true,
        id: o.id,
        data: {
          name: o.name, business_type: o.business_type || 'general', abn: o.abn || '', email: o.email || '', phone: o.phone || '', website: o.website || '', description: o.description || '',
          address: { street: o.address_street || '', suburb: o.address_suburb || '', state: o.address_state || '', postcode: o.address_postcode || '', country: o.address_country || '' }
        },
        admin: emptyAdmin(),
        generatePassword: true,
        saving: false,
        error: ''
      }
      this.$nextTick(() => this.$refs.firstField?.focus())
    },
    closeForm() {
      this.form.open = false
      if (this.$route.query.new) this.$router.replace({ query: { ...this.$route.query, new: undefined } })
    },
    validateForm() {
      const d = this.form.data
      if (!d.name) return 'Organisation name is required'
      if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return 'Contact email is not valid'
      const abn = d.abn.replace(/\s/g, '')
      if (abn && !/^\d{11}$/.test(abn)) return 'ABN must be 11 digits'
      if (!this.form.id) {
        const a = this.form.admin
        if (!a.first_name || !a.last_name) return "Enter the admin user's first and last name"
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return "Enter a valid email for the admin user"
        if (!this.form.generatePassword) {
          if (a.password.length < 8 || !/[A-Z]/.test(a.password) || !/[a-z]/.test(a.password) || !/\d/.test(a.password)) {
            return 'Password needs 8+ characters with upper-case, lower-case and a number'
          }
        }
      }
      return ''
    },
    async saveForm() {
      this.form.error = this.validateForm()
      if (this.form.error) return
      this.form.saving = true
      const body = { ...this.form.data, abn: this.form.data.abn.replace(/\s/g, '') }
      try {
        if (this.form.id) {
          const res = await platformAPI.updateOrganization(this.form.id, body)
          this.patchRow(res.organization)
          toast.success('Organisation updated')
          this.form.open = false
        } else {
          const admin = { ...this.form.admin }
          if (this.form.generatePassword) admin.password = ''
          const res = await platformAPI.createOrganization({ ...body, admin })
          toast.success(`${res.organization.name} created`)
          this.closeForm()
          if (res.temporary_password) this.secret = { org: res.organization.name, email: res.admin.email, password: res.temporary_password }
          this.reload()
        }
      } catch (e) {
        this.form.error = apiErrorMessage(e, 'Could not save the organisation')
      } finally {
        this.form.saving = false
      }
    },

    // Status
    openSuspend(o) {
      this.suspend = { open: true, org: o, reason: '', saving: false }
    },
    async doSuspend() {
      this.suspend.saving = true
      try {
        const res = await platformAPI.suspendOrganization(this.suspend.org.id, this.suspend.reason)
        this.patchRow(res.organization)
        toast.success(`${res.organization.name} suspended · ${res.users_deactivated} user${res.users_deactivated === 1 ? '' : 's'} signed out`)
        this.suspend.open = false
        if (this.drawer.open) this.loadDetail()
        if (this.status === 'active') this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not suspend the organisation'))
      } finally {
        this.suspend.saving = false
      }
    },
    async activate(o) {
      this.busy = { ...this.busy, [o.id]: 'activate' }
      try {
        const res = await platformAPI.activateOrganization(o.id)
        this.patchRow(res.organization)
        toast.success(`${res.organization.name} reactivated · ${res.users_restored} user${res.users_restored === 1 ? '' : 's'} restored`)
        if (this.drawer.open) this.loadDetail()
        if (this.status === 'suspended') this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not reactivate the organisation'))
      } finally {
        this.busy = { ...this.busy, [o.id]: null }
      }
    },

    // Delete
    openDelete(o) {
      this.del = { open: true, org: o, confirm: '', saving: false, error: '' }
    },
    async doDelete() {
      if (this.del.confirm.trim() !== this.del.org.name) return
      this.del.saving = true
      this.del.error = ''
      try {
        await platformAPI.deleteOrganization(this.del.org.id, this.del.confirm.trim())
        toast.success(`${this.del.org.name} deleted`)
        this.del.open = false
        this.drawer.open = false
        this.load()
      } catch (e) {
        this.del.error = apiErrorMessage(e, 'Could not delete the organisation')
      } finally {
        this.del.saving = false
      }
    },

    // Log in as
    async loginAs(o) {
      this.busy = { ...this.busy, [o.id]: 'login' }
      try {
        await startImpersonation(o)
        toast.info(`Signed in to ${o.name}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not open this organisation'))
        this.busy = { ...this.busy, [o.id]: null }
      }
    }
  }
}

</script>

<style scoped>
.plan {
  white-space: nowrap;
}

.drawer-tabs {
  padding: 12px 24px 0;
}

.desc {
  margin: 12px 0 0;
  color: var(--text-2);
  font-size: 14px;
  white-space: pre-wrap;
}

.num-col {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.num-col small {
  display: block;
}

.user-right {
  flex-shrink: 0;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}

.timeline li {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}

.timeline li:last-child {
  border-bottom: 0;
}

.timeline .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 7px;
  flex-shrink: 0;
}

.modal-p {
  margin: 0 0 16px;
  color: var(--text-2);
}

.ui-empty.small {
  padding: 28px 16px;
}

@media (max-width: 720px) {
  .drawer-tabs {
    padding: 12px 16px 0;
  }
}
</style>
