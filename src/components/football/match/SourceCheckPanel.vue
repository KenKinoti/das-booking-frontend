<template>
  <FbSection id="source-check" title="Source check" :subtitle="subtitle">
    <div v-if="!sc || !sc.items || !sc.items.length" class="fb-muted">No second source covers this match yet, so nothing could be cross-checked.</div>
    <template v-else>
      <div class="fbsc__top">
        <SourceBadge :checks="checks" title="Source check · this match" test-key="summary" />
        <ul class="fbsc__counts" aria-label="Checks by result">
          <li v-for="c in counts" :key="c.key" :data-count="c.key">
            <i :class="c.icon" :style="{ color: c.iconColor }" aria-hidden="true"></i><strong class="fb-num">{{ c.n }}</strong> {{ c.label }}
          </li>
        </ul>
      </div>
      <div class="fbsc__bar" role="img" :aria-label="counts.map((c) => `${c.n} ${c.label}`).join(', ')">
        <i v-for="c in counts.filter((x) => x.n)" :key="c.key" :style="{ flexGrow: c.n, background: c.color }"></i>
      </div>
      <p class="fb-muted fb-small fbsc__srcs">
        Compared: {{ (sc.summary.sources || []).map(providerName).join(', ') }}<template v-if="sc.summary.checked_at"> · checked {{ fmtDateTime(sc.summary.checked_at, tz) }}</template>. {{ sc.summary.note }}
      </p>
      <div class="fb-scroll">
        <table class="fb-table" data-test="fb-srcchk-table">
          <thead>
            <tr>
              <th>What</th>
              <th>Result</th>
              <th>Values by source</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in sorted" :key="it.key" :data-key="it.key" :data-status="it.status">
              <td class="fbsc__what">{{ it.label }}</td>
              <td>
                <span class="fb-chk fbsc__chk" :class="'fb-chk--' + STATUS_OF[it.status]"><i :class="CHECK_ICON[STATUS_OF[it.status]]" aria-hidden="true"></i>{{ WORD[it.status] }}</span>
              </td>
              <td>
                <div class="fbsc__vals">
                  <span v-for="v in it.values" :key="v.source" class="fbsc__val" :class="{ 'is-off': isOff(it, v.source) }"
                    >{{ providerName(v.source) }}: <strong>{{ fmtValue(it.key, v.value, tz) }}</strong
                    ><i v-if="isOff(it, v.source)" class="fa-solid fa-not-equal" aria-label="differs"></i
                  ></span>
                </div>
              </td>
              <td class="fb-muted fb-small">{{ it.note }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import SourceBadge, { CHECK_ICON } from './SourceBadge.vue'
import { providerName, fmtDateTime } from '../fb'
import { toChecks, fmtValue, STATUS_OF } from './srccheck'

const WORD = { agree: 'Agree', minor: 'Minor difference', conflict: 'Conflict', single: 'One source', unchecked: 'Not checked' }
const ORDER = { conflict: 0, minor: 1, agree: 2, single: 3, unchecked: 4 }

export default {
  name: 'SourceCheckPanel',
  components: { FbSection, SourceBadge },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  data() {
    return { WORD, CHECK_ICON, STATUS_OF }
  },
  computed: {
    sc() {
      return this.a.source_check || null
    },
    checks() {
      return toChecks(this.sc?.items, this.tz)
    },
    sorted() {
      return [...(this.sc?.items || [])].sort((x, y) => (ORDER[x.status] ?? 9) - (ORDER[y.status] ?? 9))
    },
    subtitle() {
      const s = this.sc?.summary
      if (!s) return 'League position, points, results, head to head, kick-off and team names compared across the free sources'
      return `${s.agree || 0} agree · ${s.minor || 0} minor · ${s.conflict || 0} conflict · ${s.single || 0} with one source only — differences are flagged, never hidden`
    },
    counts() {
      const s = this.sc?.summary || {}
      return [
        { key: 'agree', n: s.agree || 0, label: 'agree', icon: CHECK_ICON.agree, color: 'var(--fb-good)', iconColor: 'var(--fb-good)' },
        { key: 'minor', n: s.minor || 0, label: 'minor difference', icon: CHECK_ICON.minor, color: 'var(--fb-warn)', iconColor: '#b77a00' },
        { key: 'conflict', n: s.conflict || 0, label: 'conflict', icon: CHECK_ICON.conflict, color: 'var(--fb-bad)', iconColor: 'var(--fb-bad)' },
        { key: 'single', n: s.single || 0, label: 'one source only', icon: CHECK_ICON.none, color: 'var(--border-strong)', iconColor: 'var(--text-3)' }
      ]
    }
  },
  methods: {
    providerName,
    fmtDateTime,
    fmtValue,
    isOff(it, src) {
      return (it.disagreeing || []).some((d) => d.source === src)
    }
  }
}
</script>

<style scoped>
.fbsc__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
}
.fbsc__counts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 13px;
  color: var(--text-2);
}
.fbsc__counts li {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.fbsc__bar {
  display: flex;
  gap: 2px;
  height: 8px;
  margin: 10px 0 6px;
  max-width: 520px;
}
.fbsc__bar i {
  flex-basis: 0;
  border-radius: 999px;
  min-width: 4px;
}
.fbsc__srcs {
  margin: 0 0 10px;
}
.fbsc__what {
  min-width: 180px;
}
.fbsc__chk {
  cursor: default;
}
.fbsc__vals {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 12.5px;
}
.fbsc__val {
  white-space: nowrap;
}
.fbsc__val.is-off {
  color: var(--danger);
}
.fbsc__val i {
  margin-left: 4px;
}
</style>
