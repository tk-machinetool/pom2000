import type { BasketLine, MenuOffer, RecommendationRole, SingleAdditionCandidate, SingleAdditionGroups } from './types'

// UI/optimizer-only roles. These IDs do not change official categories, prices,
// or campaign eligibility data in the menu source files.
const STAPLE_OFFER_IDS = new Set([
  'ref_rice_single',
  'ref_bread_single',
  'ref_stone_bread',
  'ref_hamburg_set_rice_bread_drink',
])

const OTHER_MAIN_OFFER_IDS = new Set([
  'ref_doria_shrimp_broccoli',
  'ref_kids_omurice',
  'ref_doria_omurice',
  'ref_lowcarb_vegetable_mayo_s',
  'ref_lowcarb_vegetable_mayo_ss',
  'ref_hamburg_demiglace',
  'ref_hamburg_tomato',
  'ref_lowcarb_beef_broccoli_s',
  'ref_lowcarb_beef_broccoli_ss',
  'ref_doria_curry',
  'ref_lowcarb_chicken_ketchup_s',
  'ref_lowcarb_chicken_ketchup_ss',
  'ref_hamburg_japanese',
])

const LIGHT_ADDON_OFFER_IDS = new Set([
  'autumn_salad',
  'ref_miso_asari',
  'ref_set_mini_salad',
  'ref_set_salmon_mini',
])

const PRACTICAL_ADDON_ROLES = new Set<RecommendationRole>(['drink', 'side', 'dessert', 'light-addon'])
const SINGLE_ADDON_ROLES = new Set<RecommendationRole>(['drink', 'dessert', 'light-addon'])

export function recommendationRoleOf(offer: MenuOffer): RecommendationRole {
  if (offer.requiresCategory) return 'light-addon'
  if (STAPLE_OFFER_IDS.has(offer.id)) return 'staple'
  if (offer.containsOmurice || offer.category === 'omurice' || offer.category === 'pasta' || offer.category === 'doria' || offer.category === 'bundle') return 'main'
  if (OTHER_MAIN_OFFER_IDS.has(offer.id)) return 'main'
  if (LIGHT_ADDON_OFFER_IDS.has(offer.id)) return 'light-addon'
  if (offer.category === 'drink') return 'drink'
  if (offer.category === 'side') return 'side'
  if (offer.category === 'dessert') return 'dessert'
  return 'other'
}

export function isPracticalPresetOffer(offer: MenuOffer): boolean {
  const role = recommendationRoleOf(offer)
  if (role === 'main') return offer.containsOmurice
  return PRACTICAL_ADDON_ROLES.has(role)
}

export function isPracticalFixedAddition(offer: MenuOffer, fixedHasOmurice: boolean): boolean {
  const role = recommendationRoleOf(offer)
  if (PRACTICAL_ADDON_ROLES.has(role)) return true
  return !fixedHasOmurice && role === 'main' && offer.containsOmurice
}

export function isPracticalSingleAddition(offer: MenuOffer): boolean {
  return !offer.requiresCategory && PRACTICAL_ADDON_ROLES.has(recommendationRoleOf(offer))
}

function compareSingleAdditions(left: SingleAdditionCandidate, right: SingleAdditionCandidate): number {
  return left.difference - right.difference
    || left.offer.price - right.offer.price
    || left.offer.id.localeCompare(right.offer.id, 'en')
}

export function singleAdditionCandidates(
  offers: MenuOffer[],
  selectedLines: BasketLine[],
  targetYen: number,
): SingleAdditionGroups {
  const uniqueOffers = offers.filter((offer, index, all) => all.findIndex((candidate) => candidate.id === offer.id) === index)
  const selectedIds = new Set(selectedLines.map(({ offer }) => offer.id))
  const selectedGroupIds = new Set(selectedLines.flatMap(({ offer }) => offer.groupId ? [offer.groupId] : []))
  const selectedNames = new Set(selectedLines.map(({ offer }) => offer.name.normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/\s+/g, '')))
  const selectedTotal = selectedLines.reduce((sum, line) => sum + line.offer.price * line.quantity, 0)
  const candidates = uniqueOffers
    .filter(isPracticalSingleAddition)
    .filter((offer) => !selectedIds.has(offer.id)
      && (offer.groupId === undefined || !selectedGroupIds.has(offer.groupId))
      && !selectedNames.has(offer.name.normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/\s+/g, '')))
    .filter((offer) => practicalAdditionLinesAreValid([{ offer, quantity: 1 }], selectedLines))
    .map((offer): SingleAdditionCandidate => {
      const total = selectedTotal + offer.price
      const reachesTarget = total >= targetYen
      return { offer, total, reachesTarget, difference: Math.abs(total - targetYen) }
    })

  return {
    reachesTarget: candidates.filter((candidate) => candidate.reachesTarget).toSorted(compareSingleAdditions),
    belowTarget: candidates.filter((candidate) => !candidate.reachesTarget).toSorted(compareSingleAdditions),
  }
}

function addonRoleCounts(lines: BasketLine[]): Map<RecommendationRole, number> {
  const counts = new Map<RecommendationRole, number>()
  for (const { offer, quantity } of lines) {
    const role = recommendationRoleOf(offer)
    if (PRACTICAL_ADDON_ROLES.has(role)) counts.set(role, (counts.get(role) ?? 0) + quantity)
  }
  return counts
}

export function practicalBasketLinesAreValid(lines: BasketLine[]): boolean {
  return Array.from(addonRoleCounts(lines)).every(([role, count]) => !SINGLE_ADDON_ROLES.has(role) || count <= 1)
}

export function practicalAdditionLinesAreValid(lines: BasketLine[], fixedLines: BasketLine[]): boolean {
  const fixedHasOmurice = fixedLines.some(({ offer }) => offer.containsOmurice)
  const addedMainUnits = lines.reduce((sum, { offer, quantity }) =>
    sum + (recommendationRoleOf(offer) === 'main' ? quantity : 0), 0)
  if (fixedHasOmurice ? addedMainUnits !== 0 : addedMainUnits > 1) return false

  const fixedAddonCounts = addonRoleCounts(fixedLines)
  return Array.from(addonRoleCounts(lines)).every(([role, count]) =>
    !SINGLE_ADDON_ROLES.has(role) || count <= (fixedAddonCounts.get(role) ? 0 : 1))
}

export function mainOrStapleUnits(lines: BasketLine[]): number {
  return lines.reduce((sum, { offer, quantity }) => {
    const role = recommendationRoleOf(offer)
    return sum + (role === 'main' || role === 'staple' ? quantity : 0)
  }, 0)
}

export function practicalRecommendationLabel(overage: number): string {
  if (overage <= 100) return '最小追加のおすすめ'
  if (overage <= 200) return '近い参考候補'
  return '2,000円に近い実用的な組み合わせが見つかりません'
}
