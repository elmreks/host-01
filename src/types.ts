export type OptionType = 'platform' | 'combo'

export type ScoreKey =
  | 'simplicity'
  | 'stability'
  | 'frontend_hosting'
  | 'backend_functions'
  | 'database'
  | 'auth'
  | 'payments'
  | 'storage'
  | 'pwa'
  | 'pricing_clarity'
  | 'lock_in_risk'
  | 'scalability_confidence'

export interface OptionItem {
  id: string
  name: string
  type: OptionType
  urls: string[]
  best_for: string[]
  summary: string
  scores: Record<ScoreKey, number>
  pros: string[]
  cons: string[]
  recommended_for: string[]
  avoid_if: string[]
  notes: string
  last_reviewed: string
}

export interface EnrichedOptionItem extends OptionItem {
  overall: number
}
