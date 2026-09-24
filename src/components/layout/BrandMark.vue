<template>
  <svg class="brand-mark" :width="size" :height="size" viewBox="0 0 64 64" role="img" :aria-label="label" focusable="false">
    <defs>
      <linearGradient :id="`${uid}-g`" x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#7c6bff" />
        <stop offset=".45" stop-color="#5b4cf0" />
        <stop offset="1" stop-color="#2f86ff" />
      </linearGradient>
      <linearGradient :id="`${uid}-s`" x1="32" y1="0" x2="32" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fff" stop-opacity=".22" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="18" :fill="`url(#${uid}-g)`" />
    <rect width="64" height="64" rx="18" :fill="`url(#${uid}-s)`" />
    <path
      d="M36.4 9.5 16.6 35.2c-.8 1-.1 2.5 1.2 2.5H29l-3.3 15.4c-.3 1.5 1.6 2.4 2.6 1.2l19.8-25.7c.8-1 .1-2.5-1.2-2.5H35.8l3.2-15.4c.4-1.5-1.6-2.4-2.6-1.2Z"
      fill="#fff"
    />
  </svg>
</template>

<script>
// The DASYIN ERP mark — identical to public/favicon.svg so the app icon and the in-app logo match.
let n = 0
export default {
  name: 'BrandMark',
  props: {
    size: { type: [Number, String], default: 36 },
    label: { type: String, default: 'DASYIN ERP' }
  },
  data() {
    n += 1
    return { uid: `bm${n}` }
  }
}
</script>

<style scoped>
.brand-mark {
  display: block;
  flex-shrink: 0;
  border-radius: 28%;
  box-shadow: 0 6px 16px -6px rgba(91, 76, 240, 0.7);
}
</style>
