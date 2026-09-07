import { useState } from 'react'
import { basketTotalLabel, formatYen, priceBasisLabel, priceBasisOf } from '../domain/format'
import type { Basket, BasketLine, SingleAdditionCandidate, SingleAdditionGroups } from '../domain/types'

const INITIAL_PER_GROUP = 4

interface SingleAdditionCandidatesProps {
  groups: SingleAdditionGroups
  selectedLines: BasketLine[]
  targetYen: number
  canAdd: boolean
  onAdd: (offerId: string) => void
}

function candidateBasket(candidate: SingleAdditionCandidate, selectedLines: BasketLine[], targetYen: number): Basket {
  return {
    lines: [...selectedLines, { offer: candidate.offer, quantity: 1 }],
    total: candidate.total,
    overage: candidate.total - targetYen,
    unitCount: selectedLines.reduce((sum, line) => sum + line.quantity, 0) + 1,
    duplicateUnits: 0,
    key: `single-${candidate.offer.id}`,
  }
}

function CandidateGroup({
  heading,
  candidates,
  selectedLines,
  targetYen,
  canAdd,
  showAll,
  onAdd,
}: {
  heading: string
  candidates: SingleAdditionCandidate[]
  selectedLines: BasketLine[]
  targetYen: number
  canAdd: boolean
  showAll: boolean
  onAdd: (offerId: string) => void
}) {
  const visible = showAll ? candidates : candidates.slice(0, INITIAL_PER_GROUP)
  if (candidates.length === 0) return null

  return (
    <section className="single-addition-group" aria-label={heading}>
      <div className="single-addition-group-heading">
        <h4>{heading}</h4>
        <span>{candidates.length}件</span>
      </div>
      <ul>
        {visible.map((candidate) => {
          const basket = candidateBasket(candidate, selectedLines, targetYen)
          const hypothetical = priceBasisOf(candidate.offer) === 'hypothetical'
          return (
            <li key={candidate.offer.id}>
              <div className="single-addition-copy">
                <strong>{candidate.offer.name}</strong>
                <span>{candidate.offer.size ? `${candidate.offer.size}・` : ''}{formatYen(candidate.offer.price)}</span>
                <small className={`price-basis ${priceBasisOf(candidate.offer)}`}>{priceBasisLabel(candidate.offer)}</small>
                {priceBasisOf(candidate.offer) === 'store-reference' ? <small className="store-difference">店舗差あり</small> : null}
              </div>
              <div className="single-addition-total">
                <small>{basketTotalLabel(basket)}</small>
                <strong>{formatYen(candidate.total)}</strong>
                <span>{candidate.reachesTarget
                  ? `${hypothetical ? '超過見込み ' : ''}+${formatYen(candidate.difference)}`
                  : `あと${hypothetical ? '（見込み）' : ''}${formatYen(candidate.difference)}`}</span>
              </div>
              <button
                type="button"
                disabled={!canAdd}
                aria-label={`${candidate.offer.name}${candidate.offer.size ? ` ${candidate.offer.size}` : ''}を追加する`}
                onClick={() => onAdd(candidate.offer.id)}
              >追加する</button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function SingleAdditionCandidates({ groups, selectedLines, targetYen, canAdd, onAdd }: SingleAdditionCandidatesProps) {
  const [showAll, setShowAll] = useState(false)
  const totalCount = groups.reachesTarget.length + groups.belowTarget.length
  const hiddenCount = Math.max(0, groups.reachesTarget.length - INITIAL_PER_GROUP)
    + Math.max(0, groups.belowTarget.length - INITIAL_PER_GROUP)

  return (
    <section className="single-additions" aria-labelledby="single-additions-heading">
      <div className="single-additions-heading">
        <div>
          <h3 id="single-additions-heading">1品追加で近い候補</h3>
          <p>好きな商品を1品ずつ選び、残額を調整できます。</p>
        </div>
        <span>{totalCount}件</span>
      </div>
      {!canAdd ? <p className="single-additions-limit">最大4品を選択中のため、数量を減らすと追加できます。</p> : null}
      <CandidateGroup heading="1品追加で2,000円以上" candidates={groups.reachesTarget} selectedLines={selectedLines} targetYen={targetYen} canAdd={canAdd} showAll={showAll} onAdd={onAdd} />
      <CandidateGroup heading="まだ2,000円未満" candidates={groups.belowTarget} selectedLines={selectedLines} targetYen={targetYen} canAdd={canAdd} showAll={showAll} onAdd={onAdd} />
      {hiddenCount > 0 ? (
        <button className="show-more" type="button" aria-expanded={showAll} onClick={() => setShowAll((current) => !current)}>
          {showAll ? '表示を戻す' : `もっと見る（残り${hiddenCount}件）`}
        </button>
      ) : null}
    </section>
  )
}
