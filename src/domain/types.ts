export type MenuCategory = 'omurice' | 'pasta' | 'doria' | 'side' | 'dessert' | 'bundle' | string
export type OfferStatus = 'official-current' | 'official-future' | 'reference-current' | string
export type Preset = 'solo' | 'pair' | 'price'
export type PriceBasis = 'official-reference' | 'store-reference' | 'hypothetical' | 'store-entered'

export interface MenuSource {
  title: string
  publisher: string
  published?: string
  effective?: string
  url: string
  verifiedOn: string
}

export interface MenuOffer {
  id: string
  name: string
  size?: 'SS' | 'S' | 'M' | 'L' | string
  price: number
  category: MenuCategory
  source: string
  status: OfferStatus
  scope?: string
  taxIncluded: boolean
  priceType: 'exact' | string
  containsOmurice: boolean
  menuContext: string
  fair?: string
  start?: string
  reviewAfter?: string
  revalidatedOn?: string
  freshnessPolicy?: string
  note?: string
  groupId?: string
  availabilityNote?: string
  requiresCategory?: string
  priceBasis?: PriceBasis
}

export interface CampaignRule {
  targetYen: number
  restaurantCondition: string
  startsAtJST: string
  endsAtJST: string
  proof: string
  source: string
}

export interface MenuData {
  schemaVersion: string
  asOf: string
  targetYen: number
  campaignRule: CampaignRule
  sources: Record<string, MenuSource>
  menu: MenuOffer[]
  rangeItemsExcludedFromOptimization: Array<Record<string, unknown>>
  facilityOfficialEvidence: Array<Record<string, unknown>>
  historicalEvidenceNotForCurrentPricing: Array<Record<string, unknown>>
  dataTrust: Record<string, unknown>
  coverage: Record<string, unknown>
}

export interface SearchFilters {
  includeLunch: boolean
  includeSide: boolean
  includeDessert: boolean
  includePasta: boolean
  includeFair: boolean
  includeS: boolean
}

export interface BasketLine {
  offer: MenuOffer
  quantity: number
}

export interface Basket {
  lines: BasketLine[]
  total: number
  overage: number
  unitCount: number
  duplicateUnits: number
  key: string
  additionalUnitCount?: number
  fixedQuantities?: Record<string, number>
}

export interface SearchOptions {
  preset: Preset
  filters: SearchFilters
  maxQuantityPerOffer?: number
  maxTotalUnits?: number
  limit?: number
}

export type FixedQuantities = Record<string, number>
