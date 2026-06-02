"use client"

import { useState, useEffect, useRef } from 'react'
import { Train } from 'lucide-react'
import { T, SI, I } from '@/components/ui-constants'
import type { LineStyle } from '@/components/ui-constants'
import { Section, Toggle, LineCtrl } from '@/components/shared-controls'
import { useMap } from '@/context/map-context'
import { useMapLayers } from '@/context/map-layers'
import type mapboxgl from 'mapbox-gl'

const TRAINS_SOURCE  = 'trains-source'
const LAYER_LINES    = 'trains-lines'
const LAYER_SHADOW   = 'trains-lines-shadow'
const LAYER_OUTLINE  = 'trains-lines-outline'
const LAYER_STATIONS = 'trains-stations'

interface TrainLine {
  magistrala: string
  bbox: [number, number, number, number]
}

interface Selection {
  magistrala: string
  bbox: [number, number, number, number]
}

function extendBbox(bbox: [number, number, number, number], coord: number[]) {
  const x = coord[0], y = coord[1]
  if (x < bbox[0]) bbox[0] = x
  if (y < bbox[1]) bbox[1] = y
  if (x > bbox[2]) bbox[2] = x
  if (y > bbox[3]) bbox[3] = y
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walkCoords(geom: any, fn: (c: number[]) => void) {
  if (!geom?.coordinates) return
  switch (geom.type) {
    case 'LineString':
      for (const p of geom.coordinates) fn(p); break
    case 'MultiLineString':
      for (const r of geom.coordinates) for (const p of r) fn(p); break
  }
}

export default function TrainsModule() {
  const { map, ready } = useMap()
  const { registerSource, registerLayer, removeRegisteredLayer, mutateRegisteredLayer } = useMapLayers(map, ready)

  const [sourceLoaded, setSourceLoaded] = useState(false)
  const [lines, setLines] = useState<TrainLine[]>([])
  const [selections, setSelections] = useState<Selection[]>([])
  const [showStations, setShowStations] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<TrainLine[]>([])
  const [showSug, setShowSug] = useState(false)
  const [sugPos, setSugPos] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const [trainStyle, setTrainStyle] = useState<LineStyle>({
    color: '#e85d04',
    width: 3,
    shadow: false,
    shadowBlur: 4,
    shadowColor: '#000000',
    outlineOn: false,
    outlineColor: '#ffffff',
    outlineW: 1,
  })
  const prevStyleRef = useRef<LineStyle | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterRef = useRef<any>(['==', ['get', 'magistrala'], '__none__'])

  // Fetch GeoJSON, register source, build TrainLine list
  useEffect(() => {
    if (!map || !ready) return
    let cancelled = false

    fetch('/data/trains.geojson')
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((raw: any) => {
        if (cancelled) return
        registerSource(TRAINS_SOURCE, { type: 'geojson', data: raw })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list: TrainLine[] = (raw.features ?? [] as any[])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((f: any) => f.properties?.magistrala)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((f: any) => {
            const bbox: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
            walkCoords(f.geometry, c => extendBbox(bbox, c))
            return { magistrala: String(f.properties.magistrala), bbox }
          })
          .filter((l: TrainLine) => isFinite(l.bbox[0]))

        list.sort((a, b) => a.magistrala.localeCompare(b.magistrala, undefined, { numeric: true }))
        setLines(list)
        setSourceLoaded(true)
      })
      .catch(err => console.error('Failed to fetch trains.geojson:', err))

    return () => { cancelled = true }
  }, [map, ready, registerSource])

  // Register stations layer once source is ready
  useEffect(() => {
    if (!map || !ready || !sourceLoaded) return
    if (!map.getLayer(LAYER_STATIONS)) {
      registerLayer({
        id: LAYER_STATIONS, type: 'circle', source: TRAINS_SOURCE,
        filter: ['==', ['get', 'public_transport'], 'station'],
        layout: { visibility: 'none' },
        paint: { 'circle-radius': 3, 'circle-color': '#ffffff', 'circle-stroke-color': '#e85d04', 'circle-stroke-width': 1 },
      } as unknown as mapboxgl.AnyLayer, TRAINS_SOURCE)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, sourceLoaded])

  // Sync trainStyle → shadow/outline/main line layers
  useEffect(() => {
    if (!map || !ready || !sourceLoaded) return

    const prev = prevStyleRef.current
    const curr = trainStyle
    const filter = filterRef.current

    const isNew          = !prev
    const shadowToggled  = !!prev && prev.shadow    !== curr.shadow
    const outlineToggled = !!prev && prev.outlineOn !== curr.outlineOn

    if (isNew || shadowToggled || outlineToggled) {
      removeRegisteredLayer(LAYER_SHADOW)
      removeRegisteredLayer(LAYER_OUTLINE)
      removeRegisteredLayer(LAYER_LINES)

      if (curr.shadow) {
        registerLayer({
          id: LAYER_SHADOW, type: 'line', source: TRAINS_SOURCE, filter,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color':   curr.shadowColor,
            'line-width':   curr.width + curr.shadowBlur / 2,
            'line-blur':    curr.shadowBlur,
            'line-opacity': 0.5,
          },
        } as unknown as mapboxgl.AnyLayer, TRAINS_SOURCE)
      }

      if (curr.outlineOn) {
        registerLayer({
          id: LAYER_OUTLINE, type: 'line', source: TRAINS_SOURCE, filter,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color':   curr.outlineColor,
            'line-width':   curr.width + curr.outlineW * 2,
            'line-opacity': 0.85,
          },
        } as unknown as mapboxgl.AnyLayer, TRAINS_SOURCE)
      }

      registerLayer({
        id: LAYER_LINES, type: 'line', source: TRAINS_SOURCE, filter,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color':   curr.color,
          'line-width':   curr.width,
          'line-opacity': 0.85,
        },
      } as unknown as mapboxgl.AnyLayer, TRAINS_SOURCE)

      if (curr.shadow    && map.getLayer(LAYER_SHADOW))  map.moveLayer(LAYER_SHADOW)
      if (curr.outlineOn && map.getLayer(LAYER_OUTLINE)) map.moveLayer(LAYER_OUTLINE)
      if (map.getLayer(LAYER_LINES)) map.moveLayer(LAYER_LINES)
    } else if (prev) {
      const setPaint = (id: string, prop: string, val: string | number) => {
        if (!map.getLayer(id)) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.setPaintProperty(id, prop as any, val)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutateRegisteredLayer(id, l => ({ ...l, paint: { ...((l as any).paint ?? {}), [prop]: val } } as mapboxgl.AnyLayer))
      }

      if (prev.color !== curr.color) setPaint(LAYER_LINES, 'line-color', curr.color)
      if (prev.width !== curr.width) {
        setPaint(LAYER_LINES, 'line-width', curr.width)
        if (curr.shadow)    setPaint(LAYER_SHADOW,  'line-width', curr.width + curr.shadowBlur / 2)
        if (curr.outlineOn) setPaint(LAYER_OUTLINE, 'line-width', curr.width + curr.outlineW * 2)
      }
      if (curr.shadow) {
        if (prev.shadowColor !== curr.shadowColor) setPaint(LAYER_SHADOW, 'line-color', curr.shadowColor)
        if (prev.shadowBlur  !== curr.shadowBlur) {
          setPaint(LAYER_SHADOW, 'line-blur',  curr.shadowBlur)
          setPaint(LAYER_SHADOW, 'line-width', curr.width + curr.shadowBlur / 2)
        }
      }
      if (curr.outlineOn) {
        if (prev.outlineColor !== curr.outlineColor) setPaint(LAYER_OUTLINE, 'line-color', curr.outlineColor)
        if (prev.outlineW     !== curr.outlineW)     setPaint(LAYER_OUTLINE, 'line-width', curr.width + curr.outlineW * 2)
      }

      // Re-raise trains above borders on incremental style update
      for (const id of [LAYER_SHADOW, LAYER_OUTLINE, LAYER_LINES]) {
        if (map.getLayer(id)) map.moveLayer(id)
      }
    }

    prevStyleRef.current = { ...curr }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(trainStyle), map, ready, sourceLoaded])

  // Sync filter to active selections (all 3 line layers)
  useEffect(() => {
    if (!map || !sourceLoaded) return
    const magistrales = selections.map(s => s.magistrala)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = magistrales.length > 0
      ? ['in', ['get', 'magistrala'], ['literal', magistrales]]
      : ['==', ['get', 'magistrala'], '__none__']

    filterRef.current = filter

    for (const id of [LAYER_SHADOW, LAYER_OUTLINE, LAYER_LINES]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mutateRegisteredLayer(id, l => ({ ...l, filter } as any))
      if (map.getLayer(id)) map.setFilter(id, filter)
    }

    // Re-raise trains above borders on every selection change
    for (const id of [LAYER_SHADOW, LAYER_OUTLINE, LAYER_LINES]) {
      if (map.getLayer(id)) map.moveLayer(id)
    }
  }, [selections, map, sourceLoaded, mutateRegisteredLayer])

  // Sync stations toggle → visibility
  useEffect(() => {
    if (!map || !sourceLoaded) return
    const vis = showStations ? 'visible' : 'none'
    mutateRegisteredLayer(LAYER_STATIONS, l => ({
      ...l,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layout: { ...(((l as any).layout) ?? {}), visibility: vis },
    } as mapboxgl.AnyLayer))
    if (map.getLayer(LAYER_STATIONS)) map.setLayoutProperty(LAYER_STATIONS, 'visibility', vis)
  }, [showStations, map, sourceLoaded, mutateRegisteredLayer])

  // Debounced search on magistrala field (strip leading M/m)
  useEffect(() => {
    const q = query.trim()
    if (!q) { setSuggestions([]); setShowSug(false); return }
    const t = setTimeout(() => {
      const ql = q.replace(/^m/i, '').toLowerCase()
      if (!ql) { setSuggestions([]); setShowSug(false); return }

      const results = lines.filter(l =>
        l.magistrala.toLowerCase().includes(ql)
      ).slice(0, 8)

      if (results.length > 0 && containerRef.current) {
        const r = containerRef.current.getBoundingClientRect()
        setSugPos({ top: r.bottom + 4, left: r.left, width: r.width })
      }
      setSuggestions(results)
      setShowSug(results.length > 0)
    }, 200)
    return () => clearTimeout(t)
  }, [query, lines])

  const fitToBbox = (bbox: [number, number, number, number]) => {
    if (!map) return
    const [w, s, e, n] = bbox
    if (!isFinite(w) || !isFinite(s) || !isFinite(e) || !isFinite(n)) return
    map.fitBounds([[w, s], [e, n]], { padding: 80, duration: 800, maxZoom: 13 })
  }

  const handlePickSuggestion = (line: TrainLine) => {
    setSelections(prev => {
      if (prev.some(p => p.magistrala === line.magistrala)) return prev
      return [...prev, { magistrala: line.magistrala, bbox: line.bbox }]
    })
    fitToBbox(line.bbox)
    setQuery('')
    setSuggestions([])
    setShowSug(false)
  }

  return (
    <Section title="Trains" icon={<Train size={16}/>}>
      <div ref={containerRef} style={{marginBottom:10}}>
        <div style={{position:'relative'}}>
          <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.muted}}>{I.search()}</div>
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>{ if (e.key==='Enter' && suggestions.length > 0) handlePickSuggestion(suggestions[0]) }}
            onFocus={()=>{
              if (suggestions.length > 0 && containerRef.current) {
                const r = containerRef.current.getBoundingClientRect()
                setSugPos({ top: r.bottom + 4, left: r.left, width: r.width })
                setShowSug(true)
              }
            }}
            onBlur={()=>setTimeout(()=>setShowSug(false), 150)}
            placeholder="Magistrală (e.g. M100, M200…)"
            className="s-input"
            style={SI}
          />
        </div>
        {showSug && suggestions.length > 0 && (
          <div style={{position:'fixed',top:sugPos.top,left:sugPos.left,width:sugPos.width,zIndex:99999,background:T.card,border:`1px solid ${T.glassBorder}`,borderRadius:8,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.5)'}}>
            {suggestions.map((s, i) => {
              const alreadyActive = selections.some(sel => sel.magistrala === s.magistrala)
              return (
                <button
                  key={s.magistrala}
                  onMouseDown={e=>{ e.preventDefault(); if (!alreadyActive) handlePickSuggestion(s) }}
                  disabled={alreadyActive}
                  style={{display:'block',width:'100%',padding:'8px 12px',background:'none',border:'none',borderBottom:i < suggestions.length - 1 ? `1px solid ${T.glassBorder}` : 'none',cursor:alreadyActive?'default':'pointer',textAlign:'left',color:T.fg,fontSize:12,opacity:alreadyActive?0.45:1}}
                  className="sug-item"
                >
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontWeight:700,color:T.primary}}>{s.magistrala}</span>
                    {alreadyActive && (
                      <span style={{marginLeft:'auto',fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:'.06em'}}>activ</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
        {selections.map(s => (
          <div
            key={s.magistrala}
            style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',background:T.secondary,borderRadius:8}}
          >
            <span
              style={{width:10,height:10,borderRadius:2,background:trainStyle.color,flexShrink:0,boxShadow:`0 0 6px ${trainStyle.color}66`}}
            />
            <button
              onClick={()=>fitToBbox(s.bbox)}
              style={{display:'flex',alignItems:'center',gap:6,flex:1,background:'none',border:'none',cursor:'pointer',color:T.fg,padding:0,fontSize:12,fontWeight:500,textAlign:'left',minWidth:0}}
            >
              <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.magistrala}</span>
            </button>
            <button
              onClick={()=>setSelections(prev=>prev.filter(x=>x.magistrala!==s.magistrala))}
              className="rm-btn"
              style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:0,display:'flex'}}
              aria-label={`Remove ${s.magistrala}`}
            >
              {I.x(12)}
            </button>
          </div>
        ))}
        {selections.length === 0 && (
          <p style={{fontSize:11,color:T.muted,textAlign:'center',padding:'8px 0'}}>
            {sourceLoaded ? 'Caută o magistrală pentru a o afișa.' : 'Se încarcă datele CFR…'}
          </p>
        )}
      </div>

      <div style={{padding:'8px 10px',background:T.secondary,borderRadius:8,marginBottom:8}}>
        <p style={{fontSize:10,color:T.muted,marginBottom:8,fontWeight:500,textTransform:'uppercase',letterSpacing:'.06em'}}>Stil linii trenuri</p>
        <LineCtrl s={trainStyle} onChange={setTrainStyle}/>
      </div>

      <div style={{padding:'8px 10px',background:T.secondary,borderRadius:8}}>
        <Toggle label="Afișează stații" value={showStations} onChange={setShowStations}/>
      </div>
    </Section>
  )
}
