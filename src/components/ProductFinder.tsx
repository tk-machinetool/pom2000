import { useMemo, useState } from 'react'
import { formatYen, priceBasisLabel, priceBasisOf } from '../domain/format'
import { searchOffers } from '../domain/optimizer'
import type { FixedQuantities, MenuOffer } from '../domain/types'

type ProductCategory = 'omurice' | 'drink' | 'side' | 'dessert' | 'other'

const INITIAL_PRODUCT_COUNT = 8
const PRODUCT_CATEGORIES: Array<{ id: ProductCategory; label: string }> = [
  { id: 'omurice', label: 'オムライス' },
  { id: 'drink', label: 'ドリンク' },
  { id: 'side', label: 'サイド' },
  { id: 'dessert', label: 'デザート' },
  { id: 'other', label: 'その他' },
]

function productPanelLabel(category: ProductCategory): string {
  return category === 'side' ? 'サイド・デザート' : PRODUCT_CATEGORIES.find((item) => item.id === category)!.label
}

interface ProductGroup {
  key: string
  name: string
  offers: MenuOffer[]
}

function normalizedName(name: string): string {
  return name.normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/\s+/g, '')
}

function productCategory(offer: MenuOffer): ProductCategory {
  if (offer.containsOmurice) return 'omurice'
  if (offer.category === 'drink') return 'drink'
  if (offer.category === 'side') return 'side'
  if (offer.category === 'dessert') return 'dessert'
  return 'other'
}

function menuPriority(offer: MenuOffer): number {
  if (offer.menuContext === 'lunch') return 3
  if (offer.fair || offer.menuContext === 'fair') return 2
  if (priceBasisOf(offer) === 'store-reference') return 1
  return 0
}

function sizePriority(offer: MenuOffer): number {
  return ({ SS: 0, S: 1, M: 2, L: 3 }[offer.size ?? '']) ?? 4
}

function menuContextLabel(offer: MenuOffer): string {
  if (offer.menuContext === 'lunch') return 'ランチ'
  if (offer.fair || offer.menuContext === 'fair') return '期間限定'
  if (priceBasisOf(offer) === 'store-reference') return '店頭メニュー参考'
  return '通常メニュー'
}

function groupProducts(offers: MenuOffer[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>()
  offers.forEach((offer) => {
    const key = `${productCategory(offer)}::${normalizedName(offer.name)}`
    const group = groups.get(key) ?? { key, name: offer.name, offers: [] }
    group.offers.push(offer)
    groups.set(key, group)
  })

  return Array.from(groups.values()).map((group) => ({
    ...group,
    offers: group.offers.toSorted((left, right) => menuPriority(left) - menuPriority(right) || sizePriority(left) - sizePriority(right) || left.id.localeCompare(right.id, 'en')),
  })).toSorted((left, right) => {
    const leftPriority = Math.min(...left.offers.map(menuPriority))
    const rightPriority = Math.min(...right.offers.map(menuPriority))
    return leftPriority - rightPriority || left.name.localeCompare(right.name, 'ja')
  })
}

interface ProductFinderProps {
  offers: MenuOffer[]
  simulationOffer: MenuOffer
  onSimulationPriceChange: (price: number) => void
  fixedQuantities: FixedQuantities
  onChange: (quantities: FixedQuantities) => void
  maxQuantityPerOffer: number
  maxTotalUnits: number
  floatEnabled: boolean
  onFloatChange: (enabled: boolean) => void
}

export function ProductFinder({
  offers,
  simulationOffer,
  onSimulationPriceChange,
  fixedQuantities,
  onChange,
  maxQuantityPerOffer,
  maxTotalUnits,
  floatEnabled,
  onFloatChange,
}: ProductFinderProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProductCategory>('omurice')
  const [showAll, setShowAll] = useState(false)
  const [sizeByGroup, setSizeByGroup] = useState<Record<string, string>>({})
  const isSearching = query.trim().length > 0
  const categoryGroups = useMemo(() => PRODUCT_CATEGORIES.reduce((result, item) => {
    result[item.id] = groupProducts(offers.filter((offer) => productCategory(offer) === item.id))
    return result
  }, {} as Record<ProductCategory, ProductGroup[]>), [offers])
  const searchedGroups = useMemo(() => groupProducts(searchOffers(offers, query, offers.length)), [offers, query])
  const groups = categoryGroups[category]
  const results = isSearching ? searchedGroups : showAll ? groups : groups.slice(0, INITIAL_PRODUCT_COUNT)
  const totalResultCount = isSearching ? searchedGroups.length : groups.length
  const byId = useMemo(() => new Map([...offers, simulationOffer].map((offer) => [offer.id, offer])), [offers, simulationOffer])
  const selected = Object.entries(fixedQuantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({ offer: byId.get(id), quantity }))
    .filter((entry): entry is { offer: MenuOffer; quantity: number } => Boolean(entry.offer))
  const selectedUnits = selected.reduce((sum, entry) => sum + entry.quantity, 0)
  const simulationQuantity = fixedQuantities[simulationOffer.id] ?? 0
  const selectedDrink = selected.some(({ offer }) => offer.category === 'drink')

  const setQuantity = (id: string, quantity: number) => {
    const next = { ...fixedQuantities }
    if (quantity <= 0) delete next[id]
    else next[id] = quantity
    if (!Object.entries(next).some(([nextId]) => byId.get(nextId)?.category === 'drink')) onFloatChange(false)
    onChange(next)
  }

  const selectedOfferFor = (group: ProductGroup): MenuOffer => {
    const selectedOffer = group.offers.find((offer) => (fixedQuantities[offer.id] ?? 0) > 0)
    if (selectedOffer) return selectedOffer
    const chosenId = sizeByGroup[group.key]
    return group.offers.find((offer) => offer.id === chosenId) ?? group.offers[0]
  }

  return (
    <section className="wanted-finder" aria-labelledby="wanted-heading">
      <div className="wanted-intro">
        <h2 id="wanted-heading">食べたいものから探す</h2>
        <p>商品を選ぶと、2,000円に近い追加を探します</p>
      </div>

      <label className="product-search">
        <span className="sr-only">商品名検索</span>
        <span className="search-icon" aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder="商品名を入力"
          onChange={(event) => {
            const nextQuery = event.target.value
            setQuery(nextQuery)
            if (!nextQuery.trim()) setShowAll(false)
          }}
          autoComplete="off"
        />
      </label>

      <div className="product-categories" role="tablist" aria-label="商品カテゴリ">
        {PRODUCT_CATEGORIES.map((item) => {
          const count = categoryGroups[item.id].length
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              aria-label={item.id === 'side' ? 'サイド・デザート（サイド）' : item.label}
              className={category === item.id ? 'product-category is-active' : 'product-category'}
              onClick={() => {
                setCategory(item.id)
                setQuery('')
                setShowAll(false)
              }}
            >
              <strong>{item.label}</strong>
              <small>{count}件</small>
            </button>
          )
        })}
      </div>

      <section className="simulation-drink" aria-labelledby="simulation-drink-heading">
        <div className="simulation-drink-copy">
          <span className="price-basis hypothetical">仮価格</span>
          <h3 id="simulation-drink-heading">仮ドリンク（参考{formatYen(simulationOffer.price)}）</h3>
          <p>事前シミュレーション用です。公式掲載価格ではありません。</p>
        </div>
        <div className="simulation-drink-controls">
          <label>税込参考価格
            <span><input
              type="number"
              min="1"
              max="9999"
              step="1"
              inputMode="numeric"
              value={simulationOffer.price}
              aria-label="仮ドリンクの税込参考価格"
              onChange={(event) => {
                const nextPrice = event.currentTarget.valueAsNumber
                if (Number.isInteger(nextPrice) && nextPrice > 0 && nextPrice <= 9999) onSimulationPriceChange(nextPrice)
              }}
            /> 円</span>
          </label>
          <button
            type="button"
            onClick={() => setQuantity(simulationOffer.id, 1)}
            disabled={simulationQuantity > 0 || selectedUnits >= maxTotalUnits}
          >{simulationQuantity > 0 ? '追加済み' : '仮ドリンクを追加'}</button>
        </div>
      </section>

      {selectedDrink ? (
        <label className="float-option">
          <input type="checkbox" checked={floatEnabled} onChange={(event) => onFloatChange(event.target.checked)} />
          <span><strong>フロート化（バニラジェラート +55円）</strong><small>ドリンク選択時だけ適用できる公式掲載参考の加算です。</small></span>
        </label>
      ) : null}

      <div className="product-results" role="tabpanel" aria-label={isSearching ? '全カテゴリの検索結果' : `${productPanelLabel(category)}の商品一覧`}>
        <div className="product-results-heading">
          <strong>{isSearching ? '全カテゴリの検索結果' : '商品一覧'}</strong>
          <span>{results.length}/{totalResultCount}件を表示</span>
        </div>
        {results.length > 0 ? (
          <ul>
            {results.map((group) => {
              const offer = selectedOfferFor(group)
              const quantity = fixedQuantities[offer.id] ?? 0
              const disabled = quantity >= maxQuantityPerOffer || selectedUnits >= maxTotalUnits
              return (
                <li key={group.key}>
                  <div className="product-name-price">
                    <strong>{group.name}</strong>
                    <span className="product-details">
                      <i>{menuContextLabel(offer)}</i>
                      <span><b>{priceBasisLabel(offer)}</b>{offer.size ?? 'サイズ表記なし'}・{formatYen(offer.price)}{priceBasisOf(offer) === 'store-reference' ? '・店舗差あり' : ''}</span>
                    </span>
                    {group.offers.length > 1 ? (
                      <label className="product-size-select">
                        <span>サイズ・価格</span>
                        <select
                          aria-label={`${group.name}のサイズ`}
                          value={offer.id}
                          onChange={(event) => setSizeByGroup((current) => ({ ...current, [group.key]: event.target.value }))}
                        >
                          {group.offers.map((sizeOffer) => <option key={sizeOffer.id} value={sizeOffer.id}>{sizeOffer.size ?? 'サイズ表記なし'}・{formatYen(sizeOffer.price)}（{priceBasisLabel(sizeOffer)}）</option>)}
                        </select>
                      </label>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={quantity > 0 ? 'select-product is-selected' : 'select-product'}
                    onClick={() => setQuantity(offer.id, quantity + 1)}
                    disabled={disabled}
                    aria-label={`${group.name}${offer.size ? ` ${offer.size}` : ''}を選択`}
                  >
                    {quantity > 0 ? `選択中 ×${quantity}` : '＋ 選択'}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : <p className="no-search-result">該当する商品はありません。</p>}
        {!isSearching && groups.length > INITIAL_PRODUCT_COUNT ? (
          <button
            className="show-all-products"
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? '表示を戻す' : `すべて見る（残り${groups.length - INITIAL_PRODUCT_COUNT}件）`}
          </button>
        ) : null}
      </div>

      <div className="selected-products" aria-live="polite">
        <div className="selected-heading">
          <h3>選択中の商品</h3>
          <span>{selectedUnits}/{maxTotalUnits}品</span>
        </div>
        {selected.length > 0 ? (
          <ul>
            {selected.map(({ offer, quantity }) => (
              <li key={offer.id}>
                <div className="selected-product-name">
                  <strong>{offer.name}</strong>
                  <span className={`price-basis ${priceBasisOf(offer)}`}>{priceBasisLabel(offer)}</span>
                  <span>{offer.size ? `${offer.size}・` : ''}{formatYen(offer.price)}／1品</span>
                </div>
                <div className="selected-product-actions">
                  <div className="quantity-control" aria-label={`${offer.name}の数量`}>
                    <button type="button" onClick={() => setQuantity(offer.id, quantity - 1)} aria-label={`${offer.name}を1つ減らす`}>−</button>
                    <output aria-label="数量">{quantity}</output>
                    <button
                      type="button"
                      onClick={() => setQuantity(offer.id, quantity + 1)}
                      disabled={quantity >= maxQuantityPerOffer || selectedUnits >= maxTotalUnits}
                      aria-label={`${offer.name}を1つ増やす`}
                    >＋</button>
                  </div>
                  <button type="button" className="remove-product" onClick={() => setQuantity(offer.id, 0)} aria-label={`${offer.name}を解除`}>解除</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="selected-empty">商品一覧または検索結果から、食べたい商品を1つ以上選んでください。</p>}
      </div>
    </section>
  )
}
