import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-05T12:00:00+09:00'))
  })

  afterEach(() => vi.useRealTimers())

  it('shows the required first-use trust copy and best result by default', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ポムの樹 2,000円参考チェッカー')
    expect(screen.getByText('非公式・参考ツール')).toBeVisible()
    expect(screen.getByRole('note')).toHaveTextContent('価格は参考です。店舗により価格・取扱商品が異なります。実際の注文前に店頭メニューをご確認ください。')
    expect(screen.getByRole('heading', { name: '食べたいものから探す' })).toBeVisible()
    expect(screen.getByRole('searchbox', { name: '商品名検索' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '選択中の商品' })).toBeVisible()
    expect(screen.getByRole('radio', { name: /1人向け/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getAllByText('2,013円').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+13円').length).toBeGreaterThan(0)
    expect(screen.getAllByText('公式掲載参考価格').length).toBeGreaterThan(0)
  })

  it('starts on the omurice category with more than four products available without search', () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: /オムライス/ })).toHaveAttribute('aria-selected', 'true')
    const productList = screen.getByRole('tabpanel', { name: 'オムライスの商品一覧' })
    const visibleProducts = within(productList).getAllByRole('button', { name: /を選択/ })
    expect(visibleProducts.length).toBe(8)
    expect(visibleProducts.length).toBeGreaterThan(4)
  })

  it('reveals the remaining category products with show all', () => {
    render(<App />)
    const productList = screen.getByRole('tabpanel', { name: 'オムライスの商品一覧' })
    const initialCount = within(productList).getAllByRole('button', { name: /を選択/ }).length
    fireEvent.click(within(productList).getByRole('button', { name: /すべて見る/ }))
    expect(within(productList).getAllByRole('button', { name: /を選択/ }).length).toBeGreaterThan(initialCount)
    expect(within(productList).getByRole('button', { name: '表示を戻す' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('switches product categories', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /サイド・デザート/ }))
    const productList = screen.getByRole('tabpanel', { name: 'サイド・デザートの商品一覧' })
    expect(within(productList).getByText('うじゃうじゃウインナー')).toBeVisible()
    expect(screen.getByRole('tab', { name: /サイド・デザート/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('searches all products beyond the selected category and returns after clearing', () => {
    render(<App />)
    const search = screen.getByRole('searchbox', { name: '商品名検索' })
    expect(screen.getByRole('tab', { name: /オムライス/ })).toHaveAttribute('aria-selected', 'true')

    fireEvent.change(search, { target: { value: 'うじゃうじゃ' } })
    const searchResults = screen.getByRole('tabpanel', { name: '全カテゴリの検索結果' })
    expect(within(searchResults).getByText('うじゃうじゃウインナー')).toBeVisible()

    fireEvent.change(search, { target: { value: '' } })
    const categoryList = screen.getByRole('tabpanel', { name: 'オムライスの商品一覧' })
    expect(within(categoryList).queryByText('うじゃうじゃウインナー')).not.toBeInTheDocument()
    expect(within(categoryList).getAllByRole('button', { name: /を選択/ })).toHaveLength(8)
  })

  it('shows expanded drink, side, dessert, and reference-price coverage', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'ドリンク' }))
    expect(screen.getByRole('tabpanel', { name: 'ドリンクの商品一覧' })).toHaveTextContent('コーラ')
    fireEvent.click(screen.getByRole('tab', { name: 'サイド・デザート（サイド）' }))
    expect(screen.getByRole('tabpanel', { name: 'サイド・デザートの商品一覧' })).toHaveTextContent('うじゃうじゃウインナー')
    fireEvent.click(screen.getByRole('tab', { name: 'デザート' }))
    expect(screen.getByRole('tabpanel', { name: 'デザートの商品一覧' })).toHaveTextContent('ジェラート')
    expect(document.body).toHaveTextContent('2026店頭メニュー参考価格')
  })

  it('allows a drink-only fixed item to enable the official +55 yen float modifier', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'ドリンク' }))
    fireEvent.click(screen.getByRole('button', { name: 'コーラを選択' }))
    const float = screen.getByRole('checkbox', { name: /フロート化/ })
    expect(float).not.toBeChecked()
    fireEvent.click(float)
    expect(float).toBeChecked()
    expect(screen.getAllByText(/バニラジェラート追加/).length).toBeGreaterThan(0)
  })

  it('filters by partial name and shows the fixed-product 647 yen gap and +13 yen best result', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('searchbox', { name: '商品名検索' }), { target: { value: '海鮮あん' } })
    fireEvent.click(screen.getByRole('button', { name: '海鮮あんかけオムライス SSを選択' }))

    expect(screen.getByText('647円')).toBeVisible()
    expect(screen.getByRole('heading', { name: '最小追加のおすすめ' })).toBeVisible()
    expect(screen.getAllByText('2,013円').length).toBeGreaterThan(0)
    expect(screen.getByText('超過 +2円')).toBeVisible()
  })

  it('supports multiple fixed products and removal', () => {
    render(<App />)
    const search = screen.getByRole('searchbox', { name: '商品名検索' })
    fireEvent.change(search, { target: { value: '海鮮あん' } })
    fireEvent.click(screen.getByRole('button', { name: '海鮮あんかけオムライス SSを選択' }))
    fireEvent.change(search, { target: { value: 'うじゃうじゃ' } })
    fireEvent.click(screen.getByRole('button', { name: 'うじゃうじゃウインナーを選択' }))
    expect(screen.getByText('参考価格上、この注文だけで2,000円以上')).toBeVisible()
    expect(screen.getByText('追加注文なしの参考候補です')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'うじゃうじゃウインナーを解除' }))
    expect(screen.queryByRole('button', { name: 'うじゃうじゃウインナーを解除' })).not.toBeInTheDocument()
    expect(screen.getByText('647円')).toBeVisible()
  })

  it('warns and adds omurice when the fixed product is not omurice', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('searchbox', { name: '商品名検索' }), { target: { value: 'うじゃうじゃ' } })
    fireEvent.click(screen.getByRole('button', { name: 'うじゃうじゃウインナーを選択' }))
    expect(screen.getByText(/この商品だけではキャンペーン条件を満たしません/)).toBeVisible()
    expect(screen.getByRole('heading', { name: '最小追加のおすすめ' })).toBeVisible()
  })

  it('adds a 400 yen hypothetical drink as a separate simulation item', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '仮ドリンク（参考400円）' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '仮ドリンクを追加' }))
    expect(screen.getByRole('button', { name: '仮ドリンク（参考400円）を解除' })).toBeVisible()
    expect(screen.getAllByText('仮価格').length).toBeGreaterThan(0)
  })

  it('changes the hypothetical drink price and reflects it in optimization', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('spinbutton', { name: '仮ドリンクの税込参考価格' }), { target: { value: '647' } })
    expect(screen.getByRole('heading', { name: '仮ドリンク（参考647円）' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '仮ドリンクを追加' }))
    fireEvent.change(screen.getByRole('searchbox', { name: '商品名検索' }), { target: { value: '海鮮あん' } })
    fireEvent.click(screen.getByRole('button', { name: '海鮮あんかけオムライス SSを選択' }))

    const result = screen.getByRole('region', { name: '最小追加のおすすめ' })
    expect(within(result).getByText('予想合計')).toBeVisible()
    expect(within(result).getByText('2,000円')).toBeVisible()
    expect(within(result).getByText('超過見込み +0円')).toBeVisible()
    expect(within(result).getByText('仮価格を含む参考結果です。')).toBeVisible()
    expect(result).not.toHaveTextContent('条件達成')
  })

  it('does not let the hypothetical drink satisfy the omurice requirement by itself', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '仮ドリンクを追加' }))
    expect(screen.getByText(/この商品だけではキャンペーン条件を満たしません/)).toBeVisible()
    const result = screen.getByRole('region', { name: '最小追加のおすすめ' })
    expect(result).toHaveTextContent('オムライス')
    expect(result).toHaveTextContent('実際の店舗価格によって2,000円未満になる場合があります')
  })

  it('keeps the fixed optimization result classified as a reference total when a store-menu item wins', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('searchbox', { name: '商品名検索' }), { target: { value: '海鮮あん' } })
    fireEvent.click(screen.getByRole('button', { name: '海鮮あんかけオムライス SSを選択' }))
    const result = screen.getByRole('region', { name: '最小追加のおすすめ' })
    expect(within(result).getByText('店頭参考合計')).toBeVisible()
    expect(within(result).getByText('2,002円')).toBeVisible()
    expect(within(result).getByText('超過 +2円')).toBeVisible()
    expect(result).not.toHaveTextContent('仮価格を含む参考結果です')
  })

  it('makes lunch mode obvious after explicit opt-in', () => {
    render(<App />)
    fireEvent.click(screen.getByText('条件を詳しく設定'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'ランチ価格を含める' }))
    expect(screen.getByText(/ランチ価格を使用中です/)).toBeVisible()
  })

  it('does not render prohibited product claims', () => {
    render(<App />)
    expect(document.body).not.toHaveTextContent('公式ツール')
    expect(document.body).not.toHaveTextContent('全国共通価格')
    expect(document.body).not.toHaveTextContent('全メニュー網羅')
    expect(document.body).not.toHaveTextContent('人気No.1')
    expect(document.body).not.toHaveTextContent('定番人気')
    expect(document.body).not.toHaveTextContent('確定価格')
    expect(document.body).not.toHaveTextContent('必ず2,000円以上')
    expect(document.body).not.toHaveTextContent('この金額で応募できます')
    expect(document.body).not.toHaveTextContent('店舗共通価格')
  })
})
