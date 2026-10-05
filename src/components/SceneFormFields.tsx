import { Bus, MapPin, Armchair, CloudSun, Signpost, TreePine, Users, FileText } from 'lucide-react'
import { getWeatherIcon, getTreeIcon, getPedestrianIcon } from '@/utils/sceneHelpers'
import type { SceneFormData, Weather, TreeDensity, PedestrianStatus, SeatDirection } from '@/types'

const WEATHERS: Weather[] = ['晴', '多云', '阴', '小雨', '大雨', '雪', '雾']
const TREES: TreeDensity[] = ['稀疏', '适中', '茂密']
const PEDESTRIANS: PedestrianStatus[] = ['稀少', '零星', '密集']

interface SceneFormFieldsProps {
  form: SceneFormData
  onChange: <K extends keyof SceneFormData>(key: K, val: SceneFormData[K]) => void
}

export default function SceneFormFields({ form, onChange }: SceneFormFieldsProps) {
  return (
    <>
      <section className="space-y-3">
        <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
          <MapPin className="w-4 h-4" />路线信息
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Bus className="w-3 h-3" />线路</label>
            <input className="w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400" value={form.routeName} onChange={(e) => onChange('routeName', e.target.value)} required />
          </div>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />区间</label>
            <input className="w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400" value={form.segment} onChange={(e) => onChange('segment', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Armchair className="w-3 h-3" />座位方向</label>
          <div className="flex gap-2">
            {(['左', '右'] as SeatDirection[]).map((d) => (
              <button key={d} type="button" onClick={() => onChange('seatDirection', d)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${form.seatDirection === d ? 'bg-dusk-400/20 text-dusk-400 border border-dusk-400' : 'bg-teal-850 text-mist-300 border border-transparent'}`}>
                {d}侧
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
          <CloudSun className="w-4 h-4" />窗景信息
        </h2>
        <div>
          <label className="text-mist-300 text-xs mb-1 block">天气</label>
          <div className="grid grid-cols-4 gap-2">
            {WEATHERS.map((w) => (
              <button key={w} type="button" onClick={() => onChange('weather', w)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition ${form.weather === w ? 'bg-dusk-400/20 border border-dusk-400 text-dusk-400' : 'bg-teal-850 border border-transparent text-mist-300'}`}>
                {getWeatherIcon(w)}{w}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Signpost className="w-3 h-3" />招牌文字</label>
          <input className="w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400" value={form.signText} onChange={(e) => onChange('signText', e.target.value)} />
        </div>
        <div>
          <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><TreePine className="w-3 h-3" />树木密度</label>
          <div className="grid grid-cols-3 gap-2">
            {TREES.map((t) => (
              <button key={t} type="button" onClick={() => onChange('treeDensity', t)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition ${form.treeDensity === t ? 'bg-dusk-400/20 border border-dusk-400 text-dusk-400' : 'bg-teal-850 border border-transparent text-mist-300'}`}>
                {getTreeIcon(t)}{t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Users className="w-3 h-3" />行人状态</label>
          <div className="grid grid-cols-3 gap-2">
            {PEDESTRIANS.map((p) => (
              <button key={p} type="button" onClick={() => onChange('pedestrianStatus', p)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition ${form.pedestrianStatus === p ? 'bg-dusk-400/20 border border-dusk-400 text-dusk-400' : 'bg-teal-850 border border-transparent text-mist-300'}`}>
                {getPedestrianIcon(p)}{p}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
          <FileText className="w-4 h-4" />观察笔记
        </h2>
        <textarea className="w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400 resize-none h-24" value={form.note} onChange={(e) => onChange('note', e.target.value)} />
      </section>
    </>
  )
}
