import { isCampaignActive, isOfferAvailable, passesFilters } from './availability'
import { isPracticalFixedAddition, isPracticalPresetOffer, mainOrStapleUnits, practicalAdditionLinesAreValid, practicalBasketLinesAreValid, recommendationRoleOf } from './recommendation'
import type { Basket, BasketLine, FixedQuantities, MenuData, MenuOffer, Preset, SearchOptions } from './types'

const MAIN_CATEGORIES = new Set(['omurice', 'pasta', 'doria', 'bundle'])
const SIZE_ORDER: Record<string, number> = { SS: 0, S: 1, M: 2, L: 3 }

function countedUnits(lines: BasketLine[]): number {
  return lines.reduce((sum, line) => sum + (line.offer.requiresCategory ? 0 : line.quantity), 0)
}

function duplicateUnits(lines: BasketLine[]): number {
  return lines.reduce((sum, line) => sum + (line.offer.requiresCategory ? 0 : Math.max(0, line.quantity - 1)), 0)
}

function basketMatchesPreset(lines: BasketLine[], preset: Preset): boolean {
  if (preset === 'price') return true

  let mainUnits = 0
  let omuriceMainUnits = 0
  for (const { offer, quantity } of lines) {
    if (!MAIN_CATEGORIES.has(offer.category)) continue
    mainUnits += quantity
    if (offer.containsOmurice) omuriceMainUnits += quantity
  }

  if (preset === 'solo' || preset === 'light') return mainUnits === 1
    && omuriceMainUnits === 1
    && countedUnits(lines) <= 3
    && practicalBasketLinesAreValid(lines)
  return mainUnits === 2 && omuriceMainUnits >= 1
}

function basketIsEligible(lines: BasketLine[], total: number, targetYen: number, preset: Preset): boolean {
  return total >= targetYen && lines.some(({ offer }) => offer.containsOmurice) && basketMatchesPreset(lines, preset)
}

function basketKey(lines: BasketLine[]): string {
  return lines.map(({ offer, quantity }) => `${offer.id}:${quantity}`).join('|')
}

function smallestKnownOmuriceSize(basket: Basket): number | undefined {
  let smallest: number | undefined
  for (const { offer } of basket.lines) {
    if (!offer.containsOmurice || offer.size === undefined || SIZE_ORDER[offer.size] === undefined) continue
    const rank = SIZE_ORDER[offer.size]
    smallest = smallest === undefined ? rank : Math.min(smallest, rank)
  }
  return smallest
}

function omuriceSizeBurden(lines: BasketLine[]): number {
  return lines.reduce((sum, { offer, quantity }) => {
    if (!offer.containsOmurice || offer.size === undefined) return sum
    return sum + (SIZE_ORDER[offer.size] ?? 4) * quantity
  }, 0)
}

function partialKey(lines: BasketLine[]): string {
  return lines.map(({ offer, quantity }) => `${offer.id}:${quantity}`).join('|')
}

interface PartialBasket {
  lines: BasketLine[]
  total: number
  unitCount: number
  mainUnits: number
  omuriceUnits: number
  duplicateUnits: number
}

function comparePartials(left: PartialBasket, right: PartialBasket): number {
  return left.duplicateUnits - right.duplicateUnits
    || omuriceSizeBurden(left.lines) - omuriceSizeBurden(right.lines)
    || partialKey(left.lines).localeCompare(partialKey(right.lines), 'en')
}

function addPartial(state: Map<string, PartialBasket>, candidate: PartialBasket): void {
  const stateKey = `${candidate.unitCount}|${candidate.total}|${candidate.mainUnits}|${candidate.omuriceUnits}`
  const current = state.get(stateKey)
  if (!current || comparePartials(candidate, current) < 0) state.set(stateKey, candidate)
}

function emptyPartial(): PartialBasket {
  return { lines: [], total: 0, unitCount: 0, mainUnits: 0, omuriceUnits: 0, duplicateUnits: 0 }
}

function extendPartial(partial: PartialBasket, offer: MenuOffer, quantity: number): PartialBasket {
  const mainUnits = MAIN_CATEGORIES.has(offer.category) ? quantity : 0
  const omuriceUnits = mainUnits > 0 && offer.containsOmurice ? quantity : 0
  return {
    lines: [...partial.lines, { offer, quantity }],
    total: partial.total + offer.price * quantity,
    unitCount: partial.unitCount + quantity,
    mainUnits: partial.mainUnits + mainUnits,
    omuriceUnits: partial.omuriceUnits + omuriceUnits,
    duplicateUnits: partial.duplicateUnits + Math.max(0, quantity - 1),
  }
}

function basketFromPartial(partial: PartialBasket, targetYen: number, fixedQuantities?: FixedQuantities, fixedUnits = 0, additionalUnitCount = 0): Basket {
  const key = basketKey(partial.lines)
  return {
    lines: partial.lines,
    total: partial.total,
    overage: partial.total - targetYen,
    unitCount: fixedUnits + partial.unitCount,
    duplicateUnits: duplicateUnits(partial.lines),
    additionalUnitCount,
    fixedQuantities,
    key,
  }
}

export function compareBaskets(a: Basket, b: Basket): number {
  const primary = a.overage - b.overage || a.unitCount - b.unitCount || a.duplicateUnits - b.duplicateUnits
  if (primary !== 0) return primary

  const aSize = smallestKnownOmuriceSize(a)
  const bSize = smallestKnownOmuriceSize(b)
  if (aSize !== undefined && bSize !== undefined && aSize !== bSize) return aSize - bSize
  return a.key.localeCompare(b.key, 'en')
}

export function compareLightBaskets(a: Basket, b: Basket): number {
  return mainOrStapleUnits(a.lines) - mainOrStapleUnits(b.lines)
    || a.overage - b.overage
    || omuriceSizeBurden(a.lines) - omuriceSizeBurden(b.lines)
    || a.unitCount - b.unitCount
    || a.duplicateUnits - b.duplicateUnits
    || a.key.localeCompare(b.key, 'en')
}

export function compareFixedBaskets(a: Basket, b: Basket): number {
  return a.overage - b.overage
    || (a.additionalUnitCount ?? a.unitCount) - (b.additionalUnitCount ?? b.unitCount)
    || a.duplicateUnits - b.duplicateUnits
    || omuriceSizeBurden(a.lines) - omuriceSizeBurden(b.lines)
    || a.key.localeCompare(b.key, 'en')
}

export function availableOffers(data: MenuData, options: SearchOptions, now: Date): MenuOffer[] {
  return data.menu
    .filter((offer) => isOfferAvailable(offer, now) && passesFilters(offer, options.filters))
    .toSorted((a, b) => a.id.localeCompare(b.id, 'en'))
}

function generatePartials(offers: MenuOffer[], maxQuantity: number, maxUnits: number, quantityLimitFor: (offer: MenuOffer) => number = () => maxQuantity): PartialBasket[] {
  let states = new Map<string, PartialBasket>([['0|0|0|0', emptyPartial()]])
  for (const offer of offers) {
    const next = new Map(states)
    const quantityLimit = Math.min(maxQuantity, quantityLimitFor(offer))
    if (quantityLimit <= 0) {
      states = next
      continue
    }
    for (const partial of states.values()) {
      for (let quantity = 1; quantity <= quantityLimit; quantity += 1) {
        const candidate = extendPartial(partial, offer, quantity)
        if (candidate.unitCount <= maxUnits) addPartial(next, candidate)
      }
    }
    states = next
  }
  return Array.from(states.values())
}

export function optimize(data: MenuData, options: SearchOptions, now: Date): Basket[] {
  if (!isCampaignActive(now, data.campaignRule)) return []

  const practicalPreset = options.preset === 'solo' || options.preset === 'light'
  const available = availableOffers(data, options, now)
  const offers = practicalPreset ? available.filter(isPracticalPresetOffer) : available
  const maxQuantity = options.maxQuantityPerOffer ?? 2
  const requestedMaxUnits = options.maxTotalUnits ?? 4
  const maxUnits = practicalPreset ? Math.min(requestedMaxUnits, 3) : requestedMaxUnits
  const baskets = generatePartials(
    offers,
    maxQuantity,
    maxUnits,
    (offer) => options.preset === 'light' && recommendationRoleOf(offer) !== 'main' ? 1 : maxQuantity,
  )
    .filter((partial) => partial.lines.length > 0 && basketIsEligible(partial.lines, partial.total, data.targetYen, options.preset))
    .map((partial) => basketFromPartial(partial, data.targetYen))

  return baskets.sort(options.preset === 'light' ? compareLightBaskets : compareBaskets).slice(0, options.limit ?? 20)
}

export function selectableOffers(data: MenuData, filters: SearchOptions['filters'], now: Date): MenuOffer[] {
  return data.menu.filter((offer) => {
    if (!isOfferAvailable(offer, now)) return false
    return offer.menuContext !== 'lunch' || filters.includeLunch
  })
}

export function searchOffers(offers: MenuOffer[], query: string, limit = 12): MenuOffer[] {
  const normalized = query.normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/\s+/g, '')
  if (!normalized) return offers.slice(0, limit)
  return offers
    .filter((offer) => offer.name.normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/\s+/g, '').includes(normalized))
    .slice(0, limit)
}

export function optimizeWithFixed(
  data: MenuData,
  options: SearchOptions,
  now: Date,
  fixedQuantities: FixedQuantities,
  supplementalOffers: MenuOffer[] = [],
): Basket[] {
  if (!isCampaignActive(now, data.campaignRule)) return []

  const maxQuantity = options.maxQuantityPerOffer ?? 2
  const maxUnits = options.maxTotalUnits ?? 4
  const selectable = selectableOffers(data, options.filters, now)
  const selectableById = new Map([...selectable, ...supplementalOffers].map((offer) => [offer.id, offer]))
  const fixedEntries = Object.entries(fixedQuantities)
    .filter(([, quantity]) => quantity > 0)
    .toSorted(([left], [right]) => left.localeCompare(right, 'en'))

  if (fixedEntries.length === 0) return []
  if (fixedEntries.some(([id, quantity]) => !selectableById.has(id) || !Number.isInteger(quantity) || quantity > maxQuantity)) return []

  const fixedLines = fixedEntries.map(([id, quantity]) => ({ offer: selectableById.get(id)!, quantity }))
  if (fixedLines.some(({ offer }) => offer.requiresCategory && !fixedLines.some(({ offer: required }) => required.category === offer.requiresCategory))) return []
  const fixedUnits = countedUnits(fixedLines)
  if (fixedUnits > maxUnits) return []

  const fixedTotal = fixedLines.reduce((sum, { offer, quantity }) => sum + offer.price * quantity, 0)
  const practicalPreset = options.preset === 'solo' || options.preset === 'light'
  const fixedHasOmurice = fixedLines.some(({ offer }) => offer.containsOmurice)
  const additionOffers = [...availableOffers(data, { ...options, preset: 'price' }, now), ...supplementalOffers]
    .filter((offer) => !offer.requiresCategory)
    .filter((offer, index, all) => all.findIndex((candidate) => candidate.id === offer.id) === index)
    .filter((offer) => !practicalPreset || isPracticalFixedAddition(offer, fixedHasOmurice))
    .toSorted((left, right) => left.id.localeCompare(right.id, 'en'))
  const remainingUnits = maxUnits - fixedUnits
  const additions = generatePartials(
    additionOffers,
    maxQuantity,
    practicalPreset ? Math.min(remainingUnits, 2) : remainingUnits,
    (offer) => {
      const remainingQuantity = maxQuantity - (fixedQuantities[offer.id] ?? 0)
      return options.preset === 'light' ? Math.min(1, remainingQuantity) : remainingQuantity
    },
  )
  const baskets: Basket[] = []

  for (const addition of additions) {
    if (practicalPreset && !practicalAdditionLinesAreValid(addition.lines, fixedLines)) continue
    const quantities = new Map(fixedLines.map(({ offer, quantity }) => [offer.id, quantity]))
    for (const { offer, quantity } of addition.lines) quantities.set(offer.id, (quantities.get(offer.id) ?? 0) + quantity)
    const lines = Array.from(quantities, ([id, quantity]) => ({ offer: selectableById.get(id) ?? additionOffers.find((candidate) => candidate.id === id)!, quantity }))
      .toSorted((left, right) => left.offer.id.localeCompare(right.offer.id, 'en'))
    const total = fixedTotal + addition.total
    if (!basketIsEligible(lines, total, data.targetYen, 'price')) continue
    const key = basketKey(lines)
    baskets.push({
      lines,
      total,
      overage: total - data.targetYen,
      unitCount: countedUnits(lines),
      additionalUnitCount: addition.unitCount,
      duplicateUnits: duplicateUnits(lines),
      fixedQuantities: { ...fixedQuantities },
      key,
    })
  }

  return baskets.sort(options.preset === 'light' ? compareLightBaskets : compareFixedBaskets).slice(0, options.limit ?? 20)
}
