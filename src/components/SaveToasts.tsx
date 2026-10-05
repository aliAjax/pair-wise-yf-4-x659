import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'

/**
 * 全局保存状态提示：保存失败时指出是哪条没写成功，并重试。
 */
export default function SaveToasts() {
  const pendingSaves = useSceneStore((s) => s.pendingSaves)
  const retrySave = useSceneStore((s) => s.retrySave)
  const dismissFailed = useSceneStore((s) => s.dismissFailed)

  const failed = pendingSaves.filter((p) => p.status === 'failed')
  if (failed.length === 0) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[60] w-80 space-y-2">
      {failed.map((p) => (
        <div
          key={p.tempId}
          className="rounded-xl border border-red-800/70 bg-red-950/95 p-3 shadow-2xl shadow-black/40"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-100">保存失败：{p.label}</p>
              {p.error && <p className="mt-0.5 text-xs text-red-400/80 break-all">{p.error}</p>}
            </div>
            <button
              onClick={() => dismissFailed(p.tempId)}
              className="text-red-400/60 hover:text-red-200 transition-colors"
              aria-label="忽略"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => retrySave(p.tempId)}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-800/60 py-2 text-xs font-medium text-red-100 transition-colors hover:bg-red-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重试保存
          </button>
        </div>
      ))}
    </div>
  )
}
