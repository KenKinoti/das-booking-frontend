<template>
  <!-- v2.18: how much each source counts in the picks' consensus chance, per competition group — the defaults, or weights
       learned from graded matches when they beat the defaults on matches held back for checking. -->
  <section class="fb-panel" data-test="fb-consensus-weights">
    <div class="fb-panel__head">
      <div>
        <h2>How the picks' chance is blended</h2>
        <p>Weight of each source in the consensus, per competition group · learned weights are used only when they beat the defaults on held-back matches</p>
      </div>
      <button v-if="isSuper" type="button" class="ui-btn ui-btn--sm" :disabled="fitting" data-test="fb-weights-fit" @click="fit">
        <i :class="fitting ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-sliders'" aria-hidden="true"></i> Refit now
      </button>
    </div>
    <div class="fb-panel__body">
      <div v-if="!d && !error" class="ui-skeleton" style="height: 120px"></div>
      <p v-else-if="error" class="fb-muted fb-small">{{ error }}</p>
      <template v-else>
        <div class="fb-scroll">
          <table class="fb-table fb-table--nowrap">
            <thead>
              <tr>
                <th>Group</th>
                <th v-for="k in keys" :key="k" class="num">{{ consensusLabel(k) }}</th>
                <th>In use</th>
                <th class="num">Graded</th>
                <th class="num" title="Mean log loss on the held-back matches (lower is better)">Log loss default → learned</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in d.groups || []" :key="g.group" :data-group="g.group" :data-in-use="g.in_use">
                <td>
                  <strong>{{ g.label || g.group }}</strong>
                  <div v-if="g.note" class="fb-muted fb-small fbcw__note">{{ g.note }}</div>
                </td>
                <td v-for="k in keys" :key="k" class="num">{{ g.weights && g.weights[k] != null ? pct(g.weights[k], 0) : '—' }}</td>
                <td>
                  <span class="fb-pill" :class="g.in_use === 'learned' ? 'fb-pill--info' : ''">{{ g.in_use === 'learned' ? 'Learned' : 'Defaults' }}</span>
                </td>
                <td class="num">
                  {{ g.n ?? 0 }}<span v-if="g.holdout_n" class="fb-muted fb-small"> ({{ g.holdout_n }} held back)</span>
                </td>
                <td class="num">{{ g.logloss_default != null ? fixed(g.logloss_default, 4) : '—' }} → {{ g.logloss_learned != null ? fixed(g.logloss_learned, 4) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="fb-muted fb-small fbcw__foot">
          Defaults: {{ defaultsText }}. Missing sources are left out and the others scaled up. Market prices are never “corrected” — closing prices are already well calibrated on
          draws.
        </p>
      </template>
    </div>
  </section>
</template>

<script>
import { footballApi, footballAdminApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { pct, fixed } from '../fb'
import { consensusLabel } from '../verdict/verdict'

const ORDER = ['sharp', 'market', 'clubelo', 'model', 'polymarket', 'apifootball_pred']

export default {
  name: 'ConsensusWeights',
  data() {
    return { d: null, error: '', fitting: false }
  },
  computed: {
    isSuper() {
      return useAuthStore().isSuperAdmin
    },
    keys() {
      const seen = new Set(Object.keys(this.d?.defaults || {}))
      for (const g of this.d?.groups || []) for (const k of Object.keys(g.weights || {})) seen.add(k)
      return ORDER.filter((k) => seen.has(k)).concat([...seen].filter((k) => !ORDER.includes(k)))
    },
    defaultsText() {
      return this.keys.map((k) => `${consensusLabel(k)} ${pct(this.d?.defaults?.[k] ?? 0, 0)}`).join(' · ')
    }
  },
  created() {
    this.load()
  },
  methods: {
    pct,
    fixed,
    consensusLabel,
    async load() {
      try {
        this.d = await footballApi.consensusWeights()
      } catch (e) {
        this.error = e?.response?.status === 404 ? 'Not available on this server yet.' : apiErrorMessage(e, 'Could not load the weights')
      }
    },
    async fit() {
      this.fitting = true
      try {
        this.d = await footballAdminApi.fitConsensusWeights()
        toast.success('Weights refitted')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not refit the weights'))
      } finally {
        this.fitting = false
      }
    }
  }
}
</script>

<style scoped>
.fbcw__note {
  white-space: normal;
  max-width: 320px;
}
.fbcw__foot {
  margin: 8px 0 0;
}
</style>
