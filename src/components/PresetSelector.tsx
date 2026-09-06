import type { Preset } from '../domain/types'

const PRESETS: Array<{ id: Preset; label: string; description: string }> = [
  { id: 'solo', label: '1人向け', description: '主食1品' },
  { id: 'pair', label: '2人向け', description: '主食2品' },
  { id: 'price', label: '金額最優先', description: '条件だけで探索' },
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
        <span>最大4品まで探索</span>
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
