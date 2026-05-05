"use client"

import { Layers, Plus, Minus, Satellite, Mountain } from "lucide-react"

type MapStyleType = "dark" | "satellite" | "terrain"

interface MapControlsProps {
  mapStyle: MapStyleType
  onSetStyle: (style: MapStyleType) => void
  onZoomIn: () => void
  onZoomOut: () => void
}

const STYLES: { id: MapStyleType; label: string; icon: typeof Layers }[] = [
  { id: "dark", label: "Standard", icon: Layers },
  { id: "satellite", label: "Satellite", icon: Satellite },
  { id: "terrain", label: "Terrain", icon: Mountain },
]

export default function MapControls({
  mapStyle,
  onSetStyle,
  onZoomIn,
  onZoomOut,
}: MapControlsProps) {
  return (
    <div
      className="absolute bottom-6 left-4 z-20 flex flex-col gap-2"
    >
      {/* Map style switcher */}
      <div className="glass-panel rounded-xl overflow-hidden">
        {STYLES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSetStyle(id)}
            className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors cursor-pointer ${
              mapStyle === id
                ? "bg-primary/20 text-primary font-medium"
                : "text-foreground hover:bg-secondary/40"
            }`}
            aria-label={`Switch to ${label} view`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
        <button
          onClick={onZoomIn}
          className="flex items-center justify-center w-10 h-9 text-foreground hover:bg-secondary/40 transition-colors cursor-pointer border-b border-border/30"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="flex items-center justify-center w-10 h-9 text-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
