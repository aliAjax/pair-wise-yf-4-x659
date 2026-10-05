import type { WindowScene, EditableField, SaveResult } from '@/types'

export const STORAGE_KEY = 'bus_window_scenes'

export const EDITABLE_FIELDS: EditableField[] = [
  'routeName',
  'segment',
  'seatDirection',
  'weather',
  'signText',
  'treeDensity',
  'pedestrianStatus',
  'note',
]

function readAll(): WindowScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WindowScene[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(scenes: WindowScene[]): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '写入失败' }
  }
}

/**
 * 旧数据迁移：补齐 updatedAt / fieldUpdatedAt。
 * 没有改动时间的旧数据，所有字段时间戳回退到创建时间 timestamp，
 * 升级后照旧打开并可继续编辑。
 */
function migrate(scene: WindowScene): WindowScene {
  const base = scene.updatedAt ?? scene.timestamp
  const fieldUpdatedAt: Partial<Record<EditableField, string>> = {
    ...(scene.fieldUpdatedAt ?? {}),
  }
  for (const f of EDITABLE_FIELDS) {
    if (!fieldUpdatedAt[f]) fieldUpdatedAt[f] = base
  }
  return { ...scene, updatedAt: base, fieldUpdatedAt }
}

export function getAllScenes(): WindowScene[] {
  return readAll().map(migrate)
}

/**
 * 字段级合并：每个字段保留时间戳较新的一方。
 * 这样多个标签同时保存同一条时，各自动过的字段都留下，
 * 而不是后到的把对方刚写的整个盖掉。
 */
function mergeScene(storedRaw: WindowScene, incomingRaw: WindowScene): WindowScene {
  const stored = migrate(storedRaw)
  const incoming = migrate(incomingRaw)

  const merged: WindowScene = {
    ...stored,
    fieldUpdatedAt: { ...(stored.fieldUpdatedAt ?? {}) },
  }

  for (const f of EDITABLE_FIELDS) {
    const sTs = stored.fieldUpdatedAt?.[f] ?? stored.updatedAt ?? stored.timestamp
    const iTs = incoming.fieldUpdatedAt?.[f] ?? incoming.updatedAt ?? incoming.timestamp
    if (iTs >= sTs) {
      ;(merged as unknown as Record<string, unknown>)[f] = (incoming as unknown as Record<string, unknown>)[f]
      merged.fieldUpdatedAt![f] = iTs
    } else {
      merged.fieldUpdatedAt![f] = sTs
    }
  }

  // updatedAt 取较新者；timestamp（创建时间）保留较早者
  const sUp = stored.updatedAt ?? stored.timestamp
  const iUp = incoming.updatedAt ?? incoming.timestamp
  merged.updatedAt = iUp >= sUp ? iUp : sUp
  merged.timestamp = stored.timestamp <= incoming.timestamp ? stored.timestamp : incoming.timestamp

  return merged
}

export function saveScene(scene: WindowScene): SaveResult {
  const scenes = readAll()
  const idx = scenes.findIndex((s) => s.id === scene.id)
  if (idx >= 0) {
    scenes[idx] = mergeScene(scenes[idx], scene)
  } else {
    scenes.push(scene)
  }
  return writeAll(scenes)
}

export function deleteScene(id: string): SaveResult {
  const scenes = readAll().filter((s) => s.id !== id)
  return writeAll(scenes)
}

export function getScenesByRoute(routeName: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => s.routeName === routeName)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getAllRouteNames(): string[] {
  const scenes = getAllScenes()
  const routeSet = new Set(scenes.map((s) => s.routeName))
  return Array.from(routeSet).sort()
}

export function getRandomScene(): WindowScene | null {
  const scenes = getAllScenes()
  if (scenes.length === 0) return null
  return scenes[Math.floor(Math.random() * scenes.length)]
}
