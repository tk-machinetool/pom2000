import type { KeyboardEvent } from 'react'

export type ExploreMode = 'wanted' | 'conditions'

const MODES: Array<{ id: ExploreMode; label: string; panelId: string }> = [
  { id: 'wanted', label: '食べたいものから探す', panelId: 'wanted-mode-panel' },
  { id: 'conditions', label: '条件から探す', panelId: 'conditions-mode-panel' },
]

interface ExploreModeSwitchProps {
  value: ExploreMode
  onChange: (mode: ExploreMode) => void
}

export function ExploreModeSwitch({ value, onChange }: ExploreModeSwitchProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? MODES.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + MODES.length) % MODES.length
    const nextMode = MODES[nextIndex]
    onChange(nextMode.id)
    document.getElementById(`explore-mode-${nextMode.id}`)?.focus()
  }

  return (
    <nav className="explore-mode-switch" aria-labelledby="explore-mode-heading">
      <strong id="explore-mode-heading">探し方</strong>
      <div role="tablist" aria-label="探し方を選択">
        {MODES.map((mode, index) => (
          <button
            key={mode.id}
            id={`explore-mode-${mode.id}`}
            type="button"
            role="tab"
            aria-selected={value === mode.id}
            aria-controls={mode.panelId}
            tabIndex={value === mode.id ? 0 : -1}
            className={value === mode.id ? 'is-active' : ''}
            onClick={() => onChange(mode.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >{mode.label}</button>
        ))}
      </div>
    </nav>
  )
}
