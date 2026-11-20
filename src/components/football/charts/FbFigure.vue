<template>
  <!-- A chart with its title, legend and table-view twin (every value reachable without hovering). -->
  <figure class="fb-fig" :data-chart="chartId">
    <div v-if="title || table" class="fb-fig__head">
      <div>
        <div v-if="title" class="fb-fig__title">{{ title }}</div>
        <div v-if="subtitle" class="fb-fig__sub">{{ subtitle }}</div>
      </div>
      <button v-if="table" type="button" class="fb-linkbtn" :aria-pressed="showTable" @click="showTable = !showTable">
        <i :class="showTable ? 'fa-solid fa-chart-simple' : 'fa-solid fa-table-list'"></i> {{ showTable ? 'Chart' : 'Table' }}
      </button>
    </div>
    <ul v-if="legend && legend.length && !showTable" class="fb-legend" aria-label="Legend">
      <li v-for="l in legend" :key="l.name">
        <i class="fb-key" :class="l.kind ? 'fb-key--' + l.kind : ''" :style="{ background: l.color }"></i>{{ l.name }}
      </li>
    </ul>
    <div v-show="!showTable">
      <slot />
    </div>
    <div v-if="showTable && table" class="fb-scroll">
      <table class="fb-table" :aria-label="(title || 'Chart') + ' — table'">
        <thead>
          <tr>
            <th v-for="(c, i) in table.cols" :key="i" :class="{ num: c.num }">{{ c.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in table.rows" :key="i">
            <td v-for="(v, j) in r" :key="j" :class="{ num: table.cols[j] && table.cols[j].num }">{{ v }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <figcaption v-if="foot || $slots.foot" class="fb-fig__foot"><slot name="foot">{{ foot }}</slot></figcaption>
  </figure>
</template>

<script>
export default {
  name: 'FbFigure',
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    foot: { type: String, default: '' },
    // [{ name, color, kind: 'line' | 'dot' | 'band' | '' }]
    legend: { type: Array, default: null },
    // { cols: [{ label, num }], rows: [[...]] }
    table: { type: Object, default: null },
    chartId: { type: String, default: '' }
  },
  data() {
    return { showTable: false }
  }
}
</script>
