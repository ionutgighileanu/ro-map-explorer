"use client"

import { useEffect, useRef } from "react"
import type mapboxgl from "mapbox-gl"
import type { SatelliteSettings } from "@/components/satellite-controls"

type MapStyleType = "dark" | "satellite"

// ── Symbol label sets ─────────────────────────────────────────────────────────
const PLACES_LAYERS = new Set(['settlement-major-label', 'settlement-minor-label', 'settlement-subdivision-label'])
const REGIONS_LAYERS = new Set(['state-label', 'region-label'])
const SUBREGIONS_LAYERS = new Set(['subregion-label', 'district-label', 'county-label'])
const COUNTRIES_LAYERS = new Set(['country-label'])
const WATERS_SYM = new Set(['water-point-label', 'natural-point-label', 'waterway-label', 'lake-label', 'sea-label', 'ocean-label'])
const ROADS_SYM = new Set(['road-label', 'road-number-shield', 'road-exit-shield'])
const POI_SYM = new Set(['poi-label', 'transit-label', 'airport-label'])

// ── Visibility helpers ────────────────────────────────────────────────────────

function symVis(id: string, s: SatelliteSettings): boolean {
  if (!s.allLabels) return false
  if (PLACES_LAYERS.has(id)) return s.placesLabels
  if (REGIONS_LAYERS.has(id)) return s.regionsLabels
  if (SUBREGIONS_LAYERS.has(id)) return s.subregionsLabels
  if (COUNTRIES_LAYERS.has(id)) return s.countriesLabels
  if (WATERS_SYM.has(id)) return s.watersLabels
  if (ROADS_SYM.has(id)) return s.roadsLabels
  if (POI_SYM.has(id)) return s.poiLabels
  return true // uncategorised symbol → follows allLabels master only
}

function lineVis(id: string, s: SatelliteSettings): boolean {
  // Roads, tunnels, bridges
  if (/road|tunnel|bridge/.test(id)) return s.roadsVisual
  // Country-level admin (level-0)
  if ((id.includes('admin') || id.includes('boundary') || id.includes('border')) && id.includes('-0')) return s.borderCountries
  // Sub-national admin (level-1+)
  if (id.includes('admin') || id.includes('boundary')) return s.borderAdmin
  // Water / coastline lines
  if (/water|lake|river|ocean|sea|coast/.test(id)) return s.waterOutlines
  return true
}

function fillVis(id: string, s: SatelliteSettings): boolean {
  if (/water|lake|river|ocean|sea/.test(id)) return s.waterOutlines
  return true
}

// ── Debug logging ─────────────────────────────────────────────────────────────

function logAllLayers(map: mapboxgl.Map) {
  const style = map.getStyle()
  if (!style?.layers) return
  const groups: Record<string, string[]> = {}
  for (const layer of style.layers) {
    if (!groups[layer.type]) groups[layer.type] = []
    groups[layer.type].push(layer.id)
  }
  console.group('[satellite-streets-v12] All layers by type:')
  for (const [type, ids] of Object.entries(groups)) {
    console.log(`${type} (${ids.length}):`, ids)
  }
  console.groupEnd()
}

// ── Master apply function ─────────────────────────────────────────────────────

function applyAll(map: mapboxgl.Map, s: SatelliteSettings, isSat: boolean) {
  if (!isSat) {
    // Cleanup when switching to standard mode
    try { map.setTerrain(null) } catch {}
    if (map.getLayer('sat-sky')) map.removeLayer('sat-sky')
    return
  }

  const style = map.getStyle()
  if (!style?.layers) return

  for (const layer of style.layers) {
    // Always keep raster (satellite image) and background
    if (layer.type === 'raster' || layer.type === 'background' || layer.id === 'sat-sky') continue

    let visible: boolean

    if (s.emptyMap) {
      // Pure satellite image — hide everything non-raster
      visible = false
    } else {
      switch (layer.type) {
        case 'symbol': visible = symVis(layer.id, s); break
        case 'line':   visible = lineVis(layer.id, s); break
        case 'fill':   visible = fillVis(layer.id, s); break
        default:       visible = true  // hillshade, fill-extrusion, etc.
      }
    }

    try { map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none') } catch {}
  }

  // Terrain
  try {
    if (s.terrain3D) {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })
      }
      map.setTerrain({ source: 'mapbox-dem', exaggeration: s.terrainExaggeration })
    } else {
      map.setTerrain(null)
    }
  } catch {}

  // Sky (visible only when sky toggle ON and emptyMap OFF)
  const showSky = s.sky && !s.emptyMap
  if (showSky && !map.getLayer('sat-sky')) {
    map.addLayer({
      id: 'sat-sky',
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 15,
      },
    } as mapboxgl.AnyLayer)
  } else if (!showSky && map.getLayer('sat-sky')) {
    map.removeLayer('sat-sky')
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSatelliteControls(
  map: mapboxgl.Map | null,
  ready: boolean,
  mapStyle: MapStyleType,
  settings: SatelliteSettings,
) {
  const isSatellite = mapStyle === 'satellite'

  // Refs keep style.load handler current without re-registering it
  const settingsRef = useRef(settings)
  const isSatelliteRef = useRef(isSatellite)
  useEffect(() => { settingsRef.current = settings })
  useEffect(() => { isSatelliteRef.current = isSatellite })

  // Register style.load handler once per map instance
  useEffect(() => {
    if (!map || !ready) return
    const onLoad = () => {
      const isSat = isSatelliteRef.current
      if (isSat) logAllLayers(map)
      applyAll(map, settingsRef.current, isSat)
    }
    map.on('style.load', onLoad)
    return () => { map.off('style.load', onLoad) }
  }, [map, ready])

  // Apply immediately whenever any setting or mode changes
  const {
    emptyMap, allLabels, placesLabels, regionsLabels, subregionsLabels,
    countriesLabels, watersLabels, roadsLabels, poiLabels,
    roadsVisual, borderCountries, borderAdmin, waterOutlines,
    terrain3D, terrainExaggeration, sky,
  } = settings

  useEffect(() => {
    if (!map || !ready) return
    applyAll(map, settings, isSatellite)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, isSatellite,
    emptyMap, allLabels, placesLabels, regionsLabels, subregionsLabels,
    countriesLabels, watersLabels, roadsLabels, poiLabels,
    roadsVisual, borderCountries, borderAdmin, waterOutlines,
    terrain3D, terrainExaggeration, sky,
  ])
}
