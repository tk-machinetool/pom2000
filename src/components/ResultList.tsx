import { useState } from 'react'
import { basketHasHypotheticalPrice, basketHasStoreReferencePrice, basketTotalLabel, formatYen, priceBasisLabel } from '../domain/format'
import type { Basket, MenuSource } from '../domain/types'
import { SourceDetails } from './SourceDetails'

interface ResultListProps {
  baskets: Basket[]
  sources: Record<string, MenuSource>
  asOf: string
}

export function ResultList({ baskets, sources, asOf }: ResultListProps) {
  const [showAll, setShowAll] = useState(false)
  const secondary = baskets.slice(1)
  const visible = showAll ? secondary : secondary.slice(0, 4)

  return (
    <section className="result-list" aria-labelledby="other-results-heading">
      <div className="section-heading-row result-list-heading">
        <h2 id="other-results-heading">ほかの組み合わせ</h2>
        <span>{baskets.length}件（上位{baskets.length}件）</span>
      </div>
      {visible.length > 0 ? (
        <ol start={2}>
          {visible.map((basket, index) => (
            <li key={basket.key} className="result-row">
              <div className="rank-number">{index + 2}</div>
              <div className="result-row-main">
                <ul>
                  {basket.lines.map(({ offer, quantity }) => (
                    <li key={offer.id}>
                      <span>{offer.name}{offer.size ? ` ${offer.size}` : ''} ×{quantity}</span>
                      <span className="official-line-price"><small>{priceBasisLabel(offer)}</small>{formatYen(offer.price * quantity)}</span>
                    </li>
                  ))}
                </ul>
                <SourceDetails basket={basket} sources={sources} asOf={asOf} />
              </div>
              <div className="result-row-total">
                <small>{basketTotalLabel(basket)}</small>
                <strong>{formatYen(basket.total)}</strong>
                <span>{basketHasHypotheticalPrice(basket) ? '見込み ' : ''}+{formatYen(basket.overage)}</span>
              </div>
              {basketHasStoreReferencePrice(basket) ? <p className="reference-price-warning compact">店舗によって実際の価格が異なる可能性があります。</p> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-secondary">この条件では、ほかの候補はありません。</p>
      )}
      {secondary.length > 4 ? (
        <button className="show-more" type="button" onClick={() => setShowAll((current) => !current)}>
          {showAll ? '表示を戻す' : `残り${secondary.length - 4}件を表示`}
        </button>
      ) : null}
    </section>
  )
}
