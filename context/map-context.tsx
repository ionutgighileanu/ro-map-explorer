"use client"

import { createContext, useContext, useState, useCallback } from "react"
import type mapboxgl from "mapbox-gl"

interface MapContextValue {
  map: mapboxgl.Map | null
  ready: boolean
  setMap: (map: mapboxgl.Map) => void
  setReady: (ready: boolean) => void
}

const MapContext = createContext<MapContextValue>({
  map: null,
  ready: false,
  setMap: () => {},
  setReady: () => {},
})

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [map, setMapState] = useState<mapboxgl.Map | null>(null)
  const [ready, setReadyState] = useState(false)

  const setMap = useCallback((m: mapboxgl.Map) => setMapState(m), [])
  const setReady = useCallback((r: boolean) => setReadyState(r), [])

  return (
    <MapContext.Provider value={{ map, ready, setMap, setReady }}>
      {children}
    </MapContext.Provider>
  )
}

export function useMap() {
  return useContext(MapContext)
}
