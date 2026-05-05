"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { T, SI, AB, ABO, GP, PRESETS, I, mkPt, mkLn } from '@/components/ui-constants'
import type { PointStyle, LineStyle } from '@/components/ui-constants'
import { Section, Accordion, LineCtrl, Toggle } from '@/components/shared-controls'
import { useMap } from '@/context/map-context'
import { useMapLayers } from '@/context/map-layers'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

interface Waypoint {
  id: string
  name: string
  lng: number
  lat: number
  style: PointStyle
}

interface Suggestion {
  id: string
  place_name: string
  center: [number, number]
}

async function geocodeQuery(query: string): Promise<Suggestion[]> {
  if (!query.trim() || !TOKEN) return []
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=ro&limit=5&access_token=${TOKEN}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.features ?? []).map((f: any) => ({ id: f.id, place_name: f.place_name, center: f.center }))
  } catch (e) {
    console.error('[Route Planner] Geocoding error:', e)
    return []
  }
}

function buildRouteLayerStack(
  _map: mapboxgl.Map,
  style: LineStyle,
  registerLayer: (layer: mapboxgl.AnyLayer, sourceId: string) => void,
  removeRegisteredLayer: (id: string) => void,
) {
  removeRegisteredLayer('route-shadow')
  removeRegisteredLayer('route-outline')
  removeRegisteredLayer('route-main')

  if (style.shadow) {
    registerLayer({
      id: 'route-shadow', type: 'line', source: 'route-planner-line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': style.shadowColor,
        'line-width': style.width + style.shadowBlur / 2,
        'line-blur': style.shadowBlur,
        'line-opacity': 0.5,
      },
    } as unknown as mapboxgl.AnyLayer, 'route-planner-line')
  }

  if (style.outlineOn) {
    registerLayer({
      id: 'route-outline', type: 'line', source: 'route-planner-line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': style.outlineColor,
        'line-width': style.width + style.outlineW * 2,
        'line-opacity': 0.85,
      },
    } as unknown as mapboxgl.AnyLayer, 'route-planner-line')
  }

  registerLayer({
    id: 'route-main', type: 'line', source: 'route-planner-line',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': style.color,
      'line-width': style.width,
      'line-opacity': 0.85,
    },
  } as unknown as mapboxgl.AnyLayer, 'route-planner-line')
}

// ── Sortable waypoint row ──────────────────────────────────────────────────

function SortableWaypointRow({ w, index, onRemove }: { w: Waypoint; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: w.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        background: 'rgba(40,44,70,0.5)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span
          {...attributes}
          {...listeners}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            color: T.muted,
            display: 'flex',
            flexShrink: 0,
            touchAction: 'none',
          }}
        >
          {I.grip()}
        </span>
        <span style={{ flex: 1, fontSize: 12, color: T.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {index + 1}. {w.name}
        </span>
        <button
          onClick={onRemove}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.muted, display: 'flex', padding: 2, flexShrink: 0,
          }}
        >
          {I.x(14)}
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RoutePlannerModule() {
  const [wIn, setWIn] = useState('')
  const [wps, setWps] = useState<Waypoint[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const [rStyle, setRStyle] = useState<LineStyle>(mkLn('#00e5ff'))
  const [rOpen, setROpen] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [showWaypoints, setShowWaypoints] = useState(true)

  const { map, ready } = useMap()
  const { registerSource, registerLayer, removeRegisteredSource, removeRegisteredLayer, mutateRegisteredLayer } = useMapLayers(map, ready)

  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const showWaypointsRef = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevWpsRef = useRef<Waypoint[]>([])
  const prevRStyleRef = useRef<LineStyle>(rStyle)
  const routeActiveRef = useRef(false)
  const wpsRef = useRef(wps)
  const rStyleRef = useRef(rStyle)
  const mapRef = useRef(map)
  const readyRef = useRef(ready)
  const regRef = useRef({ registerSource, registerLayer, removeRegisteredSource, removeRegisteredLayer, mutateRegisteredLayer })

  useEffect(() => { wpsRef.current = wps }, [wps])
  useEffect(() => { rStyleRef.current = rStyle }, [rStyle])
  useEffect(() => { mapRef.current = map }, [map])
  useEffect(() => { readyRef.current = ready }, [ready])
  useEffect(() => {
    regRef.current = { registerSource, registerLayer, removeRegisteredSource, removeRegisteredLayer, mutateRegisteredLayer }
  }, [registerSource, registerLayer, removeRegisteredSource, removeRegisteredLayer, mutateRegisteredLayer])

  // ── dnd-kit sensors ───────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setWps(prev => {
      const oldIdx = prev.findIndex(w => w.id === active.id)
      const newIdx = prev.findIndex(w => w.id === over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }, [])

  // ── Geocoding helpers ──────────────────────────────────────────────────────

  const handleInputChange = (val: string) => {
    setWIn(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.includes(',') || !val.trim()) {
      setSuggestions([])
      setShowSugg(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      const suggs = await geocodeQuery(val)
      setSuggestions(suggs)
      setShowSugg(suggs.length > 0)
    }, 300)
  }

  const makeWaypoint = useCallback((name: string, lng: number, lat: number, index: number): Waypoint => ({
    id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.split(',')[0].trim(),
    lng, lat,
    style: mkPt(PRESETS[index % PRESETS.length]),
  }), [])

  const handleSuggestionClick = (s: Suggestion) => {
    setWps(prev => {
      if (prev.length >= 25) return prev
      return [...prev, makeWaypoint(s.place_name, s.center[0], s.center[1], prev.length)]
    })
    setWIn('')
    setSuggestions([])
    setShowSugg(false)
  }

  const handleEnter = async () => {
    const raw = wIn.trim()
    if (!raw) return
    setSuggestions([])
    setShowSugg(false)
    setWIn('')

    const parts = raw.split(',').map(s => s.trim()).filter(Boolean)

    if (parts.length > 1) {
      const results: Waypoint[] = []
      for (const part of parts) {
        if (wpsRef.current.length + results.length >= 25) break
        const suggs = await geocodeQuery(part)
        if (suggs.length > 0) {
          results.push(makeWaypoint(suggs[0].place_name, suggs[0].center[0], suggs[0].center[1], wpsRef.current.length + results.length))
        } else {
          console.warn(`[Route Planner] No geocoding result for "${part}"`)
        }
        await new Promise(r => setTimeout(r, 200))
      }
      if (results.length > 0) setWps(prev => [...prev, ...results].slice(0, 25))
    } else {
      const suggs = await geocodeQuery(raw)
      if (suggs.length > 0) {
        setWps(prev => {
          if (prev.length >= 25) return prev
          return [...prev, makeWaypoint(suggs[0].place_name, suggs[0].center[0], suggs[0].center[1], prev.length)]
        })
      } else {
        console.warn(`[Route Planner] No geocoding result for "${raw}"`)
      }
    }
  }

  // ── Delete waypoint with auto-update ──────────────────────────────────────

  const handleDeleteWaypoint = useCallback((id: string) => {
    setWps(prev => {
      const next = prev.filter(x => x.id !== id)
      if (next.length < 2) {
        // Clear route from map
        const { removeRegisteredLayer: remLyr, removeRegisteredSource: remSrc } = regRef.current
        remLyr('route-shadow')
        remLyr('route-outline')
        remLyr('route-main')
        remSrc('route-planner-line')
        routeActiveRef.current = false
      }
      return next
    })
  }, [])

  // ── Marker sync ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map || !ready) return
    const prev = prevWpsRef.current
    const curr = wps
    const currIds = new Set(curr.map(w => w.id))

    prev.forEach(pw => {
      if (!currIds.has(pw.id)) {
        markersRef.current.get(pw.id)?.remove()
        markersRef.current.delete(pw.id)
      }
    })

    curr.forEach(w => {
      const existing = markersRef.current.get(w.id)
      const prevW = prev.find(pw => pw.id === w.id)

      if (!existing) {
        const marker = new mapboxgl.Marker({ color: w.style.color })
          .setLngLat([w.lng, w.lat])
          .addTo(map)
        if (!showWaypointsRef.current) marker.getElement().style.display = 'none'
        markersRef.current.set(w.id, marker)
      } else if (prevW) {
        if (prevW.lng !== w.lng || prevW.lat !== w.lat) {
          existing.setLngLat([w.lng, w.lat])
        }
        if (prevW.style.color !== w.style.color) {
          existing.remove()
          const marker = new mapboxgl.Marker({ color: w.style.color })
            .setLngLat([w.lng, w.lat])
            .addTo(map)
          if (!showWaypointsRef.current) marker.getElement().style.display = 'none'
          markersRef.current.set(w.id, marker)
        }
      }
    })

    prevWpsRef.current = JSON.parse(JSON.stringify(curr))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(wps), map, ready])

  useEffect(() => { showWaypointsRef.current = showWaypoints }, [showWaypoints])

  useEffect(() => {
    markersRef.current.forEach(m => {
      m.getElement().style.display = showWaypoints ? '' : 'none'
    })
  }, [showWaypoints])

  useEffect(() => () => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()
  }, [])

  // ── Route calculation ──────────────────────────────────────────────────────

  const doCalculate = useCallback(async () => {
    const m = mapRef.current
    const r = readyRef.current
    const currentWps = wpsRef.current
    const { registerSource: regSrc, registerLayer: regLyr, removeRegisteredSource: remSrc } = regRef.current

    if (!m || !r || currentWps.length < 2) return
    setCalculating(true)
    setRouteError(null)

    try {
      const coords = currentWps.map(w => `${w.lng},${w.lat}`).join(';')
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${TOKEN}`
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new Error('Invalid Mapbox token')
        throw new Error(`Directions API error (${res.status})`)
      }
      const data = await res.json()
      if (!data.routes?.[0]) throw new Error('No route found between waypoints')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const feature = { type: 'Feature' as const, geometry: data.routes[0].geometry as any, properties: {} }

      remSrc('route-planner-line')
      regSrc('route-planner-line', { type: 'geojson', data: feature })
      buildRouteLayerStack(m, rStyleRef.current, regLyr, regRef.current.removeRegisteredLayer)
      routeActiveRef.current = true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Route calculation failed'
      console.error('[Route Planner] Directions error:', e)
      setRouteError(msg)
    } finally {
      setCalculating(false)
    }
  }, [])

  // Auto-recalculate when waypoints change (if route already on map)
  useEffect(() => {
    if (!routeActiveRef.current || wps.length < 2) return
    doCalculate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wps])

  // ── Route layer paint sync on style change ─────────────────────────────────

  useEffect(() => {
    if (!map || !ready || !routeActiveRef.current) return
    const prev = prevRStyleRef.current
    const s = rStyle

    const shadowToggled  = prev.shadow    !== s.shadow
    const outlineToggled = prev.outlineOn !== s.outlineOn

    if (shadowToggled || outlineToggled) {
      buildRouteLayerStack(map, s, registerLayer, removeRegisteredLayer)
    } else {
      const set = (id: string, prop: string, val: string | number) => {
        if (!map.getLayer(id)) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.setPaintProperty(id, prop as any, val)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutateRegisteredLayer(id, l => ({ ...l, paint: { ...((l as any).paint ?? {}), [prop]: val } } as mapboxgl.AnyLayer))
      }
      set('route-main', 'line-color', s.color)
      set('route-main', 'line-width', s.width)
      if (s.shadow) {
        set('route-shadow', 'line-color', s.shadowColor)
        set('route-shadow', 'line-width', s.width + s.shadowBlur / 2)
        set('route-shadow', 'line-blur', s.shadowBlur)
      }
      if (s.outlineOn) {
        set('route-outline', 'line-color', s.outlineColor)
        set('route-outline', 'line-width', s.width + s.outlineW * 2)
      }
    }

    prevRStyleRef.current = s
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rStyle)])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Section title="Route Planner" icon={I.route()}>
      <div style={{marginBottom:10}}>
        <Accordion name="Route Line Settings" isOpen={rOpen} onToggle={()=>setROpen(!rOpen)} onRemove={()=>setRStyle(mkLn())}>
          <LineCtrl s={rStyle} onChange={setRStyle}/>
        </Accordion>
      </div>

      {/* Input + suggestions dropdown */}
      <div style={{position:'relative',marginBottom:4}}>
        <div style={{display:'flex',gap:8}}>
          <div style={{position:'relative',flex:1}}>
            <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.muted,pointerEvents:'none'}}>
              {I.search()}
            </div>
            <input
              value={wIn}
              onChange={e=>handleInputChange(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')handleEnter()}}
              onBlur={()=>setTimeout(()=>setShowSugg(false),150)}
              onFocus={()=>suggestions.length>0&&setShowSugg(true)}
              placeholder="Add waypoint..."
              className="s-input"
              style={SI}
            />
          </div>
          <button
            onClick={()=>{if(wIn.trim())handleEnter()}}
            disabled={!wIn.trim()||wps.length>=25}
            className="add-btn"
            style={!wIn.trim()||wps.length>=25?ABO:AB}
          >
            {I.plus()}
          </button>
        </div>

        {showSugg && suggestions.length>0 && (
          <div style={{position:'absolute',top:'100%',left:0,right:40,zIndex:200,marginTop:4,borderRadius:8,overflow:'hidden',...GP}}>
            {suggestions.map((s,i)=>(
              <button
                key={s.id}
                onMouseDown={()=>handleSuggestionClick(s)}
                style={{
                  display:'block',width:'100%',textAlign:'left',
                  padding:'8px 12px',background:'none',border:'none',
                  color:T.fg,fontSize:12,cursor:'pointer',
                  borderBottom:i<suggestions.length-1?`1px solid rgba(255,255,255,0.06)`:'none',
                  transition:'background .12s',
                }}
                className="sugg-item"
              >
                <span style={{color:T.primary,marginRight:6}}>{I.pin(12)}</span>
                {s.place_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <p style={{fontSize:10,color:T.muted,marginBottom:10}}>{wps.length}/25 waypoints</p>

      {/* Calculate button */}
      <button
        onClick={doCalculate}
        disabled={wps.length<2||calculating}
        className="act-btn"
        style={{
          width:'100%',marginTop:10,
          background:'rgba(0,212,232,0.12)',color:T.primary,
          border:'1px solid rgba(0,212,232,0.2)',borderRadius:8,
          padding:'8px 0',fontSize:12,fontWeight:500,
          cursor:wps.length<2||calculating?'not-allowed':'pointer',
          opacity:wps.length<2||calculating?.4:1,
        }}
      >
        {calculating?'Calculating…':'Calculate Route'}
      </button>

      {routeError&&(
        <p style={{fontSize:10,color:'#ff4081',marginTop:6,textAlign:'center',lineHeight:1.4}}>{routeError}</p>
      )}

      {/* Show waypoints toggle */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 12px',marginTop:10,background:'rgba(40,44,70,0.5)',borderRadius:8,border:'1px solid rgba(255,255,255,0.07)'}}>
        <span style={{fontSize:12,fontWeight:500,color:showWaypoints?T.fg:T.muted,transition:'color .2s'}}>Show waypoints</span>
        <Toggle label="" value={showWaypoints} onChange={setShowWaypoints}/>
      </div>

      {/* Waypoints list with drag-and-drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={wps.map(w => w.id)} strategy={verticalListSortingStrategy}>
          <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:10}}>
            {wps.map((w,i)=>(
              <SortableWaypointRow
                key={w.id}
                w={w}
                index={i}
                onRemove={()=>handleDeleteWaypoint(w.id)}
              />
            ))}
            {wps.length===0&&(
              <p style={{fontSize:11,color:T.muted,textAlign:'center',padding:'8px 0'}}>No waypoints yet.</p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </Section>
  )
}
