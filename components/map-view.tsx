"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { useMap } from "@/context/map-context"
import type { ViewportMode } from "@/app/page"

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

export const VIEWPORT_DIMS: Record<ViewportMode, { w: number; h: number }> = {
  "16p": { w: 1920, h: 1080 },
  "32p": { w: 3840, h: 1080 },
}

interface MapViewProps {
  mapStyle: MapStyleType
  viewportMode: ViewportMode
}

export default function MapView({ mapStyle, viewportMode }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const { setMap, setReady } = useMap()
  const appliedStyleRef = useRef<MapStyleType>(mapStyle)
  const [scale, setScale] = useState(1)

  // Recompute scale whenever viewportMode or window size changes
  useEffect(() => {
    const compute = () => {
      const { w, h } = VIEWPORT_DIMS[viewportMode]
      setScale(Math.min(window.innerWidth / w, window.innerHeight / h))
    }
    compute()
    window.addEventListener("resize", compute)
    return () => window.removeEventListener("resize", compute)
  }, [viewportMode])

  // Initialize map once — cleanup only on unmount, never on style/viewport change
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

  // Notify Mapbox of container resize after DOM updates
  useEffect(() => {
    if (!mapRef.current) return
    requestAnimationFrame(() => {
      mapRef.current?.resize()
    })
  }, [scale, viewportMode])

  const { w, h } = VIEWPORT_DIMS[viewportMode]

  return (
    <div
      ref={mapContainer}
      style={{
        position: "absolute",
        width: w,
        height: h,
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center center",
      }}
    />
  )
}
