<template>
  <section class="wd" data-testid="withdrawn" :style="accentStyle">
    <div class="wd__band" aria-hidden="true"></div>
    <header class="wd__brand">
      <img v-if="logo" :src="logo" :alt="biz.name || 'Logo'" class="wd__logo" @error="logoFailed = true" />
      <strong v-else class="wd__name">{{ biz.name || 'The sender' }}</strong>
    </header>
    <div class="wd__icon" aria-hidden="true"><i class="fa-solid fa-file-circle-xmark"></i></div>
    <p v-if="w.number" class="wd__doc">{{ docLabel }} {{ w.number }}</p>
    <h1>No longer available</h1>
    <p class="wd__msg" data-testid="withdrawn-message">{{ w.message }}</p>
    <ul v-if="contacts.length" class="wd__contacts">
      <li v-for="c in contacts" :key="c.href">
        <a :href="c.href" :target="c.external ? '_blank' : null" :rel="c.external ? 'noopener' : null"><i :class="c.icon"></i> {{ c.label }}</a>
      </li>
    </ul>
    <p class="wd__fine">Links in the email you received no longer open it. If you already paid, please let {{ biz.name || 'them' }} know.</p>
  </section>
</template>

<script>
/**
 * The neutral page a recalled email's link opens (pkg/invoicing recall.go): who withdrew which document and when,
 * how to reach them — never an amount or a line item. Uses the app's light / dark tokens and the business accent.
 */
export default {
  name: 'WithdrawnNotice',
  props: { w: { type: Object, required: true } },
  data() {
    return { logoFailed: false }
  },
  computed: {
    biz() {
      return this.w.business || {}
    },
    logo() {
      return !this.logoFailed && this.biz.logo_url ? this.biz.logo_url : ''
    },
    docLabel() {
      const word = this.w.doc_word || 'invoice'
      return word.charAt(0).toUpperCase() + word.slice(1)
    },
    accentStyle() {
      const a = this.biz.accent_color
      return /^#[0-9a-fA-F]{6}$/.test(a || '') ? { '--wd-accent': a } : {}
    },
    contacts() {
      const out = []
      if (this.biz.email) out.push({ href: `mailto:${this.biz.email}`, label: this.biz.email, icon: 'fa-regular fa-envelope' })
      if (this.biz.phone) out.push({ href: `tel:${this.biz.phone.replace(/\s+/g, '')}`, label: this.biz.phone, icon: 'fa-solid fa-phone' })
      if (this.biz.website) {
        const href = /^https?:\/\//.test(this.biz.website) ? this.biz.website : `https://${this.biz.website}`
        out.push({ href, label: this.biz.website.replace(/^https?:\/\//, ''), icon: 'fa-solid fa-globe', external: true })
      }
      return out
    }
  }
}
</script>

<style scoped>
.wd {
  --wd-accent: var(--accent);
  position: relative;
  max-width: 560px;
  margin: 40px auto 0;
  padding: 34px 28px 26px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  text-align: center;
  overflow: hidden;
}
.wd__band {
  position: absolute;
  inset: 0 0 auto 0;
  height: 6px;
  background: var(--wd-accent);
}
.wd__brand {
  display: flex;
  justify-content: center;
  min-height: 40px;
  margin-bottom: 18px;
}
.wd__logo {
  max-height: 48px;
  max-width: 200px;
  object-fit: contain;
  background: #fff;
  border-radius: 6px;
  padding: 4px;
}
.wd__name {
  font-size: 18px;
  color: var(--text);
}
.wd__icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--neutral-soft);
  color: var(--text-2);
  font-size: 22px;
}
.wd__doc {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
h1 {
  font-size: 20px;
  margin: 0 0 8px;
  color: var(--text);
  overflow-wrap: anywhere;
}
.wd__msg {
  margin: 0 auto;
  max-width: 440px;
  color: var(--text-2);
  font-size: 15px;
  line-height: 1.55;
}
.wd__contacts {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.wd__contacts a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text);
  text-decoration: none;
  font-size: 13.5px;
  overflow-wrap: anywhere;
}
.wd__contacts a:hover {
  background: var(--surface-hover);
}
.wd__contacts i {
  color: var(--wd-accent);
}
.wd__fine {
  margin: 18px 0 0;
  font-size: 12.5px;
  color: var(--text-3);
}
@media (max-width: 480px) {
  .wd {
    margin-top: 12px;
    padding: 28px 16px 20px;
  }
}
</style>
