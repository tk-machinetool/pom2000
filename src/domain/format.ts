import type { Basket, MenuOffer, PriceBasis } from './types'

export const formatYen = (value: number) => `${new Intl.NumberFormat('ja-JP').format(value)}円`

export const priceBasisOf = (offer: MenuOffer): PriceBasis => offer.priceBasis ?? 'official-reference'

export const priceBasisLabel = (offer: MenuOffer) => ({
  'official-reference': '公式掲載参考価格',
  'store-reference': '2026店頭メニュー参考価格',
  hypothetical: '仮価格',
  'store-entered': '店頭入力価格',
})[priceBasisOf(offer)]

export const basketHasHypotheticalPrice = (basket: Basket) =>
  basket.lines.some(({ offer }) => priceBasisOf(offer) === 'hypothetical')

export const basketHasStoreReferencePrice = (basket: Basket) =>
  basket.lines.some(({ offer }) => priceBasisOf(offer) === 'store-reference')

export const basketTotalLabel = (basket: Basket) => {
  if (basketHasHypotheticalPrice(basket)) return '予想合計'
  if (basketHasStoreReferencePrice(basket)) return '店頭参考合計'
  return '参考合計'
}

export const basketOverageLabel = (basket: Basket) =>
  basketHasHypotheticalPrice(basket) ? '超過見込み' : '超過'

export const categoryLabel = (category: string) =>
  ({ omurice: 'オムライス', pasta: 'パスタ', doria: 'ドリア', side: 'サイド', dessert: 'デザート', bundle: 'セット商品' })[
    category
  ] ?? category
