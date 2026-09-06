import { describe, expect, it } from 'vitest'
import { optimize, optimizeWithFixed, searchOffers, selectableOffers } from './optimizer'
import { createHypotheticalDrinkOffer, SIMULATION_DRINK_ID } from './simulation'
import { createFloatModifierOffer, FLOAT_MODIFIER_ID } from './simulation'
import { activeNow, customData, data, filters, offer, soloOptions } from '../test/fixtures'
import type { SearchOptions } from './types'

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
})
