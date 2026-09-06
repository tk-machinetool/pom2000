import { basketHasHypotheticalPrice, basketHasStoreReferencePrice, basketTotalLabel, formatYen, priceBasisLabel, priceBasisOf } from '../domain/format'
import type { Basket, BasketLine, MenuSource } from '../domain/types'
import { SourceDetails } from './SourceDetails'

interface FixedOrderCompleteProps {
  lines: BasketLine[]
  targetYen: number
  sources: Record<string, MenuSource>
  asOf: string
}

export function FixedOrderComplete({ lines, targetYen, sources, asOf }: FixedOrderCompleteProps) {
  const total = lines.reduce((sum, { offer, quantity }) => sum + offer.price * quantity, 0)
  const basket: Basket = {
    lines,
    total,
    overage: total - targetYen,
    unitCount: lines.reduce((sum, { quantity }) => sum + quantity, 0),
    duplicateUnits: lines.reduce((sum, { quantity }) => sum + Math.max(0, quantity - 1), 0),
    additionalUnitCount: 0,
    key: lines.map(({ offer, quantity }) => `${offer.id}:${quantity}`).join('|'),
  }
  const hasHypotheticalPrice = basketHasHypotheticalPrice(basket)
  const hasStoreReferencePrice = basketHasStoreReferencePrice(basket)

  return (
    <section className="fixed-complete" aria-labelledby="fixed-complete-heading">
      <h3 id="fixed-complete-heading">追加注文は不要です</h3>
      <p>{hasHypotheticalPrice
        ? '選択中の商品だけで仮価格上2,000円以上の見込みです。'
        : '選択中の商品だけで参考価格上2,000円以上です。'}</p>
      <ul className="fixed-complete-lines" aria-label="選択中の注文内容">
        {lines.map(({ offer, quantity }) => (
          <li key={offer.id}>
            <div>
              <strong>{offer.name}</strong>
              <span>{offer.size ? `${offer.size}・` : ''}選択中 {quantity}</span>
              <small className={`price-basis ${priceBasisOf(offer)}`}>{priceBasisLabel(offer)}</small>
            </div>
            <b>{formatYen(offer.price * quantity)}</b>
          </li>
        ))}
      </ul>
      <div className="fixed-complete-total">
        <span>{basketTotalLabel(basket)}</span>
        <strong>{formatYen(total)}</strong>
        <em>2,000円との差：+{formatYen(basket.overage)}</em>
      </div>
      {basket.overage >= 201 ? <p className="fixed-complete-guidance">2,000円に近づけたい場合は、選択中の商品を1品解除してください。</p> : null}
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
