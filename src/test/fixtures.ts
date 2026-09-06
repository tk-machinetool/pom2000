import rawData from '../../handoff/menu-data.json'
import type { MenuData, MenuOffer, SearchFilters, SearchOptions } from '../domain/types'

export const data = rawData as MenuData
export const activeNow = new Date('2026-09-05T12:00:00+09:00')
export const filters: SearchFilters = {
  includeLunch: false,
  includeSide: true,
  includeDessert: true,
  includePasta: false,
  includeFair: true,
  includeS: true,
}
export const soloOptions: SearchOptions = {
  preset: 'solo',
  filters,
  maxQuantityPerOffer: 2,
  maxTotalUnits: 4,
  limit: 20,
}

export function offer(overrides: Partial<MenuOffer> & Pick<MenuOffer, 'id' | 'price'>): MenuOffer {
  return {
    name: overrides.id,
    category: 'side',
    source: 'grand',
    status: 'official-current',
    taxIncluded: true,
    priceType: 'exact',
    containsOmurice: false,
    menuContext: 'grand',
    ...overrides,
  }
}

export function customData(menu: MenuOffer[]): MenuData {
  return { ...data, menu }
}
