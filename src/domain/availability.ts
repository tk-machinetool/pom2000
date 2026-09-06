import type { CampaignRule, MenuOffer, SearchFilters } from './types'

const jstStart = (date: string) => new Date(`${date}T00:00:00+09:00`).getTime()

export function isCampaignActive(now: Date, campaign: CampaignRule): boolean {
  const timestamp = now.getTime()
  return timestamp >= new Date(campaign.startsAtJST).getTime() && timestamp <= new Date(campaign.endsAtJST).getTime()
}

export function isExactOptimizerOffer(offer: MenuOffer): boolean {
  return Number.isInteger(offer.price)
    && offer.price > 0
    && offer.taxIncluded === true
    && (offer.priceType === 'exact' || offer.priceType === 'exact-observed')
}

export function isOfferAvailable(offer: MenuOffer, now: Date): boolean {
  if (!isExactOptimizerOffer(offer)) return false

  const timestamp = now.getTime()
  if (offer.status === 'official-current') {
    // Current offers still pass through start and freshness gates below.
  } else if (offer.status === 'reference-current') {
    // Store-menu references are current observations, not official nationwide prices.
  } else if (offer.status === 'official-future') {
    if (!offer.start || timestamp < jstStart(offer.start)) return false
  } else {
    return false
  }

  if (offer.start && timestamp < jstStart(offer.start)) return false
  if (offer.reviewAfter && timestamp >= jstStart(offer.reviewAfter)) {
    if (!offer.revalidatedOn || offer.revalidatedOn < offer.reviewAfter) return false
  }
  return true
}

export function passesFilters(offer: MenuOffer, filters: SearchFilters): boolean {
  if (offer.menuContext === 'lunch' && !filters.includeLunch) return false
  if (offer.category === 'side' && !filters.includeSide) return false
  if (offer.category === 'dessert' && !filters.includeDessert) return false
  if (offer.category === 'pasta' && !filters.includePasta) return false
  if (offer.fair && !filters.includeFair) return false
  if (offer.size === 'S' && !filters.includeS) return false
  return true
}
