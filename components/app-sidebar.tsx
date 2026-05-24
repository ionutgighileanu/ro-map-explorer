"use client"

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { T, GP, FB, I } from '@/components/ui-constants'
import type { ViewportMode } from '@/app/page'
import { VIEWPORT_DIMS } from '@/components/map-view'
import { Toggle } from '@/components/shared-controls'
import { useMap } from '@/context/map-context'
// Markers temporarily disabled - re-enable later
import StbRoutesModule from '@/components/modules/stb-routes'
import RoutePlannerModule from '@/components/modules/route-planner'
import InfrastructureModule from '@/components/modules/infrastructure'
import BordersModule from '@/components/modules/borders'
import PhotoOverlayModule from '@/components/modules/photo-overlay'

type MapStyleType = "dark" | "satellite"

interface AppSidebarProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  mapStyle: MapStyleType
  onSetMapStyle: (style: MapStyleType) => void
  onZoomIn: () => void
  onZoomOut: () => void
  placeLabels: boolean
  onPlaceLabelsChange: (value: boolean) => void
  viewportMode: ViewportMode
  onViewportModeChange: (mode: ViewportMode) => void
}

const nav = [
  {icon: I.pin(), l: 'Markers'},
  {icon: I.bus(), l: 'STB Routes'},
  {icon: I.route(), l: 'Route Planner'},
  {icon: I.construction(), l: 'Infrastructure'},
  {icon: I.hex(), l: 'Borders'},
]

export default function AppSidebar({ collapsed, onCollapsedChange, mapStyle, onSetMapStyle, onZoomIn, onZoomOut, placeLabels, onPlaceLabelsChange, viewportMode, onViewportModeChange }: AppSidebarProps) {
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

    const { w, h } = VIEWPORT_DIMS[viewportMode]
    const hiddenDiv = document.createElement('div')
    hiddenDiv.style.cssText = `position:absolute;left:-9999px;top:0;width:${w}px;height:${h}px;overflow:hidden`
    document.body.appendChild(hiddenDiv)

    try {
      const mapboxgl = (await import('mapbox-gl')).default

      const hiddenMap = new mapboxgl.Map({
        container: hiddenDiv,
        style: map.getStyle() as mapboxgl.StyleSpecification,
        center: map.getCenter(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        preserveDrawingBuffer: true,
        interactive: false,
        attributionControl: false,
      })

      hiddenMap.once('idle', () => {
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
        const dataURL = hiddenMap.getCanvas().toDataURL(mimeType, 0.95)

        const link = document.createElement('a')
        link.download = `ro-map-${Date.now()}.${format}`
        link.href = dataURL
        link.click()

        hiddenMap.remove()
        document.body.removeChild(hiddenDiv)
        setExporting(false)

        // Flash on map area
        const container = map.getContainer()
        const flash = document.createElement('div')
        flash.style.cssText = 'position:absolute;inset:0;background:white;opacity:0.55;pointer-events:none;transition:opacity 0.4s ease;z-index:10'
        container.appendChild(flash)
        requestAnimationFrame(() => {
          flash.style.opacity = '0'
          setTimeout(() => flash.remove(), 450)
        })

        toast.success('Map exported successfully')
      })
    } catch (err) {
      console.error('Export failed:', err)
      if (document.body.contains(hiddenDiv)) document.body.removeChild(hiddenDiv)
      setExporting(false)
      toast.error('Export failed')
    }
  }

  return (
    <>
      {/* Collapsed icon bar */}
      {collapsed && (
        <aside style={{position:'fixed',top:0,left:0,zIndex:20,height:'100%',width:56,...GP,display:'flex',flexDirection:'column',alignItems:'center',padding:'16px 0',gap:4,boxShadow:'4px 0 30px rgba(0,0,0,.4)'}}>
          <button onClick={()=>onCollapsedChange(false)} className="panel-btn" style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:'none',border:'none',color:T.fg,cursor:'pointer',marginBottom:16}}>
            {I.panelOpen()}
          </button>
          {nav.map((n,i)=>(
            <button key={i} onClick={()=>onCollapsedChange(false)} title={n.l} className="nav-btn" style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:'none',border:'none',color:T.muted,cursor:'pointer'}}>
              {n.icon}
            </button>
          ))}
          <div style={{flex:1}}/>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,borderTop:`1px solid ${T.glassBorder}`,paddingTop:12}}>
            <button style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:'none',border:'none',color:T.muted,cursor:'pointer'}} className="nav-btn">
              {I.download()}
            </button>
            {(['dark','satellite'] as const).map((id)=>(
              <button key={id} onClick={()=>onSetMapStyle(id)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:mapStyle===id?'rgba(0,212,232,0.15)':'none',border:'none',color:mapStyle===id?T.primary:T.muted,cursor:'pointer'}} className="nav-btn">
                {id==='dark'?I.layers():I.sat()}
              </button>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',width:36,borderRadius:8,overflow:'hidden',border:`1px solid ${T.glassBorder}`,background:T.secondary,margin:'8px 0'}}>
            <button onClick={onZoomIn} style={{display:'flex',alignItems:'center',justifyContent:'center',height:36,background:'none',border:'none',borderBottom:`1px solid ${T.glassBorder}`,color:T.muted,cursor:'pointer'}} className="zm-btn">{I.plus(16)}</button>
            <button onClick={onZoomOut} style={{display:'flex',alignItems:'center',justifyContent:'center',height:36,background:'none',border:'none',color:T.muted,cursor:'pointer'}} className="zm-btn">{I.minus()}</button>
          </div>
        </aside>
      )}

      {/* Full sidebar */}
      <aside style={{position:'fixed',top:0,left:0,zIndex:20,height:'100%',width:340,transition:'transform .3s ease,opacity .3s ease',transform:collapsed?'translateX(-100%)':'translateX(0)',opacity:collapsed?0:1,pointerEvents:collapsed?'none':'auto'}}>
        <div style={{height:'100%',...GP,borderRadius:'0 16px 16px 0',display:'flex',flexDirection:'column',boxShadow:'4px 0 30px rgba(0,0,0,.4)'}}>

          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingRight:12,borderBottom:`1px solid ${T.glassBorder}`}}>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'20px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:'rgba(0,212,232,0.12)',color:T.primary}}>{I.map()}</div>
              <div>
                <h1 style={{fontSize:16,fontWeight:600,margin:0,color:T.fg}}>RO-MAP Explorer</h1>
                <p style={{fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:'.06em',margin:0}}>GIS Dashboard</p>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:2}}>
              <button onClick={()=>onCollapsedChange(true)} className="panel-btn" style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:8,background:'none',border:'none',color:T.muted,cursor:'pointer'}}>
                {I.panelClose()}
              </button>
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
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 12px',background:T.secondary,borderRadius:8,border:`1px solid ${T.glassBorder}`}}>
                <span style={{fontSize:12,fontWeight:500,color:placeLabels?T.fg:T.muted,transition:'color .2s'}}>Place Labels</span>
                <Toggle label="" value={placeLabels} onChange={onPlaceLabelsChange}/>
              </div>
              <button onClick={()=>onSetMapStyle('dark')} className="ft-btn" style={FB(mapStyle==='dark')}>{I.layers()}<span>Standard</span></button>
              <button onClick={()=>onSetMapStyle('satellite')} className="ft-btn" style={FB(mapStyle==='satellite')}>{I.sat()}<span>Satellite</span></button>
            </div>
          </div>

        </div>
      </aside>
    </>
  )
}
