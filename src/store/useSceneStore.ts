import { create } from 'zustand'
import type { WindowScene, SceneFormData, PendingSave, SaveResult } from '@/types'
import {
  STORAGE_KEY,
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  getAllRouteNames,
  getRandomScene,
  EDITABLE_FIELDS,
} from '@/services/storage'

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null
  /** 待写入 / 写入失败的队列 */
  pendingSaves: PendingSave[]

  loadAll: () => void
  saveScene: (data: SceneFormData) => SaveResult
  updateScene: (scene: WindowScene) => SaveResult
  retrySave: (tempId: string) => void
  dismissFailed: (tempId: string) => void
  deleteScene: (id: string) => SaveResult
  selectRoute: (routeName: string) => void
  refreshRandom: () => void
}

function reloadAfterWrite(set: (partial: Partial<SceneState>) => void, state: SceneState) {
  const scenes = getAllScenes()
  const routeNames = getAllRouteNames()
  const currentRouteScenes = state.selectedRoute ? getScenesByRoute(state.selectedRoute) : []
  let randomScene = state.randomScene
  if (randomScene && !scenes.some((s) => s.id === randomScene!.id)) {
    randomScene = null
  }
  set({ scenes, routeNames, currentRouteScenes, randomScene })
}

function runSave(
  set: (partial: Partial<SceneState> | ((s: SceneState) => Partial<SceneState>)) => void,
  get: () => SceneState,
  scene: WindowScene,
  mode: 'create' | 'update',
): SaveResult {
  const tempId = crypto.randomUUID()
  const label = `${scene.routeName} · ${scene.segment}`
  const pending: PendingSave = { tempId, scene, mode, status: 'saving', label }
  set((s) => ({ pendingSaves: [...s.pendingSaves, pending] }))

  const result = storageSaveScene(scene)
  if (result.ok) {
    set((s) => ({ pendingSaves: s.pendingSaves.filter((p) => p.tempId !== tempId) }))
    reloadAfterWrite(set, get())
  } else {
    const error = result.error ?? '写入失败'
    set((s) => ({
      pendingSaves: s.pendingSaves.map((p) =>
        p.tempId === tempId ? { ...p, status: 'failed', error } : p,
      ),
    }))
  }
  return result
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  routeNames: [],
  currentRouteScenes: [],
  selectedRoute: '',
  randomScene: null,
  pendingSaves: [],

  loadAll: () => {
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    set((state) => {
      const currentRouteScenes = state.selectedRoute
        ? getScenesByRoute(state.selectedRoute)
        : []
      // 别的标签删掉了正在灵感页展示的那条，就撤下
      let randomScene = state.randomScene
      if (randomScene && !scenes.some((s) => s.id === randomScene!.id)) {
        randomScene = null
      }
      return { scenes, routeNames, currentRouteScenes, randomScene }
    })
  },

  saveScene: (data: SceneFormData) => {
    const now = new Date().toISOString()
    const fieldUpdatedAt = {} as Record<string, string>
    for (const f of EDITABLE_FIELDS) fieldUpdatedAt[f] = now
    const scene: WindowScene = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: now,
      updatedAt: now,
      fieldUpdatedAt,
    }
    return runSave(set, get, scene, 'create')
  },

  updateScene: (scene: WindowScene) => {
    return runSave(set, get, scene, 'update')
  },

  retrySave: (tempId: string) => {
    const pending = get().pendingSaves.find((p) => p.tempId === tempId)
    if (!pending) return
    set((s) => ({
      pendingSaves: s.pendingSaves.map((p) =>
        p.tempId === tempId ? { ...p, status: 'saving', error: undefined } : p,
      ),
    }))
    // 重试时重新读取当前存储再合并，避免覆盖别的标签刚写入的内容
    const result = storageSaveScene(pending.scene)
    if (result.ok) {
      set((s) => ({ pendingSaves: s.pendingSaves.filter((p) => p.tempId !== tempId) }))
      reloadAfterWrite(set, get())
    } else {
      const error = result.error ?? '写入失败'
      set((s) => ({
        pendingSaves: s.pendingSaves.map((p) =>
          p.tempId === tempId ? { ...p, status: 'failed', error } : p,
        ),
      }))
    }
  },

  dismissFailed: (tempId: string) => {
    set((s) => ({ pendingSaves: s.pendingSaves.filter((p) => p.tempId !== tempId) }))
  },

  deleteScene: (id: string) => {
    const result = storageDeleteScene(id)
    if (result.ok) {
      reloadAfterWrite(set, get())
    }
    return result
  },

  selectRoute: (routeName: string) => {
    const currentRouteScenes = routeName ? getScenesByRoute(routeName) : []
    set({ selectedRoute: routeName, currentRouteScenes })
  },

  refreshRandom: () => {
    const randomScene = getRandomScene()
    set({ randomScene })
  },
}))

// 多标签同步：别的标签写入后，本标签重算线路标签与灵感页范围
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      useSceneStore.getState().loadAll()
    }
  })
}
