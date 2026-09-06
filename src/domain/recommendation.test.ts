import { describe, expect, it } from 'vitest'
import rawData from '../../handoff/menu-data.json'
import { mergeMenuData } from './menuMerge'
import { practicalRecommendationLabel, recommendationRoleOf } from './recommendation'
import type { MenuData, RecommendationRole } from './types'

const mergedData = mergeMenuData(rawData as MenuData)

describe('recommendation-only classification', () => {
  it('audits all 209 price rows into explicit recommendation roles', () => {
    const counts = mergedData.menu.reduce((result, offer) => {
      const role = recommendationRoleOf(offer)
      result[role] = (result[role] ?? 0) + 1
      return result
    }, {} as Record<RecommendationRole, number>)

    expect(mergedData.menu).toHaveLength(209)
    expect(counts).toEqual({ main: 162, side: 11, dessert: 9, drink: 19, 'light-addon': 4, staple: 4 })
    expect(mergedData.menu.filter((offer) => recommendationRoleOf(offer) === 'other')).toEqual([])
    expect(recommendationRoleOf(mergedData.menu.find((offer) => offer.id === 'ref_rice_single')!)).toBe('staple')
    expect(recommendationRoleOf(mergedData.menu.find((offer) => offer.id === 'ref_stone_bread')!)).toBe('staple')
  })

  it('does not add inferred nutrition or physical-quantity metrics', () => {
    for (const offer of mergedData.menu) {
      expect(offer).not.toHaveProperty('satiety')
      expect(offer).not.toHaveProperty('calorie')
      expect(offer).not.toHaveProperty('weight')
    }
  })

  it('uses cautious recommendation wording at the requested overage thresholds', () => {
    expect(practicalRecommendationLabel(100)).toBe('最小追加のおすすめ')
    expect(practicalRecommendationLabel(101)).toBe('近い参考候補')
    expect(practicalRecommendationLabel(200)).toBe('近い参考候補')
    expect(practicalRecommendationLabel(201)).toBe('2,000円に近い実用的な組み合わせが見つかりません')
  })
})
