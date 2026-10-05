export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

export interface WindowScene {
  id: string
  routeName: string
  segment: string
  seatDirection: SeatDirection
  timestamp: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
  /** 最后一次修改时间。旧数据没有该字段，读取时按可选处理 */
  updatedAt?: string
  /** 每个可编辑字段各自的最后修改时间，用于多标签合并。旧数据没有该字段 */
  fieldUpdatedAt?: Partial<Record<SceneEditableKey, string>>
}

export interface SceneFormData {
  routeName: string
  segment: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

export type SceneEditableKey = keyof SceneFormData

export const SCENE_EDITABLE_KEYS: SceneEditableKey[] = [
  'routeName',
  'segment',
  'seatDirection',
  'weather',
  'signText',
  'treeDensity',
  'pedestrianStatus',
  'note',
]
