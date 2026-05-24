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
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
})

type MapStyleType = "dark" | "satellite"
export type ViewportMode = "16p" | "32p"

function PageInner() {
  const [mapStyle, setMapStyle] = useState<MapStyleType>("dark")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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
    <main className="relative w-screen h-screen overflow-hidden">
      <MapView mapStyle={mapStyle} viewportMode={viewportMode} />
      <AppSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mapStyle={mapStyle}
        onSetMapStyle={setMapStyle}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        viewportMode={viewportMode}
        onViewportModeChange={setViewportMode}
        satelliteSettings={satelliteSettings}
        onSatelliteSettingsChange={setSatelliteSettings}
      />
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
