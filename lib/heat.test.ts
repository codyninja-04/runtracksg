import { describe, expect, it } from 'vitest'
import { coolEquivalentPace, dewPointC, heatAdjustmentPct, heatAdvice, heatBand, heatIndexC, heatRisk, heatSlowdownSeconds } from './heat'

describe('heat maths', () => {
  it('dew point is below air temperature unless saturated', () => {
    expect(dewPointC(30, 70)).toBeCloseTo(23.9, 0)
    expect(dewPointC(25, 100)).toBeCloseTo(25, 1)
  })

  it('heat index climbs with humidity', () => {
    expect(heatIndexC(32, 75)).toBeGreaterThan(heatIndexC(32, 40))
    expect(heatIndexC(32, 75)).toBeGreaterThan(38)
    expect(heatIndexC(20, 50)).toBeLessThan(21)
  })

  it('a cool dry day costs nothing', () => {
    expect(heatAdjustmentPct(10, 50)).toBe(0)
  })

  it('a Singapore afternoon costs a lot more than a morning', () => {
    const morning = heatAdjustmentPct(26.5, 85)
    const afternoon = heatAdjustmentPct(32, 65)
    expect(afternoon).toBeGreaterThan(morning)
    expect(afternoon).toBeGreaterThan(5)
    expect(afternoon).toBeLessThanOrEqual(12)
  })

  it('cool equivalent pace is faster than the actual hot pace', () => {
    expect(coolEquivalentPace(400, 32, 70)).toBeLessThan(400)
    expect(heatSlowdownSeconds(330, 31, 75)).toBeGreaterThan(15)
    expect(heatSlowdownSeconds(330, 31, 75)).toBeLessThan(45)
  })

  it('bands by the 27 and 30 degree thresholds', () => {
    expect(heatBand(26)).toBe('cool')
    expect(heatBand(28.5)).toBe('warm')
    expect(heatBand(30)).toBe('hot')
    expect(heatBand(null)).toBeNull()
  })

  it('risk and advice line up', () => {
    expect(heatRisk(24, 60)).toBe('low')
    expect(heatRisk(34, 75)).toBe('extreme')
    expect(heatAdvice(34, 75)).toMatch(/not worth it/)
    expect(heatAdvice(31, 70, 330)).toMatch(/sec\/km/)
  })
})
