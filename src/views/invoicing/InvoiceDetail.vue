<template>
  <div class="ui-page">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <router-link :to="listPath">Back to list</router-link></span></div>

    <div v-else-if="!doc" class="ui-card ui-card__body">
      <div class="ui-skeleton" style="width: 30%; height: 22px; margin-bottom: 18px"></div>
      <div class="ui-skeleton" style="height: 420px"></div>
    </div>

    <template v-else>
      <header class="ui-page-head no-print">
        <div>
          <router-link :to="listPath" class="back"><i class="fa-solid fa-arrow-left"></i> {{ isQuote ? 'Quotes' : 'Invoices' }}</router-link>
          <h1 class="title-row">
            {{ doc.number }}
            <StatusBadge :domain="isQuote ? 'quote' : 'invoice'" :status="doc.display_status" :label="statusLabel" />
            <span v-if="doc.is_recurring" class="ui-badge ui-badge--converted"><i class="fa-solid fa-repeat"></i> {{ recurrenceLabel }}</span>
          </h1>
          <p>
            {{ doc.client_name }} · {{ money(doc.total) }}
            <template v-if="!isQuote && doc.display_status === 'overdue'"> · <span class="txt-danger">{{ doc.days_overdue }} days overdue</span></template>
            <template v-else-if="!isQuote && doc.status !== 'paid' && doc.status !== 'void' && doc.status !== 'draft'"> · due {{ rel(doc.due_date) }}</template>
          </p>
        </div>
        <div class="ui-actions">
          <router-link v-if="canEdit" :to="`${listPath}/${doc.id}/edit`" class="ui-btn"><i class="fa-regular fa-pen-to-square"></i> Edit</router-link>
          <button class="ui-btn" :disabled="pdfBusy" data-testid="download-pdf" @click="downloadPdf"><i :class="pdfBusy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-file-pdf'"></i> <span class="hide-sm">Download PDF</span></button>
          <button class="ui-btn ui-btn--icon" title="Print" aria-label="Print" @click="print"><i class="fa-solid fa-print"></i></button>
          <button v-if="primary" class="ui-btn ui-btn--primary" @click="primary.run">
            <i :class="primary.icon"></i> {{ primary.label }}
          </button>
          <div class="more" ref="more">
            <button class="ui-btn ui-btn--icon" @click="moreOpen = !moreOpen" aria-label="More actions" :aria-expanded="moreOpen"><i class="fa-solid fa-ellipsis"></i></button>
            <div v-if="moreOpen" class="more__pop" role="menu">
              <button v-for="a in moreActions" :key="a.label" class="more__item" :class="{ danger: a.danger }" role="menuitem" @click="moreOpen = false; a.run()">
                <i :class="a.icon"></i> {{ a.label }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div v-if="doc.converted_to_id" class="ui-alert no-print banner">
        <i class="fa-solid fa-circle-info"></i>
        <span>This quote was converted to an invoice. <router-link :to="`/invoices/${doc.converted_to_id}`">Open invoice</router-link></span>
      </div>
      <div v-if="doc.converted_from_id" class="ui-alert no-print banner">
        <i class="fa-solid fa-circle-info"></i>
        <span>Created from a quote. <router-link :to="`/quotes/${doc.converted_from_id}`">View original quote</router-link></span>
      </div>

      <div v-if="fxMissing" class="ui-alert ui-alert--danger no-print banner" data-testid="fx-missing">
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>
          <strong>No exchange rate is locked on this {{ isQuote ? 'quote' : 'invoice' }}.</strong>
          It is in {{ doc.currency }} and your home currency is {{ doc.base_currency }}. It can't be sent until a rate is locked.
          <button class="ui-btn ui-btn--sm" :disabled="busy" data-testid="fx-lock" @click="lockRate()">Lock today's rate</button>
        </span>
      </div>

      <div class="layout">
        <div class="doc-col">
          <InvoiceDocument :doc="doc" :business="business" />
        </div>

        <aside class="side-col no-print">
          <ImportedDocCard v-if="doc.source" :doc="doc" />
          <section v-if="!isQuote" class="ui-card">
            <div class="ui-card__head">
              <h2>Payments</h2>
              <button v-if="canPay" class="ui-btn ui-btn--sm" @click="openPayment"><i class="fa-solid fa-plus"></i> Record</button>
            </div>
            <div class="ui-card__body pay-body">
              <div class="progress" :title="`${pct}% paid`">
                <div class="progress__bar" :style="{ width: pct + '%' }"></div>
              </div>
              <div class="pay-sum">
                <span><small>Paid</small><strong>{{ money(doc.amount_paid) }}</strong></span>
                <span class="r"><small>Balance</small><strong :class="{ 'txt-danger': doc.display_status === 'overdue' }">{{ money(doc.balance_due) }}</strong></span>
              </div>
              <ul v-if="doc.payments?.length" class="pay-list" data-testid="payments-list">
                <li v-for="p in doc.payments" :key="p.id" class="pay-item" :data-payment="p.id">
                  <span class="pay-ico"><i class="fa-solid fa-arrow-down"></i></span>
                  <span class="pay-main">
                    <span class="pay-top"><strong>{{ money(p.amount) }}</strong><span v-if="p.receipt_number" class="rcpt-no" data-testid="receipt-number">{{ p.receipt_number }}</span></span>
                    <small>
                      <span v-if="originBadge(p)" class="ui-badge dep-badge" :class="originBadge(p).badge">{{ originBadge(p).label }}</span>
                      <span v-if="p.revised_at" class="ui-badge ui-badge--warning dep-badge" :title="`Edited ${dt(p.revised_at)}`">Revised</span>{{ date(p.date) }} · {{ methodLabel(p.method) }}{{ p.reference ? ' · ' + p.reference : '' }}
                    </small>
                    <small v-if="receiptSent(p)" class="sent-note"><i class="fa-regular fa-envelope"></i> Receipt emailed {{ dt(receiptSent(p).created_at) }}</small>
                  </span>
                  <span class="pay-actions">
                    <button v-if="doc.status !== 'void'" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit payment" aria-label="Edit payment" data-testid="edit-payment" @click="openEditPayment(p)"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Download receipt" aria-label="Download receipt" data-testid="download-receipt" @click="downloadReceipt(p)"><i class="fa-solid fa-receipt"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :title="receiptSent(p) ? 'Resend receipt' : 'Send receipt'" :aria-label="receiptSent(p) ? 'Resend receipt' : 'Send receipt'" data-testid="email-receipt" @click="openSend('receipt', p)"><i class="fa-regular fa-envelope"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Remove payment" aria-label="Remove payment" data-testid="remove-payment" @click="removePayment(p)"><i class="fa-regular fa-trash-can"></i></button>
                  </span>
                </li>
              </ul>
              <p v-else class="muted small">No payments recorded yet.</p>
            </div>
          </section>

          <section v-if="!isQuote" class="ui-card" data-testid="online-payments">
            <div class="ui-card__head">
              <h2>Online payments</h2>
              <span v-if="online.enabled" class="ui-badge" :class="online.mode === 'live' ? 'ui-badge--success' : 'ui-badge--warning'">{{ online.mode === 'live' ? 'Flutterwave' : 'Test mode' }}</span>
            </div>
            <div class="ui-card__body share">
              <template v-if="online.enabled">
                <template v-if="payLink.payable">
                  <div class="link-row">
                    <input class="ui-input" :value="payLink.url" readonly aria-label="Pay link" data-testid="pay-link" @focus="$event.target.select()" />
                    <button class="ui-btn ui-btn--icon" title="Copy pay link" aria-label="Copy pay link" data-testid="copy-pay-link" @click="copyPayLink"><i class="fa-regular fa-copy"></i></button>
                  </div>
                  <p class="muted small">Clients can pay by M-Pesa, mobile money, bank or card — the lowest-fee method is suggested. Emails include a <strong>Pay now</strong> button.</p>
                </template>
                <p v-else class="muted small">{{ payLink.reason || 'Nothing to pay online.' }}</p>
                <ul v-if="online.transactions.length" class="otx" data-testid="online-tx">
                  <li v-for="t in online.transactions" :key="t.id">
                    <StatusBadge domain="payment" :status="t.status" :label="txStatus(t).label" size="sm" />
                    <span class="otx__main">
                      <strong>{{ money(t.charge_amount) }}</strong> · {{ t.method_label }}
                      <small class="muted">{{ dt(t.completed_at || t.created_at) }}<template v-if="t.app_fee > 0"> · fee {{ money(t.app_fee) }}</template><template v-if="t.surcharge > 0"> · incl. surcharge {{ money(t.surcharge) }}</template><template v-if="t.error && t.status !== 'successful'"> · {{ t.error }}</template></small>
                    </span>
                  </li>
                </ul>
              </template>
              <p v-else class="muted small">
                Let clients pay this invoice online (M-Pesa, mobile money, bank or card).
                <router-link to="/settings#payments">Set up Flutterwave</router-link>
              </p>
            </div>
          </section>

          <section v-if="isForeign" class="ui-card" data-testid="fx-card">
            <div class="ui-card__head">
              <h2>Exchange rate</h2>
              <span class="ui-badge" :class="rateSource.badge"><i :class="rateSource.icon"></i> {{ rateSource.label }}</span>
            </div>
            <div class="ui-card__body fx-body">
              <template v-if="doc.exchange_rate > 0">
                <div class="fx-rate tabular" data-testid="fx-rate">{{ fxRateText }}</div>
                <p class="muted small m0">Locked {{ doc.rate_date ? dt(doc.rate_date) : '' }}{{ doc.rate_provider ? ' · ' + doc.rate_provider : '' }}</p>
                <dl class="fx-dl">
                  <div><dt>Total</dt><dd class="tabular">{{ money(doc.total) }}</dd></div>
                  <div><dt>In {{ doc.base_currency }}</dt><dd class="tabular" data-testid="fx-total-base">≈ {{ baseMoney(doc.total_base) }}</dd></div>
                  <div v-if="!isQuote && doc.balance_due > 0 && doc.balance_due !== doc.total"><dt>Balance in {{ doc.base_currency }}</dt><dd class="tabular">≈ {{ baseMoney(doc.balance_due / doc.exchange_rate) }}</dd></div>
                </dl>
                <p v-if="rateStale" class="fx-warn"><i class="fa-solid fa-clock"></i> This rate is more than 24 hours old.</p>
                <p v-if="doc.rate_source === 'fallback'" class="fx-warn"><i class="fa-solid fa-triangle-exclamation"></i> Live rates were unavailable — this is an approximate reference rate.</p>
                <p class="muted small m0">{{ doc.status === 'draft' ? 'Used to convert catalog prices and for reporting. Locked until you update it.' : 'Locked when the document was created — it no longer changes.' }}</p>
                <div v-if="doc.status === 'draft'" class="fx-actions">
                  <button class="ui-btn ui-btn--sm" :disabled="busy" data-testid="fx-update" @click="lockRate()"><i class="fa-solid fa-rotate"></i> Update rate</button>
                </div>
              </template>
              <p v-else class="muted small m0">No rate locked yet.</p>
            </div>
          </section>

          <section class="ui-card">
            <div class="ui-card__head"><h2>Share</h2></div>
            <div class="ui-card__body share">
              <p class="muted small" v-if="doc.status === 'draft'">Send or mark this {{ isQuote ? 'quote' : 'invoice' }} as sent to activate its client link.</p>
              <template v-else>
                <div class="link-row">
                  <input class="ui-input" :value="publicUrl" readonly @focus="$event.target.select()" aria-label="Client link" />
                  <button class="ui-btn ui-btn--icon" title="Copy link" @click="copyLink"><i class="fa-regular fa-copy"></i></button>
                </div>
                <p class="muted small">Anyone with this link can view{{ isQuote ? ' and accept' : '' }} the document online.<span v-if="doc.viewed_at"> Client viewed it {{ dt(doc.viewed_at) }}.</span></p>
              </template>
            </div>
          </section>

          <section class="ui-card" data-testid="activity-card">
            <div class="ui-card__head act-head">
              <div class="ui-tabs act-tabs" role="tablist">
                <button class="ui-tab" :class="{ 'is-active': actTab === 'activity' }" role="tab" @click="actTab = 'activity'">Activity</button>
                <button class="ui-tab" :class="{ 'is-active': actTab === 'emails' }" role="tab" data-testid="emails-tab" @click="actTab = 'emails'; loadEmailLog()">Emails<span v-if="emailLog.length" class="count">{{ emailLog.length }}</span></button>
              </div>
            </div>
            <ul v-if="actTab === 'emails'" class="elog" data-testid="email-log">
              <li v-if="!emailLog.length" class="muted small elog-empty">{{ emailLogLoading ? 'Loading…' : 'No emails yet. Every send, test and failed attempt is recorded here with its checks.' }}</li>
              <li v-for="e in emailLog" :key="e.id" :class="`el-${e.status}`">
                <button class="elog-row" :aria-expanded="openLog === e.id" @click="openLog = openLog === e.id ? null : e.id">
                  <span class="ui-badge" :class="logBadge(e).cls">{{ logBadge(e).label }}</span>
                  <span class="elog-main">
                    <strong>{{ logKind(e) }} → {{ e.to || '—' }}</strong>
                    <small>{{ dt(e.created_at) }}<template v-if="e.amounts && Object.keys(e.amounts).length"> · {{ Object.entries(e.amounts)[0].join(' ') }}</template></small>
                  </span>
                  <i class="fa-solid" :class="openLog === e.id ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
                <div v-if="openLog === e.id" class="elog-detail" data-testid="email-log-detail">
                  <div v-if="e.error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span><strong>{{ e.error_code || 'Error' }}</strong> {{ e.error }}</span></div>
                  <dl>
                    <div><dt>Subject</dt><dd>{{ e.subject }}</dd></div>
                    <div v-if="e.from"><dt>From</dt><dd>{{ e.from }}</dd></div>
                    <div><dt>To</dt><dd>{{ e.to || '—' }}</dd></div>
                    <div v-if="e.cc && e.cc.length"><dt>CC</dt><dd>{{ e.cc.join(', ') }}</dd></div>
                    <div v-if="e.bcc && e.bcc.length"><dt>BCC</dt><dd>{{ e.bcc.join(', ') }}</dd></div>
                    <div v-if="e.attachments && e.attachments.length"><dt>Attached</dt><dd>{{ e.attachments.join(', ') }}</dd></div>
                    <div v-if="e.message_id"><dt>Message-ID</dt><dd class="mono">&lt;{{ e.message_id }}&gt;</dd></div>
                    <div v-if="e.response"><dt>Server</dt><dd>{{ e.response }}<template v-if="e.duration_ms"> · {{ e.duration_ms }} ms</template></dd></div>
                    <div v-if="e.user_email"><dt>By</dt><dd>{{ e.user_email }}</dd></div>
                    <div v-for="(v, k) in e.amounts || {}" :key="k"><dt>{{ k }}</dt><dd class="tabular">{{ v }}</dd></div>
                  </dl>
                  <ul v-if="e.checks && e.checks.length" class="elog-checks">
                    <li v-for="c in sortedChecks(e.checks)" :key="c.id" :class="`c-${c.severity}`"><i :class="checkIcon(c.severity)"></i><span>{{ c.title }}<small v-if="c.detail"> — {{ c.detail }}</small></span></li>
                  </ul>
                </div>
              </li>
            </ul>
            <ul v-else class="timeline">
              <li v-for="a in doc.activities" :key="a.id">
                <span class="dot" :class="`t-${a.type}`"></span>
                <span>
                  <span class="t-msg">{{ a.message }}</span>
                  <span v-if="a.recipients && a.recipients.cc && a.recipients.cc.length" class="t-cc"><i class="fa-regular fa-envelope"></i> {{ a.recipients.cc.length }} CC</span>
                  <small>{{ dt(a.created_at) }}</small>
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </template>

    <!-- Convert quote → invoice (optionally with a deposit already received) -->
    <div v-if="conv.open" class="ui-modal-backdrop" @mousedown.self="conv.open = false">
      <form class="ui-modal" data-testid="convert-modal" @submit.prevent="submitConvert">
        <div class="ui-modal__head">
          <div>
            <h2>Convert to invoice</h2>
            <p class="muted small m0">{{ doc.number }} · {{ money(doc.total) }}</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" @click="conv.open = false" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body grid-form">
          <p class="span muted m0">A new draft invoice is created with this quote's client and lines, and the quote is marked converted.</p>
          <label class="ui-switch span"><input v-model="conv.enabled" type="checkbox" data-testid="convert-deposit-toggle" /> The client has already paid a deposit</label>
          <template v-if="conv.enabled">
            <div class="ui-field">
              <label for="cv_amount">Amount received ({{ doc.currency }})</label>
              <input id="cv_amount" v-model.number="conv.amount" type="number" :step="step" min="0" :max="doc.total" class="ui-input" required />
            </div>
            <div class="ui-field">
              <label for="cv_date">Date received</label>
              <input id="cv_date" v-model="conv.date" type="date" :max="today" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="cv_method">Method</label>
              <select id="cv_method" v-model="conv.method" class="ui-select">
                <option v-for="m in methods" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="cv_ref">Reference</label>
              <input id="cv_ref" v-model.trim="conv.reference" class="ui-input" placeholder="Receipt or transaction number" />
            </div>
          </template>
          <div v-if="conv.error" class="ui-alert ui-alert--danger span"><i class="fa-solid fa-circle-exclamation"></i><span>{{ conv.error }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="conv.open = false">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy"><i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-file-invoice-dollar'"></i> Create invoice</button>
        </div>
      </form>
    </div>

    <!-- Record / edit a payment -->
    <div v-if="payOpen" class="ui-modal-backdrop" @mousedown.self="closePay">
      <form class="ui-modal pay-modal" data-testid="payment-modal" @submit.prevent="submitPayment">
        <div class="ui-modal__head">
          <div>
            <h2>{{ payEdit ? (payEdit.is_deposit ? 'Edit deposit' : 'Edit payment') : 'Record payment' }}</h2>
            <p class="muted small m0">
              {{ doc.number }}<template v-if="payEdit && payEdit.receipt_number"> · receipt {{ payEdit.receipt_number }}</template> · {{ payEdit ? `paid ${money(doc.amount_paid)} of ${money(doc.total)}` : `balance ${money(doc.balance_due)}` }}
            </p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" @click="closePay" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body grid-form">
          <div v-if="payLocked" class="ui-alert ui-alert--warning span" data-testid="payment-locked"><i class="fa-solid fa-lock"></i><span>{{ payEdit.lock_reason }}</span></div>
          <div class="ui-field">
            <label for="p_amount">Amount received ({{ doc.currency }})</label>
            <input id="p_amount" ref="payAmount" v-model.number="pay.amount" type="number" :step="step" min="0" inputmode="decimal" class="ui-input r tabular" :class="{ 'is-invalid': payTouched && amountError }" :disabled="payLocked" required />
            <div v-if="!payLocked" class="chips">
              <button type="button" class="chip" @click="pay.amount = payMax">{{ payEdit ? 'Up to the total' : 'Full balance' }}</button>
              <button v-if="!payEdit" type="button" class="chip" @click="pay.amount = half">50%</button>
            </div>
            <span v-if="payTouched && amountError" class="field-error" data-testid="amount-error">{{ amountError }}</span>
            <span v-else class="ui-hint" data-testid="amount-hint">{{ amountHint }}</span>
          </div>
          <div class="ui-field">
            <label for="p_date">Date received</label>
            <input id="p_date" v-model="pay.date" type="date" :max="today" class="ui-input" :disabled="payLocked" required />
          </div>
          <div class="ui-field">
            <label for="p_method">Method</label>
            <select id="p_method" v-model="pay.method" class="ui-select" :disabled="payLocked">
              <option v-if="payLocked" :value="pay.method">{{ methodLabel(pay.method) }}</option>
              <option v-for="m in methods" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label for="p_ref">Reference</label>
            <input id="p_ref" v-model.trim="pay.reference" class="ui-input" maxlength="255" :placeholder="pay.method === 'mobile_money' ? 'e.g. M-Pesa code QK12AB34CD' : 'Transaction ID, cheque no…'" />
          </div>
          <div class="ui-field span">
            <label for="p_notes">Notes <span class="muted">(shown on the receipt)</span></label>
            <textarea id="p_notes" v-model="pay.notes" class="ui-textarea" rows="2" maxlength="4000"></textarea>
          </div>
          <div v-if="payEdit" class="ui-field span">
            <label for="p_reason">Reason for the change <span class="muted">(optional, kept in the activity log)</span></label>
            <input id="p_reason" v-model.trim="pay.reason" class="ui-input" maxlength="500" placeholder="e.g. Client sent 7,500, not 5,000" data-testid="edit-reason" />
          </div>
          <div class="span rcpt-opt">
            <label class="ui-switch" :class="{ 'is-disabled': !emailEnabled }">
              <input v-model="pay.email" type="checkbox" :disabled="!emailEnabled" data-testid="email-receipt-toggle" />
              {{ payEdit ? 'Email revised receipt' : 'Email receipt to client' }}
            </label>
            <span class="ui-hint">
              <template v-if="!emailEnabled">Email sending isn’t set up — <router-link to="/settings#email">connect an email account</router-link> to email receipts. You can still download the receipt PDF.</template>
              <template v-else-if="!payRecipient">No client email on this invoice — add one to email the receipt.</template>
              <template v-else-if="pay.email">The receipt PDF{{ payEdit && payEdit.receipt_number ? ` (${payEdit.receipt_number})` : '' }} is emailed to <strong>{{ payRecipient }}</strong> and anyone copied on receipts.</template>
              <template v-else>You can send the receipt later from the payments list.</template>
            </span>
            <label v-if="pay.email && emailEnabled" class="ui-switch review-first"><input v-model="pay.review" type="checkbox" data-testid="review-first" /> Let me review the email first</label>
          </div>
          <div v-if="payError" class="ui-alert ui-alert--danger span" data-testid="payment-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ payError }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="closePay">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--success" :disabled="busy" data-testid="payment-submit">
            <i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ payEdit ? 'Save changes' : 'Record payment' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Send: compose → pre-send checks + exact preview → send -->
    <SendDialog
      v-if="sendOpen"
      :doc="doc"
      :kind="sendKind"
      :payment="sendPayment"
      :email-enabled="emailEnabled"
      :sender="sender"
      :online-enabled="online.enabled"
      @close="sendOpen = false"
      @sent="onSent"
      @marked="onMarked"
      @logged="loadEmailLog"
    />
  </div>
</template>

<script>
import InvoiceDocument from '@/components/invoicing/InvoiceDocument.vue'
import { invoicingApi, STATUS_LABELS, PAYMENT_METHODS, PAYMENT_ORIGINS, RECURRENCE } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatDate, formatDateTime, relativeDays, isoDate, downloadBlob } from '@/utils/format'
import { formatCurrency, currencyStep, currencyDecimals, rateText } from '@/utils/currencies'
import SendDialog from '@/components/invoicing/SendDialog.vue'
import { RATE_SOURCES } from '@/services/invoicing'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { useBranding } from '@/composables/useBranding'
import { paymentsApi, TX_STATUS } from '@/services/payments'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ImportedDocCard from '@/components/imports/ImportedDocCard.vue'

export default {
  name: 'InvoiceDetail',
  components: { InvoiceDocument, SendDialog, StatusBadge, ImportedDocCard },
  props: { id: { type: String, required: true } },
  setup() {
    return { branding: useBranding().branding }
  },
  data() {
    return {
      doc: null,
      settings: {},
      emailEnabled: false,
      error: null,
      busy: false,
      moreOpen: false,
      payOpen: false,
      pay: {},
      payEdit: null,
      payTouched: false,
      payRecipient: '',
      payError: null,
      sendOpen: false,
      sendKind: 'invoice',
      sendPayment: null,
      sender: null,
      actTab: 'activity',
      emailLog: [],
      emailLogLoading: false,
      openLog: null,
      methods: PAYMENT_METHODS,
      pdfBusy: false,
      online: { enabled: false, mode: 'test', transactions: [] },
      payLink: { payable: false, url: '', reason: '' },
      conv: { open: false, enabled: false, amount: '', date: '', method: 'bank_transfer', reference: '', error: '' },
      today: isoDate()
    }
  },
  computed: {
    // Business block: invoice settings + the company logo (Settings → Business details).
    business() {
      const s = this.settings || {}
      const b = this.branding
      return {
        ...s,
        business_name: s.business_name || b.orgName || '',
        logo_url: b.loaded ? b.logoUrl : s.logo_url || ''
      }
    },
    isQuote() {
      return this.doc?.doc_type === 'quote'
    },
    listPath() {
      return this.isQuote || this.$route.path.startsWith('/quotes') ? '/quotes' : '/invoices'
    },
    statusLabel() {
      return STATUS_LABELS[this.doc.display_status] || this.doc.display_status
    },
    recurrenceLabel() {
      return RECURRENCE.find((r) => r.value === this.doc.recurrence_interval)?.label || 'Recurring'
    },
    canEdit() {
      return !['void', 'converted'].includes(this.doc.status)
    },
    canPay() {
      return !this.isQuote && ['sent', 'partial', 'draft'].includes(this.doc.status) && this.doc.balance_due > 0
    },
    pct() {
      if (!this.doc.total) return 0
      return Math.min(100, Math.round((this.doc.amount_paid / this.doc.total) * 100))
    },
    step() {
      return currencyStep(this.doc?.currency)
    },
    half() {
      const p = 10 ** currencyDecimals(this.doc.currency)
      return Math.round((this.doc.balance_due / 2) * p) / p
    },
    payLocked() {
      return !!(this.payEdit && this.payEdit.lock_reason)
    },
    decimals() {
      return currencyDecimals(this.doc.currency)
    },
    // The most this payment can be: the balance (record), or the balance plus
    // what the payment already counts for (edit). Overpayments are blocked.
    payMax() {
      const p = 10 ** this.decimals
      const base = this.payEdit ? this.doc.balance_due + this.payEdit.amount : this.doc.balance_due
      return Math.round(Math.max(0, base) * p) / p
    },
    amountError() {
      if (this.payLocked) return ''
      const a = Number(this.pay.amount)
      const d = this.decimals
      if (this.pay.amount === '' || this.pay.amount === null || !(a > 0)) return 'Enter an amount greater than zero.'
      if (Math.abs(Math.round(a * 10 ** d) - a * 10 ** d) > 1e-6) return d === 0 ? `${this.doc.currency} amounts can't have decimals.` : `${this.doc.currency} amounts can have at most ${d} decimal places.`
      if (a > this.payMax + 0.4 / 10 ** d) {
        return this.payEdit
          ? `Payments can't add up to more than the invoice total (${this.money(this.doc.total)}). The most this payment can be is ${this.money(this.payMax)}.`
          : `That’s more than the balance due (${this.money(this.doc.balance_due)}). Overpayments aren’t recorded — enter at most ${this.money(this.payMax)}.`
      }
      return ''
    },
    amountHint() {
      const a = Number(this.pay.amount) || 0
      if (this.payLocked) return 'Mirrors the processor / import record.'
      const after = Math.round((this.payMax - a) * 10 ** this.decimals) / 10 ** this.decimals
      if (a <= 0) return `Any amount up to ${this.money(this.payMax)} — part payments are fine.`
      if (after <= 0) return 'The invoice will be paid in full.'
      return `Part payment — ${this.money(after)} will still be due.`
    },
    canRemind() {
      return !this.isQuote && ['sent', 'partial'].includes(this.doc.status) && this.doc.balance_due > 0
    },
    isForeign() {
      return !!this.doc.base_currency && this.doc.currency !== this.doc.base_currency
    },
    fxMissing() {
      return this.isForeign && !(this.doc.exchange_rate > 0) && !['void', 'converted'].includes(this.doc.status)
    },
    rateSource() {
      return RATE_SOURCES[this.doc.rate_source] || RATE_SOURCES.missing
    },
    fxRateText() {
      return rateText(this.doc.base_currency, this.doc.currency, this.doc.exchange_rate)
    },
    rateStale() {
      return this.doc.status === 'draft' && this.doc.rate_source === 'live' && this.doc.rate_date && Date.now() - new Date(this.doc.rate_date).getTime() > 86400000
    },
    publicUrl() {
      return `${window.location.origin}/i/${this.doc.public_token}`
    },
    primary() {
      const d = this.doc
      if (d.status === 'draft') return { label: 'Send', icon: 'fa-solid fa-paper-plane', run: () => this.openSend() }
      if (!this.isQuote && this.canPay) return { label: 'Record payment', icon: 'fa-solid fa-hand-holding-dollar', run: this.openPayment }
      if (this.isQuote && ['sent', 'accepted'].includes(d.status)) return { label: 'Convert to invoice', icon: 'fa-solid fa-file-invoice-dollar', run: this.convert }
      return null
    },
    moreActions() {
      const d = this.doc
      const a = []
      if (this.canRemind) a.push({ label: 'Send payment reminder', icon: 'fa-regular fa-bell', run: () => this.openSend('reminder') })
      if (d.status !== 'draft' && d.status !== 'void' && d.status !== 'converted') a.push({ label: 'Resend', icon: 'fa-solid fa-paper-plane', run: () => this.openSend() })
      if (d.status === 'draft') a.push({ label: 'Mark as sent', icon: 'fa-solid fa-check', run: this.markSentOnly })
      if (this.isQuote && d.status === 'sent') {
        a.push({ label: 'Mark accepted', icon: 'fa-solid fa-thumbs-up', run: () => this.simple('accept', 'Quote marked as accepted') })
        a.push({ label: 'Mark declined', icon: 'fa-solid fa-thumbs-down', run: () => this.simple('decline', 'Quote marked as declined') })
      }
      if (this.isQuote && d.status === 'draft') a.push({ label: 'Convert to invoice', icon: 'fa-solid fa-file-invoice-dollar', run: this.convert })
      if (d.status !== 'draft') a.push({ label: 'Copy client link', icon: 'fa-regular fa-copy', run: this.copyLink })
      if (this.payLink.payable) a.push({ label: 'Copy pay link', icon: 'fa-solid fa-credit-card', run: this.copyPayLink })
      a.push({ label: 'Duplicate', icon: 'fa-regular fa-clone', run: this.duplicate })
      if (d.status !== 'draft') a.push({ label: 'Reset client link', icon: 'fa-solid fa-link-slash', run: this.resetLink })
      if (d.status !== 'void' && d.amount_paid <= 0 && d.status !== 'converted') a.push({ label: 'Void', icon: 'fa-solid fa-ban', run: this.voidDoc, danger: true })
      if (d.status === 'draft' || d.status === 'void' || this.isQuote) a.push({ label: 'Delete', icon: 'fa-regular fa-trash-can', run: this.remove, danger: true })
      return a
    }
  },
  watch: {
    id() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  mounted() {
    document.addEventListener('click', this.onDocClick)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick)
  },
  methods: {
    money(v) {
      return formatCurrency(v, this.doc?.currency)
    },
    date: formatDate,
    dt: formatDateTime,
    rel: relativeDays,
    methodLabel(m) {
      return PAYMENT_METHODS.find((x) => x.value === m)?.label || m
    },
    onDocClick(e) {
      if (this.moreOpen && !this.$refs.more?.contains(e.target)) this.moreOpen = false
    },
    async load() {
      this.error = null
      try {
        const [inv, s] = await Promise.all([invoicingApi.get(this.id), invoicingApi.getSettings()])
        this.doc = inv
        this.settings = s?.settings || {}
        this.emailEnabled = !!s?.email_enabled
        this.sender = s?.sender || null
        this.loadOnline()
        this.loadEmailLog()
        const expected = inv.doc_type === 'quote' ? '/quotes' : '/invoices'
        if (!this.$route.path.startsWith(expected)) this.$router.replace(`${expected}/${inv.id}`)
        if (this.$route.query.send === '1') {
          this.$router.replace({ query: {} })
          this.openSend()
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load this document')
      }
    },
    txStatus(t) {
      return TX_STATUS[t.status] || { label: t.status, badge: 'ui-badge--draft' }
    },
    async loadOnline() {
      if (!this.doc || this.doc.doc_type === 'quote') return
      try {
        const [o, l] = await Promise.all([paymentsApi.invoiceTransactions(this.doc.id), invoicingApi.payLink(this.doc.id)])
        this.online = { enabled: !!o.enabled, mode: o.mode, transactions: o.transactions || [] }
        this.payLink = l || { payable: false }
      } catch {
        this.online = { enabled: false, mode: 'test', transactions: [] }
      }
    },
    async copyPayLink() {
      try {
        await navigator.clipboard.writeText(this.payLink.url)
        toast.success('Pay link copied')
      } catch {
        toast.info(this.payLink.url, { duration: 8000, title: 'Copy this link' })
      }
    },
    async downloadPdf() {
      this.pdfBusy = true
      try {
        const blob = await invoicingApi.pdf(this.doc.id)
        downloadBlob(blob, `${this.doc.number}.pdf`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create the PDF'))
      } finally {
        this.pdfBusy = false
      }
    },
    async downloadReceipt(p) {
      try {
        const blob = await invoicingApi.receipt(this.doc.id, p.id)
        downloadBlob(blob, p.receipt_number ? `${p.receipt_number}.pdf` : `Receipt-${this.doc.number}.pdf`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create the receipt'))
      }
    },
    async run(fn, successMsg) {
      if (this.busy) return null
      this.busy = true
      try {
        const res = await fn()
        if (successMsg) toast.success(successMsg)
        return res
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Action failed'))
        return null
      } finally {
        this.busy = false
      }
    },
    async simple(action, msg) {
      const res = await this.run(() => invoicingApi[action](this.doc.id), msg)
      if (res) this.doc = res
    },
    originBadge(p) {
      return PAYMENT_ORIGINS[p.origin] || null
    },
    receiptSent(p) {
      return this.emailLog.find((e) => e.kind === 'receipt' && e.payment_id === p.id && e.status === 'sent' && e.mode === 'email') || null
    },
    async loadRecipient() {
      this.payRecipient = this.doc.client_email || ''
      try {
        const r = await invoicingApi.recipients(this.doc.id, 'receipt')
        this.payRecipient = r?.to?.email || this.payRecipient
        if (typeof r?.email_enabled === 'boolean') this.emailEnabled = r.email_enabled
      } catch {
        /* the client email on the invoice is used */
      }
      return this.payRecipient
    },
    async openPayment() {
      this.payEdit = null
      this.payTouched = false
      this.pay = { amount: this.doc.balance_due, date: isoDate(), method: 'bank_transfer', reference: '', notes: '', reason: '', email: false, review: false }
      this.payError = null
      this.payOpen = true
      this.$nextTick(() => this.$refs.payAmount?.select())
      const to = await this.loadRecipient()
      // On by default when the client has an email and a sender is set up.
      if (this.payOpen && !this.payEdit) this.pay.email = !!(to && this.emailEnabled)
    },
    openEditPayment(p) {
      this.payEdit = p
      this.payTouched = false
      this.pay = { amount: p.amount, date: (p.date || '').slice(0, 10), method: p.method, reference: p.reference || '', notes: p.notes || '', reason: '', email: false, review: false }
      this.payError = null
      this.payOpen = true
      this.loadRecipient()
      this.$nextTick(() => this.$refs.payAmount?.focus())
    },
    closePay() {
      if (!this.busy) this.payOpen = false
    },
    async submitPayment() {
      this.payError = null
      this.payTouched = true
      if (this.amountError) return
      if (!this.pay.date) return (this.payError = 'Choose the date the money was received.')
      if (this.pay.date > this.today) return (this.payError = "The payment date can't be in the future.")
      const amt = Number(this.pay.amount)
      const wantEmail = this.pay.email && this.emailEnabled
      const review = wantEmail && this.pay.review
      const autoEmail = wantEmail && !review
      this.busy = true
      try {
        let paymentId
        let rec = null
        if (this.payEdit) {
          paymentId = this.payEdit.id
          const body = { reference: this.pay.reference, notes: this.pay.notes, reason: this.pay.reason, email_receipt: autoEmail }
          if (!this.payLocked) Object.assign(body, { amount: amt, date: this.pay.date, method: this.pay.method })
          const res = await invoicingApi.updatePayment(this.doc.id, paymentId, body)
          this.doc = res.invoice
          rec = res.receipt_email || null
          if (!res.changed && !autoEmail && !review) toast.info('Nothing changed')
          else toast.success(this.doc.status === 'paid' ? `Payment updated — ${this.doc.number} is paid in full` : `Payment updated — balance ${this.money(this.doc.balance_due)}`)
        } else {
          const res = await invoicingApi.addPayment(this.doc.id, { amount: amt, date: this.pay.date, method: this.pay.method, reference: this.pay.reference, notes: this.pay.notes, email_receipt: autoEmail })
          rec = res.receipt_email || null
          paymentId = res.last_payment_id
          this.doc = res
          toast.success(this.doc.status === 'paid' ? `${this.doc.number} is fully paid` : `Payment recorded — balance ${this.money(this.doc.balance_due)}`)
        }
        if (rec) {
          if (rec.emailed) toast.success(`Receipt emailed to ${rec.to}${rec.cc?.length ? ` (CC ${rec.cc.length})` : ''} with ${rec.attachment}`)
          else toast.warning(`The receipt wasn’t emailed: ${rec.reason || 'unknown problem'}. Use “Send receipt” to try again.`, { duration: 9000 })
        }
        this.payOpen = false
        this.loadOnline()
        await this.loadEmailLog()
        if (review && paymentId) {
          const p = this.doc.payments.find((x) => x.id === paymentId)
          if (p) this.openSend('receipt', p)
        }
      } catch (e) {
        this.payError = apiErrorMessage(e, this.payEdit ? 'Could not update the payment' : 'Could not record the payment')
      } finally {
        this.busy = false
      }
    },
    async removePayment(p) {
      const online = p.origin === 'online'
      const what = `${this.money(p.amount)} ${p.is_deposit ? 'deposit' : 'payment'}${p.receipt_number ? ` (receipt ${p.receipt_number})` : ''} from ${this.date(p.date)}`
      const message = online
        ? `This ${what} was paid online through Flutterwave. Removing it here does not refund the client — refund it in your Flutterwave dashboard if needed. The balance will be updated and the receipt marked cancelled.`
        : `Remove the ${what}? The balance will be updated and the receipt marked cancelled.`
      const ok = await confirmDialog({ title: online ? 'Remove an online payment?' : 'Remove payment?', message, confirmText: 'Remove', danger: true })
      if (!ok) return
      const res = await this.run(() => invoicingApi.deletePayment(this.doc.id, p.id), 'Payment removed')
      if (res) this.doc = res
    },
    baseMoney(v) {
      return formatCurrency(v, this.doc.base_currency)
    },
    openSend(kind = 'invoice', payment = null) {
      this.sendKind = kind === 'reminder' && this.canRemind ? 'reminder' : kind === 'receipt' && payment ? 'receipt' : 'invoice'
      this.sendPayment = kind === 'receipt' ? payment : null
      this.sendOpen = true
    },
    onSent(res) {
      if (res?.invoice) this.doc = res.invoice
      this.sendOpen = false
      this.loadOnline()
      this.loadEmailLog()
    },
    onMarked(doc) {
      if (doc) this.doc = doc
      this.sendOpen = false
    },
    async loadEmailLog() {
      if (!this.doc) return
      this.emailLogLoading = true
      try {
        const r = await invoicingApi.emailLog(this.doc.id)
        this.emailLog = r?.log || []
      } catch {
        this.emailLog = []
      } finally {
        this.emailLogLoading = false
      }
    },
    logBadge(e) {
      if (e.status === 'sent' && e.mode === 'test') return { label: 'Test', cls: 'ui-badge--info' }
      return (
        {
          sent: { label: 'Sent', cls: 'ui-badge--success' },
          failed: { label: 'Failed', cls: 'ui-badge--danger' },
          blocked: { label: 'Blocked', cls: 'ui-badge--warning' },
          recorded: { label: 'Email app', cls: 'ui-badge--draft' }
        }[e.status] || { label: e.status, cls: 'ui-badge--draft' }
      )
    },
    logKind(e) {
      return { invoice: 'Invoice', quote: 'Quote', reminder: 'Reminder', receipt: 'Receipt' }[e.kind] || 'Email'
    },
    checkIcon(sev) {
      return { error: 'fa-solid fa-circle-xmark', warning: 'fa-solid fa-triangle-exclamation', info: 'fa-solid fa-circle-info', ok: 'fa-solid fa-circle-check' }[sev]
    },
    sortedChecks(list) {
      const order = { error: 0, warning: 1, info: 2, ok: 3 }
      return [...list].sort((a, b) => order[a.severity] - order[b.severity])
    },
    async lockRate() {
      const res = await this.run(() => invoicingApi.lockRate(this.doc.id), 'Exchange rate updated')
      if (res) this.doc = res
    },
    async markSentOnly() {
      const res = await this.run(() => invoicingApi.markSent(this.doc.id), 'Marked as sent')
      if (res) {
        this.doc = res
        this.sendOpen = false
      }
    },
    convert() {
      this.conv = { open: true, enabled: false, amount: '', date: isoDate(), method: 'bank_transfer', reference: '', error: '' }
    },
    async submitConvert() {
      const c = this.conv
      c.error = ''
      let body
      if (c.enabled) {
        const a = Number(c.amount)
        const d = currencyDecimals(this.doc.currency)
        if (!(a > 0)) return (c.error = 'Enter the deposit amount.')
        if (Math.abs(Math.round(a * 10 ** d) - a * 10 ** d) > 1e-6) return (c.error = d === 0 ? `${this.doc.currency} amounts can't have decimals.` : `At most ${d} decimal places.`)
        if (a > this.doc.total + 0.004) return (c.error = `The deposit can't be more than the total (${this.money(this.doc.total)}).`)
        body = { deposit: { amount: a, date: c.date || isoDate(), method: c.method, reference: c.reference } }
      }
      this.busy = true
      try {
        const res = await invoicingApi.convert(this.doc.id, body)
        toast.success(c.enabled ? `Invoice ${res.number} created — deposit recorded` : `Invoice ${res.number} created from quote`)
        this.conv.open = false
        this.$router.push(`/invoices/${res.id}`)
      } catch (e) {
        c.error = apiErrorMessage(e, 'Could not convert the quote')
      } finally {
        this.busy = false
      }
    },
    async duplicate() {
      const res = await this.run(() => invoicingApi.duplicate(this.doc.id), 'Duplicated as a new draft')
      if (res) this.$router.push(`${res.doc_type === 'quote' ? '/quotes' : '/invoices'}/${res.id}/edit`)
    },
    async voidDoc() {
      const ok = await confirmDialog({ title: `Void ${this.doc.number}?`, message: 'The document stays on record but can no longer be paid or edited. This cannot be undone.', confirmText: 'Void', danger: true })
      if (!ok) return
      await this.simple('void', `${this.doc.number} voided`)
    },
    async remove() {
      const ok = await confirmDialog({ title: `Delete ${this.doc.number}?`, message: 'This permanently deletes the document and its history.', confirmText: 'Delete', danger: true })
      if (!ok) return
      const res = await this.run(() => invoicingApi.remove(this.doc.id), `${this.doc.number} deleted`)
      if (res) this.$router.push(this.listPath)
    },
    async resetLink() {
      const ok = await confirmDialog({ title: 'Reset client link?', message: 'The current link will stop working. You’ll need to share the new one.', confirmText: 'Reset link' })
      if (!ok) return
      await this.simple('regenerateLink', 'New client link generated')
    },
    async copyLink() {
      try {
        await navigator.clipboard.writeText(this.publicUrl)
        toast.success('Link copied')
      } catch {
        toast.info(this.publicUrl, { duration: 8000, title: 'Copy this link' })
      }
    },
    print() {
      window.print()
    }
  }
}
</script>

<style scoped>
.tabular {
  font-variant-numeric: tabular-nums;
}
.fx-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fx-rate {
  font-size: 17px;
  font-weight: 700;
}
.fx-dl {
  margin: 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.fx-dl div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.fx-dl dt {
  color: var(--text-3);
}
.fx-dl dd {
  margin: 0;
  font-weight: 600;
}
.fx-warn {
  margin: 0;
  font-size: 12.5px;
  color: var(--warning);
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.fx-actions {
  display: flex;
  gap: 8px;
}
.banner .ui-btn {
  margin-left: 8px;
}
.act-head {
  padding-bottom: 0;
}
.act-tabs {
  border-bottom: 0;
}
.count {
  margin-left: 6px;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-2);
}
.elog {
  list-style: none;
  margin: 0;
  padding: 6px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.elog-empty {
  padding: 8px 6px;
}
.elog-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border: 0;
  background: none;
  color: var(--text);
  text-align: left;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.elog-row:hover {
  background: var(--surface-hover);
}
.elog-row > i {
  color: var(--text-3);
  font-size: 11px;
}
.elog-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.elog-main strong {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.elog-main small {
  color: var(--text-3);
  font-size: 12px;
}
.elog-detail {
  margin: 2px 6px 8px;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-size: 12.5px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.elog-detail dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.elog-detail dl div {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 8px;
}
.elog-detail dt {
  color: var(--text-3);
}
.elog-detail dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
}
.elog-checks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.elog-checks li {
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.elog-checks small {
  color: var(--text-2);
}
.c-error i {
  color: var(--danger);
}
.c-warning i {
  color: var(--warning);
}
.c-info i {
  color: var(--info);
}
.c-ok i {
  color: var(--success);
}
.t-rate {
  background: var(--info);
}
.t-receipt_sent,
.t-reminder {
  background: var(--info);
}
.dep-badge {
  margin-right: 6px;
  font-size: 10.5px;
  padding: 1px 6px;
  vertical-align: 1px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 550;
  color: var(--text-3);
  margin-bottom: 6px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-variant-numeric: tabular-nums;
}

.txt-danger {
  color: var(--danger);
}

.muted {
  color: var(--text-3);
}

.small {
  font-size: 12.5px;
}

.m0 {
  margin: 2px 0 0;
}

.r {
  text-align: right;
}

.banner {
  margin-bottom: 16px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
  align-items: start;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.more {
  position: relative;
}

.more__pop {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 40;
  min-width: 210px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
}

.more__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  font: inherit;
  font-size: 13.5px;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.more__item i {
  width: 16px;
  color: var(--text-3);
}

.more__item:hover {
  background: var(--surface-hover);
}

.more__item.danger,
.more__item.danger i {
  color: var(--danger);
}

.pay-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.progress {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
}

.progress__bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--success), #3ccf7e);
  transition: width 0.4s var(--ease);
}

.pay-sum {
  display: flex;
  justify-content: space-between;
}

.pay-sum small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.pay-sum strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

.pay-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 4px;
}

.pay-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--border);
}

.pay-ico {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--success-soft);
  color: var(--success);
  font-size: 12px;
}

.pay-main {
  flex: 1;
  min-width: 0;
}

.pay-main small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.pay-main strong {
  font-variant-numeric: tabular-nums;
}

.rcpt-no {
  white-space: nowrap;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-2);
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  vertical-align: 1px;
}

.sent-note {
  margin-top: 2px;
}

.pay-list li.pay-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: start;
  column-gap: 10px;
  row-gap: 4px;
}

.pay-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.pay-actions {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: -6px;
}

.pay-modal {
  max-width: 620px;
}

.rcpt-opt {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.rcpt-opt .ui-hint {
  margin: 0;
}

.review-first {
  font-size: 13px;
}

.is-disabled {
  opacity: 0.6;
}

.field-error {
  font-size: 12.5px;
  color: var(--danger);
}

.otx {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.otx li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
}

.otx__main {
  display: grid;
  min-width: 0;
  overflow-wrap: anywhere;
}

.attach-note {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 12.5px;
}

.share {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.share p {
  margin: 0;
}

.link-row {
  display: flex;
  gap: 6px;
}

.link-row .ui-input {
  font-size: 12.5px;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 14px 20px 18px;
  display: grid;
  gap: 14px;
  max-height: 360px;
  overflow: auto;
}

.timeline li {
  display: flex;
  gap: 12px;
  font-size: 13.5px;
}

.timeline small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: var(--border-strong);
  box-shadow: 0 0 0 3px var(--surface-2);
}

.t-created { background: var(--accent); }
.t-sent { background: var(--info); }
.t-payment, .t-accepted { background: var(--success); }
.t-voided, .t-payment_removed, .t-declined { background: var(--danger); }
.t-viewed { background: var(--warning); }
.t-online_payment { background: var(--success); }
.t-online_payment_failed { background: var(--danger); }

.wide {
  max-width: 620px;
}

.grid-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.sending-from {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-2);
  overflow-wrap: anywhere;
}

.sending-from strong {
  color: var(--text);
}

.smtp-note {
  margin: 0;
  font-size: 13px;
}

.t-cc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  font-size: 11.5px;
  color: var(--text-3);
}

.grid-form .span {
  grid-column: 1 / -1;
}

.chips {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 12px;
  padding: 2px 9px;
  border-radius: 999px;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .grid-form {
    grid-template-columns: 1fr;
  }
}

@media print {
  .no-print {
    display: none !important;
  }
  .layout {
    display: block;
  }
}
</style>
