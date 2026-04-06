import { useState, useEffect } from 'react'
import { 
  Activity, 
  Cpu, 
  MousePointer2, 
  Key, 
  Monitor, 
  Layers, 
  Clipboard, 
  Bell, 
  Terminal, 
  Scan, 
  RefreshCw 
} from 'lucide-react'

export default function NativeLab() {
  const [sysInfo, setSysInfo] = useState<any>(null)
  const [windows, setWindows] = useState<any[]>([])
  const [displays, setDisplays] = useState<any>(null)
  const [clipContent, setClipContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [screenshot, setScreenshot] = useState<string | null>(null)

  const refreshData = async () => {
    setLoading(true)
    try {
      const [info, winList, disp, clip] = await Promise.all([
        window.electronAPI.systemInfo(),
        window.electronAPI.listWindows(),
        window.electronAPI.displayInfo(),
        window.electronAPI.clipboardRead()
      ])
      setSysInfo(info)
      setWindows(winList)
      setDisplays(disp)
      setClipContent(clip)
    } catch (err) {
      console.error('Native Lab Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  const testMove = () => {
    window.electronAPI.moveMouse(100, 100)
  }

  const testClick = () => {
    window.electronAPI.clickMouse(500, 500)
  }

  const testNotify = () => {
    window.electronAPI.nativeNotify('Native Lab', 'The Rust engine is alive! 🦀')
  }

  const testCapture = async () => {
    const base64 = await window.electronAPI.nativeCaptureScreen(0)
    setScreenshot(`data:image/png;base64,${base64}`)
  }

  const testType = () => {
    window.electronAPI.typeText('Hello from ConscioussAI Native! 🚀')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden text-white/90 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Native Lab
          </h2>
          <p className="text-sm text-white/40 italic">Manual diagnosis for the Rust Native Engine</p>
        </div>
        <button 
          onClick={refreshData}
          disabled={loading}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/60 hover:text-white"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
        
        {/* System & Hardware */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 text-white/80 font-medium">
            <Cpu className="w-5 h-5 text-blue-400" />
            System hardware
          </div>
          {sysInfo ? (
            <div className="space-y-2 text-sm text-white/60">
              <div className="flex justify-between"><span>CPU</span> <span className="text-white/90">{sysInfo.cpuBrand} ({sysInfo.cpuCount} cores)</span></div>
              <div className="flex justify-between"><span>RAM</span> <span className="text-white/90">{Math.round(sysInfo.memTotalMb/1024)}GB ({Math.round(sysInfo.memUsedMb/1024)}GB used)</span></div>
              <div className="flex justify-between"><span>OS</span> <span className="text-white/90">{sysInfo.osVersion}</span></div>
              <div className="flex justify-between"><span>Hostname</span> <span className="text-white/90 font-mono">{sysInfo.hostname}</span></div>
            </div>
          ) : <div className="animate-pulse h-20 bg-white/5 rounded" />}
        </div>

        {/* Input Controls */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 text-white/80 font-medium">
            <MousePointer2 className="w-5 h-5 text-purple-400" />
            Input automation
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={testMove} className="py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors">Move (100,100)</button>
            <button onClick={testClick} className="py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors">Click Center</button>
            <button onClick={testType} className="py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors col-span-2 flex items-center justify-center gap-2">
              <Key className="w-3 h-3" /> Type Text
            </button>
          </div>
        </div>

        {/* Display & Screen */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 text-white/80 font-medium">
            <Monitor className="w-5 h-5 text-emerald-400" />
            Display info
          </div>
          {displays ? (
            <div className="space-y-2 text-xs text-white/60">
              <div className="flex justify-between"><span>Display Count</span> <span className="text-white">{displays.count}</span></div>
              {displays.displays.map((d: any) => (
                <div key={d.id} className="bg-white/5 p-2 rounded">
                  {d.width}x{d.height} (at {d.x},{d.y}) {d.isMain && '★ Main'}
                </div>
              ))}
            </div>
          ) : null}
          <button onClick={testCapture} className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors">
            <Scan className="w-4 h-4" /> Native Screenshot
          </button>
          <button onClick={async () => {
            const pid = await window.electronAPI.getFrontmostAppPid()
            const elements = await window.electronAPI.listUIElements(pid, 7)
            console.log('UI Elements:', elements)
            setScreenshot(null) // Clear screenshot to show something else if needed, or just log
            alert(`Detected ${elements.length} UI elements in PID ${pid}. Check console for details.`)
          }} className="w-full py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors">
            <Layers className="w-4 h-4" /> Scan Frontmost UI
          </button>
        </div>

        {/* Utilities */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 text-white/80 font-medium">
            <Activity className="w-5 h-5 text-amber-400" />
            Shell & OS
          </div>
          <div className="space-y-2">
            <button onClick={testNotify} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors">
              <Bell className="w-4 h-4" /> Native Notification
            </button>
            <div className="bg-black/20 p-3 rounded-lg overflow-hidden">
               <div className="flex items-center gap-2 mb-2 text-white/40 text-[10px] uppercase tracking-wider">
                 <Clipboard className="w-3 h-3" /> Clipboard Content
               </div>
               <div className="text-[11px] font-mono break-all line-clamp-2 text-blue-300">
                 {clipContent || '(empty or image content)'}
               </div>
            </div>
          </div>
        </div>

        {/* Window Manager */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 col-span-1 md:col-span-2">
          <div className="flex items-center gap-3 text-white/80 font-medium font-outfit">
            <Layers className="w-5 h-5 text-pink-400" />
            Window listing ({windows.length})
          </div>
          <div className="h-40 overflow-y-auto space-y-1 custom-scrollbar pr-2">
            {windows.slice(0, 20).map((w, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0 group">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-white/80 group-hover:text-pink-400 transition-colors w-24 truncate">{w.appName}</span>
                  <span className="text-white/40 truncate">{w.title || '(untitled)'}</span>
                </div>
                <div className="text-white/20 font-mono text-[9px] ml-2">
                  {Math.round(w.width)}x{Math.round(w.height)} at {Math.round(w.x)},{Math.round(w.y)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Result Area */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 lg:col-span-3">
          <div className="flex items-center gap-3 text-white/80 font-medium">
            <Terminal className="w-5 h-5 text-sky-400" />
            Last native action result
          </div>
          <div className="min-h-[100px] flex items-center justify-center border border-white/5 rounded-xl bg-black/20 overflow-hidden">
            {screenshot ? (
              <img src={screenshot} className="max-h-60 rounded shadow-2xl" alt="Test capture" />
            ) : (
              <span className="text-white/20 text-sm italic italic">Perform an action to see data...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
