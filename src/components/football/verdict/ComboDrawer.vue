<template>
  <!-- Accumulator helper: picks added from the match centre, their combined chance (product of the chances), fair odds
       and "1 in N". Opens from the floating "Combo" button; a side panel on wide screens, a bottom sheet on phones. -->
  <div class="fbcd-root">
    <div v-if="combo.items.length" class="fbcd-spacer" aria-hidden="true"></div>
    <button
      v-if="combo.items.length && !combo.open"
      type="button"
      class="fbcd-fab"
      data-test="fb-combo-open"
      :aria-label="`Open your combo: ${combo.items.length} picks, ${oneIn}`"
      @click="openIt"
    >
      <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
      <span>Combo · {{ combo.items.length }}</span>
      <span class="fbcd-fab__p">{{ oneIn }}</span>
    </button>

    <div v-if="combo.open" class="fbcd-back" @click="close"></div>
    <aside v-if="combo.open" ref="panel" class="fbcd fb-panel" role="dialog" aria-modal="true" aria-labelledby="fbcd-h" data-test="fb-combo" @keydown.esc="close">
      <header class="fbcd__head">
        <div>
          <h2 id="fbcd-h">Your combo</h2>
          <p>{{ combo.items.length }} pick{{ combo.items.length === 1 ? '' : 's' }} · kept in this browser only</p>
        </div>
        <button ref="closeBtn" type="button" class="fbcd__x" aria-label="Close the combo" @click="close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </header>

      <div class="fbcd__body">
        <p v-if="!combo.items.length" class="fb-muted fb-small" data-test="fb-combo-empty">No picks yet. Use “Add to combo” on a match to build one.</p>
        <ul v-else class="fbcd__list">
          <li v-for="x in combo.items" :key="x.id" :data-combo="x.id">
            <div class="fbcd__pick">
              <FbTierPips :tier="x.tier" />
              <div class="fbcd__txt">
                <router-link :to="`/football/match/${x.id}`" class="fbcd__match" @click="close">{{ x.match }}</router-link>
                <span class="fb-small"
                  ><strong>{{ x.pick_label }}</strong> · <span class="fb-num">{{ pct(x.p, 0) }}</span> · {{ x.tier_label }}</span
                >
              </div>
            </div>
            <button type="button" class="fbcd__rm" :aria-label="'Remove ' + x.match + ' from the combo'" :data-test="'fb-combo-rm-' + x.id" @click="removeFromCombo(x.id)">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </li>
        </ul>

        <div v-if="combo.items.length" class="fbcd__sum" data-test="fb-combo-sum">
          <div>
            <div class="fbcd__k">Chance all come off</div>
            <div class="fbcd__v" data-test="fb-combo-p" :data-v="p">{{ pctSmall(p) }}</div>
          </div>
          <div>
            <div class="fbcd__k">That's about</div>
            <div class="fbcd__v" data-test="fb-combo-onein">{{ oneIn }}</div>
          </div>
          <div>
            <div class="fbcd__k">Fair odds</div>
            <div class="fbcd__v fb-num" data-test="fb-combo-odds" :data-v="fair">{{ fair ? fair.toFixed(2) : '—' }}</div>
          </div>
        </div>
        <p v-if="combo.items.length" class="fb-honest fbcd__note" data-test="fb-combo-note">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span
            >Worked out by multiplying the chances ({{ combo.items.map((x) => pct(x.p, 0)).join(' × ') }}), as if the games were unrelated. Linked games aren't independent, so the
            real chance can differ. Every extra pick makes the combo less likely. A bookmaker's price below the fair odds pays less than the risk. 18+.</span
          >
        </p>
        <p v-if="combo.items.length >= max" class="fb-muted fb-small">That's the most a combo can hold here ({{ max }}).</p>
      </div>
      <footer v-if="combo.items.length" class="fbcd__foot">
        <button type="button" class="ui-btn ui-btn--ghost" data-test="fb-combo-clear" @click="clearCombo"><i class="fa-regular fa-trash-can" aria-hidden="true"></i> Clear</button>
        <button type="button" class="ui-btn" @click="close">Done</button>
      </footer>
    </aside>
  </div>
</template>

<script>
import './verdict.css'
import FbTierPips from './FbTierPips.vue'
import { pct } from '../fb'
import { combo, removeFromCombo, clearCombo, COMBO_MAX } from './combo'
import { comboP, fairOddsOf, oneInText } from './verdict'
import { smallPct } from '../jackpot/jp'

export default {
  name: 'ComboDrawer',
  components: { FbTierPips },
  data() {
    return { combo, max: COMBO_MAX, lastFocus: null }
  },
  computed: {
    p() {
      return comboP(this.combo.items)
    },
    fair() {
      return fairOddsOf(this.p)
    },
    oneIn() {
      return oneInText(this.p)
    }
  },
  watch: {
    'combo.open'(v) {
      if (v) this.$nextTick(() => this.$refs.closeBtn?.focus())
    }
  },
  beforeUnmount() {
    this.combo.open = false
  },
  methods: {
    pct,
    pctSmall: smallPct,
    removeFromCombo,
    clearCombo,
    openIt() {
      this.lastFocus = document.activeElement
      this.combo.open = true
    },
    close() {
      this.combo.open = false
      this.$nextTick(() => this.lastFocus?.focus?.())
    }
  }
}
</script>

<style scoped>
.fbcd-spacer {
  height: 72px;
}
.fbcd-fab {
  position: fixed;
  right: 20px;
  bottom: calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom) + 20px);
  z-index: 1005;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  border: 0;
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-weight: 650;
  box-shadow: var(--shadow-lg);
  cursor: pointer;
}
.fbcd-fab:focus-visible {
  outline: 3px solid var(--accent-ring);
  outline-offset: 2px;
}
.fbcd-fab__p {
  font-weight: 550;
  opacity: 0.9;
}
.fbcd-back {
  position: fixed;
  inset: 0;
  z-index: 1020;
  background: rgba(8, 10, 20, 0.35);
}
.fbcd {
  position: fixed;
  z-index: 1021;
  top: calc(var(--topbar-h, 64px) + 12px);
  right: 16px;
  bottom: 16px;
  width: min(400px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}
.fbcd__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 16px 10px 18px;
  border-bottom: 1px solid var(--border);
}
.fbcd__head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
}
.fbcd__head p {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--text-3);
}
.fbcd__x,
.fbcd__rm {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--text-2);
  cursor: pointer;
  font: inherit;
}
.fbcd__x:hover,
.fbcd__rm:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.fbcd__x:focus-visible,
.fbcd__rm:focus-visible {
  outline: 2px solid var(--accent);
}
.fbcd__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 10px 18px 14px;
}
.fbcd__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.fbcd__list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}
.fbcd__pick {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.fbcd__txt {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}
.fbcd__match {
  color: var(--text);
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fbcd__match:hover {
  text-decoration: underline;
}
.fbcd__sum {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0 10px;
}
.fbcd__k {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbcd__v {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.fbcd__note {
  margin: 0;
}
.fbcd__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--border);
}
.fbcd__foot .ui-btn {
  min-height: 44px;
}
@media (max-width: 640px) {
  .fbcd-fab {
    right: 16px;
    bottom: calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom) + 12px);
    left: 16px;
    justify-content: center;
  }
  .fbcd {
    top: auto;
    left: 0;
    right: 0;
    bottom: calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom));
    width: 100%;
    max-height: calc(100vh - var(--bottom-nav-h, 0px) - 72px);
    border-radius: 18px 18px 0 0;
  }
  .fbcd__sum {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .fbcd__v {
    font-size: 16px;
  }
}
</style>
