/**
 * Seasonal themes the web app draws (styles/seasons.css + SeasonOrnament).
 * The backend's list (pkg/occasions/themes.go) is the source for the admin
 * page; this map is what the greeting chip needs without a round trip.
 */
export const SEASON_THEMES = {
  halloween: { label: 'Halloween', icon: 'fa-solid fa-ghost' },
  christmas: { label: 'Christmas', icon: 'fa-solid fa-tree' },
  new_year: { label: 'New Year', icon: 'fa-solid fa-champagne-glasses' },
  valentines: { label: "Valentine's Day", icon: 'fa-solid fa-heart' },
  kenya_national: { label: 'Kenyan national day', icon: 'fa-solid fa-flag' },
  mazingira: { label: 'Mazingira Day', icon: 'fa-solid fa-seedling' },
  labour_day: { label: 'Labour Day', icon: 'fa-solid fa-helmet-safety' },
  australia_day: { label: 'Australia Day', icon: 'fa-solid fa-sun' },
  remembrance: { label: 'Remembrance', icon: 'fa-solid fa-dove' },
  easter: { label: 'Easter', icon: 'fa-solid fa-egg' },
  diwali: { label: 'Diwali', icon: 'fa-solid fa-fire-flame-curved' },
  eid: { label: 'Eid', icon: 'fa-solid fa-moon' },
  black_friday: { label: 'Black Friday', icon: 'fa-solid fa-tags' },
  womens_day: { label: "International Women's Day", icon: 'fa-solid fa-venus' },
  mothers_day: { label: "Mother's Day", icon: 'fa-solid fa-spa' },
  fathers_day: { label: "Father's Day", icon: 'fa-solid fa-mug-hot' }
}

export const SEASON_THEME_KEYS = Object.keys(SEASON_THEMES)

export function seasonIcon(theme) {
  return SEASON_THEMES[theme]?.icon || 'fa-solid fa-star'
}

export function seasonLabel(theme) {
  return SEASON_THEMES[theme]?.label || theme
}

export const KIND_LABELS = {
  public_holiday: 'Public holiday',
  observance: 'Observance',
  commercial: 'Shopping season',
  custom: 'Custom'
}

export const COUNTRY_NAMES = { KE: 'Kenya', AU: 'Australia' }

/** "Kenya, Australia" / "Everywhere" / "Everywhere except Kenya". */
export function countriesLabel(o) {
  const name = (c) => COUNTRY_NAMES[c] || c
  if (o?.countries?.length) return o.countries.map(name).join(', ')
  if (o?.except_countries?.length) return `Everywhere except ${o.except_countries.map(name).join(' and ')}`
  return 'Everywhere'
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a, b) {
  const lum = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
    if (!m) return 0
    const v = parseInt(m[1], 16)
    const ch = (c) => {
      c /= 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * ch((v >> 16) & 255) + 0.7152 * ch((v >> 8) & 255) + 0.0722 * ch(v & 255)
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
