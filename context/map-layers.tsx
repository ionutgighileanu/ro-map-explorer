"use client"

import { useEffect, useRef, useCallback } from "react"
import type mapboxgl from "mapbox-gl"

type AnySourceData = mapboxgl.AnySourceData

interface RegistryEntry {
  sourceId: string
  sourceSpec: AnySourceData | null  // null = built-in source (e.g. 'composite'), skip addSource on rehydrate
  layers: mapboxgl.AnyLayer[]
}

export interface MapLayersRegistry {
  registerSource: (id: string, spec: AnySourceData) => void
  registerLayer: (layer: mapboxgl.AnyLayer, sourceId: string) => void
  removeRegisteredLayer: (layerId: string) => void
  removeRegisteredSource: (sourceId: string) => void
  mutateRegisteredLayer: (layerId: string, updater: (layer: mapboxgl.AnyLayer) => mapboxgl.AnyLayer) => void
}

export function useMapLayers(
  map: mapboxgl.Map | null,
  ready: boolean
): MapLayersRegistry {
  // Map<sourceId, RegistryEntry>
  const registry = useRef<Map<string, RegistryEntry>>(new Map())

  const rehydrate = useCallback(() => {
    if (!map) return
    registry.current.forEach((entry) => {
      // sourceSpec is null for built-in sources (e.g. composite) — skip addSource
      if (entry.sourceSpec && !map.getSource(entry.sourceId)) {
        map.addSource(entry.sourceId, entry.sourceSpec)
      }
      entry.layers.forEach((layer) => {
        if (!map.getLayer(layer.id)) {
          map.addLayer(layer)
        }
      })
    })
  }, [map])

  useEffect(() => {
    if (!map || !ready) return
    map.on("style.load", rehydrate)
    return () => {
      map.off("style.load", rehydrate)
    }
  }, [map, ready, rehydrate])

  const registerSource = useCallback(
    (id: string, spec: AnySourceData) => {
      if (!registry.current.has(id)) {
        registry.current.set(id, { sourceId: id, sourceSpec: spec, layers: [] })
      }
      if (map && !map.getSource(id)) {
        map.addSource(id, spec)
      }
    },
    [map]
  )

  const registerLayer = useCallback(
    (layer: mapboxgl.AnyLayer, sourceId: string) => {
      // For built-in sources (e.g. 'composite') that were never registered via registerSource,
      // create a null-sourceSpec entry so rehydrate can still re-add their layers on style.load.
      if (!registry.current.has(sourceId)) {
        registry.current.set(sourceId, { sourceId, sourceSpec: null, layers: [] })
      }
      const entry = registry.current.get(sourceId)!
      if (!entry.layers.find((l) => l.id === layer.id)) {
        entry.layers.push(layer)
      }
      if (map && !map.getLayer(layer.id)) {
        map.addLayer(layer)
      }
    },
    [map]
  )

  const removeRegisteredLayer = useCallback(
    (layerId: string) => {
      registry.current.forEach((entry) => {
        entry.layers = entry.layers.filter((l) => l.id !== layerId)
      })
      if (map && map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
    },
    [map]
  )

  const mutateRegisteredLayer = useCallback(
    (layerId: string, updater: (layer: mapboxgl.AnyLayer) => mapboxgl.AnyLayer) => {
      registry.current.forEach((entry) => {
        const idx = entry.layers.findIndex((l) => l.id === layerId)
        if (idx >= 0) {
          entry.layers[idx] = updater(entry.layers[idx])
        }
      })
    },
    []
  )

  const removeRegisteredSource = useCallback(
    (sourceId: string) => {
      const entry = registry.current.get(sourceId)
      if (entry) {
        entry.layers.forEach((layer) => {
          if (map && map.getLayer(layer.id)) {
            map.removeLayer(layer.id)
          }
        })
        registry.current.delete(sourceId)
      }
      if (map && map.getSource(sourceId)) {
        map.removeSource(sourceId)
      }
    },
    [map]
  )

  return { registerSource, registerLayer, removeRegisteredLayer, removeRegisteredSource, mutateRegisteredLayer }
}
