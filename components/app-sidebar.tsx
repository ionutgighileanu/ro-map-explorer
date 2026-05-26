"use client"

import { useState, useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import { toast } from 'sonner'
import { T, GP, FB, I } from '@/components/ui-constants'
import type { ViewportMode } from '@/app/page'
import { useMap } from '@/context/map-context'
import SatelliteControls, { type SatelliteSettings } from '@/components/satellite-controls'
import StbRoutesModule from '@/components/modules/stb-routes'
import RoutePlannerModule from '@/components/modules/route-planner'
import InfrastructureModule from '@/components/modules/infrastructure'
import BordersModule from '@/components/modules/borders'
import PhotoOverlayModule from '@/components/modules/photo-overlay'
import LayoutModule from '@/components/modules/layout'
import TempGeoJSONModule from '@/components/modules/temp-geojson'

type MapStyleType = "dark" | "satellite"

interface AppSidebarProps {
  mapStyle: MapStyleType
  onSetMapStyle: (style: MapStyleType) => void
  onZoomIn: () => void
  onZoomOut: () => void
  viewportMode: ViewportMode
  onViewportModeChange: (mode: ViewportMode) => void
  satelliteSettings: SatelliteSettings
  onSatelliteSettingsChange: (s: SatelliteSettings) => void
}

// Solid opaque sidebar background (no glass blur)
const SIDEBAR_BG = 'var(--background)'

export default function AppSidebar({ mapStyle, onSetMapStyle, onZoomIn, onZoomOut, viewportMode, onViewportModeChange, satelliteSettings, onSatelliteSettingsChange }: AppSidebarProps) {
  const { map } = useMap()
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportQuality, setExportQuality] = useState(0.75)
  const [jpegOpen, setJpegOpen] = useState(false)
  const [jpegPreparing, setJpegPreparing] = useState(false)
  const [jpegSize, setJpegSize] = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const hiddenMapRef = useRef<mapboxgl.Map | null>(null)
  const hiddenDivRef = useRef<HTMLDivElement | null>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const cleanupHiddenMap = () => {
    hiddenMapRef.current?.remove()
    hiddenMapRef.current = null
    if (hiddenDivRef.current && document.body.contains(hiddenDivRef.current)) {
      document.body.removeChild(hiddenDivRef.current)
    }
    hiddenDivRef.current = null
    hiddenCanvasRef.current = null
  }

  const closeJpegPanel = () => {
    cleanupHiddenMap()
    setJpegOpen(false)
    setJpegPreparing(false)
    setJpegSize(null)
  }

  useEffect(() => {
    if (!exportOpen && !jpegOpen) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        if (jpegOpen) closeJpegPanel()
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen, jpegOpen])

  useEffect(() => {
    return () => { cleanupHiddenMap() }
  }, [])

  const formatBytes = (bytes: number) => bytes >= 1048576
    ? (bytes / 1048576).toFixed(2) + ' MB'
    : Math.round(bytes / 1024) + ' KB'

  useEffect(() => {
    if (!jpegOpen || jpegPreparing || !hiddenCanvasRef.current) return
    const timer = setTimeout(() => {
      const c = hiddenCanvasRef.current
      if (!c) return
      const dataURL = c.toDataURL('image/jpeg', exportQuality)
      const bytes = Math.round(dataURL.length * 0.75)
      setJpegSize(formatBytes(bytes))
    }, 200)
    return () => clearTimeout(timer)
  }, [exportQuality, jpegOpen, jpegPreparing])

  const prepareHiddenMap = async () => {
    if (!map) throw new Error('Map not ready')

    const targetW = viewportMode === '16p' ? 1920 : 3840
    const targetH = 1080

    const hiddenDiv = document.createElement('div')
    hiddenDiv.style.cssText = `position:absolute;left:${-(targetW + 200)}px;top:0;width:${targetW}px;height:${targetH}px;visibility:hidden;`
    document.body.appendChild(hiddenDiv)
    hiddenDivRef.current = hiddenDiv

    const currentStyle = map.getStyle()
    const visibleWidth = map.getContainer().getBoundingClientRect().width
    const zoomDelta = Math.log2(targetW / visibleWidth)
    const exportZoom = map.getZoom() + zoomDelta

    const hiddenMap = new mapboxgl.Map({
      container: hiddenDiv,
      style: currentStyle as mapboxgl.StyleSpecification,
      center: map.getCenter(),
      zoom: exportZoom,
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      preserveDrawingBuffer: true,
      interactive: false,
      attributionControl: false,
      pixelRatio: 1,
    } as unknown as mapboxgl.MapboxOptions)
    hiddenMapRef.current = hiddenMap

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Export timeout')), 20000)
      hiddenMap.once('idle', () => { clearTimeout(t); resolve() })
    })

    const mapCanvas = hiddenMap.getCanvas()
    console.log('[Export] mapCanvas:', mapCanvas.width, 'x', mapCanvas.height, '| dpr:', window.devicePixelRatio)

    const offscreen = document.createElement('canvas')
    offscreen.width = targetW
    offscreen.height = targetH
    const ctx = offscreen.getContext('2d')!
    ctx.drawImage(mapCanvas, 0, 0, targetW, targetH)

    hiddenCanvasRef.current = offscreen
    return offscreen
  }

  const downloadFromCanvas = (canvas: HTMLCanvasElement, format: 'png' | 'jpeg', quality?: number) => {
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
    const dataURL = canvas.toDataURL(mimeType, format === 'jpeg' ? quality : undefined)
    const bytes = Math.round(dataURL.length * 0.75)
    const sizeStr = formatBytes(bytes)

    const link = document.createElement('a')
    link.download = `ro-map-${Date.now()}.${format}`
    link.href = dataURL
    link.click()

    if (map) {
      const container = map.getContainer()
      const flash = document.createElement('div')
      flash.style.cssText = 'position:absolute;inset:0;background:white;opacity:0.55;pointer-events:none;transition:opacity 0.4s ease;z-index:10'
      container.appendChild(flash)
      requestAnimationFrame(() => {
        flash.style.opacity = '0'
        setTimeout(() => flash.remove(), 450)
      })
    }

    toast.success(`Map exported (${sizeStr})`)
  }

  const handleExportPng = async () => {
    if (!map || exporting) return
    setExporting(true)
    setExportOpen(false)
    try {
      const canvas = await prepareHiddenMap()
      downloadFromCanvas(canvas, 'png')
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[Export] FAILED:', errMsg, err)
      toast.error('Export failed: ' + errMsg)
    } finally {
      cleanupHiddenMap()
      setExporting(false)
    }
  }

  const handleStartJpegExport = async () => {
    if (!map || exporting || jpegOpen) return
    setExportOpen(false)
    setJpegOpen(true)
    setJpegPreparing(true)
    setJpegSize(null)
    try {
      const canvas = await prepareHiddenMap()
      const dataURL = canvas.toDataURL('image/jpeg', exportQuality)
      const bytes = Math.round(dataURL.length * 0.75)
      setJpegSize(formatBytes(bytes))
      setJpegPreparing(false)
    } catch (err) {
      console.error('JPEG prep failed:', err)
      toast.error('Export failed')
      closeJpegPanel()
    }
  }

  const handleConfirmJpegExport = () => {
    const canvas = hiddenCanvasRef.current
    if (!canvas || exporting) return
    setExporting(true)
    try {
      downloadFromCanvas(canvas, 'jpeg', exportQuality)
    } catch (err) {
      console.error('JPEG export failed:', err)
      toast.error('Export failed')
    } finally {
      closeJpegPanel()
      setExporting(false)
    }
  }

  return (
    <aside style={{
      height: '100%',
      width: 340,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: SIDEBAR_BG,
      borderRight: `1px solid ${T.glassBorder}`,
      boxShadow: '4px 0 20px rgba(0,0,0,.5)',
      zIndex: 10,
    }}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',paddingRight:12,borderBottom:`1px solid ${T.glassBorder}`}}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:'rgba(0,212,232,0.12)',color:T.primary}}>{I.map()}</div>
          <div>
            <h1 style={{fontSize:16,fontWeight:600,margin:0,color:T.fg}}>RO-MAP Explorer</h1>
            <p style={{fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:'.06em',margin:0}}>GIS Dashboard</p>
          </div>
        </div>
      </div>

      {/* Viewport mode selector */}
      <div style={{display:'flex',gap:4,padding:'8px 12px',borderBottom:`1px solid ${T.glassBorder}`}}>
        {(['16p','32p'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewportModeChange(mode)}
            style={{...FB(viewportMode === mode), flex:1, justifyContent:'center', gap:0, padding:'6px 0'}}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Scrollable modules */}
      <div style={{flex:1,overflowY:'auto',overflowX:'visible'}} className="sb-scroll">
        <StbRoutesModule/>
        <RoutePlannerModule/>
        <InfrastructureModule/>
        <BordersModule/>
        <PhotoOverlayModule/>
        <LayoutModule/>
        <TempGeoJSONModule/>
      </div>

      {/* Footer */}
      <div style={{flexShrink:0,padding:'12px 16px',borderTop:`1px solid ${T.glassBorder}`,display:'flex',flexDirection:'column',gap:4}}>
        <div ref={exportRef} style={{position:'relative'}}>
          <button
            className="exp-btn"
            style={FB(exportOpen || jpegOpen)}
            onClick={() => {
              if (exporting) return
              if (jpegOpen) { closeJpegPanel(); return }
              setExportOpen(o => !o)
            }}
          >
            {exporting
              ? <span className="animate-spin" style={{width:16,height:16,border:`2px solid ${T.primary}`,borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',flexShrink:0}}/>
              : I.download()
            }
            <span style={{flex:1}}>{exporting ? 'Exporting...' : 'Export'}</span>
            {!exporting && (
              <span style={{display:'flex',transform:(exportOpen||jpegOpen)?'rotate(180deg)':'none',transition:'transform .2s'}}>
                {I.chevron(12)}
              </span>
            )}
          </button>
          {exportOpen && !jpegOpen && (
            <div style={{position:'absolute',bottom:'calc(100% + 4px)',left:0,right:0,...GP,borderRadius:8,overflow:'hidden',zIndex:100}}>
              <button className="exp-opt" onClick={() => handleExportPng()} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'9px 12px',background:'none',border:'none',borderBottom:`1px solid ${T.glassBorder}`,color:T.fg,fontSize:12,cursor:'pointer'}}>
                {I.download(14)}<span>Export as PNG</span>
              </button>
              <button className="exp-opt" onClick={() => handleStartJpegExport()} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'9px 12px',background:'none',border:'none',color:T.fg,fontSize:12,cursor:'pointer'}}>
                {I.download(14)}<span>Export as JPEG</span>
              </button>
            </div>
          )}
          {jpegOpen && (
            <div style={{position:'absolute',bottom:'calc(100% + 4px)',left:0,right:0,...GP,borderRadius:8,overflow:'hidden',zIndex:100,padding:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <div style={{fontSize:11,color:T.fg,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>JPEG Quality</div>
                <button onClick={closeJpegPanel} style={{background:'none',border:'none',color:T.muted,cursor:'pointer',padding:0,display:'flex',alignItems:'center'}} aria-label="Close">{I.x()}</button>
              </div>
              {jpegPreparing ? (
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 0',color:T.muted,fontSize:11}}>
                  <span className="animate-spin" style={{width:14,height:14,border:`2px solid ${T.primary}`,borderTopColor:'transparent',borderRadius:'50%',display:'inline-block'}}/>
                  <span>Pregătire preview…</span>
                </div>
              ) : (
                <>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:11,color:T.muted}}>Calitate</span>
                    <span style={{fontSize:11,color:T.fg,fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{Math.round(exportQuality * 100)}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={Math.round(exportQuality * 100)}
                    onChange={(e) => setExportQuality(Number(e.target.value) / 100)}
                    style={{width:'100%',background:'rgba(255,255,255,0.12)',height:4,borderRadius:2,outline:'none',appearance:'none',WebkitAppearance:'none',marginBottom:10,cursor:'pointer'}}
                  />
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,padding:'6px 8px',background:T.secondary,border:`1px solid ${T.glassBorder}`,borderRadius:6}}>
                    <span style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:'.06em'}}>Mărime estimată</span>
                    <span style={{fontSize:12,color:T.primary,fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{jpegSize ?? '—'}</span>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={closeJpegPanel} style={{flex:1,padding:'7px 0',fontSize:11,fontWeight:500,borderRadius:6,cursor:'pointer',border:`1px solid ${T.glassBorder}`,background:T.secondary,color:T.muted}}>Anulează</button>
                    <button onClick={handleConfirmJpegExport} disabled={exporting} style={{flex:1,padding:'7px 0',fontSize:11,fontWeight:600,borderRadius:6,cursor:exporting?'not-allowed':'pointer',border:`1px solid ${T.primary}`,background:'rgba(0,212,232,0.18)',color:T.primary,opacity:exporting?0.6:1}}>{exporting ? 'Se salvează…' : 'Salvează'}</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:`1px solid ${T.glassBorder}`,background:T.secondary}}>
          <button onClick={onZoomIn} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:36,background:'none',border:'none',borderRight:`1px solid ${T.glassBorder}`,color:T.muted,cursor:'pointer'}} className="zm-btn">{I.plus(16)}</button>
          <button onClick={onZoomOut} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:36,background:'none',border:'none',color:T.muted,cursor:'pointer'}} className="zm-btn">{I.minus()}</button>
        </div>
        <div style={{height:1,background:T.glassBorder,margin:'6px 0'}}/>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <button onClick={()=>onSetMapStyle('dark')} className="ft-btn" style={FB(mapStyle==='dark')}>{I.layers()}<span>Standard</span></button>
          <button onClick={()=>onSetMapStyle('satellite')} className="ft-btn" style={FB(mapStyle==='satellite')}>{I.sat()}<span>Satellite</span></button>
        </div>
        {mapStyle === 'satellite' && (
          <SatelliteControls settings={satelliteSettings} onChange={onSatelliteSettingsChange} />
        )}
      </div>

    </aside>
  )
}
