import { describe, expect, it } from 'vitest'
import { isExactOptimizerOffer, isOfferAvailable, passesFilters } from './availability'
import { data, filters, offer } from '../test/fixtures'

describe('availability and data-trust gates', () => {
  const autumn = data.menu.find((item) => item.id === 'autumn_porcini_ss')!
  const summer = data.menu.find((item) => item.id === 'summer_seafood_ss')!
  const lunch = data.menu.find((item) => item.id === 'lunch_veg_tomato')!

  it('excludes official-future one second before the JST boundary', () => {
    expect(isOfferAvailable(autumn, new Date('2026-09-09T23:59:59+09:00'))).toBe(false)
  })

  it('includes official-future at the JST start boundary', () => {
    expect(isOfferAvailable(autumn, new Date('2026-09-10T00:00:00+09:00'))).toBe(true)
  })

  it('excludes stale fair data on reviewAfter without revalidation', () => {
    expect(isOfferAvailable(summer, new Date('2026-09-10T00:00:00+09:00'))).toBe(false)
  })

  it('accepts a reviewed offer only when revalidatedOn reaches reviewAfter', () => {
    expect(isOfferAvailable({ ...summer, revalidatedOn: '2026-09-10' }, new Date('2026-09-10T00:00:00+09:00'))).toBe(true)
  })

  it('prevents lunch leakage and enables lunch only on explicit opt-in', () => {
    expect(passesFilters(lunch, filters)).toBe(false)
    expect(passesFilters(lunch, { ...filters, includeLunch: true })).toBe(true)
  })

  it('rejects non-exact, non-integer, untaxed, and non-positive prices', () => {
    expect(isExactOptimizerOffer(offer({ id: 'range', price: 1000, priceType: 'from' }))).toBe(false)
    expect(isExactOptimizerOffer(offer({ id: 'decimal', price: 1000.5 }))).toBe(false)
    expect(isExactOptimizerOffer(offer({ id: 'untaxed', price: 1000, taxIncluded: false }))).toBe(false)
    expect(isExactOptimizerOffer(offer({ id: 'zero', price: 0 }))).toBe(false)
  })
})
