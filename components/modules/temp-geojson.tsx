"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { T, I, PRESETS } from '@/components/ui-constants'
import { Section, Toggle, SliderRow } from '@/components/shared-controls'
import ColorPicker from '@/components/color-picker'
import { useMap } from '@/context/map-context'
import { useMapLayers } from '@/context/map-layers'
import type mapboxgl from 'mapbox-gl'

type GeomType = 'point' | 'line' | 'polygon' | 'mixed'

interface TempLayer {
  id: string
  filename: string
  geomType: GeomType
  color: string
  opacity: number
  width: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectGeomType(geojson: any): GeomType {
  const types = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const f of (geojson.features ?? []) as any[]) {
    const t = f.geometry?.type
    if (!t) continue
    if (t === 'Point' || t === 'MultiPoint') types.add('point')
    else if (t === 'LineString' || t === 'MultiLineString') types.add('line')
    else if (t === 'Polygon' || t === 'MultiPolygon') types.add('polygon')
  }
  if (types.size === 0) return 'mixed'
  if (types.size === 1) return [...types][0] as GeomType
  return 'mixed'
}

const uploadIcon = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
)

export default function TempGeoJSONModule() {
  const [enabled, setEnabled] = useState(false)
  const [layers, setLayers] = useState<TempLayer[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const layersRef = useRef<TempLayer[]>([])
  const prevLayers = useRef<TempLayer[]>([])

  useEffect(() => { layersRef.current = layers }, [layers])

  const { map, ready } = useMap()
  const { registerSource, registerLayer, removeRegisteredSource, mutateRegisteredLayer } = useMapLayers(map, ready)

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(geojson|json)$/i)) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geojson = JSON.parse(e.target!.result as string) as any
        if (!geojson || geojson.type !== 'FeatureCollection') {
          console.warn('[TempGeoJSON] Not a FeatureCollection')
          return
        }
        const geomType = detectGeomType(geojson)
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const color = PRESETS[layersRef.current.length % PRESETS.length]
        registerSource(`tmp-geo-${id}`, { type: 'geojson', data: geojson })
        setLayers(p => [...p, { id, filename: file.name, geomType, color, opacity: 0.8, width: 3 }])
      } catch (err) {
        console.error('[TempGeoJSON] Parse error', err)
      }
    }
    reader.readAsText(file)
  }, [registerSource])

  // Sync layers → Mapbox
  useEffect(() => {
    if (!map || !ready) return
    const prev = prevLayers.current
    const curr = layers

    // Remove deleted
    prev.forEach(pl => {
      if (!curr.find(cl => cl.id === pl.id)) {
        removeRegisteredSource(`tmp-geo-${pl.id}`)
      }
    })

    // Add or update
    curr.forEach(l => {
      const p = prev.find(pl => pl.id === l.id)
      const srcId = `tmp-geo-${l.id}`
      const fillId = `tmp-geo-${l.id}-fill`
      const lineId = `tmp-geo-${l.id}-line`
      const circleId = `tmp-geo-${l.id}-circle`

      if (!p) {
        if (l.geomType === 'point') {
          registerLayer({ id: circleId, type: 'circle', source: srcId, paint: { 'circle-color': l.color, 'circle-radius': 5, 'circle-opacity': l.opacity } } as unknown as mapboxgl.AnyLayer, srcId)
        } else if (l.geomType === 'line') {
          registerLayer({ id: lineId, type: 'line', source: srcId, paint: { 'line-color': l.color, 'line-width': l.width, 'line-opacity': l.opacity } } as unknown as mapboxgl.AnyLayer, srcId)
        } else if (l.geomType === 'polygon') {
          registerLayer({ id: fillId, type: 'fill', source: srcId, paint: { 'fill-color': l.color, 'fill-opacity': l.opacity * 0.4 } } as unknown as mapboxgl.AnyLayer, srcId)
          registerLayer({ id: lineId, type: 'line', source: srcId, paint: { 'line-color': l.color, 'line-width': l.width, 'line-opacity': l.opacity } } as unknown as mapboxgl.AnyLayer, srcId)
        } else {
          // mixed
          registerLayer({ id: fillId, type: 'fill', source: srcId, paint: { 'fill-color': l.color, 'fill-opacity': l.opacity * 0.4 } } as unknown as mapboxgl.AnyLayer, srcId)
          registerLayer({ id: lineId, type: 'line', source: srcId, paint: { 'line-color': l.color, 'line-width': l.width, 'line-opacity': l.opacity } } as unknown as mapboxgl.AnyLayer, srcId)
          registerLayer({ id: circleId, type: 'circle', source: srcId, paint: { 'circle-color': l.color, 'circle-radius': 5, 'circle-opacity': l.opacity } } as unknown as mapboxgl.AnyLayer, srcId)
        }
      } else {
        // Fine-grained paint updates
        const setPaint = (id: string, prop: string, val: string | number) => {
          if (!map.getLayer(id)) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.setPaintProperty(id, prop as any, val)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mutateRegisteredLayer(id, layer => ({ ...layer, paint: { ...((layer as any).paint ?? {}), [prop]: val } } as mapboxgl.AnyLayer))
        }
        if (p.color !== l.color) {
          setPaint(fillId, 'fill-color', l.color)
          setPaint(lineId, 'line-color', l.color)
          setPaint(circleId, 'circle-color', l.color)
        }
        if (p.opacity !== l.opacity) {
          setPaint(fillId, 'fill-opacity', l.opacity * 0.4)
          setPaint(lineId, 'line-opacity', l.opacity)
          setPaint(circleId, 'circle-opacity', l.opacity)
        }
        if (p.width !== l.width) {
          setPaint(lineId, 'line-width', l.width)
        }
      }
    })

    prevLayers.current = JSON.parse(JSON.stringify(curr))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(layers), map, ready])

  // Map container drag-drop with visual overlay
  useEffect(() => {
    if (!map || !enabled) return
    const container = map.getContainer()
    let overlayEl: HTMLDivElement | null = null

    const showOverlay = () => {
      if (overlayEl) return
      overlayEl = document.createElement('div')
      overlayEl.style.cssText = 'position:absolute;inset:0;background:rgba(0,212,232,0.07);border:3px dashed rgba(0,212,232,0.45);pointer-events:none;z-index:5;display:flex;align-items:center;justify-content:center;border-radius:4px'
      overlayEl.innerHTML = '<span style="color:#00d4e8;font-size:15px;font-weight:600;text-shadow:0 2px 10px rgba(0,0,0,.6);background:rgba(26,29,46,0.85);padding:12px 24px;border-radius:8px">Drop GeoJSON here</span>'
      container.appendChild(overlayEl)
    }
    const hideOverlay = () => { overlayEl?.remove(); overlayEl = null }

    const onDragOver = (e: DragEvent) => { e.preventDefault(); showOverlay() }
    const onDragLeave = (e: DragEvent) => { if (!container.contains(e.relatedTarget as Node)) hideOverlay() }
    const onDrop = (e: DragEvent) => { e.preventDefault(); hideOverlay(); const f = e.dataTransfer?.files[0]; if (f) handleFile(f) }

    container.addEventListener('dragover', onDragOver)
    container.addEventListener('dragleave', onDragLeave)
    container.addEventListener('drop', onDrop)
    return () => {
      container.removeEventListener('dragover', onDragOver)
      container.removeEventListener('dragleave', onDragLeave)
      container.removeEventListener('drop', onDrop)
      hideOverlay()
    }
  }, [map, enabled, handleFile])

  const onSidebarDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const onSidebarDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const removeLayer = (id: string) => setLayers(p => p.filter(l => l.id !== id))

  const showWidth = (geomType: GeomType) => geomType === 'line' || geomType === 'polygon' || geomType === 'mixed'

  return (
    <Section title="Temporary GeoJSON" icon={uploadIcon}>
      <Toggle value={enabled} onChange={setEnabled} label="Enable drop zone" />
      {enabled && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            onDragOver={onSidebarDragOver}
            onDrop={onSidebarDrop}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${T.glassBorder}`, borderRadius: 8, padding: '14px 12px', textAlign: 'center', cursor: 'pointer', background: 'rgba(40,44,70,0.3)' }}
          >
            <div style={{ color: T.muted, fontSize: 11 }}>Drop GeoJSON here or click to browse</div>
            <input
              ref={fileRef}
              type="file"
              accept=".geojson,.json"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
            />
          </div>

          {layers.map(l => (
            <div key={l.id} style={{ background: T.secondary, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.glassBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 11, color: T.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.filename}>{l.filename}</span>
                <span style={{ fontSize: 9, color: T.muted, background: 'rgba(40,44,70,0.8)', padding: '2px 6px', borderRadius: 4, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l.geomType}</span>
                <button onClick={() => removeLayer(l.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', flexShrink: 0 }} className="rm-btn">{I.x()}</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: T.muted, flex: 1 }}>Color</span>
                  <ColorPicker color={l.color} onChange={c => setLayers(p => p.map(x => x.id === l.id ? { ...x, color: c } : x))} label="Color" />
                </div>
                <SliderRow label="Opacity" value={l.opacity} onChange={v => setLayers(p => p.map(x => x.id === l.id ? { ...x, opacity: v } : x))} min={0} max={1} step={0.05} />
                {showWidth(l.geomType) && (
                  <SliderRow label="Width" value={l.width} onChange={v => setLayers(p => p.map(x => x.id === l.id ? { ...x, width: v } : x))} min={1} max={20} step={1} />
                )}
              </div>
            </div>
          ))}

          {layers.length === 0 && (
            <p style={{ fontSize: 11, color: T.muted, textAlign: 'center', padding: '4px 0', margin: 0 }}>No files loaded. Drag a .geojson file onto the map or use the drop zone above.</p>
          )}
        </div>
      )}
    </Section>
  )
}
