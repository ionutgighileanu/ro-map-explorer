"use client"

import { useState } from "react"
import { Circle, Square } from "lucide-react"
import SidebarSection from "@/components/sidebar-section"
import ColorPicker from "@/components/color-picker"

type MarkerShape = "circle" | "square"

export default function MarkerStylesModule() {
  const [shape, setShape] = useState<MarkerShape>("circle")
  const [size, setSize] = useState(14)
  const [borderWidth, setBorderWidth] = useState(2)
  const [fillColor, setFillColor] = useState("#00e5ff")

  return (
    <SidebarSection title="Marker Styles" icon={<Circle className="h-4 w-4" />}>
      <div className="flex flex-col gap-4">
        {/* Shape toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Shape
          </label>
          <div className="flex rounded-lg overflow-hidden border border-border/40 bg-secondary/20">
            <button
              onClick={() => setShape("circle")}
              className={`flex items-center justify-center gap-2 flex-1 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                shape === "circle"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Circle className="h-3.5 w-3.5" />
              <span>Circle</span>
            </button>
            <button
              onClick={() => setShape("square")}
              className={`flex items-center justify-center gap-2 flex-1 py-2 text-xs font-medium transition-all duration-200 cursor-pointer border-l border-border/30 ${
                shape === "square"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>Square</span>
            </button>
          </div>
        </div>

        {/* Marker Size slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Marker Size
            </label>
            <span className="text-[10px] font-mono text-primary">{size}px</span>
          </div>
          <input
            type="range"
            min={5}
            max={40}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full h-1.5 rounded-full bg-secondary/60 appearance-none cursor-pointer accent-primary"
          />
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/60">5px</span>
            <span className="text-[9px] text-muted-foreground/60">40px</span>
          </div>
        </div>

        {/* Border Width slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Grosime Contur
            </label>
            <span className="text-[10px] font-mono text-primary">{borderWidth}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={8}
            value={borderWidth}
            onChange={(e) => setBorderWidth(Number(e.target.value))}
            className="w-full h-1.5 rounded-full bg-secondary/60 appearance-none cursor-pointer accent-primary"
          />
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/60">0px</span>
            <span className="text-[9px] text-muted-foreground/60">8px</span>
          </div>
        </div>

        {/* Fill Color */}
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Fill Color
          </label>
          <ColorPicker color={fillColor} onChange={setFillColor} />
        </div>

        {/* Live Preview */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Preview
          </label>
          <div className="flex items-center justify-center h-20 rounded-lg border border-border/40 bg-secondary/10">
            <div
              style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: fillColor,
                borderRadius: shape === "circle" ? "50%" : "2px",
                border: borderWidth > 0 ? `${borderWidth}px solid rgba(255,255,255,0.9)` : "none",
                boxShadow: `0 0 ${Math.max(size * 0.4, 4)}px ${fillColor}60`,
                transition: "all 0.2s ease",
              }}
            />
          </div>
        </div>
      </div>
    </SidebarSection>
  )
}
