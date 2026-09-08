import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('analytics', () => {
  beforeEach(() => {
    document.head.querySelectorAll('script[data-pom-ga4]').forEach((script) => script.remove())
    delete window.gtag
    delete window.dataLayer
    vi.resetModules()
  })

  it('initializes GA4 once and queues page-view configuration without blocking rendering', async () => {
    const { GA_MEASUREMENT_ID, initializeAnalytics } = await import('./analytics')

    expect(() => initializeAnalytics()).not.toThrow()
    expect(() => initializeAnalytics()).not.toThrow()

    expect(document.head.querySelectorAll(`script[data-pom-ga4="${GA_MEASUREMENT_ID}"]`)).toHaveLength(1)
    expect(window.dataLayer).toHaveLength(2)

    const commands = window.dataLayer ?? []
    expect(commands.every((command) => Object.prototype.toString.call(command) === '[object Arguments]')).toBe(true)
    expect(Array.from(commands[0] as IArguments)[0]).toBe('js')
    expect(Array.from(commands[0] as IArguments)[1]).toBeInstanceOf(Date)
    expect(Array.from(commands[1] as IArguments)).toEqual(['config', GA_MEASUREMENT_ID])
    expect(Array.isArray(commands[0])).toBe(false)
    expect(Array.isArray(commands[1])).toBe(false)
  })

  it('keeps app initialization safe when the GA4 script cannot be appended', async () => {
    const { initializeAnalytics } = await import('./analytics')
    const appendChild = vi.spyOn(document.head, 'appendChild').mockImplementationOnce(() => {
      throw new Error('blocked')
    })

    expect(() => initializeAnalytics()).not.toThrow()

    appendChild.mockRestore()
  })

  it('does not fail when GA4 has not loaded or its command function throws', async () => {
    const { trackAnalyticsEvent } = await import('./analytics')
    expect(() => trackAnalyticsEvent('pom_mode_change', { mode: 'finder' })).not.toThrow()

    window.gtag = () => { throw new Error('blocked') }
    expect(() => trackAnalyticsEvent('pom_mode_change', { mode: 'condition' })).not.toThrow()
  })

  it('classifies target overage without collecting order details', async () => {
    const { overageBand } = await import('./analytics')
    expect([overageBand(0), overageBand(20), overageBand(21), overageBand(100), overageBand(101), overageBand(200), overageBand(201)])
      .toEqual(['0-20', '0-20', '21-100', '21-100', '101-200', '101-200', '201+'])
  })
})
