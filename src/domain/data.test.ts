import { describe, expect, it } from 'vitest'
import { data } from '../test/fixtures'

describe('menu schema', () => {
  it('has unique offer ids', () => {
    const ids = data.menu.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has valid exact-price optimizer offers with resolving sources', () => {
    for (const item of data.menu) {
      expect(Number.isInteger(item.price)).toBe(true)
      expect(item.price).toBeGreaterThan(0)
      expect(item.taxIncluded).toBe(true)
      expect(item.priceType).toBe('exact')
      expect(data.sources[item.source]).toBeDefined()
    }
  })

  it('keeps facility evidence and range prices outside the default menu', () => {
    const menuNames = new Set(data.menu.map((item) => item.name))
    expect(menuNames.has('定番オムライス（チキン入り）SS')).toBe(false)
    expect(data.menu.some((item) => 'priceFrom' in item)).toBe(false)
    expect(data.facilityOfficialEvidence.length).toBeGreaterThan(0)
    expect(data.rangeItemsExcludedFromOptimization.length).toBeGreaterThan(0)
  })

  it('does not synthesize the historical SS to S price rule', () => {
    expect(data.historicalEvidenceNotForCurrentPricing.some((entry) => entry.status === 'historical-only')).toBe(true)
    expect(data.menu.every((item) => item.id !== 'synthetic_ss_to_s')).toBe(true)
  })
})
