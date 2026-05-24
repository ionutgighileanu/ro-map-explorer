"use client"

import { useState, useEffect, useRef } from 'react'
import { T, SI, AB, ABO, PRESETS, I, mkLn } from '@/components/ui-constants'
import type { LineStyle } from '@/components/ui-constants'
import { Section, Accordion, LineCtrl, useToggleSet } from '@/components/shared-controls'
import { useMap } from '@/context/map-context'
import { useMapLayers } from '@/context/map-layers'
import type mapboxgl from 'mapbox-gl'

type Direction = 'outbound' | 'return' | 'both'

interface StbRoute {
  id: string
  line: string
  style: LineStyle
  direction: Direction
}

const DIR_OPTIONS: { val: Direction; label: string }[] = [
  { val: 'outbound', label: 'Outbound' },
  { val: 'return', label: 'Return' },
  { val: 'both', label: 'Both' },
]

function DirGroup({ value, onChange }: { value: Direction; onChange: (v: Direction) => void }) {
  return (
    <div style={{ display: 'flex', marginTop: 8, borderRadius: 6, overflow: 'hidden', border: `1px solid ${T.glassBorder}` }}>
      {DIR_OPTIONS.map((o, idx) => (
        <button
          key={o.val}
          onClick={() => onChange(o.val)}
          style={{
            flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: value === o.val ? 'rgba(0,212,232,0.18)' : 'rgba(40,44,70,0.6)',
            color: value === o.val ? T.primary : T.muted,
            borderRight: idx < DIR_OPTIONS.length - 1 ? `1px solid ${T.glassBorder}` : 'none',
            transition: 'background .15s, color .15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkFilter(line: string, dir: Direction): any[] {
  if (dir === 'outbound') return ['all', ['==', ['get', 'line'], line], ['in', ['get', 'direction'], ['literal', ['outbound', 'both']]]]
  if (dir === 'return')   return ['all', ['==', ['get', 'line'], line], ['in', ['get', 'direction'], ['literal', ['return', 'both']]]]
  return ['==', ['get', 'line'], line]
}

interface StbSuggestion { line: string; name: string }

export default function StbRoutesModule() {
  const [sIn, setSIn] = useState('')
  const [stb, setStb] = useState<StbRoute[]>([])
  const [openS, togS] = useToggleSet()
  const [sourceLoaded, setSourceLoaded] = useState(false)
  const [allRoutesSug, setAllRoutesSug] = useState<StbSuggestion[]>([])
  const [stbSuggestions, setStbSuggestions] = useState<StbSuggestion[]>([])
  const [showStbSug, setShowStbSug] = useState(false)
  const [stbSugPos, setStbSugPos] = useState({ top: 0, left: 0, width: 0 })
  const stbContainerRef = useRef<HTMLDivElement>(null)
  const prevStbRef = useRef<StbRoute[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validLinesRef = useRef<Set<string>>(new Set())

  const { map, ready } = useMap()
  const { registerSource, registerLayer, removeRegisteredLayer, mutateRegisteredLayer } = useMapLayers(map, ready)

  // Fetch GeoJSON, pre-process MultiLineString → two LineStrings with direction prop, register source
  useEffect(() => {
    if (!map || !ready) return
    fetch('/data/stb-all-routes.geojson')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((raw: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const features: any[] = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        raw.features.forEach((f: any) => {
          if (f.geometry.type === 'MultiLineString') {
            const coords: number[][][] = f.geometry.coordinates
            if (coords.length >= 2) {
              features.push({ ...f, geometry: { type: 'LineString', coordinates: coords[0] }, properties: { ...f.properties, direction: 'outbound' } })
              features.push({ ...f, geometry: { type: 'LineString', coordinates: coords[1] }, properties: { ...f.properties, direction: 'return'   } })
              // extra sub-lines (rare) treated as 'both'
              for (let i = 2; i < coords.length; i++) {
                features.push({ ...f, geometry: { type: 'LineString', coordinates: coords[i] }, properties: { ...f.properties, direction: 'both' } })
              }
            } else {
              features.push({ ...f, geometry: { type: 'LineString', coordinates: coords[0] ?? [] }, properties: { ...f.properties, direction: 'both' } })
            }
          } else {
            // Already a LineString — no distinct tur/retur info
            features.push({ ...f, properties: { ...f.properties, direction: 'both' } })
          }
        })
        const data = { ...raw, features }
        registerSource('stb-routes', { type: 'geojson', data })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines = new Set<string>(raw.features.map((f: any) => String(f.properties?.line)).filter(Boolean))
        validLinesRef.current = lines
        // Build sorted suggestions list (unique by line)
        const seen = new Set<string>()
        const sug: StbSuggestion[] = []
        for (const f of raw.features) {
          const line = String(f.properties?.line ?? '')
          if (!line || seen.has(line)) continue
          seen.add(line)
          sug.push({ line, name: String(f.properties?.name ?? f.properties?.long_name ?? '') })
        }
        sug.sort((a, b) => a.line.localeCompare(b.line, undefined, { numeric: true }))
        setAllRoutesSug(sug)
        setSourceLoaded(true)
      })
      .catch(console.error)
  }, [map, ready, registerSource])

  // Sync state → Mapbox layers
  useEffect(() => {
    if (!map || !ready || !sourceLoaded) return
    const prev = prevStbRef.current
    const curr = stb
    const currIds = new Set(curr.map(r => r.id))

    // Remove deleted routes
    prev.forEach(pr => {
      if (!currIds.has(pr.id)) {
        removeRegisteredLayer(`stb-${pr.id}-shadow`)
        removeRegisteredLayer(`stb-${pr.id}-outline`)
        removeRegisteredLayer(`stb-${pr.id}`)
      }
    })

    // Add/update routes
    curr.forEach(r => {
      const p = prev.find(pr => pr.id === r.id)
      const mainId    = `stb-${r.id}`
      const shadowId  = `stb-${r.id}-shadow`
      const outlineId = `stb-${r.id}-outline`
      const filter    = mkFilter(r.line, r.direction)

      const isNew          = !p
      const shadowToggled  = !!p && p.style.shadow    !== r.style.shadow
      const outlineToggled = !!p && p.style.outlineOn !== r.style.outlineOn
      const dirChanged     = !!p && p.direction       !== r.direction

      if (isNew || shadowToggled || outlineToggled || dirChanged) {
        // Full rebuild to maintain correct z-order: shadow → outline → main (top)
        removeRegisteredLayer(shadowId)
        removeRegisteredLayer(outlineId)
        removeRegisteredLayer(mainId)

        if (r.style.shadow) {
          registerLayer({
            id: shadowId, type: 'line', source: 'stb-routes', filter,
            paint: {
              'line-color': r.style.shadowColor,
              'line-width': r.style.width + r.style.shadowBlur / 2,
              'line-blur': r.style.shadowBlur,
              'line-opacity': 0.5,
            },
          } as unknown as mapboxgl.AnyLayer, 'stb-routes')
        }

        if (r.style.outlineOn) {
          registerLayer({
            id: outlineId, type: 'line', source: 'stb-routes', filter,
            paint: {
              'line-color': r.style.outlineColor,
              'line-width': r.style.width + r.style.outlineW * 2,
              'line-opacity': 0.85,
            },
          } as unknown as mapboxgl.AnyLayer, 'stb-routes')
        }

        registerLayer({
          id: mainId, type: 'line', source: 'stb-routes', filter,
          paint: {
            'line-color': r.style.color,
            'line-width': r.style.width,
            'line-opacity': 0.85,
          },
        } as unknown as mapboxgl.AnyLayer, 'stb-routes')
      } else if (p) {
        // Fine-grained paint property updates
        const setPaint = (id: string, prop: string, val: string | number) => {
          if (!map.getLayer(id)) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.setPaintProperty(id, prop as any, val)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mutateRegisteredLayer(id, l => ({ ...l, paint: { ...((l as any).paint ?? {}), [prop]: val } } as mapboxgl.AnyLayer))
        }

        if (p.style.color !== r.style.color) setPaint(mainId, 'line-color', r.style.color)
        if (p.style.width !== r.style.width) {
          setPaint(mainId, 'line-width', r.style.width)
          if (r.style.shadow)    setPaint(shadowId,  'line-width', r.style.width + r.style.shadowBlur / 2)
          if (r.style.outlineOn) setPaint(outlineId, 'line-width', r.style.width + r.style.outlineW * 2)
        }
        if (r.style.shadow) {
          if (p.style.shadowColor !== r.style.shadowColor) setPaint(shadowId, 'line-color', r.style.shadowColor)
          if (p.style.shadowBlur  !== r.style.shadowBlur)  {
            setPaint(shadowId, 'line-blur',  r.style.shadowBlur)
            setPaint(shadowId, 'line-width', r.style.width + r.style.shadowBlur / 2)
          }
        }
        if (r.style.outlineOn) {
          if (p.style.outlineColor !== r.style.outlineColor) setPaint(outlineId, 'line-color', r.style.outlineColor)
          if (p.style.outlineW     !== r.style.outlineW)     setPaint(outlineId, 'line-width', r.style.width + r.style.outlineW * 2)
        }
      }
    })

    prevStbRef.current = JSON.parse(JSON.stringify(curr))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stb), map, ready, sourceLoaded])

  // Debounce STB suggestions
  useEffect(() => {
    const q = sIn.trim()
    if (!q || q.includes(',')) { setStbSuggestions([]); setShowStbSug(false); return }
    const t = setTimeout(() => {
      const lower = q.toLowerCase()
      const sw  = allRoutesSug.filter(r => r.line.toLowerCase().startsWith(lower) || r.name.toLowerCase().startsWith(lower))
      const inc = allRoutesSug.filter(r => !sw.includes(r) && (r.line.toLowerCase().includes(lower) || r.name.toLowerCase().includes(lower)))
      const result = [...sw, ...inc].slice(0, 5)
      if (result.length > 0 && stbContainerRef.current) {
        const rect = stbContainerRef.current.getBoundingClientRect()
        setStbSugPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
      }
      setStbSuggestions(result)
      setShowStbSug(result.length > 0)
    }, 150)
    return () => clearTimeout(t)
  }, [sIn, allRoutesSug])

  const handleAddFromSuggestion = (s: StbSuggestion) => {
    const existingLines = new Set(stb.map(r => r.line))
    if (existingLines.has(s.line)) { setSIn(''); setShowStbSug(false); return }
    const r: StbRoute = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${s.line}`,
      line: s.line,
      style: mkLn(PRESETS[stb.length % PRESETS.length]),
      direction: 'both',
    }
    setStb(p => [...p, r])
    togS(r.id)
    setSIn('')
    setStbSuggestions([])
    setShowStbSug(false)
  }

  const handleAddRoute = () => {
    if (!sIn.trim()) return
    const existingLines = new Set(stb.map(r => r.line))
    const newRoutes: StbRoute[] = []
    sIn.split(',').map(s => s.trim()).filter(Boolean).forEach(token => {
      if (existingLines.has(token)) return
      if (validLinesRef.current.size > 0 && !validLinesRef.current.has(token)) {
        console.warn(`[STB] Line "${token}" not found in stb-all-routes.geojson — layer will render empty`)
      }
      const r: StbRoute = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${token}`,
        line: token,
        style: mkLn(PRESETS[(stb.length + newRoutes.length) % PRESETS.length]),
        direction: 'both',
      }
      newRoutes.push(r)
      existingLines.add(token)
    })
    if (newRoutes.length > 0) {
      setStb(p => [...p, ...newRoutes])
      if (newRoutes.length === 1) togS(newRoutes[0].id)
    }
    setSIn('')
  }

  return (
    <Section title="STB Routes" icon={I.bus()}>
      <div ref={stbContainerRef} style={{marginBottom:10}}>
        <div style={{display:'flex',gap:8}}>
          <div style={{position:'relative',flex:1}}>
            <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.muted}}>{I.search()}</div>
            <input
              value={sIn}
              onChange={e=>setSIn(e.target.value)}
              onKeyDown={e=>{ if (e.key==='Enter') { stbSuggestions.length > 0 && !sIn.includes(',') ? handleAddFromSuggestion(stbSuggestions[0]) : handleAddRoute() } }}
              onFocus={()=>{ if (stbSuggestions.length > 0 && stbContainerRef.current) { const r = stbContainerRef.current.getBoundingClientRect(); setStbSugPos({ top: r.bottom + 4, left: r.left, width: r.width }); setShowStbSug(true) } }}
              onBlur={()=>setTimeout(()=>setShowStbSug(false), 150)}
              placeholder="Line number (e.g. 41, 205)"
              className="s-input"
              style={SI}
            />
          </div>
          <button onClick={handleAddRoute} disabled={!sIn.trim()} className="add-btn" style={!sIn.trim()?ABO:AB}>{I.plus()}</button>
        </div>
        {showStbSug && stbSuggestions.length > 0 && (
          <div style={{position:'fixed',top:stbSugPos.top,left:stbSugPos.left,width:stbSugPos.width,zIndex:99999,background:T.card,border:`1px solid ${T.glassBorder}`,borderRadius:8,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.5)'}}>
            {stbSuggestions.map((s, i) => (
              <button key={s.line} onMouseDown={e=>{ e.preventDefault(); handleAddFromSuggestion(s) }}
                style={{display:'block',width:'100%',padding:'8px 12px',background:'none',border:'none',borderBottom:i < stbSuggestions.length - 1 ? `1px solid ${T.glassBorder}` : 'none',cursor:'pointer',textAlign:'left',color:T.fg,fontSize:12}}
                className="sug-item"
              >
                <span style={{fontWeight:700,color:T.primary,marginRight:6}}>{s.line}</span>
                <span style={{color:T.muted,fontSize:11}}>{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {stb.map(r=>(
          <Accordion key={r.id} name={`Line ${r.line}`} isOpen={openS.has(r.id)} onToggle={()=>togS(r.id)} onRemove={()=>setStb(p=>p.filter(x=>x.id!==r.id))}>
            <LineCtrl s={r.style} onChange={s=>setStb(p=>p.map(x=>x.id===r.id?{...x,style:s}:x))}/>
            <div style={{marginTop:6}}>
              <span style={{fontSize:10,color:T.muted,display:'block',marginBottom:2}}>Direction</span>
              <DirGroup value={r.direction} onChange={d=>setStb(p=>p.map(x=>x.id===r.id?{...x,direction:d}:x))}/>
            </div>
          </Accordion>
        ))}
        {stb.length===0 && <p style={{fontSize:11,color:T.muted,textAlign:'center',padding:'8px 0'}}>No active routes.</p>}
      </div>
    </Section>
  )
}
