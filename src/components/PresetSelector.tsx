import type { Preset } from '../domain/types'

const PRESETS: Array<{ id: Preset; label: string; description: string }> = [
  { id: 'solo', label: '1人向け', description: '食事として自然な追加' },
  { id: 'pair', label: '2人向け', description: '2人でシェア' },
  { id: 'light', label: '軽めに2,000円', description: 'SSサイズ・品数少なめ・主食の追加を抑えた参考候補' },
  { id: 'price', label: '金額最優先', description: '金額差を最優先' },
]

interface PresetSelectorProps {
  value: Preset
  onChange: (preset: Preset) => void
}

export function PresetSelector({ value, onChange }: PresetSelectorProps) {
  return (
    <section className="preset-section" aria-labelledby="preset-heading">
      <div className="section-heading-row">
        <h2 id="preset-heading">人数・目的を選ぶ</h2>
        <span>{value === 'solo' || value === 'light' ? '主食1品＋追加2品まで' : '最大4品まで探索'}</span>
      </div>
      <div className="preset-tabs" role="radiogroup" aria-label="人数・目的プリセット">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={value === preset.id ? 'preset-tab is-active' : 'preset-tab'}
            type="button"
            role="radio"
            aria-checked={value === preset.id}
            onClick={() => onChange(preset.id)}
          >
            <strong>{preset.label}</strong>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
