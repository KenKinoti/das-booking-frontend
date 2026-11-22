<template>
  <!-- 1–4 filled signal bars for the tier (Coin-flip 1 … Strong 4), in the tier's ordinal colour. Decorative next to the
       tier word; standalone it carries its own label. -->
  <span class="fb-pips" :class="'fb-pips--' + key" :role="label ? 'img' : null" :aria-label="label || null" :aria-hidden="label ? null : 'true'" :title="label || null"
    ><i v-for="n in 4" :key="n" :class="{ on: n <= pips }"></i
  ></span>
</template>

<script>
import './verdict.css'
import { TIERS } from './verdict'

export default {
  name: 'FbTierPips',
  props: {
    tier: { type: String, default: 'coinflip' },
    label: { type: String, default: '' }
  },
  computed: {
    key() {
      return TIERS[this.tier] ? this.tier : 'coinflip'
    },
    pips() {
      return TIERS[this.key].pips
    }
  }
}
</script>
