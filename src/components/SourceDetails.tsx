import { ExternalIcon } from './Icons'
import { priceBasisOf } from '../domain/format'
import type { Basket, MenuSource } from '../domain/types'

interface SourceDetailsProps {
  basket: Basket
  sources: Record<string, MenuSource>
  asOf: string
}

export function SourceDetails({ basket, sources, asOf }: SourceDetailsProps) {
  const sourceIds = Array.from(new Set(basket.lines
    .filter(({ offer }) => (priceBasisOf(offer) === 'official-reference' || priceBasisOf(offer) === 'store-reference') && sources[offer.source])
    .map(({ offer }) => offer.source)))
  const hasHypotheticalPrice = basket.lines.some(({ offer }) => priceBasisOf(offer) === 'hypothetical')
  const hasStoreEnteredPrice = basket.lines.some(({ offer }) => priceBasisOf(offer) === 'store-entered')
  const hasStoreReferencePrice = basket.lines.some(({ offer }) => priceBasisOf(offer) === 'store-reference')

  return (
    <details className="source-details">
      <summary>出典・価格区分を見る</summary>
      <div className="source-details-content">
        <p>データ確認日 {asOf}</p>
        {hasHypotheticalPrice ? <p className="nonofficial-source-note"><strong>仮価格：</strong>事前シミュレーション用で、公式掲載価格ではありません。</p> : null}
        {hasStoreEnteredPrice ? <p className="nonofficial-source-note"><strong>店頭入力価格：</strong>利用者が入力した価格で、公式確認済みデータとは分離しています。</p> : null}
        {hasStoreReferencePrice ? <p className="nonofficial-source-note"><strong>店頭メニュー参考価格：</strong>2026年の実店舗メニュー写真で確認した参考価格です。公式価格や全国一律価格としては扱わず、店舗差があります。</p> : null}
        <ul>
          {sourceIds.map((id) => {
            const source = sources[id]
            return (
              <li key={id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  <span>{source.title}</span>
                  <ExternalIcon size={16} />
                </a>
                <small>{source.publisher}・確認 {source.verifiedOn}</small>
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}
