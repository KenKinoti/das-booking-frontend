<template>
  <!-- v2.19.1: "Locked pick: Liverpool win · 64% → ✓ Correct (4–0)" and when it was locked. The ✓ / ✗ is an icon + a
       word in a large pill (status colour only as a third cue). No pick → the reason, said plainly. -->
  <div
    class="fb-lr"
    :class="['fb-lr--' + mark, size === 'lg' ? 'fb-lr--lg' : '', compact ? 'fb-lr--compact' : '']"
    :data-mark="mark"
    :data-test="rootTestId"
  >
    <div class="fb-lr__line">
      <span v-if="v" class="fb-lr__k">Locked pick</span>
      <FbVerdictChip
        :verdict="v"
        :fixture-id="fixtureId"
        :test-id="chipTestId"
        :none-text="noPick ? noPick.title : upcoming ? 'No pick yet' : 'No pick'"
        :details="details"
        :large="size === 'lg'"
      />
      <span v-if="rc && (v || rc.kind === 'void')" class="fb-lr__res">
        <i class="fa-solid fa-arrow-right fb-lr__to" aria-hidden="true"></i>
        <FbResultBadge :check="rc" large :score="score" :test-id="badgeTestId" />
      </span>
      <span v-else-if="v && finished && !rc" class="fb-lr__wait" data-test="fb-lr-wait"
        ><i class="fa-regular fa-clock" aria-hidden="true"></i> Waiting for the result</span
      >
    </div>
    <p v-if="when" class="fb-lr__when" data-test="fb-lr-when">
      <i class="fa-solid fa-lock" aria-hidden="true"></i>{{ when }}
    </p>
    <p v-if="noPick && noPick.reason && !compact" class="fb-lr__why" data-test="fb-lr-why">
      {{ noPick.reason }}
    </p>
  </div>
</template>

<script>
import '../verdict/verdict.css'
import FbVerdictChip from '../verdict/FbVerdictChip.vue'
import FbResultBadge from '../verdict/FbResultBadge.vue'
import { normVerdict, normResult, verdictFromResult } from '../verdict/verdict'
import { lockText, noPickOf, scoreOf } from './lock'

export default {
  name: 'FbLockedResult',
  components: { FbVerdictChip, FbResultBadge },
  props: {
    /** a fixtures-list row, a results row (pick + result_check + lock) or the match page's analysis-like object */
    row: { type: Object, required: true },
    fixtureId: { type: [Number, String], default: null },
    finished: { type: Boolean, default: false },
    upcoming: { type: Boolean, default: false },
    size: { type: String, default: 'md' }, // md | lg
    compact: { type: Boolean, default: false },
    details: { type: Boolean, default: true },
    chipTestId: { type: String, default: null },
    badgeTestId: { type: String, default: null },
    rootTestId: { type: String, default: null },
  },
  computed: {
    rc() {
      const r = normResult(this.row.result_check)
      return r && r.kind !== 'pending' && r.kind !== 'nopick' ? r : null
    },
    v() {
      const p = this.row.pick
      const fromPick =
        p && p.pick
          ? normVerdict({
              pick: p.pick,
              pick_label: p.pick_label,
              p: p.p,
              tier: { key: p.tier, label: p.tier_label, note: p.note || '' },
              kind: 'frozen',
            })
          : null
      return normVerdict(this.row.verdict) || fromPick || verdictFromResult(this.row.result_check)
    },
    noPick() {
      return this.v ? null : noPickOf(this.row, { finished: this.finished })
    },
    mark() {
      if (this.rc) return this.rc.kind
      if (this.noPick) return this.noPick.key === 'not_enough_data' ? 'nodata' : 'nopick'
      if (this.v && this.finished) return 'pending'
      return this.v ? 'locked' : 'none'
    },
    score() {
      return this.rc && this.rc.kind !== 'void' ? scoreOf(this.row) : ''
    },
    when() {
      const lock = this.row.lock || null
      if (lock && lock.status === 'locked') return lockText(lock, { upcoming: this.upcoming })
      if (this.row.result_check?.locked_label) return this.row.result_check.locked_label
      return ''
    },
  },
}
</script>

<style>
.fb-lr {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  min-width: 0;
}
.fb-lr__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
}
.fb-lr__k {
  font-size: 11.5px;
  font-weight: 650;
  color: var(--text-3);
  white-space: nowrap;
}
.fb-lr__res {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.fb-lr__to {
  color: var(--text-3);
  font-size: 12px;
}
.fb-lr__wait {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--text-2);
}
.fb-lr__when,
.fb-lr__why {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.4;
}
.fb-lr__when i {
  font-size: 10.5px;
  margin-right: 5px;
}
.fb-lr__why {
  color: var(--text-2);
}
.fb-lr--lg .fb-lr__k {
  font-size: 12.5px;
}
.fb-lr--lg .fb-lr__when,
.fb-lr--lg .fb-lr__why {
  font-size: 13px;
}
.fb-lr--lg .fb-rc--lg {
  height: 40px;
  font-size: 16px;
  padding: 0 16px 0 14px;
}
.fb-lr--compact .fb-rc--lg {
  height: 30px;
  font-size: 13.5px;
}
</style>
