import { basketHasHypotheticalPrice, basketHasStoreReferencePrice, basketTotalLabel, formatYen, priceBasisLabel, priceBasisOf } from '../domain/format'
import type { Basket, MenuSource } from '../domain/types'
import { SourceDetails } from './SourceDetails'

interface BestResultProps {
  basket: Basket
  presetLabel: string
  sources: Record<string, MenuSource>
  asOf: string
}

export function BestResult({ basket, presetLabel, sources, asOf }: BestResultProps) {
  return (
    <section className="best-result" aria-labelledby="best-result-heading">
      <div className="best-label" id="best-result-heading">ベストな組み合わせ（{presetLabel}）</div>
      <div className="best-totals">
        <div>
          <span>{basketTotalLabel(basket)}</span>
          <strong>{formatYen(basket.total)}</strong>
        </div>
        <div className="overage-box">
          <span>2,000円との差額</span>
          <strong>+{formatYen(basket.overage)}</strong>
        </div>
      </div>
      <p className="eligibility-note"><span aria-hidden="true" />オムライスを含む組み合わせです</p>
      <ul className="best-lines" aria-label="注文内容">
        {basket.lines.map(({ offer, quantity }) => (
          <li key={offer.id}>
            <div>
              <strong>{offer.name}</strong>
              <span>{offer.size ? `${offer.size}・` : ''}数量 {quantity}・{priceBasisLabel(offer)}</span>
            </div>
            <span>{formatYen(offer.price * quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="result-meta">
        <div><span>価格の扱い</span><strong>{basket.lines.every(({ offer }) => priceBasisOf(offer) === 'official-reference') ? '公式掲載参考価格' : basketHasHypotheticalPrice(basket) ? '仮価格を含む参考結果' : '店頭メニュー参考価格を含む参考結果'}</strong></div>
        <div><span>データ確認日</span><strong>{asOf}</strong></div>
      </div>
      {basketHasHypotheticalPrice(basket) ? (
        <div className="hypothetical-warning" role="note"><strong>仮価格を含む参考結果です。</strong><span>実際の店舗価格によって2,000円未満になる場合があります。注文前に店頭価格をご確認ください。</span></div>
      ) : basketHasStoreReferencePrice(basket) ? (
        <div className="reference-price-warning" role="status"><strong>店頭メニュー参考価格を含む参考結果です。</strong><span>店舗によって実際の価格・取扱商品が異なる可能性があります。注文前に店頭メニューをご確認ください。</span></div>
      ) : null}
      <SourceDetails basket={basket} sources={sources} asOf={asOf} />
    </section>
  )
}
