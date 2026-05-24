"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { T, IB, I, PRESETS } from '@/components/ui-constants'
import { Section, Toggle, SliderRow } from '@/components/shared-controls'
import ColorPicker from '@/components/color-picker'
import { useMap } from '@/context/map-context'
import { useMapLayers } from '@/context/map-layers'
import type mapboxgl from 'mapbox-gl'

type GeomType = 'point' | 'line' | 'polygon' | 'mixed'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FC = any

interface TempLayer {
  id: string
  filename: string
  geomType: GeomType
  geojson: FC
  propKeys: string[]
  fillEnabled: boolean
  fillColor: string
  fillOpacity: number
  shapeEnabled: boolean
  shapeColor: string
  shapeWidth: number
  searchQuery: string
  suggestions: string[]
  showSuggestions: boolean
  filterQuery: string | null
  matchCount: number
}

type Snap = Pick<TempLayer, 'id' | 'geomType' | 'fillEnabled' | 'fillColor' | 'fillOpacity' | 'shapeEnabled' | 'shapeColor' | 'shapeWidth'>

function detectGeomType(geojson: FC): GeomType {
  const types = new Set<string>()
  for (const f of (geojson.features ?? []) as FC[]) {
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

function extractPropKeys(geojson: FC): string[] {
  const props = geojson.features?.[0]?.properties
  if (!props) return []
  return Object.entries(props)
    .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
    .map(([k]) => k)
}

function computeSuggestions(geojson: FC, propKeys: string[], query: string): string[] {
  if (!query.trim() || !propKeys.length) return []
  const q = query.toLowerCase()
  const starts: string[] = []
  const contains: string[] = []
  const seen = new Set<string>()
  for (const f of (geojson.features ?? []) as FC[]) {
    for (const k of propKeys) {
      const v = String(f.properties?.[k] ?? '')
      if (!v || seen.has(v)) continue
      const vl = v.toLowerCase()
      if (vl.startsWith(q)) { starts.push(v); seen.add(v) }
      else if (vl.includes(q)) { contains.push(v); seen.add(v) }
    }
    if (starts.length >= 5) break
  }
  return [...starts, ...contains].slice(0, 5)
}

const uploadIcon = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
)

const tog = (on: boolean, click: () => void) => (
  <div onClick={click} className="tog-track" style={{ width: 28, height: 16, borderRadius: 8, background: on ? T.primary : '#444', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
    <div className="tog-thumb" style={{ width: 12, height: 12, borderRadius: 6, background: '#fff', position: 'absolute', top: 2, left: on ? 14 : 2, transition: 'left .15s' }} />
  </div>
)

export default function TempGeoJSONModule() {
  const [enabled, setEnabled] = useState(false)
  const [layers, setLayers] = useState<TempLayer[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const layersRef = useRef<TempLayer[]>([])
  const prevSnaps = useRef<Snap[]>([])

  useEffect(() => { layersRef.current = layers }, [layers])

  const { map, ready } = useMap()
  const { registerSource, registerLayer, removeRegisteredLayer, removeRegisteredSource, mutateRegisteredLayer } = useMapLayers(map, ready)

  // Re-apply active filters after style.load (rehydrate restores original source data first)
  useEffect(() => {
    if (!map || !ready) return
    const onStyleLoad = () => {
      setTimeout(() => {
        layersRef.current.forEach(l => {
          // Re-apply active filter (rehydrate restores original data)
          if (l.filterQuery) {
            const src = map.getSource(`tmp-geo-${l.id}`) as mapboxgl.GeoJSONSource
            if (src?.setData) {
              const q = l.filterQuery.toLowerCase()
              src.setData({ ...l.geojson, features: (l.geojson.features as FC[]).filter((f: FC) => l.propKeys.some(k => String(f.properties?.[k] ?? '').toLowerCase() === q)) })
            }
          }
          // Move all temp geojson layers above borders (to top of stack)
          const base = `tmp-geo-${l.id}`
          ;[`${base}-fill`, `${base}-line`, `${base}-circle`].forEach(id => {
            if (map.getLayer(id)) map.moveLayer(id)
          })
        })
      }, 0)
    }
    map.on('style.load', onStyleLoad)
    return () => { map.off('style.load', onStyleLoad) }
  }, [map, ready])

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(geojson|json)$/i)) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const geojson = JSON.parse(e.target!.result as string) as FC
        if (!geojson || geojson.type !== 'FeatureCollection') { console.warn('[TempGeoJSON] Not a FeatureCollection'); return }
        const geomType = detectGeomType(geojson)
        const propKeys = extractPropKeys(geojson)
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const color = PRESETS[layersRef.current.length % PRESETS.length]
        registerSource(`tmp-geo-${id}`, { type: 'geojson', data: geojson })
        setLayers(p => [...p, {
          id, filename: file.name, geomType, geojson, propKeys,
          fillEnabled: geomType !== 'line',
          fillColor: color, fillOpacity: 0.7,
          shapeEnabled: geomType !== 'point',
          shapeColor: color, shapeWidth: 2,
          searchQuery: '', suggestions: [], showSuggestions: false,
          filterQuery: null, matchCount: 0,
        }])
      } catch (err) {
        console.error('[TempGeoJSON] Parse error', err)
      }
    }
    reader.readAsText(file)
  }, [registerSource])

  const upd = (id: string, patch: Partial<TempLayer>) => setLayers(p => p.map(l => l.id === id ? { ...l, ...patch } : l))

  const handleSearch = (layerId: string, query: string) =>
    setLayers(p => p.map(l => l.id !== layerId ? l : { ...l, searchQuery: query, suggestions: computeSuggestions(l.geojson, l.propKeys, query), showSuggestions: true }))

  const applyFilter = (layerId: string, value: string | null) => {
    if (!map) return
    setLayers(p => p.map(l => {
      if (l.id !== layerId) return l
      const src = map.getSource(`tmp-geo-${l.id}`) as mapboxgl.GeoJSONSource
      if (!src?.setData) return l
      if (value) {
        const q = value.toLowerCase()
        const features = (l.geojson.features as FC[]).filter((f: FC) => l.propKeys.some(k => String(f.properties?.[k] ?? '').toLowerCase() === q))
        src.setData({ ...l.geojson, features })
        return { ...l, filterQuery: value, matchCount: features.length, searchQuery: value, showSuggestions: false }
      }
      src.setData(l.geojson)
      return { ...l, filterQuery: null, matchCount: 0, searchQuery: '', showSuggestions: false }
    }))
  }

  // Sync layers → Mapbox (paint/layer add-remove; skip geojson/search fields)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!map || !ready) return
    const prev = prevSnaps.current
    const curr = layers

    prev.forEach(ps => { if (!curr.find(l => l.id === ps.id)) removeRegisteredSource(`tmp-geo-${ps.id}`) })

    const sp = (layId: string, prop: string, val: string | number) => {
      if (!map.getLayer(layId)) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.setPaintProperty(layId, prop as any, val)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mutateRegisteredLayer(layId, lay => ({ ...lay, paint: { ...((lay as any).paint ?? {}), [prop]: val } } as mapboxgl.AnyLayer))
    }

    // Register layer and immediately move it above everything else
    const rl = (layer: mapboxgl.AnyLayer, sourceId: string, lid: string) => {
      registerLayer(layer, sourceId)
      if (map.getLayer(lid)) map.moveLayer(lid)
    }

    curr.forEach(l => {
      const p = prev.find(ps => ps.id === l.id)
      const src = `tmp-geo-${l.id}`
      const fId = `${src}-fill`, lId = `${src}-line`, cId = `${src}-circle`

      const mkFill = () => ({ id: fId, type: 'fill' as const, source: src, paint: { 'fill-color': l.fillColor, 'fill-opacity': l.fillOpacity } })
      const mkLine = () => ({ id: lId, type: 'line' as const, source: src, paint: { 'line-color': l.shapeColor, 'line-width': l.shapeWidth, 'line-opacity': 0.9 } })
      const mkCircle = () => ({ id: cId, type: 'circle' as const, source: src, paint: { 'circle-color': l.fillColor, 'circle-radius': 5, 'circle-opacity': l.fillOpacity } })

      if (!p) {
        if (l.geomType === 'point') {
          rl(mkCircle() as unknown as mapboxgl.AnyLayer, src, cId)
        } else if (l.geomType === 'line') {
          if (l.shapeEnabled) rl(mkLine() as unknown as mapboxgl.AnyLayer, src, lId)
        } else {
          if (l.fillEnabled) rl(mkFill() as unknown as mapboxgl.AnyLayer, src, fId)
          if (l.shapeEnabled) rl(mkLine() as unknown as mapboxgl.AnyLayer, src, lId)
          if (l.geomType === 'mixed') rl(mkCircle() as unknown as mapboxgl.AnyLayer, src, cId)
        }
        return
      }

      // Toggle changes
      if (l.geomType === 'line') {
        if (p.shapeEnabled !== l.shapeEnabled) {
          if (l.shapeEnabled) rl(mkLine() as unknown as mapboxgl.AnyLayer, src, lId)
          else removeRegisteredLayer(lId)
        }
      } else if (l.geomType !== 'point') {
        if (p.fillEnabled !== l.fillEnabled) {
          if (l.fillEnabled) rl(mkFill() as unknown as mapboxgl.AnyLayer, src, fId)
          else removeRegisteredLayer(fId)
          if (l.geomType === 'mixed') {
            if (l.fillEnabled) rl(mkCircle() as unknown as mapboxgl.AnyLayer, src, cId)
            else removeRegisteredLayer(cId)
          }
        }
        if (p.shapeEnabled !== l.shapeEnabled) {
          if (l.shapeEnabled) rl(mkLine() as unknown as mapboxgl.AnyLayer, src, lId)
          else removeRegisteredLayer(lId)
        }
      }

      // Paint updates
      if (p.fillColor !== l.fillColor) { sp(fId, 'fill-color', l.fillColor); sp(cId, 'circle-color', l.fillColor) }
      if (p.fillOpacity !== l.fillOpacity) { sp(fId, 'fill-opacity', l.fillOpacity); sp(cId, 'circle-opacity', l.fillOpacity) }
      if (p.shapeColor !== l.shapeColor) sp(lId, 'line-color', l.shapeColor)
      if (p.shapeWidth !== l.shapeWidth) sp(lId, 'line-width', l.shapeWidth)
    })

    prevSnaps.current = curr.map(({ id, geomType, fillEnabled, fillColor, fillOpacity, shapeEnabled, shapeColor, shapeWidth }) =>
      ({ id, geomType, fillEnabled, fillColor, fillOpacity, shapeEnabled, shapeColor, shapeWidth }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(layers.map(({ id, geomType, fillEnabled, fillColor, fillOpacity, shapeEnabled, shapeColor, shapeWidth }) => ({ id, geomType, fillEnabled, fillColor, fillOpacity, shapeEnabled, shapeColor, shapeWidth }))), map, ready])

  // Drag-drop on map canvas
  useEffect(() => {
    if (!map || !enabled) return
    const container = map.getContainer()
    let overlay: HTMLDivElement | null = null
    const show = () => {
      if (overlay) return
      overlay = document.createElement('div')
      overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,212,232,0.07);border:3px dashed rgba(0,212,232,0.45);pointer-events:none;z-index:5;display:flex;align-items:center;justify-content:center;border-radius:4px'
      overlay.innerHTML = '<span style="color:#00d4e8;font-size:15px;font-weight:600;text-shadow:0 2px 10px rgba(0,0,0,.6);background:rgba(26,29,46,0.85);padding:12px 24px;border-radius:8px">Drop GeoJSON here</span>'
      container.appendChild(overlay)
    }
    const hide = () => { overlay?.remove(); overlay = null }
    const onDragOver = (e: DragEvent) => { e.preventDefault(); show() }
    const onDragLeave = (e: DragEvent) => { if (!container.contains(e.relatedTarget as Node)) hide() }
    const onDrop = (e: DragEvent) => { e.preventDefault(); hide(); const f = e.dataTransfer?.files[0]; if (f) handleFile(f) }
    container.addEventListener('dragover', onDragOver)
    container.addEventListener('dragleave', onDragLeave)
    container.addEventListener('drop', onDrop)
    return () => { container.removeEventListener('dragover', onDragOver); container.removeEventListener('dragleave', onDragLeave); container.removeEventListener('drop', onDrop); hide() }
  }, [map, enabled, handleFile])

  const onSidebarDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const onSidebarDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }

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
            <input ref={fileRef} type="file" accept=".geojson,.json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
          </div>

          {layers.map(l => (
            <div key={l.id} style={{ background: T.secondary, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.glassBorder}` }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 11, color: T.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.filename}>{l.filename}</span>
                <span style={{ fontSize: 9, color: T.muted, background: 'rgba(40,44,70,0.8)', padding: '2px 6px', borderRadius: 4, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l.geomType}</span>
                <button onClick={() => setLayers(p => p.filter(x => x.id !== l.id))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', flexShrink: 0 }} className="rm-btn">{I.x()}</button>
              </div>

              {/* Search & autosuggest */}
              {l.propKeys.length > 0 && (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      style={{ ...IB, fontSize: 11, padding: '5px 8px', flex: 1 }}
                      placeholder={`Search by ${l.propKeys.slice(0, 2).join(', ')}…`}
                      value={l.searchQuery}
                      onChange={e => handleSearch(l.id, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && l.searchQuery.trim()) applyFilter(l.id, l.searchQuery.trim())
                        if (e.key === 'Escape') upd(l.id, { showSuggestions: false })
                      }}
                      onFocus={() => { if (l.suggestions.length) upd(l.id, { showSuggestions: true }) }}
                      onBlur={() => setTimeout(() => upd(l.id, { showSuggestions: false }), 150)}
                    />
                    {l.filterQuery && (
                      <button onClick={() => applyFilter(l.id, null)} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(0,212,232,0.12)', border: '1px solid rgba(0,212,232,0.3)', color: T.primary, cursor: 'pointer', fontSize: 10, whiteSpace: 'nowrap', flexShrink: 0 }}>Clear</button>
                    )}
                  </div>
                  {l.showSuggestions && l.suggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e2235', border: `1px solid ${T.glassBorder}`, borderRadius: 6, zIndex: 50, marginTop: 2, overflow: 'hidden' }}>
                      {l.suggestions.map(s => (
                        <button key={s} onMouseDown={() => applyFilter(l.id, s)} style={{ display: 'block', width: '100%', padding: '6px 10px', background: 'none', border: 'none', color: T.fg, cursor: 'pointer', textAlign: 'left', fontSize: 11 }} className="sug-item">{s}</button>
                      ))}
                    </div>
                  )}
                  {l.filterQuery && (
                    <div style={{ fontSize: 10, color: T.primary, marginTop: 3 }}>Filtered: {l.matchCount} feature{l.matchCount !== 1 ? 's' : ''} matched</div>
                  )}
                </div>
              )}

              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {/* Point: always-on circle color + opacity */}
                {l.geomType === 'point' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: T.muted, flex: 1 }}>Color</span>
                      <ColorPicker color={l.fillColor} onChange={c => upd(l.id, { fillColor: c })} label="Color" />
                    </div>
                    <SliderRow label="Opacity" value={l.fillOpacity} onChange={v => upd(l.id, { fillOpacity: v })} min={0} max={1} step={0.05} />
                  </>
                )}

                {/* Line: shape only */}
                {l.geomType === 'line' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: T.muted, flex: 1 }}>Shape</span>
                      {l.shapeEnabled && <ColorPicker color={l.shapeColor} onChange={c => upd(l.id, { shapeColor: c })} label="Line" />}
                      {tog(l.shapeEnabled, () => upd(l.id, { shapeEnabled: !l.shapeEnabled }))}
                    </div>
                    {l.shapeEnabled && <SliderRow label="Width" value={l.shapeWidth} onChange={v => upd(l.id, { shapeWidth: v })} min={1} max={20} step={1} />}
                  </>
                )}

                {/* Polygon / mixed: fill + shape */}
                {(l.geomType === 'polygon' || l.geomType === 'mixed') && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: T.muted, flex: 1 }}>Fill</span>
                      {l.fillEnabled && <ColorPicker color={l.fillColor} onChange={c => upd(l.id, { fillColor: c })} label="Fill" />}
                      {tog(l.fillEnabled, () => upd(l.id, { fillEnabled: !l.fillEnabled }))}
                    </div>
                    {l.fillEnabled && <SliderRow label="Opacity" value={l.fillOpacity} onChange={v => upd(l.id, { fillOpacity: v })} min={0} max={1} step={0.05} />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: T.muted, flex: 1 }}>Shape</span>
                      {l.shapeEnabled && <ColorPicker color={l.shapeColor} onChange={c => upd(l.id, { shapeColor: c })} label="Line" />}
                      {tog(l.shapeEnabled, () => upd(l.id, { shapeEnabled: !l.shapeEnabled }))}
                    </div>
                    {l.shapeEnabled && <SliderRow label="Width" value={l.shapeWidth} onChange={v => upd(l.id, { shapeWidth: v })} min={1} max={20} step={1} />}
                  </>
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
