<template>
  <div class="ui-page ui-page--wide plan-page">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Administration</div>
        <h1>Plan &amp; billing</h1>
        <p>Your subscription, what it includes and what it costs — in the currency you choose.</p>
      </div>
      <div class="ui-actions" v-if="plan">
        <button v-if="plan.can_manage" class="ui-btn ui-btn--primary" @click="openWizard()">
          <i class="fa-solid fa-arrows-rotate"></i> Change plan
        </button>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <template v-else>
      <!-- Upgrade prompt when redirected from a module outside the plan -->
      <div v-if="blockedModule && plan && !hasEntitlement(blockedModule)" class="upsell ui-card">
        <div class="upsell__icon"><i :class="moduleInfo(blockedModule).icon || 'fa-solid fa-lock'"></i></div>
        <div class="upsell__text">
          <strong>{{ moduleInfo(blockedModule).name || blockedModule }} isn’t included in your plan</strong>
          <span>
            {{ moduleInfo(blockedModule).description }}
            <template v-if="moduleInfo(blockedModule).price !== undefined"> From {{ money(moduleInfo(blockedModule).price) }} / month.</template>
          </span>
        </div>
        <button v-if="plan.can_manage" class="ui-btn ui-btn--primary" @click="openWizard({ addModule: blockedModule })">
          <i class="fa-solid fa-plus"></i> Add to my plan
        </button>
        <span v-else class="ui-hint">Ask an organisation admin to upgrade the plan.</span>
      </div>

      <div v-if="plan && plan.trial && plan.trial.active" class="ui-alert" :class="plan.trial.days_left <= 3 ? 'ui-alert--warning' : ''">
        <i class="fa-solid fa-hourglass-half"></i>
        <span>
          You’re on a free trial of the <strong>{{ plan.tier.name }}</strong> plan — {{ plan.trial.days_left }} day{{ plan.trial.days_left === 1 ? '' : 's' }} left
          (ends {{ formatDate(plan.trial.ends_at) }}). Pick the plan that fits before it ends.
        </span>
      </div>
      <div v-else-if="plan && plan.trial && plan.trial.expired" class="ui-alert ui-alert--warning">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Your trial has ended. Confirm a plan to keep using your modules.</span>
      </div>

      <!-- KPIs -->
      <div class="ui-kpis">
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon"><i :class="tierIcon(sub.tier)"></i></span>Current plan</div>
          <div class="ui-kpi__value"><span v-if="!plan" class="ui-skeleton sk"></span><template v-else>{{ plan.tier.name }}</template></div>
          <div class="ui-kpi__meta">
            <span v-if="plan" class="ui-badge" :class="statusInfo.badge">{{ statusInfo.label }}</span>
            <span v-if="plan && sub.grandfathered" class="meta-note">Legacy full access</span>
          </div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-success"><i class="fa-solid fa-receipt"></i></span>Price</div>
          <div class="ui-kpi__value"><span v-if="!plan" class="ui-skeleton sk"></span><template v-else-if="quote">{{ money(quote.total, quote.currency, quote.decimals) }}</template><template v-else>—</template></div>
          <div class="ui-kpi__meta">{{ quote ? cycleLabel(quote.cycle) : '' }}<template v-if="quote && quote.cycle === 'annual'"> · {{ money(quote.per_month, quote.currency, quote.decimals) }}/mo</template></div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-info"><i class="fa-solid fa-users"></i></span>Users</div>
          <div class="ui-kpi__value"><span v-if="!plan" class="ui-skeleton sk"></span><template v-else>{{ plan.limits.users }}<small class="of"> / {{ plan.limits.max_users || '∞' }}</small></template></div>
          <div class="ui-kpi__meta">
            <div v-if="plan && plan.limits.max_users" class="meter"><span :style="{ width: usersPct + '%' }" :class="{ warn: usersPct >= 90 }"></span></div>
            <template v-else>Unlimited users</template>
          </div>
        </div>
        <div class="ui-kpi">
          <div class="ui-kpi__label"><span class="ui-kpi__icon k-warning"><i class="fa-solid fa-puzzle-piece"></i></span>Systems</div>
          <div class="ui-kpi__value"><span v-if="!plan" class="ui-skeleton sk"></span><template v-else>{{ paidModules.length }}<small v-if="plan.limits.max_modules" class="of"> / {{ plan.limits.max_modules }}</small></template></div>
          <div class="ui-kpi__meta">{{ plan && plan.limits.max_modules ? `Up to ${plan.limits.max_modules} on ${plan.tier.name}` : 'Modules in your plan' }}</div>
        </div>
      </div>

      <div class="plan-grid">
        <!-- Current plan -->
        <section class="ui-card">
          <div class="ui-card__head">
            <h2>Your plan</h2>
            <span v-if="plan" class="ui-hint">{{ plan.industry?.name }}</span>
          </div>
          <div class="ui-card__body">
            <div v-if="!plan" class="ui-skeleton" style="height: 180px"></div>
            <template v-else>
              <div class="cur-plan">
                <div class="cur-plan__tier">
                  <span class="tier-icon"><i :class="tierIcon(sub.tier)"></i></span>
                  <div>
                    <strong>{{ plan.tier.name }}</strong>
                    <small>{{ plan.tier.tagline }}</small>
                  </div>
                </div>
                <div class="cur-plan__price" v-if="quote">
                  <strong>{{ money(quote.total, quote.currency, quote.decimals) }}</strong>
                  <small>{{ cycleLabel(quote.cycle) }} · {{ quote.currency }}</small>
                </div>
              </div>

              <h3 class="sub-h">Included modules</h3>
              <div class="chips">
                <span v-for="m in paidModules" :key="m" class="chip"><i :class="moduleInfo(m).icon"></i>{{ moduleInfo(m).name || m }}</span>
                <span class="chip chip--core"><i class="fa-solid fa-house"></i>Core workspace</span>
              </div>

              <template v-if="quote">
                <h3 class="sub-h">Price breakdown</h3>
                <table class="lines">
                  <tbody>
                    <tr v-for="(l, i) in quote.lines" :key="i" :class="{ muted: l.kind === 'included' }">
                      <td>{{ l.label }}</td>
                      <td class="num">{{ l.kind === 'included' ? 'Included' : money(l.amount, quote.currency, quote.decimals) }}</td>
                    </tr>
                    <tr v-if="quote.cycle === 'annual'" class="muted">
                      <td>Monthly subtotal × 12, less {{ quote.annual_discount_pct }}% annual discount</td>
                      <td class="num">−{{ money(quote.annual_discount, quote.currency, quote.decimals) }}</td>
                    </tr>
                    <tr class="total">
                      <td>Total {{ cycleLabel(quote.cycle) }}</td>
                      <td class="num">{{ money(quote.total, quote.currency, quote.decimals) }}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="ui-hint fx-note" v-if="quote.currency !== 'USD'">
                  Converted from USD at {{ quote.rate }} {{ quote.currency }}/USD ({{ quote.rate_source === 'live' ? 'live rate' : 'reference rate' }}), rounded for {{ quote.currency }}.
                </p>
              </template>
              <div v-else-if="plan.quote_error" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ plan.quote_error }}</span></div>

              <div class="bill-note"><i class="fa-solid fa-shield-halved"></i><span>{{ plan.billing_note }}</span></div>
            </template>
          </div>
        </section>

        <div class="side-col">
          <!-- Default currency -->
          <section class="ui-card">
            <div class="ui-card__head"><h2>Default currency</h2></div>
            <div class="ui-card__body">
              <p class="ui-hint" style="margin-top: 0">Used as the starting currency for invoices, quotes and reports across your workspace.</p>
              <div class="ui-field">
                <label for="def-cur">Organisation currency</label>
                <select id="def-cur" v-model="defaultCurrency" class="ui-select" :disabled="!plan || !plan.can_manage">
                  <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                    <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                  </optgroup>
                </select>
              </div>
              <button
                v-if="plan && plan.can_manage"
                class="ui-btn ui-btn--sm"
                :disabled="savingCurrency || defaultCurrency === plan.default_currency"
                @click="saveDefaultCurrency"
              >
                <i :class="savingCurrency ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'"></i> Save currency
              </button>
              <p v-else-if="plan" class="ui-hint">Only organisation admins can change this.</p>
            </div>
          </section>

          <!-- Trial / support -->
          <section class="ui-card">
            <div class="ui-card__head"><h2>Need something bigger?</h2></div>
            <div class="ui-card__body help">
              <p>The <strong>Large</strong> plan includes every module and unlimited users, with custom pricing and contracts for enterprises.</p>
              <button v-if="plan && plan.can_manage && sub.tier !== 'large'" class="ui-btn ui-btn--sm" @click="openWizard({ tier: 'large' })">
                <i class="fa-solid fa-building"></i> Explore Large
              </button>
              <router-link to="/faq" class="ui-btn ui-btn--ghost ui-btn--sm"><i class="fa-regular fa-circle-question"></i> Help &amp; FAQ</router-link>
            </div>
          </section>
        </div>
      </div>

      <!-- Comparison -->
      <section class="ui-card compare-card">
        <div class="ui-card__head">
          <h2>Compare plans</h2>
          <div class="compare-tools">
            <label class="sr-only" for="cmp-cur">Currency</label>
            <select id="cmp-cur" v-model="viewCurrency" class="ui-select ui-select--sm">
              <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }}</option>
              </optgroup>
            </select>
          </div>
        </div>
        <div v-if="!catalog" class="ui-card__body"><div class="ui-skeleton" style="height: 260px"></div></div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table compare">
            <thead>
              <tr>
                <th></th>
                <th v-for="t in catalog.tiers" :key="t.key" :class="{ current: t.key === sub.tier }">
                  <div class="cmp-head">
                    <span class="tier-icon sm"><i :class="tierIcon(t.key)"></i></span>
                    <strong>{{ t.name }}</strong>
                    <span v-if="t.key === sub.tier" class="ui-badge ui-badge--info">Current</span>
                  </div>
                  <small class="cmp-tag">{{ t.tagline }}</small>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Price</td>
                <td v-for="t in catalog.tiers" :key="t.key" :class="{ current: t.key === sub.tier }">
                  <strong class="cmp-price">{{ t.includes_all_modules || t.includes_industry_bundle ? '' : 'from ' }}{{ money(t.from_price, catalog.currency, catalog.decimals) }}</strong>
                  <small>/ month</small>
                  <div v-if="!t.includes_all_modules && !t.includes_industry_bundle" class="ui-hint">base {{ money(t.base_price, catalog.currency, catalog.decimals) }} + each system</div>
                  <div v-else-if="t.includes_industry_bundle" class="ui-hint">industry bundle included</div>
                  <div v-else-if="t.enterprise" class="ui-hint">custom pricing available</div>
                </td>
              </tr>
              <tr>
                <td>Systems</td>
                <td v-for="t in catalog.tiers" :key="t.key" :class="{ current: t.key === sub.tier }">{{ systemsLabel(t) }}</td>
              </tr>
              <tr>
                <td>Users</td>
                <td v-for="t in catalog.tiers" :key="t.key" :class="{ current: t.key === sub.tier }">{{ t.max_users ? `Up to ${t.max_users}` : 'Unlimited' }}</td>
              </tr>
              <tr>
                <td>Extra systems</td>
                <td v-for="t in catalog.tiers" :key="t.key" :class="{ current: t.key === sub.tier }">
                  <template v-if="t.includes_all_modules">Everything included</template>
                  <template v-else-if="t.includes_industry_bundle">Add-ons {{ t.addon_discount_pct ? `${t.addon_discount_pct}% off` : 'at list price' }}</template>
                  <template v-else>List price per system</template>
                </td>
              </tr>
              <tr>
                <td>Annual billing</td>
                <td v-for="t in catalog.tiers" :key="t.key" :class="{ current: t.key === sub.tier }">{{ t.annual_discount_pct ? `Save ${t.annual_discount_pct}%` : '—' }}</td>
              </tr>
              <tr>
                <td>Free trial</td>
                <td v-for="t in catalog.tiers" :key="t.key" :class="{ current: t.key === sub.tier }">{{ t.trial_days ? `${t.trial_days} days` : '—' }}</td>
              </tr>
              <tr>
                <td>Highlights</td>
                <td v-for="t in catalog.tiers" :key="t.key" :class="{ current: t.key === sub.tier }">
                  <ul class="feat">
                    <li v-for="f in t.features || []" :key="f"><i class="fa-solid fa-check"></i>{{ f }}</li>
                  </ul>
                </td>
              </tr>
              <tr v-if="plan && plan.can_manage">
                <td></td>
                <td v-for="t in catalog.tiers" :key="t.key" :class="{ current: t.key === sub.tier }">
                  <button class="ui-btn ui-btn--sm" :class="{ 'ui-btn--primary': t.key !== sub.tier }" @click="openWizard({ tier: t.key })">
                    {{ t.key === sub.tier ? 'Adjust' : `Choose ${t.name}` }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- Change plan wizard -->
    <div v-if="wiz.open" class="ui-modal-backdrop" @mousedown.self="closeWizard">
      <div class="ui-modal wiz" role="dialog" aria-modal="true" aria-labelledby="wiz-title">
        <div class="ui-modal__head">
          <h2 id="wiz-title">Change plan</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="closeWizard"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <ol class="steps">
          <li v-for="(s, i) in steps" :key="s" :class="{ 'is-active': wiz.step === i, 'is-done': wiz.step > i }">
            <button type="button" @click="goStep(i)" :disabled="i > maxReachableStep">
              <span class="steps__n">{{ wiz.step > i ? '✓' : i + 1 }}</span><span class="steps__l">{{ s }}</span>
            </button>
          </li>
        </ol>
        <div class="ui-modal__body wiz__body">
          <div class="wiz__main">
            <!-- 1. Industry -->
            <div v-if="wiz.step === 0">
              <p class="wiz__lead">What kind of business are you? We’ll recommend the right plan and modules.</p>
              <div class="pick-grid">
                <button
                  v-for="ind in catalog.industries"
                  :key="ind.key"
                  type="button"
                  class="pick"
                  :class="{ 'is-selected': wiz.industry === ind.key }"
                  @click="chooseIndustry(ind)"
                >
                  <span class="pick__icon"><i :class="ind.icon"></i></span>
                  <span class="pick__body">
                    <strong>{{ ind.name }}</strong>
                    <small>{{ ind.description }}</small>
                  </span>
                </button>
              </div>
            </div>

            <!-- 2. Tier -->
            <div v-else-if="wiz.step === 1">
              <p class="wiz__lead">Recommended for <strong>{{ industryInfo.name }}</strong>: <strong>{{ tierName(industryInfo.recommended_tier) }}</strong>.</p>
              <div class="tier-grid">
                <button
                  v-for="t in catalog.tiers"
                  :key="t.key"
                  type="button"
                  class="tier-card"
                  :class="{ 'is-selected': wiz.tier === t.key }"
                  @click="chooseTier(t.key)"
                >
                  <span v-if="t.key === industryInfo.recommended_tier" class="tier-card__rec">Recommended</span>
                  <span class="tier-icon"><i :class="tierIcon(t.key)"></i></span>
                  <strong class="tier-card__name">{{ t.name }}</strong>
                  <span class="tier-card__price">
                    {{ t.includes_all_modules || t.includes_industry_bundle ? '' : 'from ' }}{{ money(t.from_price, catalog.currency, catalog.decimals) }}<small>/mo</small>
                  </span>
                  <small class="tier-card__tag">{{ t.tagline }}</small>
                  <ul class="feat">
                    <li><i class="fa-solid fa-check"></i>{{ systemsLabel(t) }}</li>
                    <li><i class="fa-solid fa-check"></i>{{ t.max_users ? `Up to ${t.max_users} users` : 'Unlimited users' }}</li>
                    <li v-if="t.annual_discount_pct"><i class="fa-solid fa-check"></i>Save {{ t.annual_discount_pct }}% annually</li>
                  </ul>
                </button>
              </div>
            </div>

            <!-- 3. Modules -->
            <div v-else-if="wiz.step === 2">
              <template v-if="wizTier.includes_all_modules">
                <p class="wiz__lead">The <strong>{{ wizTier.name }}</strong> plan includes every module.</p>
                <div class="mod-grid">
                  <div v-for="m in sellable" :key="m.key" class="mod is-included">
                    <span class="mod__icon"><i :class="m.icon"></i></span>
                    <span class="mod__body"><strong>{{ m.name }}</strong><small>{{ m.description }}</small></span>
                    <span class="mod__price">Included</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <p v-if="isSmallLike" class="wiz__lead">
                  Choose up to <strong>{{ wizTier.max_modules }}</strong> system{{ wizTier.max_modules === 1 ? '' : 's' }}. Each one adds to the price.
                </p>
                <p v-else class="wiz__lead">
                  Your <strong>{{ industryInfo.name }}</strong> bundle is included. Add more systems{{ wizTier.addon_discount_pct ? ` at ${wizTier.addon_discount_pct}% off` : '' }}.
                </p>
                <div v-if="isSmallLike" class="limit" :class="{ full: selectedCount >= wizTier.max_modules }">
                  <i class="fa-solid fa-circle-info"></i>
                  <span v-if="selectedCount < wizTier.max_modules">{{ selectedCount }} of {{ wizTier.max_modules }} selected — {{ wizTier.max_modules - selectedCount }} more available.</span>
                  <span v-else>
                    You’ve picked the maximum of {{ wizTier.max_modules }} for {{ wizTier.name }}. Need more?
                    <a href="#" @click.prevent="chooseTier('sme', true)">Switch to SME</a> for a full industry bundle.
                  </span>
                </div>
                <div class="mod-grid">
                  <label
                    v-for="m in sellable"
                    :key="m.key"
                    class="mod"
                    :class="{
                      'is-selected': isChosen(m.key),
                      'is-included': inBundle(m.key),
                      'is-disabled': !inBundle(m.key) && !isChosen(m.key) && limitReached
                    }"
                  >
                    <input
                      type="checkbox"
                      :checked="isChosen(m.key) || inBundle(m.key)"
                      :disabled="inBundle(m.key) || (!isChosen(m.key) && limitReached)"
                      @change="toggleModule(m.key)"
                    />
                    <span class="mod__icon"><i :class="m.icon"></i></span>
                    <span class="mod__body"><strong>{{ m.name }}</strong><small>{{ m.description }}</small></span>
                    <span class="mod__price">
                      <template v-if="inBundle(m.key)">Included</template>
                      <template v-else>
                        <s v-if="addonPrice(m) !== m.price">{{ money(m.price, catalog.currency, catalog.decimals) }}</s>
                        +{{ money(addonPrice(m), catalog.currency, catalog.decimals) }}<small>/mo</small>
                      </template>
                    </span>
                  </label>
                </div>
              </template>
            </div>

            <!-- 4. Billing -->
            <div v-else-if="wiz.step === 3">
              <p class="wiz__lead">How would you like to be billed?</p>
              <div class="cycle">
                <button type="button" class="cycle__opt" :class="{ 'is-selected': wiz.cycle === 'monthly' }" @click="wiz.cycle = 'monthly'">
                  <strong>Monthly</strong><small>Pay as you go, cancel any time</small>
                </button>
                <button type="button" class="cycle__opt" :class="{ 'is-selected': wiz.cycle === 'annual' }" @click="wiz.cycle = 'annual'">
                  <strong>Annual <span v-if="wizTier.annual_discount_pct" class="ui-badge ui-badge--success">Save {{ wizTier.annual_discount_pct }}%</span></strong>
                  <small>One payment a year</small>
                </button>
              </div>
              <div class="ui-field" style="margin-top: 16px">
                <label for="wiz-cur">Billing currency</label>
                <select id="wiz-cur" v-model="wiz.currency" class="ui-select">
                  <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                    <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                  </optgroup>
                </select>
                <span class="ui-hint">Prices are set in USD and converted at today’s rate, rounded for your currency.</span>
              </div>
            </div>
          </div>

          <!-- Live summary -->
          <aside class="wiz__summary" :class="{ 'is-loading': quoteLoading }" aria-live="polite">
            <h3>Summary</h3>
            <div class="sum-row"><span>Industry</span><strong>{{ industryInfo.name || '—' }}</strong></div>
            <div class="sum-row"><span>Plan</span><strong>{{ wizTier.name || '—' }}</strong></div>
            <div class="sum-row"><span>Billing</span><strong>{{ wiz.cycle === 'annual' ? 'Annual' : 'Monthly' }} · {{ wiz.currency }}</strong></div>
            <div class="sum-sep"></div>
            <div v-if="quoteError" class="ui-alert ui-alert--warning sum-alert"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ quoteError }}</span></div>
            <template v-else-if="wizQuote">
              <div v-for="(l, i) in wizQuote.lines.filter((x) => x.kind !== 'included')" :key="i" class="sum-line">
                <span>{{ l.label }}</span><span>{{ money(l.amount, wizQuote.currency, wizQuote.decimals) }}</span>
              </div>
              <div v-if="wizQuote.included.length" class="sum-line muted">
                <span>{{ wizQuote.included.length }} module{{ wizQuote.included.length === 1 ? '' : 's' }} included</span><span>—</span>
              </div>
              <div v-if="wizQuote.cycle === 'annual'" class="sum-line muted">
                <span>Annual discount ({{ wizQuote.annual_discount_pct }}%)</span><span>−{{ money(wizQuote.annual_discount, wizQuote.currency, wizQuote.decimals) }}</span>
              </div>
              <div class="sum-total">
                <span>Total</span>
                <strong :class="{ loading: quoteLoading }">{{ money(wizQuote.total, wizQuote.currency, wizQuote.decimals) }}</strong>
              </div>
              <div class="sum-cycle">{{ cycleLabel(wizQuote.cycle) }}<template v-if="wizQuote.cycle === 'annual'"> · {{ money(wizQuote.per_month, wizQuote.currency, wizQuote.decimals) }}/mo</template></div>
              <div v-if="currentQuote && wizQuote.currency === currentQuote.currency && wizQuote.cycle === currentQuote.cycle" class="sum-diff" :class="diffClass">
                {{ diffLabel }}
              </div>
            </template>
            <div v-else class="ui-skeleton" style="height: 80px"></div>
            <p class="ui-hint sum-note"><i class="fa-solid fa-shield-halved"></i> Billing is handled by DASYIN. Changes take effect immediately.</p>
          </aside>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn" @click="wiz.step > 0 ? (wiz.step -= 1) : closeWizard()">{{ wiz.step > 0 ? 'Back' : 'Cancel' }}</button>
          <button v-if="wiz.step < steps.length - 1" class="ui-btn ui-btn--primary" :disabled="!canNext" @click="wiz.step += 1">
            Continue <i class="fa-solid fa-arrow-right"></i>
          </button>
          <button v-else class="ui-btn ui-btn--primary" :disabled="saving || !!quoteError || !wizQuote || quoteLoading" @click="confirmChange">
            <i :class="saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'"></i> Confirm plan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { apiErrorMessage } from '@/services/api'
import { plansAPI, planMoney, niceRound, cycleLabel, TIER_ICONS, STATUS_LABELS } from '@/services/plans'
import { currencyGroups } from '@/utils/currencies'
import { formatDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { applyPlan } from '@/composables/useEntitlements'

export default {
  name: 'PlanBilling',
  data() {
    return {
      plan: null,
      catalog: null,
      error: '',
      viewCurrency: 'USD',
      defaultCurrency: orgCurrency(),
      savingCurrency: false,
      saving: false,
      steps: ['Industry', 'Plan', 'Modules', 'Billing'],
      wiz: { open: false, step: 0, industry: 'general', tier: 'small', modules: [], cycle: 'monthly', currency: 'USD' },
      wizQuote: null,
      quoteError: '',
      quoteLoading: false,
      quoteTimer: null,
      quoteSeq: 0,
      currencyGroups: currencyGroups()
    }
  },
  computed: {
    sub() {
      return this.plan?.subscription || {}
    },
    quote() {
      return this.plan?.quote || null
    },
    currentQuote() {
      return this.quote
    },
    statusInfo() {
      return STATUS_LABELS[this.sub.status] || { label: this.sub.status || '', badge: 'ui-badge--draft' }
    },
    blockedModule() {
      return typeof this.$route.query.module === 'string' ? this.$route.query.module : ''
    },
    paidModules() {
      return (this.plan?.entitlements || []).filter((m) => m !== 'core')
    },
    usersPct() {
      const l = this.plan?.limits
      if (!l || !l.max_users) return 0
      return Math.min(100, Math.round((l.users / l.max_users) * 100))
    },
    sellable() {
      return (this.catalog?.modules || []).filter((m) => !m.core && m.active)
    },
    industryInfo() {
      return (this.catalog?.industries || []).find((i) => i.key === this.wiz.industry) || {}
    },
    wizTier() {
      return (this.catalog?.tiers || []).find((t) => t.key === this.wiz.tier) || {}
    },
    isSmallLike() {
      return !this.wizTier.includes_all_modules && !this.wizTier.includes_industry_bundle
    },
    bundle() {
      return this.wizTier.includes_industry_bundle ? this.industryInfo.modules || [] : []
    },
    selectedCount() {
      return this.bundle.length + this.wiz.modules.filter((m) => !this.bundle.includes(m)).length
    },
    limitReached() {
      return this.wizTier.max_modules > 0 && this.selectedCount >= this.wizTier.max_modules
    },
    maxReachableStep() {
      if (!this.wiz.industry) return 0
      if (!this.wiz.tier) return 1
      if (this.isSmallLike && this.wiz.modules.length === 0) return 2
      return 3
    },
    canNext() {
      return this.wiz.step < this.maxReachableStep
    },
    selectionKey() {
      const w = this.wiz
      return w.open ? JSON.stringify([w.industry, w.tier, [...w.modules].sort(), w.cycle, w.currency]) : ''
    },
    diffLabel() {
      const d = (this.wizQuote?.total || 0) - (this.currentQuote?.total || 0)
      if (Math.abs(d) < 0.005) return 'Same price as your current plan'
      const m = this.money(Math.abs(d), this.wizQuote.currency, this.wizQuote.decimals)
      return d > 0 ? `${m} more than now` : `${m} less than now`
    },
    diffClass() {
      const d = (this.wizQuote?.total || 0) - (this.currentQuote?.total || 0)
      return d > 0.005 ? 'up' : d < -0.005 ? 'down' : ''
    }
  },
  watch: {
    viewCurrency(v, old) {
      if (v && v !== old && !this.wiz.open) this.loadCatalog(v)
    },
    'wiz.currency'(v, old) {
      if (this.wiz.open && v && v !== old) this.loadCatalog(v)
    },
    selectionKey(v) {
      if (v) this.scheduleQuote()
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.quoteTimer)
  },
  methods: {
    formatDate,
    cycleLabel,
    money(v, code, dec) {
      return planMoney(v, code || this.catalog?.currency || 'USD', dec ?? this.catalog?.decimals ?? 2)
    },
    tierIcon(k) {
      return TIER_ICONS[k] || 'fa-solid fa-layer-group'
    },
    tierName(k) {
      return (this.catalog?.tiers || []).find((t) => t.key === k)?.name || k
    },
    moduleInfo(k) {
      return (this.catalog?.modules || []).find((m) => m.key === k) || {}
    },
    hasEntitlement(k) {
      return (this.plan?.entitlements || []).includes(k)
    },
    systemsLabel(t) {
      if (t.includes_all_modules) return 'All modules'
      if (t.includes_industry_bundle) return 'Industry bundle + add-ons'
      return t.max_modules ? `Choose up to ${t.max_modules}` : 'Choose any'
    },
    async load() {
      this.error = ''
      try {
        const plan = await plansAPI.me()
        this.plan = plan
        applyPlan(plan)
        this.defaultCurrency = plan.default_currency || plan.subscription?.currency || 'USD'
        this.viewCurrency = plan.subscription?.currency || 'USD'
        await this.loadCatalog(this.viewCurrency)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load your plan')
      }
    },
    async loadCatalog(cur) {
      try {
        this.catalog = await plansAPI.catalog(cur)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load plan prices'))
      }
    },
    openWizard(opts = {}) {
      if (!this.catalog) return
      const s = this.sub
      this.wiz = {
        open: true,
        step: 0,
        industry: s.industry || 'general',
        tier: opts.tier || s.tier || 'small',
        modules: [...(s.modules || [])],
        cycle: s.cycle || 'monthly',
        currency: s.currency || this.viewCurrency
      }
      // A small-plan org shows its selection; a large-plan org starts from its entitlements.
      if (this.wiz.tier !== s.tier) this.wiz.modules = this.paidModules.slice()
      if (opts.addModule) {
        this.addModuleToWizard(opts.addModule)
        this.wiz.step = 2
      } else if (opts.tier) {
        this.fitModulesToTier()
        this.wiz.step = 2
      }
      this.wizQuote = null
      this.quoteError = ''
      if (this.wiz.currency !== this.catalog.currency) this.loadCatalog(this.wiz.currency)
      this.scheduleQuote(0)
    },
    addModuleToWizard(key) {
      if (!this.wiz.modules.includes(key)) this.wiz.modules.push(key)
      const t = this.wizTier
      if (t.includes_all_modules) return
      if (t.max_modules > 0 && this.selectedCount > t.max_modules) {
        // Too many for Small: suggest SME, which includes the industry bundle.
        this.wiz.tier = 'sme'
      }
    },
    fitModulesToTier() {
      const t = this.wizTier
      if (t.includes_all_modules) return
      const bundle = this.bundle
      this.wiz.modules = this.wiz.modules.filter((m) => !bundle.includes(m) && this.sellable.some((x) => x.key === m))
      if (t.max_modules > 0) {
        if (!this.wiz.modules.length && !bundle.length) {
          this.wiz.modules = (this.industryInfo.modules || []).slice(0, t.max_modules)
        }
        this.wiz.modules = this.wiz.modules.slice(0, Math.max(0, t.max_modules - bundle.length))
      }
    },
    closeWizard() {
      this.wiz.open = false
      if (this.catalog && this.catalog.currency !== this.viewCurrency) this.loadCatalog(this.viewCurrency)
    },
    goStep(i) {
      if (i <= this.maxReachableStep) this.wiz.step = i
    },
    chooseIndustry(ind) {
      const changed = this.wiz.industry !== ind.key
      this.wiz.industry = ind.key
      if (changed) {
        if (ind.recommended_tier) this.wiz.tier = ind.recommended_tier
        this.wiz.modules = []
        this.fitModulesToTier()
      }
      this.wiz.step = 1
    },
    chooseTier(key, stay = false) {
      this.wiz.tier = key
      this.fitModulesToTier()
      if (!stay) this.wiz.step = 2
    },
    isChosen(k) {
      return this.wiz.modules.includes(k)
    },
    inBundle(k) {
      return this.bundle.includes(k)
    },
    toggleModule(k) {
      if (this.inBundle(k)) return
      const i = this.wiz.modules.indexOf(k)
      if (i >= 0) this.wiz.modules.splice(i, 1)
      else if (!this.limitReached) this.wiz.modules.push(k)
    },
    addonPrice(m) {
      const d = this.wizTier.includes_industry_bundle ? Number(this.wizTier.addon_discount_pct) || 0 : 0
      if (!d) return m.price
      // Mirror the server: discount in USD, round to cents, convert, nice-round.
      const usd = Math.round(m.monthly_price_usd * (1 - d / 100) * 100) / 100
      return niceRound(usd * (this.catalog?.rate || 1), this.catalog?.decimals ?? 2)
    },
    scheduleQuote(delay = 250) {
      clearTimeout(this.quoteTimer)
      this.quoteLoading = true
      this.quoteTimer = setTimeout(this.fetchQuote, delay)
    },
    async fetchQuote() {
      const seq = ++this.quoteSeq
      const w = this.wiz
      try {
        const res = await plansAPI.quote({ tier: w.tier, industry: w.industry, modules: w.modules, cycle: w.cycle, currency: w.currency })
        if (seq !== this.quoteSeq) return
        this.wizQuote = res.quote
        this.quoteError = ''
      } catch (e) {
        if (seq !== this.quoteSeq) return
        this.quoteError = apiErrorMessage(e, 'Could not price this selection')
      } finally {
        if (seq === this.quoteSeq) this.quoteLoading = false
      }
    },
    async confirmChange() {
      const w = this.wiz
      this.saving = true
      try {
        const plan = await plansAPI.updateMe({ tier: w.tier, industry: w.industry, modules: w.modules, cycle: w.cycle, currency: w.currency })
        this.plan = plan
        applyPlan(plan)
        this.wiz.open = false
        this.viewCurrency = plan.subscription?.currency || this.viewCurrency
        await this.loadCatalog(this.viewCurrency)
        toast.success(`You’re now on the ${plan.tier?.name || ''} plan`)
        if (this.blockedModule && this.hasEntitlement(this.blockedModule) && typeof this.$route.query.from === 'string') {
          this.$router.push(this.$route.query.from)
        }
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not change the plan'))
      } finally {
        this.saving = false
      }
    },
    async saveDefaultCurrency() {
      this.savingCurrency = true
      try {
        const plan = await plansAPI.updateMe({ default_currency: this.defaultCurrency })
        this.plan = plan
        applyPlan(plan)
        toast.success(`Default currency set to ${this.defaultCurrency}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the currency'))
      } finally {
        this.savingCurrency = false
      }
    }
  }
}
</script>

<style scoped>
.sk {
  display: inline-block;
  width: 90px;
  height: 24px;
}

.of {
  font-size: 14px;
  color: var(--text-3);
  font-weight: 500;
}

.meta-note {
  margin-left: 6px;
  font-size: 12px;
  color: var(--text-3);
}

.meter {
  height: 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  overflow: hidden;
  margin-top: 4px;
}

.meter span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}

.meter span.warn {
  background: var(--warning);
}

.upsell {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 16px;
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  background: var(--accent-soft);
}

.upsell__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--accent);
  font-size: 18px;
  flex-shrink: 0;
}

.upsell__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.upsell__text span {
  color: var(--text-2);
  font-size: 13.5px;
}

.plan-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cur-plan {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.cur-plan__tier {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cur-plan__tier div {
  display: flex;
  flex-direction: column;
}

.cur-plan__tier strong {
  font-size: 18px;
}

.cur-plan__tier small,
.cur-plan__price small {
  color: var(--text-3);
  font-size: 12.5px;
}

.cur-plan__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.cur-plan__price strong {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.tier-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 16px;
  flex-shrink: 0;
}

.tier-icon.sm {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 12px;
}

.sub-h {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  font-weight: 650;
  margin: 20px 0 8px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 12.5px;
  font-weight: 550;
  color: var(--text);
}

.chip i {
  color: var(--accent);
  font-size: 11px;
}

.chip--core {
  color: var(--text-2);
}

.chip--core i {
  color: var(--text-3);
}

.lines {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.lines td {
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
}

.lines .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  padding-left: 12px;
}

.lines tr.muted td {
  color: var(--text-3);
}

.lines tr.total td {
  border-bottom: 0;
  font-weight: 700;
  font-size: 15px;
  padding-top: 10px;
}

.fx-note {
  margin: 6px 0 0;
}

.bill-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  color: var(--text-2);
  font-size: 13px;
}

.bill-note i {
  color: var(--success);
  margin-top: 2px;
}

.help p {
  margin: 0 0 12px;
  color: var(--text-2);
  font-size: 13.5px;
}

.help .ui-btn {
  margin-right: 6px;
}

.compare-card {
  margin-bottom: 24px;
}

.compare-tools .ui-select {
  width: auto;
  min-width: 96px;
}

.ui-select--sm {
  height: 32px;
  font-size: 13px;
  padding-top: 0;
  padding-bottom: 0;
}

.compare th,
.compare td {
  vertical-align: top;
  min-width: 180px;
}

.compare th:first-child,
.compare td:first-child {
  min-width: 120px;
  color: var(--text-2);
  font-weight: 600;
}

.compare th.current,
.compare td.current {
  background: color-mix(in srgb, var(--accent-soft) 60%, transparent);
}

.cmp-head {
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text);
  font-size: 14px;
}

.cmp-tag {
  display: block;
  margin-top: 4px;
  font-weight: 450;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-3);
  white-space: normal;
}

.cmp-price {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.feat {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
}

.feat li {
  display: flex;
  gap: 7px;
  align-items: baseline;
  color: var(--text-2);
}

.feat i {
  color: var(--success);
  font-size: 11px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

/* Wizard */
.wiz {
  max-width: 1080px;
  width: 100%;
}

.steps {
  display: flex;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.steps button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--text-3);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.steps button:disabled {
  cursor: default;
  opacity: 0.6;
}

.steps__n {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-strong);
  font-size: 11px;
}

.steps li.is-active button {
  color: var(--text);
  background: var(--bg-subtle);
}

.steps li.is-active .steps__n {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.steps li.is-done .steps__n {
  background: var(--success-soft);
  border-color: var(--success);
  color: var(--success);
}

.wiz__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  align-items: start;
  max-height: min(68vh, 720px);
  overflow-y: auto;
}

.wiz__lead {
  margin: 0 0 14px;
  color: var(--text-2);
}

.pick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.pick,
.tier-card,
.mod,
.cycle__opt {
  text-align: left;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: var(--radius);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.pick:hover,
.tier-card:hover,
.mod:hover,
.cycle__opt:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
}

.pick.is-selected,
.tier-card.is-selected,
.mod.is-selected,
.cycle__opt.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.pick {
  display: flex;
  gap: 10px;
  padding: 12px;
  align-items: flex-start;
}

.pick__icon,
.mod__icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  flex-shrink: 0;
}

.pick__body,
.mod__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pick__body strong,
.mod__body strong {
  font-size: 13.5px;
}

.pick__body small,
.mod__body small {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.35;
}

.tier-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tier-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

.tier-card__rec {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 11px;
  font-weight: 650;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 8px;
  border-radius: 999px;
}

.tier-card__name {
  font-size: 17px;
}

.tier-card__price {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.tier-card__price small {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 500;
}

.tier-card__tag {
  color: var(--text-2);
  font-size: 12.5px;
}

.limit {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--info-soft);
  color: var(--text);
  font-size: 13px;
  margin-bottom: 12px;
}

.limit i {
  color: var(--info);
  margin-top: 2px;
}

.limit.full {
  background: var(--warning-soft);
}

.limit.full i {
  color: var(--warning);
}

.mod-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.mod {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}

.mod input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.mod__body {
  flex: 1;
}

.mod__price {
  font-size: 12.5px;
  font-weight: 650;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.mod__price s {
  display: block;
  color: var(--text-3);
  font-weight: 450;
}

.mod__price small {
  color: var(--text-3);
  font-weight: 500;
}

.mod.is-included {
  cursor: default;
  background: var(--bg-subtle);
}

.mod.is-included .mod__price {
  color: var(--success);
}

.mod.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cycle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cycle__opt {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
}

.cycle__opt strong {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cycle__opt small {
  color: var(--text-3);
}

.wiz__summary {
  position: sticky;
  top: 0;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  border-radius: var(--radius);
  padding: 16px;
  font-size: 13px;
}

.wiz__summary h3 {
  margin: 0 0 10px;
  font-size: 14px;
}

.wiz__summary.is-loading .sum-line,
.wiz__summary.is-loading .sum-cycle,
.wiz__summary.is-loading .sum-diff {
  opacity: 0.5;
}

.sum-row,
.sum-line,
.sum-total {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
}

.sum-row span,
.sum-line.muted {
  color: var(--text-3);
}

.sum-line span:last-child {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sum-sep {
  height: 1px;
  background: var(--border);
  margin: 10px 0;
}

.sum-total {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  font-weight: 650;
  align-items: baseline;
}

.sum-total strong {
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  transition: opacity 0.15s;
}

.sum-total strong.loading {
  opacity: 0.5;
}

.sum-cycle {
  text-align: right;
  color: var(--text-3);
  font-size: 12px;
}

.sum-diff {
  margin-top: 8px;
  font-size: 12.5px;
  text-align: right;
  color: var(--text-2);
}

.sum-diff.up {
  color: var(--warning);
}

.sum-diff.down {
  color: var(--success);
}

.sum-alert {
  margin: 0;
  font-size: 12.5px;
}

.sum-note {
  margin: 12px 0 0;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .plan-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .wiz__body {
    grid-template-columns: 1fr;
    max-height: none;
  }
  .wiz__summary {
    position: static;
  }
  .tier-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .upsell {
    flex-direction: column;
    align-items: flex-start;
  }
  .cycle {
    grid-template-columns: 1fr;
  }
  .cur-plan__price {
    align-items: flex-start;
  }
}
</style>
