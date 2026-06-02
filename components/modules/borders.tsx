"use client"

import { useState, useEffect, useRef } from 'react'
import { T, IB, AB, ABO, PRESETS, JUDETE, I } from '@/components/ui-constants'
import { Section, Accordion, Toggle, ShapeFillCtrl, mkFill, mkShape, useToggleSet } from '@/components/shared-controls'
import type { FillConfig, ShapeConfig } from '@/components/shared-controls'
import ColorPicker from '@/components/color-picker'
import { useMap } from '@/context/map-context'
import { useMapLayers } from '@/context/map-layers'
import type mapboxgl from 'mapbox-gl'

interface Country {
  id: string
  name: string
  iso3: string
  filled: FillConfig
  shape: ShapeConfig
}

interface Judet {
  id: string
  name: string
  filled: FillConfig
  shape: ShapeConfig
}

interface Sector {
  id: string
  name: string
  enabled: boolean
  filled: FillConfig
  shape: ShapeConfig
}

interface BucFull {
  enabled: boolean
  filled: FillConfig
  shape: ShapeConfig
}

interface CountrySuggestion {
  name: string
  iso3: string
}

const SECTORS = ['Sector 1','Sector 2','Sector 3','Sector 4','Sector 5','Sector 6']

interface RegionDef { key: string; label: string; file: string; fill: string; line: string; nameProp: string }
const REGION_DEFS: RegionDef[] = [
  { key: 'regiuni_istorice',        label: 'Regiuni istorice',          file: '/data/regiuni_istorice.geojson',        fill: '#4e9af1', line: '#1f5fa8', nameProp: 'nume' },
  { key: 'regiuni_istorice_extins', label: 'Regiuni istorice (extins)', file: '/data/regiuni_istorice_extins.geojson', fill: '#f1a84e', line: '#a86a1f', nameProp: 'nume' },
  { key: 'macro_regiuni',           label: 'Macro regiuni',             file: '/data/macro%20regiuni.geojson',         fill: '#4ef1a0', line: '#1fa868', nameProp: 'name' },
  { key: 'regiuni_de_dezvoltare',   label: 'Regiuni de dezvoltare',     file: '/data/regiuni%20de%20dezvoltare.geojson', fill: '#f14e6e', line: '#a81f3e', nameProp: 'name' },
]

interface RegionFeature { name: string; enabled: boolean; filled: FillConfig; shape: ShapeConfig }
interface RegionGroupStyle { fillCol: string; shapeEnabled: boolean; shapeCol: string; shapeWidth: number }
// Transparency is carried by the color's alpha (like Countries/Jud.RO); fill-opacity stays 1.
const hexToRgba = (hex: string, a: number): string => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})` }
const mkRegionFill = (hex: string): FillConfig => ({ enabled: true, color: hexToRgba(hex, 0.3), opacity: 1 })
const mkRegionShape = (color: string): ShapeConfig => ({ enabled: true, color, width: 1.5 })

// eslint-disable-next-line no-misleading-character-class
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setPaintAndSync(map: mapboxgl.Map, mutate: (id: string, upd: (l: mapboxgl.AnyLayer) => mapboxgl.AnyLayer) => void, id: string, prop: string, value: string | number) {
  if (!map.getLayer(id)) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map.setPaintProperty(id, prop as any, value)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutate(id, l => ({ ...l, paint: { ...((l as any).paint ?? {}), [prop]: value } } as mapboxgl.AnyLayer))
}

export default function BordersModule() {
  const { map, ready } = useMap()
  const { registerSource, registerLayer, removeRegisteredLayer, mutateRegisteredLayer } = useMapLayers(map, ready)

  // Countries
  const [cIn, setCIn] = useState('')
  const [countries, setCountries] = useState<Country[]>([])
  const [openC, togC] = useToggleSet()
  const [openBCountries, setOpenBCountries] = useState(false)
  const [allFeatures, setAllFeatures] = useState<{ properties: { name: string; iso3: string } }[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geojsonData, setGeojsonData] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<CountrySuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cSugPos, setCSugPos] = useState({ top: 0, left: 0, width: 0 })
  const cInContainerRef = useRef<HTMLDivElement>(null)
  const prevCountriesRef = useRef<Country[]>([])

  // Judete
  const [selJ, setSelJ] = useState('')
  const [jCol, setJCol] = useState('#76ff03')
  const [jShapeCol, setJShapeCol] = useState('#76ff03')
  const [jShapeWidth, setJShapeWidth] = useState(2)
  const [jShapeEnabled, setJShapeEnabled] = useState(false)
  const [judete, setJudete] = useState<Judet[]>([])
  const [openBJudete, setOpenBJudete] = useState(false)
  const prevJudeteRef = useRef<Judet[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [countiesGeojson, setCountiesGeojson] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countiesGeojsonRef = useRef<any>(null)

  // Bucharest
  const [bucFull, setBucFull] = useState<BucFull>({
    enabled: false,
    filled: mkFill('#00e5ff'),
    shape: mkShape('#00e5ff'),
  })
  const [openSec, setOpenSec] = useState(false)
  const [sectors, setSectors] = useState<Sector[]>(
    SECTORS.map((s, i) => ({
      id: `sec${i + 1}`,
      name: s,
      enabled: false,
      filled: mkFill(PRESETS[i % PRESETS.length]),
      shape: mkShape(PRESETS[i % PRESETS.length]),
    }))
  )
  const [openBBuc, setOpenBBuc] = useState(false)
  const [secCol, setSecCol] = useState('#76ff03')
  const prevBucFullRef = useRef<BucFull | null>(null)
  const prevSectorsRef = useRef<Sector[]>([])

  // Regions
  const [regions, setRegions] = useState<Record<string, boolean>>(
    Object.fromEntries(REGION_DEFS.map(d => [d.key, false]))
  )
  const [regionFeats, setRegionFeats] = useState<Record<string, RegionFeature[]>>({})
  const [regionGroup, setRegionGroup] = useState<Record<string, RegionGroupStyle>>(
    Object.fromEntries(REGION_DEFS.map(d => [d.key, { fillCol: hexToRgba(d.fill, 0.3), shapeEnabled: true, shapeCol: d.line, shapeWidth: 1.5 }]))
  )
  const [openRegions, setOpenRegions] = useState(false)
  const [openReg, togReg] = useToggleSet()
  const prevRegionsRef = useRef<Record<string, boolean>>({})
  const prevFeatsRef = useRef<Record<string, RegionFeature[]>>({})

  // Load region features (name + per-feature editable style)
  useEffect(() => {
    REGION_DEFS.forEach(def => {
      fetch(def.file)
        .then(r => r.json())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((j: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const names: string[] = (j.features ?? []).map((f: any) => f.properties?.[def.nameProp]).filter(Boolean)
          const uniq = Array.from(new Set(names))
          setRegionFeats(p => p[def.key] ? p : {
            ...p,
            [def.key]: uniq.map(n => ({ name: n, enabled: true, filled: mkRegionFill(def.fill), shape: mkRegionShape(def.line) })),
          })
        })
        .catch(console.error)
    })
  }, [])

  // Fetch all-countries.geojson once
  useEffect(() => {
    fetch('/data/all-countries.geojson')
      .then(r => r.json())
      .then(data => {
        setGeojsonData(data)
        setAllFeatures(data.features || [])
      })
      .catch(console.error)
  }, [])

  // Fetch romania-counties.geojson, inject county_ascii, register source
  useEffect(() => {
    fetch('/data/romania-counties.geojson')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data: any) => {
        const features = data.features ?? []
        const processed = {
          ...data,
          features: features.map((f: any) => ({
            ...f,
            properties: {
              ...f.properties,
              county_ascii: normalize(f.properties?.name ?? '').toLowerCase(),
            },
          })),
        }
        setCountiesGeojson(processed)
        countiesGeojsonRef.current = processed
      })
      .catch(console.error)
  }, [])

  // Register non-counties sources immediately
  useEffect(() => {
    if (!map || !ready) return
    registerSource('bucuresti-full', { type: 'geojson', data: '/data/bucuresti-full.geojson' })
    registerSource('bucuresti-sectors', { type: 'geojson', data: '/data/bucuresti-sectors.geojson' })
  }, [map, ready, registerSource])

  // Register counties source once processed data is ready
  useEffect(() => {
    if (!map || !ready || !countiesGeojson) return
    registerSource('romania-counties', { type: 'geojson', data: countiesGeojson })
  }, [map, ready, countiesGeojson, registerSource])

  // Register countries source when data is loaded
  useEffect(() => {
    if (!map || !ready || !geojsonData) return
    registerSource('countries', { type: 'geojson', data: geojsonData })
  }, [map, ready, geojsonData, registerSource])

  // Debounce country suggestions
  useEffect(() => {
    const q = cIn.trim()
    if (!q) { setSuggestions([]); setShowSuggestions(false); return }
    const t = setTimeout(() => {
      const lower = q.toLowerCase()
      const sw = allFeatures.filter(f => f.properties?.name?.toLowerCase().startsWith(lower))
      const inc = allFeatures.filter(f =>
        f.properties?.name && !f.properties.name.toLowerCase().startsWith(lower) && f.properties.name.toLowerCase().includes(lower)
      )
      const result = [...sw, ...inc].slice(0, 5).map(f => ({ name: f.properties.name, iso3: f.properties.iso3 }))
      if (result.length > 0 && cInContainerRef.current) {
        const r = cInContainerRef.current.getBoundingClientRect()
        setCSugPos({ top: r.bottom + 4, left: r.left, width: r.width })
      }
      setSuggestions(result)
      setShowSuggestions(result.length > 0)
    }, 150)
    return () => clearTimeout(t)
  }, [cIn, allFeatures])

  // Sync countries → map
  useEffect(() => {
    if (!map || !ready) return
    const prev = prevCountriesRef.current
    const curr = countries
    const currIds = new Set(curr.map(c => c.id))

    prev.forEach(pc => {
      if (!currIds.has(pc.id)) {
        removeRegisteredLayer(`country-${pc.iso3}-fill`)
        removeRegisteredLayer(`country-${pc.iso3}-line`)
      }
    })

    curr.forEach(c => {
      const p = prev.find(pc => pc.id === c.id)
      const fillId = `country-${c.iso3}-fill`
      const lineId = `country-${c.iso3}-line`
      const fillWas = p?.filled.enabled ?? false
      const fillIs = c.filled.enabled
      const lineWas = p?.shape.enabled ?? false
      const lineIs = c.shape.enabled

      if (fillIs && !fillWas) {
        registerLayer({ id: fillId, type: 'fill', source: 'countries', filter: ['==', ['get', 'iso3'], c.iso3], paint: { 'fill-color': c.filled.color, 'fill-opacity': c.filled.opacity } } as unknown as mapboxgl.AnyLayer, 'countries')
      } else if (!fillIs && fillWas) {
        removeRegisteredLayer(fillId)
      } else if (fillIs && p) {
        if (p.filled.color !== c.filled.color) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-color', c.filled.color)
        if (p.filled.opacity !== c.filled.opacity) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-opacity', c.filled.opacity)
      }

      if (lineIs && !lineWas) {
        registerLayer({ id: lineId, type: 'line', source: 'countries', filter: ['==', ['get', 'iso3'], c.iso3], paint: { 'line-color': c.shape.color, 'line-width': c.shape.width } } as unknown as mapboxgl.AnyLayer, 'countries')
      } else if (!lineIs && lineWas) {
        removeRegisteredLayer(lineId)
      } else if (lineIs && p) {
        if (p.shape.color !== c.shape.color) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-color', c.shape.color)
        if (p.shape.width !== c.shape.width) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-width', c.shape.width)
      }
    })

    prevCountriesRef.current = JSON.parse(JSON.stringify(curr))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(countries), map, ready])

  // Sync judete → map (filter on county_ascii injected at fetch time)
  useEffect(() => {
    if (!map || !ready) return
    const prev = prevJudeteRef.current
    const curr = judete
    const currIds = new Set(curr.map(j => j.id))

    prev.forEach(pj => {
      if (!currIds.has(pj.id)) {
        removeRegisteredLayer(`judet-${pj.id}-fill`)
        removeRegisteredLayer(`judet-${pj.id}-line`)
      }
    })

    curr.forEach(j => {
      const p = prev.find(pj => pj.id === j.id)
      const fillId = `judet-${j.id}-fill`
      const lineId = `judet-${j.id}-line`
      const asciiLower = normalize(j.name).toLowerCase()
      const fillWas = p?.filled.enabled ?? false
      const fillIs = j.filled.enabled
      const lineWas = p?.shape.enabled ?? false
      const lineIs = j.shape.enabled

      if ((fillIs && !fillWas) || (lineIs && !lineWas)) {
        const gj = countiesGeojsonRef.current
        const matchCount = gj
          ? gj.features.filter((f: any) => f.properties?.county_ascii === asciiLower).length
          : -1
        console.log(`[Jud.RO] Add judet: "${j.name}" | normalized: "${asciiLower}" | features matched: ${matchCount} | fillId: ${fillId}`)
      }

      if (fillIs && !fillWas) {
        registerLayer({ id: fillId, type: 'fill', source: 'romania-counties', filter: ['==', ['get', 'county_ascii'], asciiLower], paint: { 'fill-color': j.filled.color, 'fill-opacity': j.filled.opacity } } as unknown as mapboxgl.AnyLayer, 'romania-counties')
      } else if (!fillIs && fillWas) {
        removeRegisteredLayer(fillId)
      } else if (fillIs && p) {
        if (p.filled.color !== j.filled.color) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-color', j.filled.color)
        if (p.filled.opacity !== j.filled.opacity) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-opacity', j.filled.opacity)
      }

      if (lineIs && !lineWas) {
        registerLayer({ id: lineId, type: 'line', source: 'romania-counties', filter: ['==', ['get', 'county_ascii'], asciiLower], paint: { 'line-color': j.shape.color, 'line-width': j.shape.width } } as unknown as mapboxgl.AnyLayer, 'romania-counties')
      } else if (!lineIs && lineWas) {
        removeRegisteredLayer(lineId)
      } else if (lineIs && p) {
        if (p.shape.color !== j.shape.color) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-color', j.shape.color)
        if (p.shape.width !== j.shape.width) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-width', j.shape.width)
      }
    })

    prevJudeteRef.current = JSON.parse(JSON.stringify(curr))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(judete), map, ready])

  // Sync bucFull → map
  useEffect(() => {
    if (!map || !ready) return
    const prev = prevBucFullRef.current
    const curr = bucFull
    const fillId = 'buc-full-fill'
    const lineId = 'buc-full-line'
    const fillWas = (prev?.enabled ?? false) && (prev?.filled.enabled ?? false)
    const fillIs = curr.enabled && curr.filled.enabled
    const lineWas = (prev?.enabled ?? false) && (prev?.shape.enabled ?? false)
    const lineIs = curr.enabled && curr.shape.enabled

    if (fillIs && !fillWas) {
      registerLayer({ id: fillId, type: 'fill', source: 'bucuresti-full', paint: { 'fill-color': curr.filled.color, 'fill-opacity': curr.filled.opacity } } as unknown as mapboxgl.AnyLayer, 'bucuresti-full')
    } else if (!fillIs && fillWas) {
      removeRegisteredLayer(fillId)
    } else if (fillIs && prev) {
      if (prev.filled.color !== curr.filled.color) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-color', curr.filled.color)
      if (prev.filled.opacity !== curr.filled.opacity) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-opacity', curr.filled.opacity)
    }

    if (lineIs && !lineWas) {
      registerLayer({ id: lineId, type: 'line', source: 'bucuresti-full', paint: { 'line-color': curr.shape.color, 'line-width': curr.shape.width } } as unknown as mapboxgl.AnyLayer, 'bucuresti-full')
    } else if (!lineIs && lineWas) {
      removeRegisteredLayer(lineId)
    } else if (lineIs && prev) {
      if (prev.shape.color !== curr.shape.color) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-color', curr.shape.color)
      if (prev.shape.width !== curr.shape.width) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-width', curr.shape.width)
    }

    prevBucFullRef.current = curr
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(bucFull), map, ready])

  // Sync sectors → map
  useEffect(() => {
    if (!map || !ready) return
    const prev = prevSectorsRef.current
    const curr = sectors

    curr.forEach(s => {
      const p = prev.find(ps => ps.id === s.id)
      const fillId = `sector-${s.id}-fill`
      const lineId = `sector-${s.id}-line`
      const sectorNum = parseInt(s.name.split(' ')[1])
      const fillWas = (p?.enabled ?? false) && (p?.filled.enabled ?? false)
      const fillIs = s.enabled && s.filled.enabled
      const lineWas = (p?.enabled ?? false) && (p?.shape.enabled ?? false)
      const lineIs = s.enabled && s.shape.enabled

      if (fillIs && !fillWas) {
        registerLayer({ id: fillId, type: 'fill', source: 'bucuresti-sectors', filter: ['==', ['get', 'sectorNumber'], sectorNum], paint: { 'fill-color': s.filled.color, 'fill-opacity': s.filled.opacity } } as unknown as mapboxgl.AnyLayer, 'bucuresti-sectors')
      } else if (!fillIs && fillWas) {
        removeRegisteredLayer(fillId)
      } else if (fillIs && p) {
        if (p.filled.color !== s.filled.color) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-color', s.filled.color)
        if (p.filled.opacity !== s.filled.opacity) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-opacity', s.filled.opacity)
      }

      if (lineIs && !lineWas) {
        registerLayer({ id: lineId, type: 'line', source: 'bucuresti-sectors', filter: ['==', ['get', 'sectorNumber'], sectorNum], paint: { 'line-color': s.shape.color, 'line-width': s.shape.width } } as unknown as mapboxgl.AnyLayer, 'bucuresti-sectors')
      } else if (!lineIs && lineWas) {
        removeRegisteredLayer(lineId)
      } else if (lineIs && p) {
        if (p.shape.color !== s.shape.color) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-color', s.shape.color)
        if (p.shape.width !== s.shape.width) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-width', s.shape.width)
      }
    })

    prevSectorsRef.current = JSON.parse(JSON.stringify(curr))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sectors), map, ready])

  // Sync regions → map (one fill + one line layer per feature, filtered by name — like Jud.RO)
  useEffect(() => {
    if (!map || !ready) return
    const prevRegions = prevRegionsRef.current
    const prevFeats = prevFeatsRef.current

    REGION_DEFS.forEach(def => {
      const key = def.key
      const srcId = `region-${key}`
      const masterIs = !!regions[key]
      const masterWas = !!prevRegions[key]
      const feats = regionFeats[key] ?? []
      const pFeats = prevFeats[key] ?? []

      if (masterIs && feats.length) registerSource(srcId, { type: 'geojson', data: def.file })

      feats.forEach((f, i) => {
        const pf = pFeats[i]
        const fillId = `${srcId}-${i}-fill`
        const lineId = `${srcId}-${i}-line`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: any = ['==', ['get', def.nameProp], f.name]

        const fillIs = masterIs && f.enabled && f.filled.enabled
        const fillWas = masterWas && (pf?.enabled ?? false) && (pf?.filled.enabled ?? false)
        const lineIs = masterIs && f.enabled && f.shape.enabled
        const lineWas = masterWas && (pf?.enabled ?? false) && (pf?.shape.enabled ?? false)

        if (fillIs && !fillWas) {
          registerLayer({ id: fillId, type: 'fill', source: srcId, filter, paint: { 'fill-color': f.filled.color, 'fill-opacity': f.filled.opacity } } as unknown as mapboxgl.AnyLayer, srcId)
        } else if (!fillIs && fillWas) {
          removeRegisteredLayer(fillId)
        } else if (fillIs && pf) {
          if (pf.filled.color !== f.filled.color) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-color', f.filled.color)
          if (pf.filled.opacity !== f.filled.opacity) setPaintAndSync(map, mutateRegisteredLayer, fillId, 'fill-opacity', f.filled.opacity)
        }

        if (lineIs && !lineWas) {
          registerLayer({ id: lineId, type: 'line', source: srcId, filter, paint: { 'line-color': f.shape.color, 'line-width': f.shape.width } } as unknown as mapboxgl.AnyLayer, srcId)
        } else if (!lineIs && lineWas) {
          removeRegisteredLayer(lineId)
        } else if (lineIs && pf) {
          if (pf.shape.color !== f.shape.color) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-color', f.shape.color)
          if (pf.shape.width !== f.shape.width) setPaintAndSync(map, mutateRegisteredLayer, lineId, 'line-width', f.shape.width)
        }
      })
    })

    prevRegionsRef.current = { ...regions }
    prevFeatsRef.current = JSON.parse(JSON.stringify(regionFeats))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(regions), JSON.stringify(regionFeats), map, ready])

  // Per-feature editing
  const updateRegionFeat = (key: string, i: number, sf: { filled: FillConfig; shape: ShapeConfig }) =>
    setRegionFeats(p => ({ ...p, [key]: (p[key] ?? []).map((f, idx) => idx === i ? { ...f, ...sf } : f) }))
  const toggleRegionFeat = (key: string, i: number) =>
    setRegionFeats(p => ({ ...p, [key]: (p[key] ?? []).map((f, idx) => idx === i ? { ...f, enabled: !f.enabled } : f) }))
  const setAllRegionFeats = (key: string, enabled: boolean) =>
    setRegionFeats(p => ({ ...p, [key]: (p[key] ?? []).map(f => ({ ...f, enabled })) }))

  // Group-level editing (applies to all features in the region)
  const setGroupFillColor = (key: string, color: string) => {
    setRegionGroup(p => ({ ...p, [key]: { ...p[key], fillCol: color } }))
    setRegionFeats(p => ({ ...p, [key]: (p[key] ?? []).map(f => ({ ...f, filled: { ...f.filled, color } })) }))
  }
  const setGroupShapeEnabled = (key: string, v: boolean) => {
    setRegionGroup(p => ({ ...p, [key]: { ...p[key], shapeEnabled: v } }))
    setRegionFeats(p => ({ ...p, [key]: (p[key] ?? []).map(f => ({ ...f, shape: { ...f.shape, enabled: v } })) }))
  }
  const setGroupShapeColor = (key: string, color: string) => {
    setRegionGroup(p => ({ ...p, [key]: { ...p[key], shapeCol: color } }))
    setRegionFeats(p => ({ ...p, [key]: (p[key] ?? []).map(f => ({ ...f, shape: { ...f.shape, color } })) }))
  }
  const setGroupShapeWidth = (key: string, width: number) => {
    setRegionGroup(p => ({ ...p, [key]: { ...p[key], shapeWidth: width } }))
    setRegionFeats(p => ({ ...p, [key]: (p[key] ?? []).map(f => ({ ...f, shape: { ...f.shape, width } })) }))
  }

  const addFromSuggestion = (s: CountrySuggestion) => {
    if (countries.some(c => c.iso3 === s.iso3)) return
    const c: Country = { id: Date.now().toString(), name: s.name, iso3: s.iso3, filled: mkFill('#00e5ff'), shape: mkShape('#00e5ff') }
    setCountries(p => [...p, c])
    setCIn('')
    setSuggestions([])
    setShowSuggestions(false)
    togC(c.id)
  }

  const addFirstSuggestion = () => { if (suggestions.length > 0) addFromSuggestion(suggestions[0]) }

  const avJ = JUDETE.filter(j => !judete.some(jj => jj.name === j))

  const handleGlobalJColor = (newColor: string) => {
    setJCol(newColor)
    setJudete(p => p.map(j => ({ ...j, filled: { ...j.filled, color: newColor } })))
  }

  const handleGlobalJShapeEnabled = (v: boolean) => {
    setJShapeEnabled(v)
    setJudete(p => p.map(j => ({ ...j, shape: { ...j.shape, enabled: v } })))
  }

  const handleGlobalJShapeColor = (newColor: string) => {
    setJShapeCol(newColor)
    setJudete(p => p.map(j => ({ ...j, shape: { ...j.shape, color: newColor } })))
  }

  const handleGlobalJShapeWidth = (newWidth: number) => {
    setJShapeWidth(newWidth)
    setJudete(p => p.map(j => ({ ...j, shape: { ...j.shape, width: newWidth } })))
  }

  const addJ = () => {
    if (!selJ) return
    setJudete(p => [...p, { id: Date.now().toString(), name: selJ, filled: mkFill(jCol), shape: { ...mkShape(jShapeCol), width: jShapeWidth, enabled: jShapeEnabled } }])
    setSelJ('')
  }

  const allJ = () => {
    const e = new Set(judete.map(j => j.name))
    setJudete(p => [...p, ...JUDETE.filter(j => !e.has(j)).map(n => ({ id: `${Date.now()}-${n}`, name: n, filled: mkFill(jCol), shape: { ...mkShape(jShapeCol), width: jShapeWidth, enabled: jShapeEnabled } }))])
  }

  const toggleSector = (id: string) => setSectors(p => p.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  const selectAllSectors = () => setSectors(p => p.map(s => ({ ...s, enabled: true })))
  const deselectAllSectors = () => setSectors(p => p.map(s => ({ ...s, enabled: false })))

  const handleGlobalSecColor = (newColor: string) => {
    setSecCol(newColor)
    setSectors(p => p.map(s => ({
      ...s,
      filled: { ...s.filled, color: newColor },
      shape: { ...s.shape, color: newColor },
    })))
  }

  return (
    <Section title="Borders" icon={I.hex()}>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>

        {/* Countries */}
        <Accordion
          name={`Countries${countries.length ? ` (${countries.length})` : ''}`}
          isOpen={openBCountries}
          onToggle={() => setOpenBCountries(!openBCountries)}
        >
          <div ref={cInContainerRef} style={{marginBottom:6}}>
            <div style={{display:'flex',gap:8}}>
              <input
                value={cIn}
                onChange={e => setCIn(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFirstSuggestion()}
                onFocus={() => {
                  if (suggestions.length > 0 && cInContainerRef.current) {
                    const r = cInContainerRef.current.getBoundingClientRect()
                    setCSugPos({ top: r.bottom + 4, left: r.left, width: r.width })
                    setShowSuggestions(true)
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Search country..."
                className="s-input"
                style={IB}
              />
              <button onClick={addFirstSuggestion} disabled={suggestions.length === 0} className="add-btn" style={suggestions.length === 0 ? ABO : AB}>
                {I.plus()}
              </button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div style={{position:'fixed',top:cSugPos.top,left:cSugPos.left,width:cSugPos.width,zIndex:99999,background:T.card,border:`1px solid ${T.glassBorder}`,borderRadius:8,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.5)'}}>
                {suggestions.map((s, i) => (
                  <button key={s.iso3} onMouseDown={e => { e.preventDefault(); addFromSuggestion(s) }}
                    style={{display:'block',width:'100%',padding:'8px 12px',background:'none',border:'none',borderBottom:i < suggestions.length - 1 ? `1px solid ${T.glassBorder}` : 'none',cursor:'pointer',textAlign:'left',color:T.fg,fontSize:12}}
                    className="sug-item"
                  >{s.name}</button>
                ))}
              </div>
            )}
          </div>
          {countries.length > 0 && (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {countries.map(c => (
                <Accordion key={c.id} name={c.name} isOpen={openC.has(c.id)} onToggle={() => togC(c.id)} onRemove={() => setCountries(p => p.filter(x => x.id !== c.id))}>
                  <ShapeFillCtrl
                    s={{ filled: c.filled, shape: c.shape }}
                    onChange={sf => setCountries(p => p.map(x => x.id === c.id ? { ...x, ...sf } : x))}
                  />
                </Accordion>
              ))}
            </div>
          )}
        </Accordion>

        {/* Jud.RO */}
        <Accordion
          name={`Jud.RO${judete.length ? ` (${judete.length}/42)` : ''}`}
          isOpen={openBJudete}
          onToggle={() => setOpenBJudete(!openBJudete)}
          extra={avJ.length === 0
            ? <button onClick={e => { e.stopPropagation(); setJudete([]) }} style={{fontSize:10,background:'rgba(255,75,75,0.12)',color:'#ff4b4b',border:'none',padding:'4px 8px',borderRadius:6,cursor:'pointer'}} className="sel-all">Deselect All</button>
            : <button onClick={e => { e.stopPropagation(); allJ() }} style={{fontSize:10,background:'rgba(0,212,232,0.12)',color:T.primary,border:'none',padding:'4px 8px',borderRadius:6,cursor:'pointer'}} className="sel-all">Select All</button>
          }
        >
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
            <select value={selJ} onChange={e => setSelJ(e.target.value)} style={{flex:1,background:T.inputBg,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:T.fg,outline:'none',cursor:'pointer'}} className="s-select">
              <option value="">Select county...</option>
              {avJ.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            <ColorPicker color={jCol} onChange={handleGlobalJColor}/>
            <button onClick={addJ} disabled={!selJ} className="add-btn" style={!selJ ? ABO : AB}>{I.plus()}</button>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
            <Toggle label="" value={jShapeEnabled} onChange={handleGlobalJShapeEnabled}/>
            <span style={{fontSize:11,color:T.muted,whiteSpace:'nowrap'}}>Shape:</span>
            <ColorPicker color={jShapeCol} onChange={handleGlobalJShapeColor}/>
            <input
              type="range" min={1} max={10} step={1} value={jShapeWidth}
              onChange={e => handleGlobalJShapeWidth(Number(e.target.value))}
              style={{flex:1,accentColor:T.primary,cursor:'pointer',height:4}}
            />
            <span style={{fontSize:11,color:T.muted,minWidth:24,textAlign:'right'}}>{jShapeWidth}px</span>
          </div>
          {judete.length > 0 && (
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:300,overflowY:'auto'}}>
              {judete.map(j => (
                <div key={j.id} className="item-group" style={{background:T.secondary,borderRadius:8,padding:'8px 10px',display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:12,flex:1,fontWeight:500}}>{j.name}</span>
                    <button onClick={() => setJudete(p => p.filter(x => x.id !== j.id))} className="rm-btn" style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:0}}>{I.x(12)}</button>
                  </div>
                  <ShapeFillCtrl
                    s={{ filled: j.filled, shape: j.shape }}
                    onChange={sf => setJudete(p => p.map(x => x.id === j.id ? { ...x, ...sf } : x))}
                  />
                </div>
              ))}
            </div>
          )}
        </Accordion>

        {/* București */}
        <Accordion
          name={`București${bucFull.enabled || sectors.some(s => s.enabled) ? ` (${(bucFull.enabled ? 1 : 0) + sectors.filter(s => s.enabled).length})` : ''}`}
          isOpen={openBBuc}
          onToggle={() => setOpenBBuc(!openBBuc)}
          extra={
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <ColorPicker color={secCol} onChange={handleGlobalSecColor}/>
              {sectors.every(s => s.enabled)
                ? <button onClick={e => { e.stopPropagation(); deselectAllSectors() }} style={{fontSize:10,background:'rgba(255,75,75,0.12)',color:'#ff4b4b',border:'none',padding:'4px 8px',borderRadius:6,cursor:'pointer'}} className="sel-all">Deselect All</button>
                : <button onClick={e => { e.stopPropagation(); selectAllSectors() }} style={{fontSize:10,background:'rgba(0,212,232,0.12)',color:T.primary,border:'none',padding:'4px 8px',borderRadius:6,cursor:'pointer'}} className="sel-all">Select All</button>
              }
            </div>
          }
        >
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {/* Full */}
            <div className="item-group" style={{background:bucFull.enabled?'rgba(0,212,232,0.08)':T.secondary,borderRadius:8,padding:'8px 10px',border:bucFull.enabled?'1px solid rgba(0,212,232,0.2)':'1px solid transparent',transition:'all .2s',display:'flex',flexDirection:'column',gap:6}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <Toggle label="" value={bucFull.enabled} onChange={v => setBucFull(p => ({ ...p, enabled: v }))}/>
                <span style={{fontSize:12,fontWeight:500,flex:1}}>Full</span>
              </div>
              <ShapeFillCtrl
                s={{ filled: bucFull.filled, shape: bucFull.shape }}
                onChange={sf => setBucFull(p => ({ ...p, ...sf }))}
              />
            </div>

            {/* Sectors accordion */}
            <Accordion name={`Sectoare (${sectors.filter(s => s.enabled).length}/6)`} isOpen={openSec} onToggle={() => setOpenSec(!openSec)} onRemove={deselectAllSectors}>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {sectors.map(s => (
                  <div key={s.id} className="item-group" style={{background:s.enabled?'rgba(0,212,232,0.08)':T.secondary,borderRadius:8,padding:'8px 10px',border:s.enabled?'1px solid rgba(0,212,232,0.2)':'1px solid transparent',transition:'all .2s',display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <Toggle label="" value={s.enabled} onChange={() => toggleSector(s.id)}/>
                      <span style={{fontSize:12,flex:1,fontWeight:s.enabled?500:400,color:s.enabled?T.fg:T.muted,transition:'all .2s'}}>{s.name}</span>
                    </div>
                    <ShapeFillCtrl
                      s={{ filled: s.filled, shape: s.shape }}
                      onChange={sf => setSectors(p => p.map(x => x.id === s.id ? { ...x, ...sf } : x))}
                    />
                  </div>
                ))}
              </div>
            </Accordion>
          </div>
        </Accordion>

        {/* Regions */}
        <Accordion
          name={`Regions${Object.values(regions).filter(Boolean).length ? ` (${Object.values(regions).filter(Boolean).length})` : ''}`}
          isOpen={openRegions}
          onToggle={() => setOpenRegions(!openRegions)}
        >
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {REGION_DEFS.map(def => {
              const feats = regionFeats[def.key] ?? []
              const g = regionGroup[def.key]
              const onCount = feats.filter(f => f.enabled).length
              const allOn = feats.length > 0 && onCount === feats.length
              return (
                <Accordion
                  key={def.key}
                  name={`${def.label}${feats.length ? ` (${onCount}/${feats.length})` : ''}`}
                  isOpen={openReg.has(def.key)}
                  onToggle={() => togReg(def.key)}
                  extra={
                    <div style={{display:'flex',alignItems:'center',gap:6}} onClick={e => e.stopPropagation()}>
                      <span style={{width:12,height:12,borderRadius:3,background:def.fill,border:`1.5px solid ${def.line}`,flexShrink:0}}/>
                      <Toggle label="" value={!!regions[def.key]} onChange={v => setRegions(p => ({ ...p, [def.key]: v }))}/>
                    </div>
                  }
                >
                  {/* Group controls */}
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{fontSize:11,color:T.muted,whiteSpace:'nowrap'}}>Fill:</span>
                    <ColorPicker color={g.fillCol} onChange={c => setGroupFillColor(def.key, c)}/>
                    {feats.length > 0 && (
                      <button
                        onClick={() => setAllRegionFeats(def.key, !allOn)}
                        style={{marginLeft:'auto',fontSize:10,background:allOn?'rgba(255,75,75,0.12)':'rgba(0,212,232,0.12)',color:allOn?'#ff4b4b':T.primary,border:'none',padding:'4px 8px',borderRadius:6,cursor:'pointer'}}
                        className="sel-all"
                      >{allOn ? 'Deselect All' : 'Select All'}</button>
                    )}
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <Toggle label="" value={g.shapeEnabled} onChange={v => setGroupShapeEnabled(def.key, v)}/>
                    <span style={{fontSize:11,color:T.muted,whiteSpace:'nowrap'}}>Outline:</span>
                    <ColorPicker color={g.shapeCol} onChange={c => setGroupShapeColor(def.key, c)}/>
                    <input
                      type="range" min={1} max={10} step={0.5} value={g.shapeWidth}
                      onChange={e => setGroupShapeWidth(def.key, Number(e.target.value))}
                      style={{flex:1,accentColor:T.primary,cursor:'pointer',height:4}}
                    />
                    <span style={{fontSize:11,color:T.muted,minWidth:30,textAlign:'right'}}>{g.shapeWidth}px</span>
                  </div>

                  {/* Per-feature list */}
                  {feats.length > 0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:320,overflowY:'auto'}}>
                      {feats.map((f, i) => (
                        <div key={f.name} className="item-group" style={{background:f.enabled?'rgba(0,212,232,0.08)':T.secondary,borderRadius:8,padding:'8px 10px',border:f.enabled?'1px solid rgba(0,212,232,0.2)':'1px solid transparent',transition:'all .2s',display:'flex',flexDirection:'column',gap:6}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <Toggle label="" value={f.enabled} onChange={() => toggleRegionFeat(def.key, i)}/>
                            <span style={{fontSize:12,flex:1,fontWeight:f.enabled?500:400,color:f.enabled?T.fg:T.muted,transition:'all .2s'}}>{f.name}</span>
                          </div>
                          <ShapeFillCtrl
                            s={{ filled: f.filled, shape: f.shape }}
                            onChange={sf => updateRegionFeat(def.key, i, sf)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Accordion>
              )
            })}
          </div>
        </Accordion>

      </div>
    </Section>
  )
}
