import type { SearchFilters } from '../domain/types'
import { ChevronIcon } from './Icons'

const FILTERS: Array<{ key: keyof SearchFilters; label: string }> = [
  { key: 'includeLunch', label: 'ランチ価格を含める' },
  { key: 'includeSide', label: 'サイド' },
  { key: 'includeDessert', label: 'デザート' },
  { key: 'includePasta', label: 'パスタ' },
  { key: 'includeFair', label: '期間限定' },
  { key: 'includeS', label: 'Sサイズ' },
]

interface AdvancedFiltersProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  defaultOpen: boolean
}

export function AdvancedFilters({ filters, onChange, defaultOpen }: AdvancedFiltersProps) {
  const activeCount = Object.values(filters).filter(Boolean).length
  const update = (key: keyof SearchFilters, checked: boolean) => onChange({ ...filters, [key]: checked })

  return (
    <details className="advanced-panel" open={defaultOpen}>
      <summary>
        <span>条件を詳しく設定<small>{activeCount}項目を使用中</small></span>
        <ChevronIcon />
      </summary>
      <div className="filter-content">
        <fieldset>
          <legend>追加候補に含める価格・商品カテゴリ</legend>
          {FILTERS.map(({ key, label }) => (
            <label key={key} className={key === 'includeLunch' && filters[key] ? 'filter-option lunch-active' : 'filter-option'}>
              <input type="checkbox" checked={filters[key]} onChange={(event) => update(key, event.target.checked)} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        {filters.includeLunch ? <p className="lunch-status">ランチ価格を使用中です。提供時間・取扱いを店舗でご確認ください。</p> : null}
        <button
          className="reset-button"
          type="button"
          onClick={() => onChange({ includeLunch: false, includeSide: true, includeDessert: true, includePasta: false, includeFair: true, includeS: true })}
        >
          初期条件に戻す
        </button>
      </div>
    </details>
  )
}
