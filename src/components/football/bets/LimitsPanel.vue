<template>
  <section id="limits" class="fb-panel fblim" data-test="fb-limits">
    <div class="fb-panel__head">
      <div>
        <h2>Limits &amp; breaks</h2>
        <p>Your own stake and loss limits. Over a limit, or on a break, new bets can't be recorded here.</p>
      </div>
      <span v-if="v && v.on_break" class="fb-pill fb-pill--bad" data-test="fb-on-break"><i class="fa-solid fa-mug-hot"></i> On a break until {{ fmtDateTime(v.cool_off_until, tz) }}</span>
    </div>
    <div class="fb-panel__body">
      <div v-if="!v" class="ui-skeleton" style="height: 160px"></div>
      <template v-else>
        <div class="fb-scroll">
          <table class="fb-table fb-table--nowrap fblim__t">
            <thead>
              <tr>
                <th>Limit</th>
                <th class="num">Used</th>
                <th>Your limit ({{ v.currency }})</th>
                <th class="fblim__meter-h">Left</th>
                <th>Resets</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in v.limits" :key="l.key" :data-limit="l.key">
                <td>{{ l.label }}</td>
                <td class="num">{{ money(l.used, v.currency) }}</td>
                <td>
                  <input v-model="draft[l.key]" class="ui-input fblim__in" inputmode="decimal" placeholder="No limit" :aria-label="l.label + ' limit'" :data-test="'fb-limit-' + l.key" />
                  <div v-if="l.pending != null" class="fb-small fblim__pending" :data-test="'fb-pending-' + l.key">
                    <i class="fa-regular fa-clock"></i>
                    {{ l.pending === -1 ? 'No limit' : money(l.pending, v.currency) }} from {{ fmtDateTime(v.pending_from, tz) }} (24-hour wait)
                  </div>
                </td>
                <td class="fblim__meter-c">
                  <template v-if="l.limit != null">
                    <span class="fblim__meter" role="meter" :aria-valuenow="l.used" aria-valuemin="0" :aria-valuemax="l.limit" :aria-label="`${l.label}: ${money(l.used, v.currency)} of ${money(l.limit, v.currency)} used`">
                      <i :style="{ width: Math.min(100, (l.used / l.limit) * 100) + '%' }" :class="l.used / l.limit >= 0.9 ? 'is-high' : l.used / l.limit >= 0.6 ? 'is-mid' : ''"></i>
                    </span>
                    <span class="fb-small fb-num">{{ money(l.left, v.currency) }}</span>
                  </template>
                  <span v-else class="fb-muted fb-small">no limit</span>
                </td>
                <td class="fb-small fb-muted">{{ fmtDay(l.resets_at, tz, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="fblim__actions">
          <button type="button" class="ui-btn ui-btn--primary" :disabled="saving || !dirty" data-test="fb-limits-save" @click="save"><i class="fa-solid fa-check"></i> Save limits</button>
          <span class="fb-small fb-muted">Lowering a limit works at once. Raising or removing one waits 24 hours, so a decision made in the heat of the moment can't undo it.</span>
        </div>

        <div class="fblim__break">
          <div>
            <strong>Take a break</strong>
            <p class="fb-muted fb-small" style="margin: 2px 0 0">No new bets can be recorded until it ends. A break can't be shortened or cancelled once started — that's the point.</p>
          </div>
          <div class="fblim__breakbtns">
            <button v-for="d in [1, 7, 30]" :key="d" type="button" class="ui-btn" :disabled="breaking" :data-test="'fb-break-' + d" @click="takeBreak(d)">{{ d === 1 ? '24 hours' : d + ' days' }}</button>
          </div>
        </div>
        <p v-if="v.note" class="fb-small fblim__pending" style="margin: 10px 0 0">{{ v.note }}</p>
        <p class="fb-muted fb-small" style="margin: 12px 0 0">{{ help }}</p>
      </template>
    </div>
  </section>
</template>

<script>
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { money, fmtDateTime, fmtDay } from '../fb'

export default {
  name: 'LimitsPanel',
  props: {
    view: { type: Object, default: null },
    help: { type: String, default: '' },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  emits: ['changed'],
  data() {
    return { v: this.view, draft: {}, saving: false, breaking: false }
  },
  computed: {
    dirty() {
      return (this.v?.limits || []).some((l) => this.parsed(l.key) !== this.target(l))
    }
  },
  watch: {
    view: {
      immediate: true,
      handler(v) {
        this.v = v
        this.resetDraft()
      }
    }
  },
  methods: {
    money,
    fmtDateTime,
    fmtDay,
    resetDraft() {
      const d = {}
      for (const l of this.v?.limits || []) {
        const val = this.target(l)
        d[l.key] = val == null ? '' : String(val)
      }
      this.draft = d
    },
    // What the limit will be once any pending change applies (pending −1 = removal).
    target(l) {
      if (l.pending === -1) return null
      return l.pending != null ? l.pending : l.limit
    },
    parsed(k) {
      const s = String(this.draft[k] ?? '').replace(/,/g, '').trim()
      if (s === '') return null
      const n = Number(s)
      return Number.isFinite(n) && n >= 0 ? n : NaN
    },
    async save() {
      const body = {}
      for (const l of this.v.limits) {
        const n = this.parsed(l.key)
        if (Number.isNaN(n)) {
          toast.error(`${l.label}: enter an amount or leave it empty for no limit`)
          return
        }
        body[l.key] = n
      }
      this.saving = true
      try {
        this.v = await footballApi.setLimits(body)
        this.resetDraft()
        const waiting = this.v.limits.some((l) => l.pending != null) || this.v.pending_from
        toast.success(waiting ? 'Saved. Lower limits apply now; higher ones start in 24 hours.' : 'Limits saved')
        this.$emit('changed', this.v)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save your limits'))
      } finally {
        this.saving = false
      }
    },
    async takeBreak(days) {
      const okk = await confirmDialog({
        title: `Take a ${days === 1 ? '24-hour' : days + '-day'} break?`,
        message: "You won't be able to record new bets here until it ends, and the break can't be shortened. Set the same break in your bookmaker's app too.",
        confirmText: 'Start the break'
      })
      if (!okk) return
      this.breaking = true
      try {
        this.v = await footballApi.takeBreak(days)
        toast.success('Break started. Take care.')
        this.$emit('changed', this.v)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not start the break'))
      } finally {
        this.breaking = false
      }
    }
  }
}
</script>

<style scoped>
.fblim {
  scroll-margin-top: calc(var(--topbar-h, 64px) + 16px);
}
.fblim__in {
  max-width: 160px;
}
.fblim__pending {
  margin-top: 4px;
  color: var(--warning);
}
.fblim__meter-c {
  min-width: 150px;
}
.fblim__meter {
  display: inline-block;
  width: 80px;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  vertical-align: middle;
  margin-right: 8px;
  overflow: hidden;
}
.fblim__meter i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--fb-good);
}
.fblim__meter i.is-mid {
  background: var(--fb-warn);
}
.fblim__meter i.is-high {
  background: var(--fb-bad);
}
.fblim__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}
.fblim__break {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.fblim__breakbtns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
