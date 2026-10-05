import type { WindowScene, SceneEditableKey } from '@/types'
import { SCENE_EDITABLE_KEYS } from '@/types'

export const STORAGE_KEY = 'bus_window_scenes'

const LOCK_NAME = 'bus_window_scenes_lock'

/**
 * 跨标签的读-改-写需要原子执行，否则两个标签各读各的、
 * 后写的一方会把先写的一方的整条数组盖掉。
 * 优先用 Web Locks，老环境退化为直接执行（单标签行为不变）。
 */
async function withStorageLock<T>(fn: () => T): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (locks) {
    return locks.request(LOCK_NAME, () => fn()) as Promise<T>
  }
  return fn()
}

export function getAllScenes(): WindowScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WindowScene[]) : []
  } catch {
    return []
  }
}

/** 写失败会抛错（如配额超限），调用方负责捕获并给出重试入口 */
function writeAllScenes(scenes: WindowScene[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

function toTime(iso: string | undefined): number {
  if (!iso) return 0
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

/**
 * 某字段的最后修改时间。旧数据没有 fieldUpdatedAt，
 * 回退到记录创建时间 timestamp，这样任何新编辑都能盖过旧值。
 */
function fieldTime(scene: WindowScene, key: SceneEditableKey): number {
  return toTime(scene.fieldUpdatedAt?.[key] ?? scene.timestamp)
}

/**
 * 逐字段合并同一条记录的两个版本：每个可编辑字段各自比较修改时间，
 * 谁新用谁。这样两个标签各改各的字段时，两边的改动都能留下。
 */
export function mergeSceneFields(stored: WindowScene, incoming: WindowScene): WindowScene {
  const merged: WindowScene = { ...stored }
  const fieldUpdatedAt: Partial<Record<SceneEditableKey, string>> = {
    ...stored.fieldUpdatedAt,
  }

  for (const key of SCENE_EDITABLE_KEYS) {
    const incomingTime = fieldTime(incoming, key)
    const storedTime = fieldTime(stored, key)
    if (incomingTime >= storedTime) {
      ;(merged as Record<SceneEditableKey, string>)[key] = incoming[key]
      fieldUpdatedAt[key] =
        incoming.fieldUpdatedAt?.[key] ?? incoming.timestamp ?? stored.fieldUpdatedAt?.[key]
    } else {
      fieldUpdatedAt[key] = stored.fieldUpdatedAt?.[key] ?? stored.timestamp
    }
  }

  merged.fieldUpdatedAt = fieldUpdatedAt
  merged.updatedAt = new Date(
    Math.max(...SCENE_EDITABLE_KEYS.map((key) => toTime(fieldUpdatedAt[key])))
  ).toISOString()
  // 创建时间永远保留最早的那一份
  merged.timestamp =
    toTime(stored.timestamp) <= toTime(incoming.timestamp) ? stored.timestamp : incoming.timestamp
  return merged
}

export async function saveScene(scene: WindowScene): Promise<void> {
  await withStorageLock(() => {
    const scenes = getAllScenes()
    const idx = scenes.findIndex((s) => s.id === scene.id)
    if (idx === -1) {
      scenes.push(scene)
    } else {
      // 同 id 已存在（例如失败后重试），按字段合并而不是重复追加
      scenes[idx] = mergeSceneFields(scenes[idx], scene)
    }
    writeAllScenes(scenes)
  })
}

/**
 * 更新已存在的记录。返回 false 表示记录已不存在（比如已在别的标签被删除），
 * 此时不复活记录，直接放弃本次写入。
 */
export async function updateScene(scene: WindowScene): Promise<boolean> {
  return withStorageLock(() => {
    const scenes = getAllScenes()
    const idx = scenes.findIndex((s) => s.id === scene.id)
    if (idx === -1) return false
    scenes[idx] = mergeSceneFields(scenes[idx], scene)
    writeAllScenes(scenes)
    return true
  })
}

export async function deleteScene(id: string): Promise<void> {
  await withStorageLock(() => {
    const scenes = getAllScenes().filter((s) => s.id !== id)
    writeAllScenes(scenes)
  })
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
