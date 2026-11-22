<template>
  <!-- One plain verdict per match: "Arsenal win · 64% · Strong". Tap / click opens the details (safer pick, draw alert,
       goals lean, how often picks like this came off). The tier is a word AND 1–4 filled pips, never colour alone. -->
  <span v-if="!v" class="fb-vchip fb-vchip--none" :class="{ 'fb-vchip--lg': large }" data-test="fb-verdict-none">
    <span class="fb-vchip__txt">{{ noneText }}</span>
  </span>
  <FbPopBtn v-else-if="details" class="fb-vchip-host" :label="'Pick details: ' + aria" :btn-class="chipClass" :test-id="testId || 'fb-verdict'">
    <template #button>
      <FbTierPips :tier="v.tier.key" />
      <span class="fb-vchip__txt" :data-tier="v.tier.key" :data-pick="v.pick" :data-p="v.p"
        ><span class="fb-vchip__pick">{{ v.pick_label }}</span>
        <span class="fb-vchip__rest"
          ><span class="fb-vchip__sep">· </span><span class="fb-vchip__p">{{ pct(v.p, 0) }}</span
          ><span class="fb-vchip__sep"> · </span><span class="fb-vchip__tier">{{ v.tier.label }}</span></span
        ></span
      >
    </template>
    <div class="fb-vpop" data-test="fb-verdict-pop">
      <div class="fb-pop__title">{{ v.pick_label }} · {{ pct(v.p, 0) }} chance</div>
      <dl>
        <div>
          <dt>Level</dt>
          <dd>
            <FbTierPips :tier="v.tier.key" /> {{ v.tier.label }} ({{ v.tier.range }})<template v-if="v.tier.history && v.tier.history.hit_rate != null"
              >. In past matches, picks at this level came off {{ pct(v.tier.history.hit_rate, 0) }} of the time</template
            ><template v-if="v.tier.own">; DASYIN's own picks {{ pct(v.tier.own.hit_rate, 0) }} of {{ v.tier.own.n.toLocaleString() }}</template
            >.
          </dd>
        </div>
        <div v-if="v.safer" data-test="fb-verdict-safer">
          <dt>Safer pick</dt>
          <dd>
            {{ v.safer.label }} · {{ pct(v.safer.p, 0)
            }}<template v-if="v.safer.history_hit_rate != null"> (came off {{ pct(v.safer.history_hit_rate, 0) }} in past matches)</template>
          </dd>
        </div>
        <div v-if="v.draw_alert">
          <dt>Draw alert</dt>
          <dd>
            <span class="fb-dalert"><i class="fa-solid fa-equals" aria-hidden="true"></i>Draw alert</span> {{ v.draw_alert.why }}
          </dd>
        </div>
        <div v-if="v.goals">
          <dt>Goals</dt>
          <dd>
            {{ goalsText(v.goals) }} · {{ pct(v.goals.p, 0) }}<template v-if="v.btts"> · {{ bttsText(v.btts) }} {{ pct(v.btts.p, 0) }}</template>
          </dd>
        </div>
      </dl>
      <p v-if="v.tier.note" class="fb-vpop__note">{{ v.tier.note }}</p>
      <p class="fb-vpop__note">Estimates, not certainties. 18+.</p>
      <router-link v-if="fixtureId" :to="`/football/match/${fixtureId}`" class="fb-small">Open the match</router-link>
    </div>
  </FbPopBtn>
  <span v-else :class="chipClass" role="img" :aria-label="aria" :data-test="testId || 'fb-verdict'">
    <FbTierPips :tier="v.tier.key" />
    <span class="fb-vchip__txt" :data-tier="v.tier.key" :data-pick="v.pick" :data-p="v.p"
      ><span class="fb-vchip__pick">{{ v.pick_label }}</span>
      <span class="fb-vchip__rest"
        ><span class="fb-vchip__sep">· </span><span class="fb-vchip__p">{{ pct(v.p, 0) }}</span
        ><span class="fb-vchip__sep"> · </span><span class="fb-vchip__tier">{{ v.tier.label }}</span></span
      ></span
    >
  </span>
</template>

<script>
import './verdict.css'
import FbPopBtn from '../FbPopBtn.vue'
import FbTierPips from './FbTierPips.vue'
import { pct } from '../fb'
import { normVerdict, goalsText, bttsText } from './verdict'

export default {
  name: 'FbVerdictChip',
  components: { FbPopBtn, FbTierPips },
  props: {
    verdict: { type: Object, default: null },
    fixtureId: { type: [Number, String], default: null },
    details: { type: Boolean, default: true },
    large: { type: Boolean, default: false },
    stack: { type: Boolean, default: false }, // two lines: the pick, then "64% · Strong" (table rows)
    noneText: { type: String, default: 'No pick yet' },
    testId: { type: String, default: null }
  },
  computed: {
    v() {
      return this.verdict && this.verdict.tier && this.verdict.tier.pips ? this.verdict : normVerdict(this.verdict)
    },
    chipClass() {
      return ['fb-vchip', 'fb-vchip--' + this.v.tier.key, this.large ? 'fb-vchip--lg' : '', this.stack ? 'fb-vchip--stack' : '']
    },
    aria() {
      const v = this.v
      return `${v.pick_label}, ${pct(v.p, 0)} chance, ${v.tier.label}${v.draw_alert ? ', draw alert' : ''}`
    }
  },
  methods: { pct, goalsText, bttsText }
}
</script>
