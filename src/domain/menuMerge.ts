import expansionRaw from '../../handoff/menu-expansion-v0.5.json'
import type { MenuData, MenuOffer, MenuSource } from './types'

interface ExpansionSource {
  title: string
  publisher: string
  published?: string
  effective?: string
  url: string
  observedStores?: string[]
  note?: string
}

interface ExpansionFile {
  researchedOn: string
  sources: Record<string, ExpansionSource>
  menuAdditions: MenuOffer[]
}

const expansion = expansionRaw as ExpansionFile

function sourceId(source: string): string {
  return source === 'official_grand' ? 'grand' : source
}

function offerKey(offer: MenuOffer): string {
  return `${offer.name}\u0000${offer.size ?? ''}`
}

function asOfficialOffer(offer: MenuOffer): MenuOffer {
  return { ...offer, priceBasis: offer.priceBasis ?? 'official-reference' }
}

function asReferenceOffer(offer: MenuOffer): MenuOffer {
  return {
    ...offer,
    source: sourceId(offer.source),
    priceBasis: 'store-reference',
  }
}

function referenceSource(source: ExpansionSource): MenuSource {
  return {
    title: source.title,
    publisher: source.publisher,
    published: source.published,
    effective: source.effective,
    url: source.url,
    verifiedOn: expansion.researchedOn,
  }
}

export function mergeMenuData(base: MenuData): MenuData {
  const officialOffers = base.menu.map(asOfficialOffer)
  const officialKeys = new Set(officialOffers.map(offerKey))
  const referenceOffers = expansion.menuAdditions
    .filter((offer) => !officialKeys.has(offerKey(offer)))
    .map(asReferenceOffer)

  const expansionSources = Object.fromEntries(
    Object.entries(expansion.sources)
      .filter(([id]) => id === 'menu_photo_2026')
      .map(([id, source]) => [id, referenceSource(source)]),
  )

  return {
    ...base,
    sources: { ...base.sources, ...expansionSources },
    menu: [...officialOffers, ...referenceOffers],
  }
}
