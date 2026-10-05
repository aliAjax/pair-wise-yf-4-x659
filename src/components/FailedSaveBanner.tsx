import { useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import { formatTimestamp } from '@/utils/sceneHelpers'

export default function FailedSaveBanner() {
  const failedSaves = useSceneStore((s) => s.failedSaves)
  const retryFailedSave = useSceneStore((s) => s.retryFailedSave)
  const dismissFailedSave = useSceneStore((s) => s.dismissFailedSave)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  if (failedSaves.length === 0) return null

  const handleRetry = async (failureId: string) => {
    setRetryingId(failureId)
    await retryFailedSave(failureId)
    setRetryingId(null)
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 space-y-2">
      {failedSaves.map((f) => (
        <div
          key={f.failureId}
          className="rounded-xl border border-red-800/60 bg-red-950/95 p-4 shadow-xl backdrop-blur"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0 text-red-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-red-200">
                {f.kind === 'create' ? '新记录' : '修改'}未保存成功：
                <span className="font-medium">
                  {f.scene.routeName || '未命名线路'} · {f.scene.segment || '未命名区间'}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-red-300/70">
                记录于 {formatTimestamp(f.scene.timestamp)}
                {f.error ? ` · ${f.error}` : ''}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleRetry(f.failureId)}
                  disabled={retryingId === f.failureId}
                  className="flex items-center gap-1 rounded-lg bg-red-300/15 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-300/25 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${retryingId === f.failureId ? 'animate-spin' : ''}`}
                  />
                  重试
                </button>
                <button
                  onClick={() => dismissFailedSave(f.failureId)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-red-300/70 transition hover:text-red-200"
                >
                  <X className="w-3 h-3" />
                  放弃
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
