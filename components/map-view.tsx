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

const GUTTER = 24

export default function MapView({ mapStyle, viewportMode }: MapViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const { setMap, setReady } = useMap()
  const appliedStyleRef = useRef<MapStyleType>(mapStyle)
  const [frameDims, setFrameDims] = useState({ w: 0, h: 0 })

  // Compute aspect-ratio-constrained frame from available space
  useEffect(() => {
    if (!wrapperRef.current) return
    const { w: exportW, h: exportH } = VIEWPORT_DIMS[viewportMode]
    const ratio = exportW / exportH

    const compute = (availW: number, availH: number) => {
      const usableW = availW - GUTTER * 2
      const usableH = availH - GUTTER * 2
      if (usableW <= 0 || usableH <= 0) return
      let fw: number, fh: number
      if (usableW / usableH > ratio) {
        fh = usableH
        fw = Math.round(usableH * ratio)
      } else {
        fw = usableW
        fh = Math.round(usableW / ratio)
      }
      setFrameDims({ w: fw, h: fh })
    }

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      compute(width, height)
    })
    observer.observe(wrapperRef.current)

    const rect = wrapperRef.current.getBoundingClientRect()
    compute(rect.width, rect.height)

    return () => observer.disconnect()
  }, [viewportMode])

  // Initialize map once — cleanup only on unmount
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

  // Apply style without recreating the map
  useEffect(() => {
    if (!mapRef.current || appliedStyleRef.current === mapStyle) return
    appliedStyleRef.current = mapStyle
    mapRef.current.setStyle(STYLES[mapStyle])
  }, [mapStyle])

  // Resize map when frame dimensions change
  useEffect(() => {
    if (!mapRef.current || frameDims.w === 0) return
    requestAnimationFrame(() => {
      mapRef.current?.resize()
    })
  }, [frameDims])

  const fw = frameDims.w > 0 ? frameDims.w : "100%"
  const fh = frameDims.h > 0 ? frameDims.h : "100%"

  return (
    <div
      ref={wrapperRef}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: GUTTER }}
    >
      <div
        ref={mapContainer}
        style={{
          width: fw,
          height: fh,
          flexShrink: 0,
        }}
      />
    </div>
  )
}
