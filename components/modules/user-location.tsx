"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"
import SidebarSection from "@/components/sidebar-section"
import ColorPicker from "@/components/color-picker"

export default function UserLocationModule() {
  const [enabled, setEnabled] = useState(false)
  const [bumbSize, setBumbSize] = useState(14)
  const [bumbColor, setBumbColor] = useState("#00e5ff")

  const sizeMin = 5
  const sizeMax = 30
  const sizeRange = sizeMax - sizeMin
  const fillPercent = ((bumbSize - sizeMin) / sizeRange) * 100

  return (
    <SidebarSection
      title="User Location"
      icon={<MapPin className="h-4 w-4" />}
    >
      <div className="flex flex-col gap-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground">My Location</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 cursor-pointer ${
              enabled ? "bg-primary" : "bg-secondary"
            }`}
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle my location"
          >
            <span
              className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-foreground transition-transform duration-200 ${
                enabled ? "translate-x-[18px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Bumb Size Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Bumb Size</span>
            <span className="text-[11px] text-foreground font-medium">{bumbSize}px</span>
          </div>
          <input
            type="range"
            min={sizeMin}
            max={sizeMax}
            value={bumbSize}
            onChange={(e) => setBumbSize(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-secondary"
            style={{
              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${fillPercent}%, var(--secondary) ${fillPercent}%, var(--secondary) 100%)`,
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{sizeMin}px</span>
            <span className="text-[10px] text-muted-foreground">{sizeMax}px</span>
          </div>
        </div>

        {/* Bumb Color */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Bumb Color</span>
          <ColorPicker color={bumbColor} onChange={setBumbColor} />
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center py-4 bg-secondary/30 rounded-lg">
          <div
            className="rounded-full transition-all duration-200"
            style={{
              width: bumbSize,
              height: bumbSize,
              backgroundColor: bumbColor,
              boxShadow: `0 0 ${bumbSize}px ${bumbColor}80`,
            }}
          />
        </div>
      </div>
    </SidebarSection>
  )
}
