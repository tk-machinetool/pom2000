import type { MenuOffer } from './types'

export const SIMULATION_DRINK_ID = 'simulation_hypothetical_drink'
export const FLOAT_MODIFIER_ID = 'official_float_vanilla_plus55'

export function createHypotheticalDrinkOffer(price: number): MenuOffer {
  return {
    id: SIMULATION_DRINK_ID,
    name: `仮ドリンク（参考${price.toLocaleString('ja-JP')}円）`,
    price,
    category: 'drink',
    source: 'user-simulation',
    status: 'simulation-only',
    taxIncluded: true,
    priceType: 'hypothetical',
    priceBasis: 'hypothetical',
    containsOmurice: false,
    menuContext: 'simulation',
    note: '事前シミュレーション専用。公式掲載価格ではない。',
  }
}

export function createFloatModifierOffer(): MenuOffer {
  return {
    id: FLOAT_MODIFIER_ID,
    name: 'バニラジェラート追加（フロート化）',
    price: 55,
    category: 'modifier',
    source: 'grand',
    status: 'official-current',
    taxIncluded: true,
    priceType: 'exact',
    priceBasis: 'official-reference',
    containsOmurice: false,
    menuContext: 'grand',
    requiresCategory: 'drink',
    note: '単独商品として扱わず、選択中のドリンクにだけ適用する公式根拠付き加算。',
  }
}
