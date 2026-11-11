// Heat maths. The pace adjustment uses the temperature + dew point rule that
// coaches use for humid races: add the two together in Fahrenheit and the sum
// tells you roughly how much to slow down. Singapore sits in the 150 to 175
// range most afternoons, which is why a 3pm run feels like a different sport.

export type HeatBand = 'cool' | 'warm' | 'hot'

export const HOT_THRESHOLD_C = 30
export const COOL_THRESHOLD_C = 27

const toF = (c: number) => (c * 9) / 5 + 32
const toC = (f: number) => ((f - 32) * 5) / 9

export function dewPointC(tempC: number, humidity: number): number {
  const rh = Math.min(Math.max(humidity, 1), 100)
  const a = 17.62
  const b = 243.12
  const gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC)
  return (b * gamma) / (a - gamma)
}

// NOAA heat index (Rothfusz regression with the usual low humidity and low
// temperature corrections). Returns Celsius.
export function heatIndexC(tempC: number, humidity: number): number {
  const T = toF(tempC)
  const R = Math.min(Math.max(humidity, 0), 100)
  const simple = 0.5 * (T + 61 + (T - 68) * 1.2 + R * 0.094)
  if ((simple + T) / 2 < 80) return round1(toC(simple))

  let hi =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R
  if (R < 13 && T >= 80 && T <= 112) hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17)
  else if (R > 85 && T >= 80 && T <= 87) hi += ((R - 85) / 10) * ((87 - T) / 5)
  return round1(toC(hi))
}

// [sum of temp + dew point in °F, slowdown %] anchor points. Linear between them.
const ADJUSTMENT_CURVE: [number, number][] = [
  [100, 0],
  [110, 0.5],
  [120, 1],
  [130, 2],
  [140, 3],
  [150, 4.5],
  [160, 6],
  [170, 8],
  [180, 10],
  [190, 12],
]

export function heatSum(tempC: number, humidity: number): number {
  return toF(tempC) + toF(dewPointC(tempC, humidity))
}

// Percent slower than a cool, dry day for the same effort.
export function heatAdjustmentPct(tempC: number, humidity: number): number {
  const sum = heatSum(tempC, humidity)
  if (sum <= ADJUSTMENT_CURVE[0][0]) return 0
  for (let i = 1; i < ADJUSTMENT_CURVE.length; i++) {
    const [x1, y1] = ADJUSTMENT_CURVE[i]
    if (sum <= x1) {
      const [x0, y0] = ADJUSTMENT_CURVE[i - 1]
      return round1(y0 + ((sum - x0) / (x1 - x0)) * (y1 - y0))
    }
  }
  return ADJUSTMENT_CURVE[ADJUSTMENT_CURVE.length - 1][1]
}

// What this run would have been on a cool morning, all else equal.
export function coolEquivalentPace(paceSeconds: number, tempC: number, humidity: number): number {
  return Math.round(paceSeconds / (1 + heatAdjustmentPct(tempC, humidity) / 100))
}

// How many sec/km to add to a cool weather target pace for these conditions.
export function heatSlowdownSeconds(coolPaceSeconds: number, tempC: number, humidity: number): number {
  return Math.round((coolPaceSeconds * heatAdjustmentPct(tempC, humidity)) / 100)
}

export function heatBand(tempC: number | null | undefined): HeatBand | null {
  if (tempC == null || !Number.isFinite(tempC)) return null
  if (tempC >= HOT_THRESHOLD_C) return 'hot'
  if (tempC <= COOL_THRESHOLD_C) return 'cool'
  return 'warm'
}

export const BAND_COLOR: Record<HeatBand, string> = {
  cool: '#3B82F6',
  warm: '#F59E0B',
  hot: '#DC2626',
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme'

export function heatRisk(tempC: number, humidity: number): RiskLevel {
  const hi = heatIndexC(tempC, humidity)
  if (hi >= 41) return 'extreme'
  if (hi >= 35) return 'high'
  if (hi >= 30) return 'moderate'
  return 'low'
}

export function heatAdvice(tempC: number, humidity: number, coolPaceSeconds?: number | null): string {
  const pct = heatAdjustmentPct(tempC, humidity)
  const risk = heatRisk(tempC, humidity)
  const slow = coolPaceSeconds ? heatSlowdownSeconds(coolPaceSeconds, tempC, humidity) : null
  const slowText = slow ? `about ${slow} sec/km` : `roughly ${Math.round(pct)}%`

  switch (risk) {
    case 'extreme':
      return `Hard running is not worth it right now. If you must go, keep it short and easy, stay in the shade and stop at the first sign of dizziness.`
    case 'high':
      return `Run by effort, not pace. Expect to be ${slowText} slower than on a cool day, and drink before you head out.`
    case 'moderate':
      return `Warm but workable. Easy runs will feel ${slowText} slower than usual. Bring water if you are going past 45 minutes.`
    default:
      return pct > 0 ? `About as good as it gets here. You might lose ${slowText}, which is nothing.` : 'Proper running weather. Go chase a time.'
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
