import { basketHasHypotheticalPrice, basketHasStoreReferencePrice, basketOverageLabel, basketTotalLabel, formatYen, priceBasisLabel, priceBasisOf } from '../domain/format'
import type { Basket, FixedQuantities, MenuSource } from '../domain/types'
import { SourceDetails } from './SourceDetails'

interface FixedRecommendationProps {
  basket: Basket
  fixedQuantities: FixedQuantities
  sources: Record<string, MenuSource>
  asOf: string
}

export function FixedRecommendation({ basket, fixedQuantities, sources, asOf }: FixedRecommendationProps) {
  const hasHypotheticalPrice = basketHasHypotheticalPrice(basket)
  const hasStoreReferencePrice = basketHasStoreReferencePrice(basket)
  return (
    <section className="fixed-best" aria-labelledby="fixed-best-heading">
      <h3 id="fixed-best-heading">最小追加のおすすめ</h3>
      {basket.additionalUnitCount === 0 ? <p className="no-addition">{hasHypotheticalPrice ? '追加注文なしで2,000円以上の見込みです' : '追加注文なしの参考候補です'}</p> : null}
      <ul className="fixed-best-lines" aria-label="おすすめの注文内容">
        {basket.lines.map(({ offer, quantity }) => {
          const fixed = Math.min(fixedQuantities[offer.id] ?? 0, quantity)
          const added = quantity - fixed
          return (
            <li key={offer.id}>
              <div>
                <strong>{offer.name}</strong>
                <span>{offer.size ? `${offer.size}・` : ''}{fixed > 0 ? `選択中 ${fixed}` : ''}{fixed > 0 && added > 0 ? '・' : ''}{added > 0 ? `追加 ${added}` : ''}</span>
                <small className={`price-basis ${priceBasisOf(offer)}`}>{priceBasisLabel(offer)}</small>
              </div>
              <b>{formatYen(offer.price * quantity)}</b>
            </li>
          )
        })}
      </ul>
      <div className="fixed-best-total">
        <span>{basketTotalLabel(basket)}</span>
        <strong>{formatYen(basket.total)}</strong>
        <em>{basketOverageLabel(basket)} +{formatYen(basket.overage)}</em>
      </div>
      {hasHypotheticalPrice ? (
        <div className="hypothetical-warning" role="note">
          <strong>仮価格を含む参考結果です。</strong>
          <span>実際の店舗価格によって2,000円未満になる場合があります。注文前に店頭価格をご確認ください。</span>
        </div>
      ) : null}
      {hasStoreReferencePrice && !hasHypotheticalPrice ? (
        <div className="reference-price-warning" role="status">
          <strong>店頭メニュー参考価格を含む参考結果です。</strong>
          <span>店舗によって実際の価格・取扱商品が異なる可能性があります。注文前に店頭メニューをご確認ください。</span>
        </div>
      ) : null}
      <SourceDetails basket={basket} sources={sources} asOf={asOf} />
    </section>
  )
}
