"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import AppSidebar from "@/components/app-sidebar"
import { MapProvider, useMap } from "@/context/map-context"
import { useSatelliteControls } from "@/hooks/use-satellite-controls"
import { defaultSatelliteSettings, type SatelliteSettings } from "@/components/satellite-controls"

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, border: '2px solid #00d4e8', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
        <p style={{ fontSize: 12, color: '#9a9cb8' }}>Loading map...</p>
      </div>
    </div>
  ),
})

type MapStyleType = "dark" | "satellite"
export type ViewportMode = "16p" | "32p"

function PageInner() {
  const [mapStyle, setMapStyle] = useState<MapStyleType>("dark")
  const [viewportMode, setViewportMode] = useState<ViewportMode>("16p")
  const [satelliteSettings, setSatelliteSettings] = useState<SatelliteSettings>(defaultSatelliteSettings)
  const { map, ready } = useMap()

  useSatelliteControls(map, ready, mapStyle, satelliteSettings)

  const handleZoomIn = useCallback(() => {
    map?.zoomIn({ duration: 300 })
  }, [map])

  const handleZoomOut = useCallback(() => {
    map?.zoomOut({ duration: 300 })
  }, [map])

  return (
    <main style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar
        mapStyle={mapStyle}
        onSetMapStyle={setMapStyle}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        viewportMode={viewportMode}
        onViewportModeChange={setViewportMode}
        satelliteSettings={satelliteSettings}
        onSatelliteSettingsChange={setSatelliteSettings}
      />
      <div style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        overflow: 'hidden',
      }}>
        <MapView mapStyle={mapStyle} viewportMode={viewportMode} />
      </div>
    </main>
  )
}

export default function Page() {
  return (
    <MapProvider>
      <PageInner />
    </MapProvider>
  )
}
