<template>
  <!-- ✓ Correct / ✗ Wrong / No pick / Void after full time: icon + word, status colour as a third cue only. -->
  <span
    v-if="r"
    class="fb-rc"
    :class="[style.cls, small ? 'fb-rc--sm' : '', large ? 'fb-rc--lg' : '']"
    :title="r.summary || style.word"
    :data-result="r.kind"
    :data-test="testId || 'fb-result-badge'"
    ><i :class="style.icon" aria-hidden="true"></i>{{ r.kind === 'correct' || r.kind === 'wrong' ? style.word : r.label
    }}<span v-if="score" class="fb-rc__score"> ({{ score }})</span><span v-if="r.summary" class="sr-only">. {{ r.summary }}</span></span
  >
</template>

<script>
import './verdict.css'
import { normResult, RESULT_STYLE } from './verdict'

export default {
  name: 'FbResultBadge',
  props: {
    check: { type: Object, default: null },
    small: { type: Boolean, default: false },
    large: { type: Boolean, default: false }, // v2.19.1: the big ✓ / ✗ next to a locked pick
    score: { type: String, default: '' }, // v2.19.1: "(4–0)" after the word
    testId: { type: String, default: null }
  },
  computed: {
    r() {
      return this.check && this.check.kind ? this.check : normResult(this.check)
    },
    style() {
      return RESULT_STYLE[this.r?.kind] || RESULT_STYLE.pending
    }
  }
}
</script>
