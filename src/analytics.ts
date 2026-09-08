export const GA_MEASUREMENT_ID = 'G-GFPBDZH2T2'

export type AnalyticsEventName =
  | 'pom_mode_change'
  | 'pom_product_select'
  | 'pom_candidate_add'
  | 'pom_preset_select'
  | 'pom_target_reached'

export type AnalyticsEventParameters = Record<string, string | number | boolean>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let initialized = false

export function initializeAnalytics(): void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') return
  initialized = true

  try {
    window.dataLayer = window.dataLayer ?? []

    if (!document.querySelector(`script[data-pom-ga4="${GA_MEASUREMENT_ID}"]`)) {
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
      script.dataset.pomGa4 = GA_MEASUREMENT_ID
      script.onerror = () => undefined
      document.head.appendChild(script)
    }

    window.gtag = window.gtag ?? function gtag(..._args: unknown[]) {
      window.dataLayer?.push(arguments)
    }

    window.gtag('js', new Date())
    window.gtag('config', GA_MEASUREMENT_ID)
  } catch {
    // Analytics must never prevent the reference checker from rendering or responding.
  }
}

export function trackAnalyticsEvent(name: AnalyticsEventName, parameters: AnalyticsEventParameters): void {
  try {
    window.gtag?.('event', name, parameters)
  } catch {
    // A blocked or unavailable analytics endpoint must not affect the app.
  }
}

export function overageBand(overage: number): '0-20' | '21-100' | '101-200' | '201+' {
  if (overage <= 20) return '0-20'
  if (overage <= 100) return '21-100'
  if (overage <= 200) return '101-200'
  return '201+'
}
