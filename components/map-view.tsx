"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { useMap } from "@/context/map-context"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

type MapStyleType = "dark" | "satellite"

const cleanSatelliteStyle: mapboxgl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-sat": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [{ id: "esri-sat-layer", type: "raster", source: "esri-sat" }],
}

const STYLES: Record<MapStyleType, string | mapboxgl.StyleSpecification> = {
  dark: cleanSatelliteStyle,
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
}

interface MapViewProps {
  mapStyle: MapStyleType
}

export default function MapView({ mapStyle }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const { setMap, setReady } = useMap()
  const appliedStyleRef = useRef<MapStyleType>(mapStyle)

  // Initialize map once — cleanup only on unmount, never on style change
  useEffect(() => {
    if (!mapContainer.current) return

    appliedStyleRef.current = mapStyle

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: STYLES[mapStyle],
      center: [25.0, 45.9432],
      zoom: 6.5,
      pitch: 0,
      bearing: 0,
      antialias: true,
      preserveDrawingBuffer: true,
      attributionControl: false,
    })

    mapRef.current.on("load", () => {
      if (mapRef.current) {
        ;(window as any).__map = mapRef.current
        setMap(mapRef.current)
        setReady(true)
      }
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply style without recreating the map — preserves viewport position
  useEffect(() => {
    if (!mapRef.current || appliedStyleRef.current === mapStyle) return
    appliedStyleRef.current = mapStyle
    mapRef.current.setStyle(STYLES[mapStyle])
  }, [mapStyle])

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  )
}
