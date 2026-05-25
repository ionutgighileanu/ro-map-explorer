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
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  const handleExport = async (format: 'png' | 'jpeg') => {
    if (!map || exporting) return
    setExporting(true)
    setExportOpen(false)

    const targetW = viewportMode === '16p' ? 1920 : 3840
    const targetH = 1080
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'

    let hiddenMap: mapboxgl.Map | null = null
    let hiddenDiv: HTMLDivElement | null = null

    try {
      hiddenDiv = document.createElement('div')
      hiddenDiv.style.cssText = `position:absolute;left:${-(targetW + 200)}px;top:0;width:${targetW}px;height:${targetH}px;visibility:hidden;`
      document.body.appendChild(hiddenDiv)

      const currentStyle = map.getStyle()

      const visibleWidth = map.getContainer().getBoundingClientRect().width
      const zoomDelta = Math.log2(targetW / visibleWidth)
      const exportZoom = map.getZoom() + zoomDelta

      hiddenMap = new mapboxgl.Map({
        container: hiddenDiv,
        style: currentStyle as mapboxgl.StyleSpecification,
        center: map.getCenter(),
        zoom: exportZoom,
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        preserveDrawingBuffer: true,
        interactive: false,
        attributionControl: false,
      })

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Export timeout')), 20000)
        hiddenMap!.once('idle', () => {
          clearTimeout(timeout)
          resolve()
        })
      })

      const dataURL = hiddenMap.getCanvas().toDataURL(mimeType, 0.95)

      const link = document.createElement('a')
      link.download = `ro-map-${Date.now()}.${format}`
      link.href = dataURL
      link.click()

      const container = map.getContainer()
      const flash = document.createElement('div')
      flash.style.cssText = 'position:absolute;inset:0;background:white;opacity:0.55;pointer-events:none;transition:opacity 0.4s ease;z-index:10'
      container.appendChild(flash)
      requestAnimationFrame(() => {
        flash.style.opacity = '0'
        setTimeout(() => flash.remove(), 450)
      })

      toast.success('Map exported successfully')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Export failed')
    } finally {
      hiddenMap?.remove()
      if (hiddenDiv && document.body.contains(hiddenDiv)) document.body.removeChild(hiddenDiv)
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
            style={FB(exportOpen)}
            onClick={() => !exporting && setExportOpen(o => !o)}
          >
            {exporting
              ? <span className="animate-spin" style={{width:16,height:16,border:`2px solid ${T.primary}`,borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',flexShrink:0}}/>
              : I.download()
            }
            <span style={{flex:1}}>{exporting ? 'Exporting...' : 'Export'}</span>
            {!exporting && (
              <span style={{display:'flex',transform:exportOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>
                {I.chevron(12)}
              </span>
            )}
          </button>
          {exportOpen && (
            <div style={{position:'absolute',bottom:'calc(100% + 4px)',left:0,right:0,...GP,borderRadius:8,overflow:'hidden',zIndex:100}}>
              <button className="exp-opt" onClick={() => handleExport('png')} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'9px 12px',background:'none',border:'none',borderBottom:`1px solid ${T.glassBorder}`,color:T.fg,fontSize:12,cursor:'pointer'}}>
                {I.download(14)}<span>Export as PNG</span>
              </button>
              <button className="exp-opt" onClick={() => handleExport('jpeg')} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'9px 12px',background:'none',border:'none',color:T.fg,fontSize:12,cursor:'pointer'}}>
                {I.download(14)}<span>Export as JPEG</span>
              </button>
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
