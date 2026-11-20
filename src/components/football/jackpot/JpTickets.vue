<template>
  <FbSection id="tickets" title="Tickets" subtitle="The single most likely ticket, the next best ones, and contrarian variants with what they cost" open-on-phone>
    <!-- Most likely ticket -->
    <div class="fbjt__ml" data-test="fb-jp-most-likely" :data-p="ml.p" :data-one-in="ml.oneIn">
      <div class="fbjt__mlhead">
        <div>
          <div class="fbjt__k">Most likely ticket</div>
          <div class="fbjt__chance">
            <span class="fbjt__hero" data-test="fb-jp-one-in">1 in {{ ml.oneIn ? ml.oneIn.toLocaleString() : '—' }}</span>
            <span class="fb-muted">chance that every game is right ({{ smallPct(ml.p) }})</span>
          </div>
        </div>
        <div class="fbjt__acts">
          <button type="button" class="ui-btn ui-btn--sm" data-test="fb-jp-copy" @click="copy(ml.picks)"><i class="fa-regular fa-copy"></i> Copy</button>
          <span v-if="mlSaved" class="fb-pill fb-pill--good" data-test="fb-jp-ml-saved" title="Kept up to date until the jackpot closes, then graded"><i class="fa-solid fa-check" aria-hidden="true"></i> Saved, graded automatically</span>
          <button v-else type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="saving" data-test="fb-jp-save-ml" @click="saveTicket('Most likely', ml.picks, 'most_likely')"><i class="fa-regular fa-bookmark"></i> Save ticket</button>
        </div>
      </div>
      <ol class="fbjt__cells" :aria-label="'Most likely ticket: ' + text(ml.picks)">
        <li v-for="(p, i) in ml.picks" :key="i" :data-n="i + 1">
          <span class="fb-muted fbjt__gn">{{ i + 1 }}</span>
          <b>{{ p }}</b>
        </li>
      </ol>
      <div class="fbjt__copyline">
        <code data-test="fb-jp-ticket-text">{{ text(ml.picks) }}</code>
      </div>
      <p class="fbjt__plain">
        In plain words: if you bought this exact ticket every week, you would expect to get all {{ an.nGames }} right about once every {{ weeks }}. On a typical week it gets about
        <strong>{{ fixed(ml.expectedCorrect, 1) }}</strong> of {{ an.nGames }} right<template v-if="ml.draws != null"> and it has {{ ml.draws }} draw{{ ml.draws === 1 ? '' : 's' }}</template>.
      </p>
    </div>

    <!-- Top N -->
    <div class="fbjt__sec">
      <div class="fb-fig__title">Top {{ an.top.length }} tickets</div>
      <div class="fb-fig__sub">
        Best first. Changes from the most likely ticket are highlighted. Together these {{ an.top.length }} tickets have a {{ smallPct(lastCum) }} chance that one of them gets every game right ({{ oneInTxt(lastCum) }}).
      </div>
      <div class="fb-scroll" style="margin-top: 6px">
        <table class="fb-table fb-table--nowrap fbjt__top" data-test="fb-jp-top">
          <thead>
            <tr>
              <th class="num">#</th>
              <th>Ticket</th>
              <th class="num">Chance</th>
              <th class="num" title="Chance that one of the tickets from #1 down to this one gets every game right">Together, #1 to here</th>
              <th class="num">Draws</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in an.top" :key="t.rank" :data-rank="t.rank" :data-p="t.p">
              <td class="num fb-muted">{{ t.rank }}</td>
              <td>
                <span class="fb-ticket" :aria-label="text(t.picks)"
                  ><b v-for="(p, i) in t.picks" :key="i" :class="{ 'is-multi': changed(t, i + 1) }" :title="changed(t, i + 1) ? `Game ${i + 1}: ${ml.picks[i]} → ${p}` : `Game ${i + 1}`">{{ p }}</b></span
                >
              </td>
              <td class="num">1 in {{ t.oneIn ? t.oneIn.toLocaleString() : '—' }}</td>
              <td class="num">{{ smallPct(t.cum) }}</td>
              <td class="num">{{ t.draws ?? '—' }}</td>
              <td class="num">
                <button type="button" class="fb-linkbtn" :aria-label="'Copy ticket ' + t.rank" @click="copy(t.picks)"><i class="fa-regular fa-copy"></i></button>
                <button type="button" class="fb-linkbtn" :aria-label="'Save ticket ' + t.rank" :disabled="saving" :data-test="'fb-jp-save-top-' + t.rank" @click="saveTicket('Top ticket ' + t.rank, t.picks, 'top')"><i class="fa-regular fa-bookmark"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Contrarian variants -->
    <div v-if="an.contrarian.length" class="fbjt__sec" data-test="fb-jp-contrarian">
      <div class="fb-fig__title">Contrarian variants</div>
      <div class="fb-fig__sub">
        Picking against the crowd where the evidence allows it: fewer people would share the prize, but each change makes the ticket less likely. The cost is shown as the chance you give up.
      </div>
      <div class="fbjt__cards">
        <article v-for="(v, i) in an.contrarian" :key="i" class="fbjt__card" :data-variant="i">
          <div class="fbjt__ctitle">{{ v.label }}</div>
          <div class="fbjt__changes">
            <span v-for="c in v.changes" :key="c.n" class="fb-pill">Game {{ c.n }}: {{ c.from }} → {{ c.to }}</span>
          </div>
          <dl class="fbjt__dl">
            <div>
              <dt>Chance</dt>
              <dd>1 in {{ v.oneIn ? v.oneIn.toLocaleString() : '—' }}</dd>
            </div>
            <div>
              <dt>Cost in chance</dt>
              <dd>{{ v.ratio != null ? `gives up ${Math.round((1 - v.ratio) * 100)}%` : '—' }}</dd>
            </div>
            <div>
              <dt>Other winners expected</dt>
              <dd>{{ fixed(v.coWinners, 1) }} <span class="fb-muted">vs {{ fixed(an.ev && an.ev.coWinners, 1) }}</span></dd>
            </div>
            <div>
              <dt>Expected value</dt>
              <dd>{{ smoney(v.evTotal, currency) }} <span class="fb-muted">vs {{ smoney(an.ev && an.ev.evTotal, currency) }}</span></dd>
            </div>
          </dl>
          <p class="fb-muted fb-small fbjt__why">{{ v.why }}</p>
          <div class="fbjt__acts">
            <button type="button" class="fb-linkbtn" @click="copy(v.picks)"><i class="fa-regular fa-copy"></i> Copy</button>
            <button type="button" class="fb-linkbtn" :disabled="saving" @click="saveTicket(v.label, v.picks, 'contrarian')"><i class="fa-regular fa-bookmark"></i> Save</button>
          </div>
        </article>
      </div>
    </div>
  </FbSection>
</template>

<script>
import FbSection from '../match/FbSection.vue'
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { fixed, smoney } from '../fb'
import { smallPct, oneIn, copyText, ticketText } from './jp'

export default {
  name: 'JpTickets',
  components: { FbSection },
  props: {
    an: { type: Object, required: true },
    jackpotId: { type: String, default: '' },
    currency: { type: String, default: 'KES' },
    tickets: { type: Array, default: () => [] }
  },
  emits: ['changed'],
  data() {
    return { saving: false }
  },
  computed: {
    ml() {
      return this.an.mostLikely
    },
    mlSaved() {
      const t = this.ml.picks.join(' ')
      return this.tickets.some((x) => x.source === 'most_likely' && x.picks.join(' ') === t)
    },
    lastCum() {
      const t = this.an.top
      return t.length ? t[t.length - 1].cum : null
    },
    weeks() {
      const n = this.ml.oneIn
      if (!n) return '—'
      const years = n / 52
      if (years >= 2) return `${Math.round(years).toLocaleString()} years`
      return `${n.toLocaleString()} weeks`
    }
  },
  methods: {
    fixed,
    smoney,
    smallPct,
    oneInTxt: oneIn,
    text: ticketText,
    changed(t, n) {
      return (t.changes || []).some((c) => c.n === n)
    },
    async copy(picks) {
      const ok = await copyText(ticketText(picks))
      if (ok) toast.success(`Copied: ${ticketText(picks)}`)
      else toast.error('Could not copy — select the text instead')
    },
    async saveTicket(name, picks, source) {
      if (!this.jackpotId) return
      this.saving = true
      try {
        const v = await footballApi.addJackpotTicket(this.jackpotId, { name, picks, source })
        toast.success(`Saved “${name}”`)
        this.$emit('changed', v)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the ticket'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.fbjt__ml {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--surface-2);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.fbjt__mlhead {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}
.fbjt__k {
  font-size: 12px;
  font-weight: 650;
  color: var(--text-3);
}
.fbjt__chance {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
}
.fbjt__hero {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.fbjt__acts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fbjt__cells {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
  gap: 6px;
  max-width: 640px;
}
.fbjt__cells li {
  display: grid;
  justify-items: center;
  gap: 2px;
}
.fbjt__gn {
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
}
.fbjt__cells b {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  font-size: 15px;
  font-weight: 750;
}
.fbjt__copyline code {
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  display: inline-block;
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  letter-spacing: 0.04em;
}
.fbjt__plain {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
.fbjt__sec {
  margin-top: 20px;
}
.fbjt__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-top: 8px;
}
.fbjt__card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  align-content: start;
}
.fbjt__ctitle {
  font-weight: 650;
}
.fbjt__changes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.fbjt__dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  margin: 0;
}
.fbjt__dl dt {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbjt__changes .fb-pill {
  font-variant-numeric: tabular-nums;
}
.fbjt__dl dd {
  margin: 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.fbjt__why {
  margin: 0;
}
</style>
