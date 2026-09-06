import { describe, expect, it } from 'vitest'
import rawData from '../../handoff/menu-data.json'
import { mergeMenuData } from './menuMerge'
import { optimize, optimizeWithFixed, searchOffers, selectableOffers } from './optimizer'
import { createHypotheticalDrinkOffer, SIMULATION_DRINK_ID } from './simulation'
import { createFloatModifierOffer, FLOAT_MODIFIER_ID } from './simulation'
import { activeNow, customData, data, filters, offer, soloOptions } from '../test/fixtures'
import type { MenuData, SearchOptions } from './types'

const mergedData = mergeMenuData(rawData as MenuData)

describe('optimizer eligibility and ranking', () => {
  it('never returns below 2,000 yen or baskets without omurice', () => {
    const results = optimize(data, soloOptions, activeNow)
    expect(results.length).toBe(20)
    expect(results.every((basket) => basket.total >= 2000)).toBe(true)
    expect(results.every((basket) => basket.lines.some(({ offer: item }) => item.containsOmurice))).toBe(true)
  })

  it('matches the 2026-09-05 best regression fixture without hard-coding it', () => {
    const [best] = optimize(data, soloOptions, activeNow)
    expect(best.total).toBe(2013)
    expect(best.overage).toBe(13)
    expect(best.key).toContain('grand_kaisen')
    expect(best.key).toContain('grand_side_sausage')
  })

  it('activates autumn at the JST boundary and ranks 2,002 yen first', () => {
    const [best] = optimize(data, soloOptions, new Date('2026-09-10T00:00:00+09:00'))
    expect(best.total).toBe(2002)
    expect(best.key).toContain('autumn_porcini_s')
    expect(best.key).toContain('autumn_salad')
    expect(best.key).not.toContain('summer_')
  })

  it('qualifies a bundle by containsOmurice rather than category name', () => {
    const bundle = offer({ id: 'bundle', price: 2000, category: 'bundle', containsOmurice: true })
    const results = optimize(customData([bundle]), { ...soloOptions }, activeNow)
    expect(results[0]?.key).toBe('bundle:1')
  })

  it('never qualifies a pasta-only basket', () => {
    const pasta = offer({ id: 'pasta', price: 2000, category: 'pasta' })
    const options: SearchOptions = { ...soloOptions, preset: 'price', filters: { ...filters, includePasta: true } }
    expect(optimize(customData([pasta]), options, activeNow)).toEqual([])
  })

  it('supports quantity two and dedupes generation order', () => {
    const omurice = offer({ id: 'omu', price: 1200, category: 'omurice', containsOmurice: true, size: 'SS' })
    const side = offer({ id: 'side', price: 400 })
    const results = optimize(customData([side, omurice]), soloOptions, activeNow)
    expect(results[0].key).toBe('omu:1|side:2')
    expect(results[0].total).toBe(2000)
    expect(results[0].duplicateUnits).toBe(1)
    expect(new Set(results.map((basket) => basket.key)).size).toBe(results.length)
  })

  it('ranks exact 2,000 before 2,001 before 2,010', () => {
    const menu = [
      offer({ id: 'omu-2000', price: 2000, category: 'omurice', containsOmurice: true, size: 'SS' }),
      offer({ id: 'omu-2001', price: 2001, category: 'omurice', containsOmurice: true, size: 'SS' }),
      offer({ id: 'omu-2010', price: 2010, category: 'omurice', containsOmurice: true, size: 'SS' }),
    ]
    expect(optimize(customData(menu), soloOptions, activeNow).slice(0, 3).map((basket) => basket.total)).toEqual([2000, 2001, 2010])
  })

  it('uses fewer units, then fewer duplicates, then ids for deterministic ties', () => {
    const menu = [
      offer({ id: 'a-single', price: 2000, category: 'omurice', containsOmurice: true, size: 'SS' }),
      offer({ id: 'b-omu', price: 1000, category: 'omurice', containsOmurice: true, size: 'SS' }),
      offer({ id: 'c-side', price: 500 }),
      offer({ id: 'd-side', price: 500 }),
    ]
    const results = optimize(customData(menu), { ...soloOptions, preset: 'price' }, activeNow)
    expect(results[0].key).toBe('a-single:1')
    const twoUnitTie = results.filter((basket) => basket.total === 2000 && basket.unitCount === 2)
    expect(twoUnitTie[0].duplicateUnits).toBeLessThanOrEqual(twoUnitTie.at(-1)!.duplicateUnits)
    expect(results.map((basket) => basket.key)).toEqual([...results.map((basket) => basket.key)].sort((a, b) => {
      const left = results.find((basket) => basket.key === a)!
      const right = results.find((basket) => basket.key === b)!
      return left.overage - right.overage || left.unitCount - right.unitCount || left.duplicateUnits - right.duplicateUnits || a.localeCompare(b, 'en')
    }))
  })

  it('enforces one-person and two-person main-dish unit semantics', () => {
    const omurice = offer({ id: 'omu', price: 1000, category: 'omurice', containsOmurice: true, size: 'SS' })
    const pasta = offer({ id: 'pasta', price: 1000, category: 'pasta' })
    const base = customData([omurice, pasta])
    const pair = optimize(base, { ...soloOptions, preset: 'pair', filters: { ...filters, includePasta: true } }, activeNow)
    const solo = optimize(base, { ...soloOptions, filters: { ...filters, includePasta: true } }, activeNow)
    expect(pair[0].key).toBe('omu:1|pasta:1')
    expect(solo).toEqual([])
  })

  it('returns identical top 20 on repeated runs', () => {
    const first = optimize(data, soloOptions, activeNow).map((basket) => basket.key)
    const second = optimize(data, soloOptions, activeNow).map((basket) => basket.key)
    expect(second).toEqual(first)
  })

  it('keeps lunch items out until lunch mode is enabled', () => {
    const off = optimize(data, soloOptions, activeNow)
    const on = optimize(data, { ...soloOptions, filters: { ...filters, includeLunch: true } }, activeNow)
    expect(off.every((basket) => basket.lines.every(({ offer: item }) => item.menuContext !== 'lunch'))).toBe(true)
    expect(on.some((basket) => basket.lines.some(({ offer: item }) => item.menuContext === 'lunch'))).toBe(true)
  })

  it('keeps staple-heavy exact totals below practical solo candidates', () => {
    const omurice = offer({ id: 'omu', price: 1200, category: 'omurice', containsOmurice: true, size: 'SS' })
    const rice = offer({ id: 'ref_rice_single', name: '単品ライス', price: 400, category: 'other' })
    const side = offer({ id: 'side', price: 820, category: 'side' })
    const results = optimize(customData([omurice, rice, side]), soloOptions, activeNow)

    expect(results[0].key).toBe('omu:1|side:1')
    expect(results[0].total).toBe(2020)
    expect(results.every((basket) => !basket.key.includes('ref_rice_single'))).toBe(true)
  })

  it('does not auto-add another omurice, pasta, or doria in solo', () => {
    const omurice = offer({ id: 'omu', price: 1300, category: 'omurice', containsOmurice: true, size: 'SS' })
    const otherOmurice = offer({ id: 'other-omu', price: 700, category: 'omurice', containsOmurice: true, size: 'SS' })
    const pasta = offer({ id: 'pasta', price: 700, category: 'pasta' })
    const doria = offer({ id: 'doria', price: 700, category: 'doria' })
    const drink = offer({ id: 'drink', price: 700, category: 'drink' })
    const results = optimize(customData([omurice, otherOmurice, pasta, doria, drink]), soloOptions, activeNow)

    expect(results[0].key).toBe('drink:1|omu:1')
    expect(results.every((basket) => !basket.key.includes('pasta') && !basket.key.includes('doria'))).toBe(true)
    expect(results.every((basket) => basket.lines.filter(({ offer: item }) => item.containsOmurice).reduce((sum, line) => sum + line.quantity, 0) === 1)).toBe(true)
  })

  it('allows drinks, sides, and desserts as practical solo additions', () => {
    for (const category of ['drink', 'side', 'dessert'] as const) {
      const omurice = offer({ id: `omu-${category}`, price: 1300, category: 'omurice', containsOmurice: true, size: 'SS' })
      const addon = offer({ id: `addon-${category}`, price: 700, category })
      const [best] = optimize(customData([omurice, addon]), soloOptions, activeNow)
      expect(best.key).toContain(`addon-${category}:1`)
    }
  })

  it('keeps the existing pair representative result unchanged', () => {
    const [best] = optimize(mergedData, { ...soloOptions, preset: 'pair' }, activeNow)
    expect(best.key).toBe('ref_classic_bacon_ss:2')
    expect(best.total).toBe(2090)
    expect(best.overage).toBe(90)
  })

  it('keeps mathematical minimum-overage behavior in price mode', () => {
    const omurice = offer({ id: 'omu', price: 1200, category: 'omurice', containsOmurice: true, size: 'SS' })
    const rice = offer({ id: 'ref_rice_single', name: '単品ライス', price: 400, category: 'other' })
    const side = offer({ id: 'side', price: 820, category: 'side' })
    const [best] = optimize(customData([omurice, rice, side]), { ...soloOptions, preset: 'price' }, activeNow)

    expect(best.key).toBe('omu:1|ref_rice_single:2')
    expect(best.overage).toBe(0)
  })

  it('prefers a one-item 2,090 yen omurice over a staple-heavy 2,002 yen light candidate', () => {
    const expensive = offer({ id: 'expensive', price: 2090, category: 'omurice', containsOmurice: true, size: 'SS' })
    const cheap = offer({ id: 'cheap', price: 1300, category: 'omurice', containsOmurice: true, size: 'SS' })
    const rice = offer({ id: 'ref_rice_single', name: '単品ライス', price: 351, category: 'other' })
    const [best] = optimize(customData([expensive, cheap, rice]), { ...soloOptions, preset: 'light' }, activeNow)

    expect(best.key).toBe('expensive:1')
    expect(best.overage).toBe(90)
  })

  it('prefers SS over larger omurice sizes when light candidates otherwise tie', () => {
    const sizeS = offer({ id: 'size-s', price: 2090, category: 'omurice', containsOmurice: true, size: 'S' })
    const sizeL = offer({ id: 'size-l', price: 2090, category: 'omurice', containsOmurice: true, size: 'L' })
    const sizeSS = offer({ id: 'size-ss', price: 2090, category: 'omurice', containsOmurice: true, size: 'SS' })
    const results = optimize(customData([sizeS, sizeL, sizeSS]), { ...soloOptions, preset: 'light' }, activeNow)

    expect(results[0].key).toBe('size-ss:1')
  })

  it('keeps pasta and doria out while allowing drink and dessert additions in light mode', () => {
    for (const addonCategory of ['drink', 'dessert'] as const) {
      const omurice = offer({ id: `omu-${addonCategory}`, price: 1300, category: 'omurice', containsOmurice: true, size: 'SS' })
      const addon = offer({ id: `addon-${addonCategory}`, price: 700, category: addonCategory })
      const pasta = offer({ id: `pasta-${addonCategory}`, price: 700, category: 'pasta' })
      const doria = offer({ id: `doria-${addonCategory}`, price: 700, category: 'doria' })
      const results = optimize(customData([omurice, addon, pasta, doria]), { ...soloOptions, preset: 'light', filters: { ...filters, includePasta: true } }, activeNow)

      expect(results[0].key).toContain(`addon-${addonCategory}:1`)
      expect(results.every((basket) => !basket.key.includes('pasta-') && !basket.key.includes('doria-'))).toBe(true)
    }
  })

  it('avoids duplicate automatic add-ons in light mode', () => {
    const omurice = offer({ id: 'omu', price: 1300, category: 'omurice', containsOmurice: true, size: 'SS' })
    const duplicateSide = offer({ id: 'side', price: 350, category: 'side' })
    const drink = offer({ id: 'drink', price: 720, category: 'drink' })
    const results = optimize(customData([omurice, duplicateSide, drink]), { ...soloOptions, preset: 'light' }, activeNow)

    expect(results[0].key).toBe('drink:1|omu:1')
    expect(results.every((basket) => basket.duplicateUnits === 0)).toBe(true)
  })
})

describe('fixed-product optimization', () => {
  const fixedOptions: SearchOptions = { ...soloOptions, preset: 'price' }

  it('keeps one fixed product in every result', () => {
    const results = optimizeWithFixed(data, fixedOptions, activeNow, { grand_kaisen: 1 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((basket) => basket.lines.some(({ offer: item, quantity }) => item.id === 'grand_kaisen' && quantity >= 1))).toBe(true)
  })

  it('supports multiple fixed products', () => {
    const results = optimizeWithFixed(data, fixedOptions, activeNow, { grand_kaisen: 1, grand_side_sausage: 1 })
    expect(results[0].additionalUnitCount).toBe(0)
    expect(results[0].key).toContain('grand_kaisen:1')
    expect(results[0].key).toContain('grand_side_sausage:1')
  })

  it('never emits a candidate missing any fixed product', () => {
    const fixed = { grand_kaisen: 1, grand_side_karaage: 1 }
    const results = optimizeWithFixed(data, fixedOptions, activeNow, fixed)
    expect(results.every((basket) => Object.entries(fixed).every(([id, quantity]) =>
      basket.lines.some(({ offer: item, quantity: resultQuantity }) => item.id === id && resultQuantity >= quantity),
    ))).toBe(true)
  })

  it('ranks 2,013 yen and +13 first when the 1,353 yen omurice is fixed', () => {
    const [best] = optimizeWithFixed(data, fixedOptions, activeNow, { grand_kaisen: 1 })
    expect(best.total).toBe(2013)
    expect(best.overage).toBe(13)
    expect(best.key).toContain('grand_side_sausage:1')
  })

  it('adds omurice when a fixed product has none', () => {
    const results = optimizeWithFixed(data, fixedOptions, activeNow, { grand_side_sausage: 1 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((basket) => basket.lines.some(({ offer: item }) => item.containsOmurice))).toBe(true)
    expect(results.every((basket) => basket.lines.some(({ offer: item }) => item.id === 'grand_side_sausage'))).toBe(true)
  })

  it('ranks an eligible fixed-only order first with no addition', () => {
    const omurice = offer({ id: 'omu', price: 2100, category: 'omurice', containsOmurice: true, size: 'SS' })
    const side = offer({ id: 'side', price: 100 })
    const [best] = optimizeWithFixed(customData([omurice, side]), fixedOptions, activeNow, { omu: 1 })
    expect(best.key).toBe('omu:1')
    expect(best.additionalUnitCount).toBe(0)
  })

  it('does not treat a 2,000+ yen fixed order without omurice as achieved', () => {
    const side = offer({ id: 'side', price: 2100 })
    const omurice = offer({ id: 'omu', price: 100, category: 'omurice', containsOmurice: true, size: 'SS' })
    const [best] = optimizeWithFixed(customData([side, omurice]), fixedOptions, activeNow, { side: 1 })
    expect(best.key).toBe('omu:1|side:1')
    expect(best.additionalUnitCount).toBe(1)
  })

  it('searches official available products by partial product name', () => {
    const offers = selectableOffers(data, filters, activeNow)
    const results = searchOffers(offers, '海鮮')
    expect(results.map((item) => item.id)).toContain('grand_kaisen')
    expect(results.every((item) => item.name.includes('海鮮'))).toBe(true)
  })

  it('uses a hypothetical drink price without letting it satisfy the omurice requirement', () => {
    const drink = createHypotheticalDrinkOffer(647)
    const results = optimizeWithFixed(
      data,
      fixedOptions,
      activeNow,
      { grand_kaisen: 1, [SIMULATION_DRINK_ID]: 1 },
      [drink],
    )
    expect(results[0].total).toBe(2000)
    expect(results[0].lines.some(({ offer: item }) => item.id === SIMULATION_DRINK_ID && !item.containsOmurice)).toBe(true)
    expect(results.every((basket) => basket.lines.some(({ offer: item }) => item.containsOmurice))).toBe(true)
  })

  it('does not allow the float modifier to be fixed without a drink', () => {
    const float = createFloatModifierOffer()
    const omurice = offer({ id: 'omu', price: 1353, category: 'omurice', containsOmurice: true })
    expect(optimizeWithFixed(
      customData([omurice]),
      fixedOptions,
      activeNow,
      { [FLOAT_MODIFIER_ID]: 1 },
      [float],
    )).toHaveLength(0)
  })

  it('keeps a user-fixed staple while restricting automatic solo additions', () => {
    const omurice = offer({ id: 'omu', price: 1791, category: 'omurice', containsOmurice: true, size: 'SS' })
    const rice = offer({ id: 'ref_rice_single', name: '単品ライス', price: 209, category: 'other' })
    const [best] = optimizeWithFixed(
      customData([omurice, rice]),
      { ...fixedOptions, preset: 'solo' },
      activeNow,
      { ref_rice_single: 1 },
    )

    expect(best.key).toContain('ref_rice_single:1')
    expect(best.key).toContain('omu:1')
    expect(best.total).toBe(2000)
  })

  it('uses only practical additions for a fixed omurice in solo mode', () => {
    const results = optimizeWithFixed(
      mergedData,
      { ...fixedOptions, preset: 'solo' },
      activeNow,
      { grand_kaisen: 1 },
    )

    expect(results[0].total).toBe(2002)
    expect(results[0].key).toContain('ref_fried_mix:1')
    expect(results.every((basket) => !basket.key.includes('ref_rice_single') && !basket.key.includes('ref_bread_single') && !basket.key.includes('ref_stone_bread'))).toBe(true)
    expect(results.every((basket) => (basket.additionalUnitCount ?? 0) <= 2)).toBe(true)
  })
})
