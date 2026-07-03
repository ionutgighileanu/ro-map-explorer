"use client"

import { useState, useEffect, useRef } from 'react'
import { T, SI, AB, ABO, PRESETS, I, mkLn } from '@/components/ui-constants'
import type { LineStyle } from '@/components/ui-constants'
import { Section, Accordion, LineCtrl, useToggleSet } from '@/components/shared-controls'
import { useMap } from '@/context/map-context'
import { useMapLayers } from '@/context/map-layers'
import type mapboxgl from 'mapbox-gl'

interface Road {
  id: string
  name: string
  style: LineStyle
}

const isRoadId = (v: string) => {
  if (!v || v.length > 20) return false
  if (!/[A-Za-z]/.test(v)) return false
  if (v.includes(' ') && !/^E\s+\d/.test(v)) return false
  return true
}

const toEndKey = (p: number[]) => `${p[0]},${p[1]}`

function stitchLineStrings(lines: number[][][]): number[][][] {
  if (lines.length === 0) return []
  if (lines.length === 1) return [lines[0]]

  const used = new Uint8Array(lines.length)

  // Endpoint index: coord_key → segment indices
  const index = new Map<string, number[]>()
  const addIdx = (k: string, i: number) => {
    let a = index.get(k); if (!a) { a = []; index.set(k, a) }; a.push(i)
  }
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i]
    const sk = toEndKey(s[0])
    const ek = toEndKey(s[s.length - 1])
    addIdx(sk, i)
    if (sk !== ek) addIdx(ek, i)
  }

  // Find and consume an unused segment touching ptKey.
  // forward=true  → returns coords to append to tail (ptKey removed from start)
  // forward=false → returns coords to prepend before head (ptKey removed from end)
  const consume = (ptKey: string, forward: boolean): number[][] | null => {
    const cands = index.get(ptKey)
    if (!cands) return null
    for (const idx of cands) {
      if (used[idx]) continue
      used[idx] = 1
      const seg = lines[idx]
      const startsHere = toEndKey(seg[0]) === ptKey
      if (forward) {
        return startsHere ? seg.slice(1) : seg.slice(0, -1).reverse()
      } else {
        return startsHere ? seg.slice(1).reverse() : seg.slice(0, -1)
      }
    }
    return null
  }

  const chains: number[][][] = []

  for (let si = 0; si < lines.length; si++) {
    if (used[si]) continue
    used[si] = 1

    const tail: number[][] = lines[si].slice()

    // Grow forward from tail's end
    for (;;) {
      const ext = consume(toEndKey(tail[tail.length - 1]), true)
      if (!ext) break
      for (const pt of ext) tail.push(pt)
    }

    // Grow backward from tail's start — collect in order, reverse when assembling
    const back: number[][][] = []
    for (;;) {
      const hk = back.length === 0 ? toEndKey(tail[0]) : toEndKey(back[back.length - 1][0])
      const ext = consume(hk, false)
      if (!ext) break
      back.push(ext)
    }

    // Assemble: back segments in reverse order, then tail
    const chain: number[][] = []
    for (let i = back.length - 1; i >= 0; i--) for (const pt of back[i]) chain.push(pt)
    for (const pt of tail) chain.push(pt)

    chains.push(chain)
  }

  return chains
}

export default function InfrastructureModule() {
  const [rdIn, setRdIn] = useState('')
  const [roads, setRoads] = useState<Road[]>([])
  const [openR, togR] = useToggleSet()
  const [sourceLoaded, setSourceLoaded] = useState(false)
  const [allRoads, setAllRoads] = useState<string[]>([])
  const [rdSuggestions, setRdSuggestions] = useState<string[]>([])
  const [showRdSug, setShowRdSug] = useState(false)
  const [rdSugPos, setRdSugPos] = useState({ top: 0, left: 0, width: 0 })
  const rdContainerRef = useRef<HTMLDivElement>(null)
  const prevRoadsRef = useRef<Road[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featuresRef = useRef<any[]>([])
  const [debug, setDebug] = useState<{ sourceLoaded: boolean; totalFeatures: number; lastAdd: string; filterMatches: number } | null>(null)

  const { map, ready } = useMap()
  const { registerSource, registerLayer, removeRegisteredLayer, mutateRegisteredLayer } = useMapLayers(map, ready)

  // Fetch GeoJSON, stitch fragments per road, register shared source
  useEffect(() => {
    if (!map || !ready) return
    let cancelled = false

    ;(async () => {
      try {
        const response = await fetch('/data/drumuri%20Ro.geojson')
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const text = await response.text()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = JSON.parse(text)
        if (cancelled) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawFeatures: any[] = data.features ?? []

        // Build unique sorted road ID list for autosuggest (from raw features)
        const seen = new Set<string>()
        const ids: string[] = []
        for (const f of rawFeatures) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p: any = f.properties
          for (const key of ['ref', 'nat_ref', 'int_ref']) {
            const val = p?.[key]
            if (!val) continue
            for (const part of String(val).split(';')) {
              const trimmed = part.trim()
              if (isRoadId(trimmed) && !seen.has(trimmed)) { seen.add(trimmed); ids.push(trimmed) }
            }
          }
        }
        ids.sort()
        setAllRoads(ids)

        // Group features by road key (first non-null ref property)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groups = new Map<string, any[]>()
        for (const f of rawFeatures) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p: any = f.properties ?? {}
          const key: string = p.ref || p.nat_ref || p.int_ref || `__noref_${p['@id'] ?? Math.random()}`
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(f)
        }

        const groupEntries = Array.from(groups.entries())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stitchedFeatures: any[] = []
        const BATCH = 20

        setDebug({ sourceLoaded: false, totalFeatures: 0, lastAdd: `Stitching: 0/${groupEntries.length}`, filterMatches: 0 })

        const processBatch = (start: number) => {
          if (cancelled) return
          const end = Math.min(start + BATCH, groupEntries.length)

          for (let i = start; i < end; i++) {
            const [, gFeatures] = groupEntries[i]
            const lineStrings: number[][][] = []
            for (const f of gFeatures) {
              if (f.geometry?.type === 'LineString') lineStrings.push(f.geometry.coordinates)
              else if (f.geometry?.type === 'MultiLineString') lineStrings.push(...f.geometry.coordinates)
            }
            if (lineStrings.length === 0) continue

            const chains = stitchLineStrings(lineStrings)
            stitchedFeatures.push({
              type: 'Feature',
              properties: gFeatures[0].properties,
              geometry: { type: 'MultiLineString', coordinates: chains },
            })
          }

          if (end < groupEntries.length) {
            setDebug(prev => ({
              ...(prev ?? { sourceLoaded: false, filterMatches: 0 }),
              totalFeatures: 0,
              lastAdd: `Stitching: ${end}/${groupEntries.length}`,
            }))
            setTimeout(() => processBatch(end), 0)
          } else {
            if (cancelled) return
            featuresRef.current = stitchedFeatures
            registerSource('roads-ro', { type: 'geojson', data: { type: 'FeatureCollection', features: stitchedFeatures } })
            setSourceLoaded(true)
            setDebug(prev => ({
              ...(prev ?? { lastAdd: '', filterMatches: 0 }),
              sourceLoaded: true,
              totalFeatures: stitchedFeatures.length,
              lastAdd: prev?.lastAdd?.startsWith('Stitching') ? `Stitched ${stitchedFeatures.length} groups` : (prev?.lastAdd ?? ''),
            }))
          }
        }

        processBatch(0)
      } catch (err: unknown) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Failed to fetch drumuri Ro.geojson:', err)
        setDebug(prev => ({ ...(prev ?? { filterMatches: 0 }), sourceLoaded: false, totalFeatures: -1, lastAdd: 'FETCH ERROR: ' + msg }))
      }
    })()

    return () => { cancelled = true }
  }, [map, ready, registerSource])

  // Debounce road autosuggest
  useEffect(() => {
    const q = rdIn.trim()
    if (!q || q.includes(',')) { setRdSuggestions([]); setShowRdSug(false); return }
    const t = setTimeout(() => {
      const upper = q.toUpperCase()
      const sw = allRoads.filter(r => r.toUpperCase().startsWith(upper))
      const inc = allRoads.filter(r => !r.toUpperCase().startsWith(upper) && r.toUpperCase().includes(upper))
      const result = [...sw, ...inc].slice(0, 5)
      if (result.length > 0 && rdContainerRef.current) {
        const r = rdContainerRef.current.getBoundingClientRect()
        setRdSugPos({ top: r.bottom + 4, left: r.left, width: r.width })
      }
      setRdSuggestions(result)
      setShowRdSug(result.length > 0)
    }, 150)
    return () => clearTimeout(t)
  }, [rdIn, allRoads])

  // Sync state → Mapbox layers
  useEffect(() => {
    if (!map || !ready || !sourceLoaded) return

    const prev = prevRoadsRef.current
    const curr = roads
    const currIds = new Set(curr.map(r => r.id))

    // Remove deleted roads
    prev.forEach(pr => {
      if (!currIds.has(pr.id)) {
        removeRegisteredLayer(`road-${pr.id}-shadow`)
        removeRegisteredLayer(`road-${pr.id}-outline`)
        removeRegisteredLayer(`road-${pr.id}`)
      }
    })

    curr.forEach(r => {
      const p = prev.find(pr => pr.id === r.id)
      const mainId    = `road-${r.id}`
      const shadowId  = `road-${r.id}-shadow`
      const outlineId = `road-${r.id}-outline`

      // Match exact în all_refs (format ",REF1,REF2,"); acceptă și "E81" → "E 81"
      const nameUpper = r.name.toUpperCase()
      const intRefUpper = nameUpper.replace(/^(E)(\d)/, '$1 $2')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allRefsExpr: any[] = ['string', ['coalesce', ['get', 'all_refs'], '']]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filter: any[] = ['any',
        ['in', `,${nameUpper},`,   allRefsExpr],
        ['in', `,${intRefUpper},`, allRefsExpr],
      ]

      const isNew          = !p
      const shadowToggled  = !!p && p.style.shadow    !== r.style.shadow
      const outlineToggled = !!p && p.style.outlineOn !== r.style.outlineOn

      if (isNew || shadowToggled || outlineToggled) {
        console.log('Adding road:', r.name, 'filter:', JSON.stringify(filter))
        removeRegisteredLayer(shadowId)
        removeRegisteredLayer(outlineId)
        removeRegisteredLayer(mainId)

        if (r.style.shadow) {
          registerLayer({
            id: shadowId, type: 'line', source: 'roads-ro', filter,
            paint: {
              'line-color':   r.style.shadowColor,
              'line-width':   r.style.width + r.style.shadowBlur / 2,
              'line-blur':    r.style.shadowBlur,
              'line-opacity': 0.5,
            },
          } as unknown as mapboxgl.AnyLayer, 'roads-ro')
        }

        if (r.style.outlineOn) {
          registerLayer({
            id: outlineId, type: 'line', source: 'roads-ro', filter,
            paint: {
              'line-color':   r.style.outlineColor,
              'line-width':   r.style.width + r.style.outlineW * 2,
              'line-opacity': 0.85,
            },
          } as unknown as mapboxgl.AnyLayer, 'roads-ro')
        }

        registerLayer({
          id: mainId, type: 'line', source: 'roads-ro', filter,
          paint: {
            'line-color':   r.style.color,
            'line-width':   r.style.width,
            'line-opacity': 0.85,
          },
        } as unknown as mapboxgl.AnyLayer, 'roads-ro')

        console.log('Layer added:', mainId, 'exists:', !!map.getLayer(mainId))
        if (r.style.shadow)    console.log('Layer added:', shadowId,  'exists:', !!map.getLayer(shadowId))
        if (r.style.outlineOn) console.log('Layer added:', outlineId, 'exists:', !!map.getLayer(outlineId))
        if (r.style.shadow    && map.getLayer(shadowId))  map.moveLayer(shadowId)
        if (r.style.outlineOn && map.getLayer(outlineId)) map.moveLayer(outlineId)
        if (map.getLayer(mainId)) map.moveLayer(mainId)
      } else if (p) {
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
          if (p.style.shadowBlur  !== r.style.shadowBlur) {
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

    prevRoadsRef.current = JSON.parse(JSON.stringify(curr))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(roads), map, ready, sourceLoaded])

  const doAddRoad = (raw: string) => {
    if (!raw.trim()) return
    const existingNamesLower = new Set(roads.map(r => r.name.toLowerCase()))
    const newRoads: Road[] = []
    let firstToken = true
    raw.split(',').map(s => {
      const trimmed = s.trim()
      // Preserve canonical case from GeoJSON (e.g. DEx12, not DEX12)
      const canonical = allRoads.find(r => r.toLowerCase() === trimmed.toLowerCase())
      return canonical || trimmed.toUpperCase()
    }).filter(Boolean).forEach((token, i) => {
      if (existingNamesLower.has(token.toLowerCase())) return
      if (firstToken) {
        firstToken = false
        const tu = token.toUpperCase()
        const intRefUpper = tu.replace(/^(E)(\d)/, '$1 $2')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matches = featuresRef.current.filter((f: any) => {
          const allRefs = (f.properties?.all_refs || '')
          return allRefs.includes(`,${tu},`) || allRefs.includes(`,${intRefUpper},`)
        })
        setDebug(prev => ({ ...(prev ?? { sourceLoaded: false, totalFeatures: 0 }), lastAdd: token, filterMatches: matches.length }))
      }
      newRoads.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${token}`,
        name: token,
        style: { ...mkLn(PRESETS[(roads.length + i) % PRESETS.length]), width: 6 },
      })
      existingNamesLower.add(token.toLowerCase())
    })
    if (newRoads.length > 0) {
      setRoads(p => [...p, ...newRoads])
      if (newRoads.length === 1) togR(newRoads[0].id)
    }
  }

  const handleAddRoad = () => {
    doAddRoad(rdIn)
    setRdIn('')
  }

  const handleAddFromSuggestion = (val: string) => {
    doAddRoad(val)
    setRdIn('')
    setRdSuggestions([])
    setShowRdSug(false)
  }

  return (
    <Section title="Infrastructure" icon={I.construction()}>
      <div ref={rdContainerRef} style={{marginBottom:6}}>
        <div style={{display:'flex',gap:8}}>
          <div style={{position:'relative',flex:1}}>
            <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.muted}}>{I.search()}</div>
            <input
              value={rdIn}
              onChange={e=>setRdIn(e.target.value)}
              onKeyDown={e=>{ if (e.key==='Enter') handleAddRoad() }}
              onFocus={()=>{
                if (rdSuggestions.length > 0 && rdContainerRef.current) {
                  const r = rdContainerRef.current.getBoundingClientRect()
                  setRdSugPos({ top: r.bottom + 4, left: r.left, width: r.width })
                  setShowRdSug(true)
                }
              }}
              onBlur={()=>setTimeout(()=>setShowRdSug(false), 150)}
              placeholder="Road ID (A, DN, E, DJ...)"
              className="s-input"
              style={SI}
            />
          </div>
          <button
            onClick={handleAddRoad}
            disabled={!rdIn.trim()}
            className="add-btn"
            style={!rdIn.trim() ? ABO : AB}
          >
            {I.plus()}
          </button>
        </div>
        {showRdSug && rdSuggestions.length > 0 && (
          <div style={{position:'fixed',top:rdSugPos.top,left:rdSugPos.left,width:rdSugPos.width,zIndex:99999,background:T.card,border:`1px solid ${T.glassBorder}`,borderRadius:8,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.5)'}}>
            {rdSuggestions.map((s, i) => (
              <button key={s} onMouseDown={e=>{ e.preventDefault(); handleAddFromSuggestion(s) }}
                style={{display:'block',width:'100%',padding:'8px 12px',background:'none',border:'none',borderBottom:i < rdSuggestions.length - 1 ? `1px solid ${T.glassBorder}` : 'none',cursor:'pointer',textAlign:'left',color:T.fg,fontSize:12}}
                className="sug-item"
              >{s}</button>
            ))}
          </div>
        )}
      </div>

      {debug && (
        <div style={{fontSize:10,fontFamily:'monospace',background:'rgba(255,255,255,0.04)',padding:6,borderRadius:4,marginBottom:8,lineHeight:1.7}}>
          <div>Source loaded: <span style={{color: debug.sourceLoaded ? '#4ade80' : '#f87171'}}>{String(debug.sourceLoaded)}</span></div>
          <div>Features in source: <span style={{color: debug.totalFeatures > 0 ? '#4ade80' : '#f87171'}}>{debug.totalFeatures}</span></div>
          <div>Last add: <span style={debug.lastAdd?.startsWith('FETCH ERROR') ? {color:'#f87171'} : {}}>{debug.lastAdd || '-'}</span></div>
          <div>Filter matches: <span style={{color: debug.filterMatches > 0 ? '#4ade80' : '#f87171'}}>{debug.filterMatches}</span></div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {roads.map(r => (
          <Accordion
            key={r.id}
            name={r.name}
            isOpen={openR.has(r.id)}
            onToggle={()=>togR(r.id)}
            onRemove={()=>setRoads(p=>p.filter(x=>x.id!==r.id))}
          >
            <LineCtrl s={r.style} onChange={s=>setRoads(p=>p.map(x=>x.id===r.id?{...x,style:s}:x))}/>
          </Accordion>
        ))}
        {roads.length===0 && (
          <p style={{fontSize:11,color:T.muted,textAlign:'center',padding:'8px 0'}}>No highlighted roads.</p>
        )}
      </div>
    </Section>
  )
}
