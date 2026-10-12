import { describe, it, expect } from 'vitest'
import {
  defaultLocations,
  locationsFromExisting,
  changedLocations,
  validateBarSetup,
  validCutoff,
  groupCatalog,
  unitText,
  existingCatalogKeys,
  spiritsSelected,
  buildSetupPayload,
  normaliseCutoff,
  summarise,
  menuItemsText,
  summaryToast
} from '../views/setup/barSetup'

const catalog = [
  { key: 'tusker_500', name: 'Tusker Lager 500 ml', category: 'beer', base_unit: 'unit', unit_size: 1, unit_label: 'bottle', pack_size: 25, pack_label: 'crate' },
  { key: 'jameson_750', name: 'Jameson Irish Whiskey 750 ml', category: 'spirits', base_unit: 'ml', unit_size: 750, unit_label: 'bottle', pack_size: 12, pack_label: 'case' },
  { key: 'gilbeys_750', name: "Gilbey's Gin 750 ml", category: 'spirits', base_unit: 'ml', unit_size: 750, unit_label: 'bottle', pack_size: 12, pack_label: 'case' },
  { key: 'keg_50', name: 'Tusker keg 50 L', category: 'beer', base_unit: 'ml', unit_size: 50000, unit_label: 'keg', pack_size: 1, pack_label: '' },
  { key: 'lemons', name: 'Lemons', category: 'garnish', base_unit: 'unit', unit_size: 1, unit_label: 'piece' },
  { key: 'coke_300', name: 'Coca-Cola 300 ml', category: 'soft_drinks', base_unit: 'unit', unit_size: 1, unit_label: 'bottle', pack_size: 24, pack_label: 'crate' },
  { key: 'mystery', name: 'Shisha coals', category: 'shisha' }
]

describe('bar setup: locations', () => {
  it('suggests a main store and two bars', () => {
    const l = defaultLocations()
    expect(l.map((x) => `${x.name}/${x.type}/${x.main}`)).toEqual(['Main store/store/true', 'Main bar/bar/false', 'VIP bar/bar/false'])
    expect(new Set(l.map((x) => x.key)).size).toBe(3)
  })

  it('maps existing locations and picks a main store when none is flagged', () => {
    const rows = locationsFromExisting([
      { id: 'a', name: 'Counter', type: 'bar' },
      { id: 'b', name: 'Back store', type: 'store' },
      { id: 'c', name: 'Odd', type: 'garage' }
    ])
    expect(rows.map((r) => `${r.id}:${r.type}:${r.main}:${r.existing}`)).toEqual(['a:bar:false:true', 'b:store:true:true', 'c:bar:false:true'])
    expect(locationsFromExisting([{ id: 'x', name: 'Main', type: 'bar', is_main_store: true }])[0].main).toBe(true)
    expect(locationsFromExisting(null)).toEqual([])
  })

  it('finds existing locations renamed or retyped in the form', () => {
    const rows = locationsFromExisting([
      { id: 'a', name: 'Counter', type: 'bar' },
      { id: 'b', name: 'Back store', type: 'store' },
      { id: 'c', name: 'Patio', type: 'bar' }
    ])
    rows[0].name = 'Counter bar '
    rows[2].type = 'event'
    rows.push({ ...defaultLocations()[1], name: 'New bar' })
    expect(changedLocations(rows).map((r) => r.id)).toEqual(['a', 'c'])
  })

  it('validates names, a bar, one main store, tot size and cutoff', () => {
    const ok = validateBarSetup({ locations: defaultLocations(), tot_ml: 25, day_cutoff: '06:00' })
    expect(ok.ok).toBe(true)

    const dup = defaultLocations()
    dup[2].name = 'main bar'
    expect(validateBarSetup({ locations: dup, tot_ml: 25, day_cutoff: '06:00' }).errors.rows[2]).toBe('Two locations have this name')

    const blank = defaultLocations()
    blank[1].name = ' '
    expect(validateBarSetup({ locations: blank, tot_ml: 25, day_cutoff: '06:00' }).errors.rows[1]).toBe('Give this location a name')

    const noBar = defaultLocations().slice(0, 1)
    expect(validateBarSetup({ locations: noBar, tot_ml: 25, day_cutoff: '06:00' }).errors.locations).toMatch(/at least one bar/)

    const noMain = defaultLocations().map((l) => ({ ...l, main: false }))
    expect(validateBarSetup({ locations: noMain, tot_ml: 25, day_cutoff: '06:00' }).errors.locations).toMatch(/main store/)

    expect(validateBarSetup({ locations: [], tot_ml: 25, day_cutoff: '06:00' }).errors.locations).toMatch(/at least one/)
    expect(validateBarSetup({ locations: defaultLocations(), tot_ml: 0, day_cutoff: '06:00' }).errors.tot_ml).toBeTruthy()
    expect(validateBarSetup({ locations: defaultLocations(), tot_ml: 250, day_cutoff: '06:00' }).errors.tot_ml).toBeTruthy()
    expect(validateBarSetup({ locations: defaultLocations(), tot_ml: 30, day_cutoff: '18:00' }).errors.day_cutoff).toBeTruthy()
  })

  it('accepts morning cutoffs only', () => {
    expect(validCutoff('06:00')).toBe(true)
    expect(validCutoff('00:00')).toBe(true)
    expect(validCutoff('12:00')).toBe(true)
    expect(validCutoff('12:30')).toBe(false)
    expect(validCutoff('6:00')).toBe(false)
    expect(validCutoff('')).toBe(false)
    expect(normaliseCutoff('6:00')).toBe('06:00')
    expect(normaliseCutoff('05:30:00')).toBe('05:30')
    expect(normaliseCutoff(null)).toBe('06:00')
  })
})

describe('bar setup: starter stock list', () => {
  it('groups by category in a fixed order, unknown categories last', () => {
    const g = groupCatalog(catalog)
    expect(g.map((x) => x.category)).toEqual(['spirits', 'beer', 'soft_drinks', 'garnish', 'shisha'])
    expect(g[0].items.map((i) => i.key)).toEqual(['gilbeys_750', 'jameson_750'])
    expect(g[4].label).toBe('Shisha')
  })

  it('searches name, category and unit (accent and case insensitive)', () => {
    expect(groupCatalog(catalog, 'tusker').flatMap((x) => x.items.map((i) => i.key))).toEqual(['keg_50', 'tusker_500'])
    expect(groupCatalog(catalog, 'SPIRITS').flatMap((x) => x.items.map((i) => i.key)).length).toBe(2)
    expect(groupCatalog(catalog, 'tusker keg').flatMap((x) => x.items.map((i) => i.key))).toEqual(['keg_50'])
    expect(groupCatalog(catalog, 'nothing like this')).toEqual([])
  })

  it('describes units and packs', () => {
    expect(unitText(catalog[1])).toBe('750 ml bottle · case of 12')
    expect(unitText(catalog[3])).toBe('50 L keg')
    expect(unitText(catalog[0])).toBe('bottle · crate of 25')
    expect(unitText(catalog[4])).toBe('piece')
    expect(unitText({ base_unit: 'ml', unit_size: 1500, unit_label: 'bottle' })).toBe('1.5 L bottle')
  })

  it('knows what is already in the stock list (re-run)', () => {
    const have = existingCatalogKeys(catalog, [{ name: 'tusker lager 500 ml' }, { name: 'Other', catalog_key: 'lemons' }])
    expect([...have].sort()).toEqual(['lemons', 'tusker_500'])
    expect(existingCatalogKeys([{ key: 'a', name: 'A', exists: true }], []).has('a')).toBe(true)
  })

  it('counts selected spirits', () => {
    expect(spiritsSelected(catalog, new Set(['jameson_750', 'tusker_500', 'gilbeys_750']))).toBe(2)
    expect(spiritsSelected(catalog, [])).toBe(0)
  })
})

describe('bar setup: payload and summary', () => {
  it('builds the POST /bar/setup body (existing items stay: the API skips them)', () => {
    const locations = defaultLocations()
    locations[2].name = '  VIP lounge '
    const body = buildSetupPayload({
      locations: [...locations, { name: '', type: 'bar' }],
      tot_ml: '30',
      day_cutoff: '5:00',
      selected: new Set(['tusker_500', 'jameson_750', 'lemons']),
      make_menu_items: true
    })
    expect(body).toEqual({
      locations: [
        { name: 'Main store', type: 'store', is_main_store: true },
        { name: 'Main bar', type: 'bar', is_main_store: false },
        { name: 'VIP lounge', type: 'bar', is_main_store: false }
      ],
      tot_ml: 30,
      day_cutoff: '05:00',
      catalog_keys: ['jameson_750', 'lemons', 'tusker_500'],
      make_menu_items: true
    })
  })

  it('summarises the API answer, falling back to what was sent', () => {
    const payload = buildSetupPayload({ locations: defaultLocations(), tot_ml: 25, day_cutoff: '06:00', selected: ['a', 'b', 'c'], make_menu_items: true })
    const s = summarise({ summary: { items_created: ['A', 'B'], items_existing: ['C'], menu_items_created: ['A tot', 'A bottle', 'B tot', 'B bottle'] } }, payload)
    expect(s.items).toBe(2)
    expect(s.skipped).toBe(1)
    expect(s.menuItems).toBe(4)
    expect(s.locations.map((l) => l.name)).toEqual(['Main store', 'Main bar', 'VIP bar'])
    expect(s.locations[0].main).toBe(true)
    const f = summarise(null, payload)
    expect(f.items).toBe(3)
    expect(f.menuItems).toBe(null)
    expect(summarise({ created: { items: [1, 2], menu_items: [1] } }, payload).menuItems).toBe(1)
  })

  it('words the summary and the toast for a first run and a re-run', () => {
    const payload = buildSetupPayload({ locations: defaultLocations(), tot_ml: 25, day_cutoff: '06:00', selected: ['a'], make_menu_items: true })
    const first = summarise({ summary: { locations_created: ['x', 'y', 'z'], items_created: ['A'], items_existing: [], menu_items_created: ['A tot', 'A bottle'] } }, payload)
    expect(summaryToast(first)).toBe('Bar set up: 3 new locations, 1 stock item, 2 menu items added')
    expect(menuItemsText(first)).toBe('2 tot & bottle items')
    const again = summarise({ summary: { locations_created: [], items_created: [], items_existing: ['A'], menu_items_created: [] } }, payload)
    expect(summaryToast(again)).toBe('Bar settings saved — nothing new to add')
    expect(menuItemsText(again)).toBe('Already on the till')
    expect(menuItemsText(summarise(null, payload))).toBe('Tot & bottle items for your spirits')
  })
})
