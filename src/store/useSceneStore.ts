import { create } from 'zustand'
import type { WindowScene, SceneFormData, SceneEditableKey } from '@/types'
import { SCENE_EDITABLE_KEYS } from '@/types'
import {
  STORAGE_KEY,
  getAllScenes,
  saveScene as storageSaveScene,
  updateScene as storageUpdateScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  getAllRouteNames,
  getRandomScene,
} from '@/services/storage'

export interface FailedSave {
  failureId: string
  kind: 'create' | 'update'
  /** 写入失败时的完整快照，重试时原样再写（保留当时的逐字段时间） */
  scene: WindowScene
  failedAt: string
  error: string
}

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null
  failedSaves: FailedSave[]

  loadAll: () => void
  saveScene: (data: SceneFormData) => Promise<boolean>
  updateScene: (id: string, changes: Partial<SceneFormData>) => Promise<boolean>
  deleteScene: (id: string) => Promise<void>
  selectRoute: (routeName: string) => void
  refreshRandom: () => void
  retryFailedSave: (failureId: string) => Promise<void>
  dismissFailedSave: (failureId: string) => void
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 新建记录：所有字段的修改时间都记为创建时间 */
function buildNewScene(data: SceneFormData): WindowScene {
  const now = new Date().toISOString()
  const fieldUpdatedAt = {} as Record<SceneEditableKey, string>
  for (const key of SCENE_EDITABLE_KEYS) fieldUpdatedAt[key] = now
  return {
    ...data,
    id: crypto.randomUUID(),
    timestamp: now,
    updatedAt: now,
    fieldUpdatedAt,
  }
}

/**
 * 在本地最新版本上套用本次编辑：只有真正变了的字段才盖上新的修改时间，
 * 其余字段保留原时间（旧数据没有逐字段时间时回退到创建时间），
 * 这样合并时别的标签改过的字段不会被这里的旧值盖掉。
 */
function applyChanges(scene: WindowScene, changes: Partial<SceneFormData>): WindowScene {
  const now = new Date().toISOString()
  const fieldUpdatedAt: Partial<Record<SceneEditableKey, string>> = {}
  for (const key of SCENE_EDITABLE_KEYS) {
    if (key in changes && changes[key] !== scene[key]) {
      fieldUpdatedAt[key] = now
    } else {
      fieldUpdatedAt[key] = scene.fieldUpdatedAt?.[key] ?? scene.timestamp
    }
  }
  return { ...scene, ...changes, fieldUpdatedAt, updatedAt: now }
}

export const useSceneStore = create<SceneState>((set, get) => {
  const addFailure = (kind: FailedSave['kind'], scene: WindowScene, err: unknown) => {
    const failure: FailedSave = {
      failureId: crypto.randomUUID(),
      kind,
      scene,
      failedAt: new Date().toISOString(),
      error: toMessage(err),
    }
    set((state) => ({ failedSaves: [...state.failedSaves, failure] }))
  }

  const removeFailure = (failureId: string) => {
    set((state) => ({
      failedSaves: state.failedSaves.filter((f) => f.failureId !== failureId),
    }))
  }

  return {
    scenes: [],
    routeNames: [],
    currentRouteScenes: [],
    selectedRoute: '',
    randomScene: null,
    failedSaves: [],

    loadAll: () => {
      const scenes = getAllScenes()
      const routeNames = getAllRouteNames()
      set((state) => {
        const currentRouteScenes = state.selectedRoute
          ? getScenesByRoute(state.selectedRoute)
          : []
        // 灵感页已抽出的那条跟着最新数据走：还在就换成最新版本，被删了就重抽
        let randomScene = state.randomScene
        if (randomScene) {
          randomScene = scenes.find((s) => s.id === randomScene!.id) ?? getRandomScene()
        }
        return { scenes, routeNames, currentRouteScenes, randomScene }
      })
    },

    saveScene: async (data: SceneFormData) => {
      const scene = buildNewScene(data)
      try {
        await storageSaveScene(scene)
      } catch (err) {
        addFailure('create', scene, err)
        return false
      }
      get().loadAll()
      return true
    },

    updateScene: async (id: string, changes: Partial<SceneFormData>) => {
      // 以存储里的最新版本为基准，避免基于过期状态构造合并输入
      const current = getAllScenes().find((s) => s.id === id)
      if (!current) {
        get().loadAll()
        return false
      }
      const hasChange = SCENE_EDITABLE_KEYS.some(
        (key) => key in changes && changes[key] !== current[key]
      )
      if (!hasChange) return true

      const next = applyChanges(current, changes)
      try {
        const applied = await storageUpdateScene(next)
        if (!applied) {
          // 记录已在别处被删除，不复活
          get().loadAll()
          return false
        }
      } catch (err) {
        addFailure('update', next, err)
        return false
      }
      get().loadAll()
      return true
    },

    deleteScene: async (id: string) => {
      try {
        await storageDeleteScene(id)
      } catch {
        // 删除失败时照常重新加载，让界面回到存储里的真实状态
      }
      get().loadAll()
    },

    selectRoute: (routeName: string) => {
      const currentRouteScenes = routeName ? getScenesByRoute(routeName) : []
      set({ selectedRoute: routeName, currentRouteScenes })
    },

    refreshRandom: () => {
      const randomScene = getRandomScene()
      set({ randomScene })
    },

    retryFailedSave: async (failureId: string) => {
      const failure = get().failedSaves.find((f) => f.failureId === failureId)
      if (!failure) return
      try {
        if (failure.kind === 'create') {
          await storageSaveScene(failure.scene)
        } else {
          const applied = await storageUpdateScene(failure.scene)
          if (!applied) {
            // 原记录已被删除，重试无意义，直接清掉这条失败项
            removeFailure(failureId)
            get().loadAll()
            return
          }
        }
      } catch (err) {
        // 仍然失败：刷新错误信息，留在列表里等下次重试
        set((state) => ({
          failedSaves: state.failedSaves.map((f) =>
            f.failureId === failureId
              ? { ...f, error: toMessage(err), failedAt: new Date().toISOString() }
              : f
          ),
        }))
        return
      }
      removeFailure(failureId)
      get().loadAll()
    },

    dismissFailedSave: (failureId: string) => {
      removeFailure(failureId)
    },
  }
})

// 其他标签页写入后，本标签立即重载：线路标签重算、当前路线列表和灵感页范围同步更新
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      useSceneStore.getState().loadAll()
    }
  })
}
