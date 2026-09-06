import { useState } from 'react'
import { basketTotalLabel, formatYen } from '../domain/format'
import type { Basket, FixedQuantities, MenuSource } from '../domain/types'
import { SourceDetails } from './SourceDetails'

interface FixedResultListProps {
  baskets: Basket[]
  fixedQuantities: FixedQuantities
  sources: Record<string, MenuSource>
  asOf: string
}

export function FixedResultList({ baskets, fixedQuantities, sources, asOf }: FixedResultListProps) {
  const [showAll, setShowAll] = useState(false)
  const secondary = baskets.slice(1)
  const visible = showAll ? secondary : secondary.slice(0, 3)

  return (
    <section className="fixed-other" aria-labelledby="fixed-other-heading">
      <div className="fixed-other-heading">
        <h3 id="fixed-other-heading">その他候補</h3>
        <span>{secondary.length}件</span>
      </div>
      {visible.length > 0 ? (
        <ol start={2}>
          {visible.map((basket, index) => (
            <li key={basket.key} className="fixed-other-row">
              <span className="rank-number">{index + 2}</span>
              <div className="fixed-other-main">
                <ul>
                  {basket.lines.map(({ offer, quantity }) => {
                    const fixed = Math.min(fixedQuantities[offer.id] ?? 0, quantity)
                    const added = quantity - fixed
                    return (
                      <li key={offer.id}>
                        <span>{offer.name}{offer.size ? ` ${offer.size}` : ''} ×{quantity}</span>
                        <small>{fixed > 0 ? `選択${fixed}` : ''}{fixed > 0 && added > 0 ? '・' : ''}{added > 0 ? `追加${added}` : ''}</small>
                      </li>
                    )
                  })}
                </ul>
                <SourceDetails basket={basket} sources={sources} asOf={asOf} />
              </div>
              <div className="fixed-other-total">
                <small>{basketTotalLabel(basket)}</small>
                <strong>{formatYen(basket.total)}</strong>
                <span>{basketTotalLabel(basket) === '予想合計' ? '見込み ' : ''}+{formatYen(basket.overage)}</span>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="empty-secondary">この条件では、ほかの候補はありません。</p>}
      {secondary.length > 3 ? (
        <button className="show-more" type="button" onClick={() => setShowAll((current) => !current)}>
          {showAll ? '表示を戻す' : `残り${secondary.length - 3}件を表示`}
        </button>
      ) : null}
    </section>
  )
}
