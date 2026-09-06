import { describe, expect, it } from 'vitest'
import rawData from '../../handoff/menu-data.json'
import { mergeMenuData } from './menuMerge'
import type { MenuData } from './types'

const merged = mergeMenuData(rawData as MenuData)

describe('v0.5 menu expansion merge', () => {
  it('loads the supplemental menu without changing the official source file', () => {
    expect(merged.menu).toHaveLength(209)
    expect(merged.menu.filter((offer) => offer.priceBasis === 'official-reference')).toHaveLength(38)
    expect(merged.menu.filter((offer) => offer.priceBasis === 'store-reference')).toHaveLength(171)
  })

  it('keeps the expanded category coverage and groups sizes by product identity', () => {
    expect(merged.menu.filter((offer) => offer.category === 'omurice')).toHaveLength(138)
    expect(merged.menu.filter((offer) => offer.category === 'drink')).toHaveLength(19)
    expect(merged.menu.filter((offer) => offer.category === 'side')).toHaveLength(16)
    expect(merged.menu.filter((offer) => offer.category === 'dessert')).toHaveLength(9)
    expect(merged.menu.filter((offer) => offer.category === 'pasta')).toHaveLength(7)
    expect(merged.sources.menu_photo_2026).toBeDefined()
  })

  it('does not infer campaign eligibility from a product name', () => {
    const doria = merged.menu.filter((offer) => offer.category === 'doria')
    const sugarOff = merged.menu.find((offer) => offer.id === 'ref_lowcarb_beef_broccoli_ss')
    expect(doria.every((offer) => offer.containsOmurice === false)).toBe(true)
    expect(sugarOff?.containsOmurice).toBe(false)
  })
})
