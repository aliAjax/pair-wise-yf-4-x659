export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

/** 可编辑字段，参与多标签字段级合并 */
export type EditableField =
  | 'routeName'
  | 'segment'
  | 'seatDirection'
  | 'weather'
  | 'signText'
  | 'treeDensity'
  | 'pedestrianStatus'
  | 'note'

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
  /** 最后修改时间；旧数据可能缺失，升级后回退到 timestamp */
  updatedAt?: string
  /** 每个字段的最后修改时间戳，用于多标签字段级合并 */
  fieldUpdatedAt?: Partial<Record<EditableField, string>>
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

export type SaveStatus = 'saving' | 'failed'

export interface PendingSave {
  tempId: string
  scene: WindowScene
  mode: 'create' | 'update'
  status: SaveStatus
  error?: string
  /** 用于向用户指出是哪条没写成功 */
  label: string
}

export interface SaveResult {
  ok: boolean
  error?: string
}
