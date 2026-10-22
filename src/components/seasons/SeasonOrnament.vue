<template>
  <!--
    Original corner ornaments, one per theme (no characters, logos or
    emblems). Drawn inside a quarter circle of radius 62 around the top-right
    corner (64, 0) of a 64×64 box, which keeps them in the page gutter: the
    box is sized so that quarter circle never reaches the content.
  -->
  <svg class="so" :data-theme="theme" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <template v-if="theme === 'halloween'">
      <g class="so-line" fill="none" stroke-width="1.1" stroke-linecap="round">
        <path d="M64 0L64 62M64 0L40.3 57.3M64 0L20.2 43.8M64 0L6.7 23.7M64 0L2 0" />
        <path d="M64 16Q61.32 13.5 57.88 14.78Q56.36 11.44 52.69 11.31Q52.56 7.64 49.22 6.12Q50.5 2.68 48 0" />
        <path d="M64 30Q58.97 25.3 52.52 27.72Q49.67 21.45 42.79 21.21Q42.55 14.33 36.28 11.48Q38.7 5.03 34 0" />
        <path d="M64 44Q56.62 37.11 47.16 40.65Q42.98 31.46 32.89 31.11Q32.53 21.02 23.35 16.84Q26.89 7.38 20 0" />
        <path d="M64 58Q54.27 48.92 41.8 53.59Q36.29 41.48 22.99 41.01Q22.53 27.71 10.41 22.2Q15.08 9.73 6 0" />
      </g>
      <g class="so-anim so-anim-bob">
        <path class="so-line" d="M50 0V31" fill="none" stroke-width="0.9" />
        <g class="so-ink-stroke" fill="none" stroke-width="1.1" stroke-linecap="round">
          <path d="M47 35Q42 32 41 29M46.8 37Q41 36 39.5 34M47 39Q42 41 41 44M47.5 40.5Q44 44.5 44 47.5" />
          <path d="M53 35Q58 32 59 29M53.2 37Q59 36 60.5 34M53 39Q58 41 59 44M52.5 40.5Q56 44.5 56 47.5" />
        </g>
        <circle class="so-ink" cx="50" cy="32.6" r="2.3" />
        <ellipse class="so-ink" cx="50" cy="37.8" rx="3.5" ry="4.2" />
        <circle class="so-1" cx="49.1" cy="32.3" r="0.65" />
        <circle class="so-1" cx="50.9" cy="32.3" r="0.65" />
      </g>
    </template>

    <template v-else-if="theme === 'christmas'">
      <g class="so-2">
        <path v-for="r in [105, 135, 165]" :key="r" :transform="`translate(60 4) rotate(${r})`" d="M0 0C3-3 5-6 8-4C9-7 12-8 14-5C16-7 19-7 22 0C19 7 16 7 14 5C12 8 9 7 8 4C5 6 3 3 0 0Z" />
      </g>
      <g class="so-vein" fill="none" stroke-width="0.8">
        <path v-for="r in [105, 135, 165]" :key="r" :transform="`translate(60 4) rotate(${r})`" d="M2 0H20" />
      </g>
      <circle class="so-1" cx="56.5" cy="9.5" r="3.4" />
      <circle class="so-1" cx="52" cy="12.5" r="3.4" />
      <circle class="so-1" cx="58" cy="15" r="3.4" />
      <circle class="so-shine" cx="55.4" cy="8.4" r="0.9" />
      <circle class="so-shine" cx="50.9" cy="11.4" r="0.9" />
      <circle class="so-shine" cx="56.9" cy="13.9" r="0.9" />
      <g v-for="f in [[30, 8, 5], [46, 38, 4]]" :key="f[0]" class="so-anim so-anim-spin">
        <g class="so-line" fill="none" stroke-width="1" stroke-linecap="round">
          <path v-for="a in [0, 60, 120]" :key="a" :transform="`rotate(${a} ${f[0]} ${f[1]})`" :d="`M${f[0]} ${f[1] - f[2]}V${f[1] + f[2]}M${f[0] - 1.6} ${f[1] - f[2] + 1.4}L${f[0]} ${f[1] - f[2] + 2.8}L${f[0] + 1.6} ${f[1] - f[2] + 1.4}M${f[0] - 1.6} ${f[1] + f[2] - 1.4}L${f[0]} ${f[1] + f[2] - 2.8}L${f[0] + 1.6} ${f[1] + f[2] - 1.4}`" />
        </g>
      </g>
    </template>

    <template v-else-if="theme === 'new_year'">
      <polygon class="so-1 so-anim so-anim-twinkle" :points="star(48, 16, 11, 4.6)" />
      <polygon class="so-1 so-anim so-anim-twinkle so-delay-1" :points="star(30, 8, 5, 2.1)" />
      <polygon class="so-1 so-anim so-anim-twinkle so-delay-2" :points="star(56, 38, 4, 1.7)" />
      <g class="so-line" fill="none" stroke-width="1" stroke-linecap="round">
        <path d="M48 0.8V2.6M60.5 6.5L59 7.6M35.5 10.5L37.2 11.2" />
      </g>
      <rect class="so-2" x="35" y="21" width="2.4" height="5" rx="0.8" transform="rotate(30 36 23)" />
      <rect class="so-3" x="40" y="32" width="2.4" height="5" rx="0.8" transform="rotate(-25 41 34)" />
      <rect class="so-3" x="24" y="16" width="2.2" height="4.6" rx="0.8" transform="rotate(60 25 18)" />
      <rect class="so-2" x="53" y="47" width="2.2" height="4.6" rx="0.8" transform="rotate(-40 54 49)" />
      <circle class="so-2" cx="44" cy="29" r="1.3" />
      <circle class="so-3" cx="58" cy="27" r="1.2" />
    </template>

    <template v-else-if="theme === 'valentines'">
      <path class="so-line" d="M62 2Q46 26 31 9" fill="none" stroke-width="1" stroke-dasharray="2 2.5" />
      <g class="so-anim so-anim-beat"><path class="so-1" :d="HEART" transform="translate(47 16) scale(20)" /></g>
      <path class="so-2" :d="HEART" transform="translate(31 9) rotate(-15) scale(9)" />
      <path class="so-3" :d="HEART" transform="translate(55 37) rotate(12) scale(10)" />
    </template>

    <template v-else-if="theme === 'kenya_national'">
      <polygon class="so-ke-k" points="64,0 53,0 64,11" />
      <polygon class="so-ke-w" points="53,0 50,0 64,14 64,11" />
      <polygon class="so-ke-r" points="50,0 37,0 64,27 64,14" />
      <polygon class="so-ke-w" points="37,0 34,0 64,30 64,27" />
      <polygon class="so-ke-g" points="34,0 23,0 64,41 64,30" />
      <path class="so-edge" d="M23 0L64 41" fill="none" stroke-width="0.8" />
      <circle v-for="(p, i) in [[47.6, 4.1], [51.7, 8.2], [55.8, 12.3], [59.9, 16.4]]" :key="i" class="so-ke-w" :cx="p[0]" :cy="p[1]" r="1.1" />
    </template>

    <template v-else-if="theme === 'mazingira'">
      <g class="so-anim so-anim-sway so-vb" style="transform-origin: 62px 2px">
        <g v-for="l in [[120, 26, 'so-2'], [150, 22, 'so-1'], [178, 17, 'so-3'], [95, 16, 'so-3']]" :key="l[0]" :transform="`translate(62 2) rotate(${l[0]}) scale(${l[1]})`">
          <path :class="l[2]" d="M0 0C0.3-0.32 0.75-0.3 1 0C0.75 0.3 0.3 0.32 0 0Z" />
          <path class="so-vein" d="M0.06 0L0.9 0" fill="none" :stroke-width="0.9 / l[1]" />
        </g>
      </g>
      <path class="so-ink-stroke" d="M38 34Q37 28 40 24" fill="none" stroke-width="1.2" stroke-linecap="round" />
      <path class="so-1" d="M40 24C42 20 46 20 47 21C45 24 42 25 40 24Z" />
      <path class="so-3" d="M38.6 27C36 24 33 25 32.5 26C34 28.5 37 28.6 38.6 27Z" />
    </template>

    <template v-else-if="theme === 'labour_day'">
      <path class="so-2 so-anim so-anim-spin-slow" fill-rule="evenodd" :d="gear(48, 16, 12, 9.2, 8, 3.6)" />
      <path class="so-1 so-anim so-anim-spin-rev" fill-rule="evenodd" :d="gear(31.5, 7, 6.6, 4.9, 6, 1.8)" />
      <path class="so-1" d="M45 36L56 47" stroke-width="3.2" stroke-linecap="round" fill="none" style="stroke: var(--orn-1)" />
      <circle class="so-1" cx="44" cy="35" r="3.6" />
      <circle class="so-bg" cx="43" cy="34" r="1.6" />
    </template>

    <template v-else-if="theme === 'australia_day'">
      <g class="so-anim so-anim-sway so-vb" style="transform-origin: 63px 1px">
        <path class="so-2-stroke" d="M63 1Q50 8 40 29" fill="none" stroke-width="1.6" stroke-linecap="round" />
        <path class="so-2-stroke" d="M53 9.5L58 16M47 16L42 12M45 21L50 27M57 5L60 10" fill="none" stroke-width="1.1" stroke-linecap="round" />
        <circle v-for="(b, i) in WATTLE" :key="i" class="so-1" :cx="b[0]" :cy="b[1]" :r="b[2]" />
        <circle v-for="(b, i) in WATTLE" :key="'h' + i" class="so-3" :cx="b[0] - b[2] * 0.35" :cy="b[1] - b[2] * 0.35" :r="b[2] * 0.35" />
      </g>
    </template>

    <template v-else-if="theme === 'remembrance'">
      <path class="so-2-stroke" d="M47 22Q44 32 38 40" fill="none" stroke-width="1.4" stroke-linecap="round" />
      <path class="so-2" d="M43 32C38 31 35 33 34 35C38 36 41 35 43 32Z" />
      <circle class="so-1" cx="44" cy="12" r="6.4" />
      <circle class="so-1" cx="52" cy="12" r="6.4" />
      <circle class="so-1" cx="44" cy="20" r="6.4" />
      <circle class="so-1" cx="52" cy="20" r="6.4" />
      <circle class="so-1b" cx="48" cy="16" r="5" />
      <circle class="so-ink" cx="48" cy="16" r="3" />
      <circle v-for="(p, i) in [[46.6, 14.8], [49.4, 14.8], [48, 17.6]]" :key="i" class="so-shine" :cx="p[0]" :cy="p[1]" r="0.45" />
    </template>

    <template v-else-if="theme === 'easter'">
      <defs>
        <clipPath :id="`${uid}-egg-a`"><ellipse cx="50" cy="15" rx="6.6" ry="8.6" transform="rotate(-20 50 15)" /></clipPath>
        <clipPath :id="`${uid}-egg-b`"><ellipse cx="37" cy="9" rx="5" ry="6.6" transform="rotate(18 37 9)" /></clipPath>
        <clipPath :id="`${uid}-egg-c`"><ellipse cx="55" cy="33" rx="5.4" ry="7" transform="rotate(24 55 33)" /></clipPath>
      </defs>
      <g class="so-anim so-anim-rock">
        <ellipse class="so-1" cx="50" cy="15" rx="6.6" ry="8.6" transform="rotate(-20 50 15)" />
        <path :clip-path="`url(#${uid}-egg-a)`" class="so-band" d="M38 14L41 11L44 14L47 11L50 14L53 11L56 14L59 11L62 14" fill="none" stroke-width="1.6" />
      </g>
      <ellipse class="so-2" cx="37" cy="9" rx="5" ry="6.6" transform="rotate(18 37 9)" />
      <g :clip-path="`url(#${uid}-egg-b)`">
        <circle v-for="(p, i) in [[35, 7], [38.5, 9], [36, 11.5], [39, 5.5]]" :key="i" class="so-dot" :cx="p[0]" :cy="p[1]" r="0.9" />
      </g>
      <ellipse class="so-3" cx="55" cy="33" rx="5.4" ry="7" transform="rotate(24 55 33)" />
      <path :clip-path="`url(#${uid}-egg-c)`" class="so-band" d="M46 31L64 31M46 35L64 35" fill="none" stroke-width="1.3" />
    </template>

    <template v-else-if="theme === 'diwali'">
      <g v-for="(dy, i) in [[47, 22, 1.05], [55.5, 41, 0.8]]" :key="i" :transform="`translate(${dy[0]} ${dy[1]}) scale(${dy[2]})`">
        <g class="so-anim so-anim-flicker" :class="i ? 'so-delay-1' : ''">
          <path class="so-1" d="M0-11C3.4-6.6 3.2-2.4 0 0C-3.2-2.4-3.4-6.6 0-11Z" />
          <path class="so-3" d="M0-6.4C1.5-4.4 1.4-2 0-0.8C-1.4-2-1.5-4.4 0-6.4Z" />
        </g>
        <path class="so-2" d="M-10 0.5C-7 7 7 7 10 0.5L6 0.5C3 1.4-3 1.4-6 0.5Z" />
        <path class="so-band" d="M-7 3.2Q0 5.6 7 3.2" fill="none" stroke-width="0.9" />
      </g>
      <circle v-for="(p, i) in [[32, 7, 1.3], [37, 14, 0.9], [29, 17, 0.8], [40, 33, 1]]" :key="'d' + i" class="so-1 so-anim so-anim-twinkle" :class="'so-delay-' + (i % 3)" :cx="p[0]" :cy="p[1]" :r="p[2]" />
    </template>

    <template v-else-if="theme === 'eid'">
      <defs>
        <mask :id="`${uid}-crescent`"><rect width="64" height="64" fill="#fff" /><circle cx="51" cy="12" r="9.6" fill="#000" /></mask>
      </defs>
      <circle class="so-1" cx="46" cy="16" r="11" :mask="`url(#${uid}-crescent)`" />
      <polygon class="so-1 so-anim so-anim-twinkle" :points="star(31, 8, 3.6, 1.5)" />
      <polygon class="so-1 so-anim so-anim-twinkle so-delay-1" :points="star(36, 24, 2.8, 1.2)" />
      <polygon class="so-1 so-anim so-anim-twinkle so-delay-2" :points="star(47, 41, 2.4, 1)" />
      <g class="so-anim so-anim-swing so-vb" style="transform-origin: 54px 0px">
        <path class="so-line" d="M54 0V29" fill="none" stroke-width="0.9" />
        <path class="so-2" d="M51 29.5H57L58 32H50Z" />
        <rect class="so-2" x="50.6" y="32" width="6.8" height="10.5" rx="2.2" />
        <rect class="so-glow" x="52.3" y="33.8" width="3.4" height="6.9" rx="1.2" />
        <path class="so-2" d="M51.5 42.5H56.5L55 44.6H53Z" />
      </g>
    </template>

    <template v-else-if="theme === 'black_friday'">
      <path class="so-line" d="M64 0Q60 5 54.5 8" fill="none" stroke-width="1" />
      <g class="so-anim so-anim-swing so-vb" style="transform-origin: 54.5px 8px">
        <g transform="translate(54.5 8) rotate(102)">
          <path class="so-1 so-tag" d="M0 0L7-7.5H28V7.5H7Z" stroke-width="0.9" stroke-linejoin="round" />
          <circle class="so-bg" cx="6.4" cy="0" r="1.8" />
          <text class="so-ink-text" x="0" y="0" transform="translate(18.5 0) rotate(-102)" text-anchor="middle" dominant-baseline="central" font-size="9.5" font-weight="800">%</text>
        </g>
      </g>
      <g class="so-line" fill="none" stroke-width="1.1" stroke-linecap="round">
        <path d="M40 9L36 7M41 15L36.5 15.5M43 20.5L39.5 23" />
      </g>
    </template>

    <template v-else-if="theme === 'womens_day'">
      <g class="so-anim so-anim-sway so-vb" style="transform-origin: 48px 6px">
        <path class="so-1" fill-rule="evenodd" d="M48 5C42 5 40 13 44 19.5L36 33L40.2 35.6L48 24.6L55.8 35.6L60 33L52 19.5C56 13 54 5 48 5ZM48 9.2C51 9.2 52 13.4 49.6 17L48 19.2L46.4 17C44 13.4 45 9.2 48 9.2Z" />
      </g>
      <path class="so-2-stroke" d="M28 6Q32 13 30 20" fill="none" stroke-width="1.2" stroke-linecap="round" />
      <path class="so-2" d="M29 10C25 9 23.5 11 23 12.5C26 13.5 28 12.5 29 10Z" />
      <path class="so-2" d="M30.6 15C34 13 35.6 14.6 36 16C33.5 17.6 31.5 17 30.6 15Z" />
      <circle class="so-3" cx="58" cy="44" r="1.6" />
      <circle class="so-2" cx="40" cy="42" r="1.3" />
    </template>

    <template v-else-if="theme === 'mothers_day'">
      <g class="so-anim so-anim-sway so-vb" style="transform-origin: 60px 3px">
        <g v-for="t in [[220, 1, 'so-1'], [198, 0.82, 'so-3'], [243, 0.78, 'so-3']]" :key="t[0]" :transform="`translate(60 3) rotate(${t[0]}) scale(${t[1]}) translate(0 -26)`">
          <path class="so-2-stroke" d="M0 0V26" fill="none" stroke-width="1.4" />
          <path :class="t[2]" d="M0 0C-5.5-1.5-6.5-9-4.4-13.5L-2-9L0-14.5L2-9L4.4-13.5C6.5-9 5.5-1.5 0 0Z" />
        </g>
      </g>
      <path class="so-2" d="M52 16C46 15 44 18 43.5 20C47 21 50 19.5 52 16Z" />
      <circle class="so-bow" cx="60" cy="3" r="2.6" />
    </template>

    <template v-else-if="theme === 'fathers_day'">
      <g class="so-anim so-anim-rock"><g transform="rotate(-12 48 16)">
        <path class="so-1" d="M48 16L36.5 8.5Q35 16 36.5 23.5Z" stroke-linejoin="round" />
        <path class="so-1" d="M48 16L59.5 8.5Q61 16 59.5 23.5Z" stroke-linejoin="round" />
        <circle v-for="(p, i) in [[39.5, 12], [39.5, 19.5], [42.5, 16], [56.5, 12], [56.5, 19.5], [53.5, 16]]" :key="i" class="so-2" :cx="p[0]" :cy="p[1]" r="1.1" />
        <rect class="so-3" x="45.4" y="12.6" width="5.2" height="6.8" rx="1.6" />
      </g></g>
      <polygon class="so-2" :points="star(33, 31, 3.4, 1.4)" />
      <polygon class="so-3" :points="star(54, 40, 2.4, 1)" />
    </template>
  </svg>
</template>

<script>
// Unit heart (≈1 wide), centred near the origin.
const HEART = 'M0 0.36C-0.1 0.26-0.5 0.05-0.5-0.2C-0.5-0.42-0.3-0.52-0.15-0.48C-0.07-0.46-0.02-0.4 0-0.35C0.02-0.4 0.07-0.46 0.15-0.48C0.3-0.52 0.5-0.42 0.5-0.2C0.5 0.05 0.1 0.26 0 0.36Z'

// Wattle blossoms along the sprig: [cx, cy, r]
const WATTLE = [
  [57, 6, 2.4],
  [52.5, 9, 2.6],
  [59, 13.5, 2.2],
  [47.5, 14.5, 2.5],
  [51, 19.5, 2.3],
  [43.5, 20.5, 2.4],
  [46, 26, 2.1],
  [40.5, 29.5, 2]
]

let uidSeq = 0

export default {
  name: 'SeasonOrnament',
  props: { theme: { type: String, default: '' } },
  data() {
    uidSeq += 1
    return { HEART, WATTLE, uid: `so${uidSeq}` }
  },
  methods: {
    // Points of a five-pointed star.
    star(cx, cy, R, r) {
      const pts = []
      for (let i = 0; i < 10; i++) {
        const a = ((-90 + 36 * i) * Math.PI) / 180
        const rad = i % 2 ? r : R
        pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`)
      }
      return pts.join(' ')
    },
    // A cog: n teeth between radii ro (tips) and ri (root), with a hole.
    gear(cx, cy, ro, ri, n, hole) {
      const step = (Math.PI * 2) / n
      let d = ''
      for (let i = 0; i < n; i++) {
        const a = i * step
        const pts = [
          [ri, a],
          [ro, a + step * 0.12],
          [ro, a + step * 0.42],
          [ri, a + step * 0.54]
        ]
        for (const [rad, ang] of pts) d += `${d ? 'L' : 'M'}${(cx + rad * Math.cos(ang)).toFixed(2)} ${(cy + rad * Math.sin(ang)).toFixed(2)}`
      }
      d += 'Z'
      d += `M${cx + hole} ${cy}A${hole} ${hole} 0 1 0 ${cx - hole} ${cy}A${hole} ${hole} 0 1 0 ${cx + hole} ${cy}Z`
      return d
    }
  }
}
</script>
