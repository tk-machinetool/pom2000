import { useEffect, useMemo, useRef, useState } from 'react'
import rawData from '../handoff/menu-data.json'
import { overageBand, trackAnalyticsEvent } from './analytics'
import { AdvancedFilters } from './components/AdvancedFilters'
import { BestResult } from './components/BestResult'
import { DataTrustNotice } from './components/DataTrustNotice'
import { ExploreModeSwitch, type ExploreMode } from './components/ExploreModeSwitch'
import { FixedRecommendation } from './components/FixedRecommendation'
import { FixedOrderComplete } from './components/FixedOrderComplete'
import { FixedResultList } from './components/FixedResultList'
import { PresetSelector } from './components/PresetSelector'
import { ProductFinder } from './components/ProductFinder'
import { ResultList } from './components/ResultList'
import { SingleAdditionCandidates } from './components/SingleAdditionCandidates'
import { formatYen, priceBasisOf } from './domain/format'
import { mergeMenuData } from './domain/menuMerge'
import { optimize, optimizeWithFixed, selectableOffers } from './domain/optimizer'
import { singleAdditionCandidates } from './domain/recommendation'
import { createFloatModifierOffer, createHypotheticalDrinkOffer, FLOAT_MODIFIER_ID, SIMULATION_DRINK_ID } from './domain/simulation'
import type { FixedQuantities, MenuData, Preset, SearchFilters } from './domain/types'

const data = mergeMenuData(rawData as MenuData)
const DEFAULT_FILTERS: SearchFilters = {
  includeLunch: false,
  includeSide: true,
  includeDessert: true,
  includePasta: false,
  includeFair: true,
  includeS: true,
}

const PRESET_LABELS: Record<Preset, string> = { solo: '1人向け', pair: '2人向け', light: '軽めに2,000円', price: '金額最優先' }

function App() {
  const [preset, setPreset] = useState<Preset>('solo')
  const [exploreMode, setExploreMode] = useState<ExploreMode>('wanted')
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [fixedQuantities, setFixedQuantities] = useState<FixedQuantities>({})
  const [simulationDrinkPrice, setSimulationDrinkPrice] = useState(400)
  const [floatEnabled, setFloatEnabled] = useState(false)
  const [now] = useState(() => new Date())
  const [desktopDefault] = useState(() => window.matchMedia('(min-width: 980px)').matches)
  const fixedResultsRef = useRef<HTMLDivElement>(null)
  const shouldScrollToFixedResultsRef = useRef(false)
  const targetReachedRef = useRef(false)

  const baskets = useMemo(
    () => optimize(data, { preset, filters, maxQuantityPerOffer: 2, maxTotalUnits: 4, limit: 20 }, now),
    [filters, now, preset],
  )
  const products = useMemo(() => selectableOffers(data, filters, now), [filters, now])
  const simulationDrink = useMemo(() => createHypotheticalDrinkOffer(simulationDrinkPrice), [simulationDrinkPrice])
  const floatModifier = useMemo(() => createFloatModifierOffer(), [])
  const fixedOfferById = useMemo(() => new Map([...products, simulationDrink, floatModifier].map((offer) => [offer.id, offer])), [products, simulationDrink, floatModifier])
  const baseSelectedLines = useMemo(() => Object.entries(fixedQuantities)
    .map(([id, quantity]) => ({ offer: fixedOfferById.get(id), quantity }))
    .filter((line) => line.offer !== undefined), [fixedOfferById, fixedQuantities])
  const selectedHasDrink = baseSelectedLines.some(({ offer }) => offer!.category === 'drink')
  const effectiveFixedQuantities = useMemo(() => {
    if (!floatEnabled || !selectedHasDrink) return fixedQuantities
    return { ...fixedQuantities, [FLOAT_MODIFIER_ID]: 1 }
  }, [fixedQuantities, floatEnabled, selectedHasDrink])
  const selectedLines = useMemo(() => Object.entries(effectiveFixedQuantities)
    .map(([id, quantity]) => ({ offer: fixedOfferById.get(id), quantity }))
    .filter((line) => line.offer !== undefined), [effectiveFixedQuantities, fixedOfferById])
  const selectedTotal = selectedLines.reduce((sum, { offer, quantity }) => sum + offer!.price * quantity, 0)
  const selectedHasOmurice = selectedLines.some(({ offer }) => offer!.containsOmurice)
  const selectedHasHypotheticalPrice = selectedLines.some(({ offer }) => priceBasisOf(offer!) === 'hypothetical')
  const selectedHasStoreReferencePrice = selectedLines.some(({ offer }) => priceBasisOf(offer!) === 'store-reference')
  const selectedBasketLines = useMemo(() => selectedLines.map(({ offer, quantity }) => ({ offer: offer!, quantity })), [selectedLines])
  const selectedUnitCount = baseSelectedLines.reduce((sum, line) => sum + line.quantity, 0)
  const fixedOrderNeedsNoAddition = selectedTotal >= data.targetYen && selectedHasOmurice
  const singleAdditions = useMemo(
    () => singleAdditionCandidates([...products, simulationDrink], selectedBasketLines, data.targetYen),
    [products, selectedBasketLines, simulationDrink],
  )
  const fixedBaskets = useMemo(
    () => optimizeWithFixed(
      data,
      { preset: 'solo', filters, maxQuantityPerOffer: 2, maxTotalUnits: 4, limit: 20 },
      now,
      effectiveFixedQuantities,
      [
        ...(effectiveFixedQuantities[SIMULATION_DRINK_ID] ? [simulationDrink] : []),
        ...(effectiveFixedQuantities[FLOAT_MODIFIER_ID] ? [floatModifier] : []),
      ],
    ),
    [effectiveFixedQuantities, filters, floatModifier, now, simulationDrink],
  )
  const hasSelection = selectedLines.length > 0

  const updateFixedQuantities = (next: FixedQuantities, source: 'product' | 'candidate' = 'product') => {
    shouldScrollToFixedResultsRef.current = Object.entries(next).some(
      ([id, quantity]) => quantity > 0 && (fixedQuantities[id] ?? 0) === 0,
    )
    if (source === 'product') {
      Object.entries(next).forEach(([id, quantity]) => {
        if (quantity <= 0 || (fixedQuantities[id] ?? 0) > 0) return
        const offer = fixedOfferById.get(id)
        if (!offer) return
        trackAnalyticsEvent('pom_product_select', {
          category: offer.category,
          price_basis: priceBasisOf(offer),
        })
      })
    }
    setFixedQuantities(next)
  }

  useEffect(() => {
    if (!shouldScrollToFixedResultsRef.current || !hasSelection || !fixedBaskets[0]) return
    shouldScrollToFixedResultsRef.current = false
    if (!window.matchMedia('(max-width: 979px)').matches) return

    fixedResultsRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [fixedBaskets, hasSelection])

  useEffect(() => {
    const reached = selectedTotal >= data.targetYen && selectedHasOmurice
    if (reached && !targetReachedRef.current) {
      trackAnalyticsEvent('pom_target_reached', {
        overage_band: overageBand(selectedTotal - data.targetYen),
      })
    }
    targetReachedRef.current = reached
  }, [selectedHasOmurice, selectedTotal])

  const updateFilters = (next: SearchFilters) => {
    if (filters.includeLunch && !next.includeLunch) {
      setFixedQuantities((current) => Object.fromEntries(Object.entries(current).filter(([id]) => data.menu.find((offer) => offer.id === id)?.menuContext !== 'lunch')))
    }
    setFilters(next)
  }

  return (
    <>
      <div className="persistent-warning" role="note">
        <span aria-hidden="true">!</span>
        <strong>価格は参考です。<br />店舗により価格・取扱商品が異なります。<br />実際の注文前に店頭メニューをご確認ください。</strong>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <h1><span className="brand-title">ポムの樹</span>{' '}<span className="tool-title"><em>2,000円</em>参考チェッカー</span></h1>
          <p>非公式・参考ツール</p>
        </div>
      </header>
      <ExploreModeSwitch
        value={exploreMode}
        onChange={(mode) => {
          if (mode === exploreMode) return
          setExploreMode(mode)
          trackAnalyticsEvent('pom_mode_change', { mode: mode === 'wanted' ? 'finder' : 'condition' })
        }}
      />
      <div className="price-basis-guide" aria-label="価格表示の区分">
        <div><strong>公式掲載参考価格</strong><span>公式Web確認・店舗差あり</span></div>
        <div><strong>店頭メニュー参考価格</strong><span>2026年写真確認・店舗差あり</span></div>
        <div><strong>仮価格</strong><span>事前シミュレーション用</span></div>
        <div><strong>店頭入力価格</strong><span>利用者入力・公式データと分離</span></div>
      </div>

      <main>
        <div className="app-grid">
          <div className="primary-column">
            <section
              id="wanted-mode-panel"
              className="mode-panel wanted-mode-panel"
              role="tabpanel"
              aria-labelledby="explore-mode-wanted"
              hidden={exploreMode !== 'wanted'}
            >
              <ProductFinder
                offers={products}
                simulationOffer={simulationDrink}
                onSimulationPriceChange={setSimulationDrinkPrice}
                fixedQuantities={fixedQuantities}
                onChange={updateFixedQuantities}
                floatEnabled={floatEnabled}
                onFloatChange={setFloatEnabled}
                maxQuantityPerOffer={2}
                maxTotalUnits={4}
              />

              {hasSelection ? (
                <div ref={fixedResultsRef} className="fixed-results" aria-live="polite">
                  <section className={selectedHasOmurice ? 'target-status' : 'target-status needs-omurice'}>
                    <div className="current-selection-summary">
                      <div>
                        <h3>現在の選択状況</h3>
                        <p>{selectedBasketLines.map(({ offer, quantity }) => `${offer.name}${offer.size ? ` ${offer.size}` : ''} ×${quantity}`).join('、')}</p>
                      </div>
                      <span>{selectedHasHypotheticalPrice ? '予想合計' : selectedHasStoreReferencePrice ? '店頭参考合計' : '参考合計'} <strong>{formatYen(selectedTotal)}</strong></span>
                    </div>
                    {selectedTotal < data.targetYen ? (
                      <p>2,000円まであと{selectedHasHypotheticalPrice ? '（見込み）' : ''} <strong>{data.targetYen - selectedTotal}円</strong></p>
                    ) : selectedHasOmurice ? (
                      <p className={selectedHasHypotheticalPrice ? 'estimate' : 'achieved'}>{selectedHasHypotheticalPrice ? '仮価格上、2,000円以上の見込み' : '参考価格上、2,000円以上'}</p>
                    ) : (
                      <p>{selectedHasHypotheticalPrice ? '仮価格上、2,000円以上の見込みです' : '参考価格上、2,000円以上です'}</p>
                    )}
                    {!selectedHasOmurice ? (
                      <div className="omurice-required">この商品だけではキャンペーン条件を満たしません。<br />オムライスを含む組み合わせを探します。</div>
                    ) : null}
                  </section>
                  {selectedTotal < data.targetYen ? (
                    <SingleAdditionCandidates
                      key={JSON.stringify(effectiveFixedQuantities)}
                      groups={singleAdditions}
                      selectedLines={selectedBasketLines}
                      targetYen={data.targetYen}
                      canAdd={selectedUnitCount < 4}
                      onAdd={(offerId) => {
                        const offer = fixedOfferById.get(offerId)
                        if (offer) {
                          trackAnalyticsEvent('pom_candidate_add', {
                            category: offer.category,
                            price_basis: priceBasisOf(offer),
                          })
                        }
                        updateFixedQuantities({ ...fixedQuantities, [offerId]: 1 }, 'candidate')
                      }}
                    />
                  ) : null}
                  {fixedOrderNeedsNoAddition ? (
                    <FixedOrderComplete
                      lines={selectedBasketLines}
                      targetYen={data.targetYen}
                      sources={data.sources}
                      asOf={data.asOf}
                    />
                  ) : fixedBaskets[0] ? (
                    <>
                      <FixedRecommendation basket={fixedBaskets[0]} fixedQuantities={effectiveFixedQuantities} sources={data.sources} asOf={data.asOf} />
                      <FixedResultList key={JSON.stringify(effectiveFixedQuantities)} baskets={fixedBaskets} fixedQuantities={effectiveFixedQuantities} sources={data.sources} asOf={data.asOf} />
                    </>
                  ) : (
                    <section className="empty-state">
                      <h2>追加できる有効な候補がありません</h2>
                      <p>最大4品・同一商品2個までの範囲と、現在の販売・価格条件を反映しています。</p>
                    </section>
                  )}
                </div>
              ) : null}
            </section>

            <section
              id="conditions-mode-panel"
              className="mode-panel auxiliary-explorer"
              role="tabpanel"
              aria-labelledby="explore-mode-conditions"
              hidden={exploreMode !== 'conditions'}
            >
              <div className="auxiliary-intro">
                <h2 id="auxiliary-heading">条件から探す</h2>
                <p>商品を決めていないときの補助機能です</p>
              </div>
              <PresetSelector
                value={preset}
                onChange={(nextPreset) => {
                  if (nextPreset === preset) return
                  setPreset(nextPreset)
                  trackAnalyticsEvent('pom_preset_select', { preset: nextPreset })
                }}
              />
              {baskets[0] ? (
                <>
                  <BestResult basket={baskets[0]} preset={preset} presetLabel={PRESET_LABELS[preset]} sources={data.sources} asOf={data.asOf} />
                  <ResultList key={`${preset}-${JSON.stringify(filters)}`} baskets={baskets} sources={data.sources} asOf={data.asOf} />
                </>
              ) : (
                <section className="empty-state" aria-live="polite">
                  <h2>現在の条件で表示できる候補がありません</h2>
                  <p>キャンペーン期間、販売開始日、データの再確認期限、選択中の条件を反映しています。</p>
                </section>
              )}
            </section>
          </div>
          <aside className="side-column">
            <AdvancedFilters filters={filters} onChange={updateFilters} defaultOpen={desktopDefault} />
            <DataTrustNotice data={data} />
          </aside>
        </div>
      </main>
      <footer>
        <span>非公式の参考ツールです。データ基準日：{data.asOf}</span>
        <small>利用状況の把握・改善のため、Google Analyticsによるアクセス解析を使用しています。</small>
      </footer>
    </>
  )
}

export default App
