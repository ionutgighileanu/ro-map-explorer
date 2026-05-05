"use client"

import { useState } from "react"
import { Hexagon, X } from "lucide-react"
import SidebarSection from "@/components/sidebar-section"
import ColorPicker from "@/components/color-picker"

const JUDETE = [
  "Alba", "Arad", "Arges", "Bacau", "Bihor", "Bistrita-Nasaud", "Botosani",
  "Braila", "Brasov", "Buzau", "Calarasi", "Caras-Severin", "Cluj",
  "Constanta", "Covasna", "Dambovita", "Dolj", "Galati", "Giurgiu", "Gorj",
  "Harghita", "Hunedoara", "Ialomita", "Iasi", "Ilfov", "Maramures", "Mehedinti",
  "Mures", "Neamt", "Olt", "Prahova", "Salaj", "Satu Mare", "Sibiu", "Suceava",
  "Teleorman", "Timis", "Tulcea", "Valcea", "Vaslui", "Vrancea",
]

const SECTORS = [
  "Sector 1", "Sector 2", "Sector 3", "Sector 4", "Sector 5", "Sector 6",
]

interface HighlightedRegion {
  id: string
  name: string
  color: string
}

export default function GeometryModule() {
  // Romania border
  const [showRomaniaBorder, setShowRomaniaBorder] = useState(false)
  const [romaniaBorderColor, setRomaniaBorderColor] = useState("#00e5ff")

  // Bucharest mode
  const [bucharestMode, setBucharestMode] = useState<"whole" | "individual">("whole")
  const [wholeBucharestColor, setWholeBucharestColor] = useState("#7c4dff")
  const [selectedSector, setSelectedSector] = useState("")
  const [sectorColor, setSectorColor] = useState("#ff4081")

  // Judet selection
  const [selectedJudet, setSelectedJudet] = useState("")
  const [judetColor, setJudetColor] = useState("#76ff03")

  // Highlighted regions list
  const [regions, setRegions] = useState<HighlightedRegion[]>([])

  const handleAddRegion = (name: string, color: string) => {
    if (!name || regions.some((r) => r.name === name)) return
    setRegions([...regions, { id: Date.now().toString(), name, color }])
  }

  const handleRemoveRegion = (id: string) => {
    setRegions(regions.filter((r) => r.id !== id))
  }

  const handleRegionColorChange = (id: string, color: string) => {
    setRegions(regions.map((r) => (r.id === id ? { ...r, color } : r)))
  }

  return (
    <SidebarSection title="Geometry" icon={<Hexagon className="h-4 w-4" />}>
      <div className="flex flex-col gap-4">
        {/* Romania Border */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground font-medium">Romania Border</span>
            <button
              onClick={() => setShowRomaniaBorder(!showRomaniaBorder)}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 cursor-pointer ${
                showRomaniaBorder ? "bg-primary" : "bg-secondary"
              }`}
              role="switch"
              aria-checked={showRomaniaBorder}
              aria-label="Toggle Romania border"
            >
              <span
                className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-foreground transition-transform duration-200 ${
                  showRomaniaBorder ? "translate-x-[18px]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {showRomaniaBorder && (
            <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
              <span className="text-[11px] text-muted-foreground">Border Color</span>
              <ColorPicker color={romaniaBorderColor} onChange={setRomaniaBorderColor} />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/30" />

        {/* Bucharest mode switch */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-foreground font-medium">Bucharest</span>
          <div className="flex bg-secondary/50 rounded-lg p-0.5">
            <button
              onClick={() => setBucharestMode("whole")}
              className={`flex-1 text-[11px] py-1.5 rounded-md transition-all cursor-pointer ${
                bucharestMode === "whole"
                  ? "bg-primary/20 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Whole Bucharest
            </button>
            <button
              onClick={() => setBucharestMode("individual")}
              className={`flex-1 text-[11px] py-1.5 rounded-md transition-all cursor-pointer ${
                bucharestMode === "individual"
                  ? "bg-primary/20 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Individual Sectors
            </button>
          </div>

          {bucharestMode === "whole" ? (
            <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
              <span className="text-[11px] text-muted-foreground">Fill Color</span>
              <div className="flex items-center gap-2">
                <ColorPicker color={wholeBucharestColor} onChange={setWholeBucharestColor} />
                <button
                  onClick={() => handleAddRegion("Bucuresti", wholeBucharestColor)}
                  className="text-[10px] bg-primary/15 text-primary px-2 py-1 rounded-md hover:bg-primary/25 transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full bg-input/60 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-card text-foreground">
                  Select Sector
                </option>
                {SECTORS.map((s) => (
                  <option key={s} value={s} className="bg-card text-foreground">
                    {s}
                  </option>
                ))}
              </select>
              {selectedSector && (
                <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">{selectedSector} Color</span>
                  <div className="flex items-center gap-2">
                    <ColorPicker color={sectorColor} onChange={setSectorColor} />
                    <button
                      onClick={() => {
                        handleAddRegion(`Bucuresti ${selectedSector}`, sectorColor)
                        setSelectedSector("")
                      }}
                      className="text-[10px] bg-primary/15 text-primary px-2 py-1 rounded-md hover:bg-primary/25 transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/30" />

        {/* Judet selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-foreground font-medium">County (Judet)</span>
          <select
            value={selectedJudet}
            onChange={(e) => setSelectedJudet(e.target.value)}
            className="w-full bg-input/60 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
          >
            <option value="" className="bg-card text-foreground">
              Select County
            </option>
            {JUDETE.map((judet) => (
              <option key={judet} value={judet} className="bg-card text-foreground">
                {judet}
              </option>
            ))}
          </select>
          {selectedJudet && (
            <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
              <span className="text-[11px] text-muted-foreground">{selectedJudet} Color</span>
              <div className="flex items-center gap-2">
                <ColorPicker color={judetColor} onChange={setJudetColor} />
                <button
                  onClick={() => {
                    handleAddRegion(selectedJudet, judetColor)
                    setSelectedJudet("")
                  }}
                  className="text-[10px] bg-primary/15 text-primary px-2 py-1 rounded-md hover:bg-primary/25 transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        {regions.length > 0 && <div className="h-px bg-border/30" />}

        {/* Highlighted regions list */}
        {regions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Highlighted Regions</span>
            {regions.map((region) => (
              <div
                key={region.id}
                className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2 group"
              >
                <div className="flex items-center gap-2.5">
                  <ColorPicker
                    color={region.color}
                    onChange={(c) => handleRegionColorChange(region.id, c)}
                  />
                  <span className="text-xs font-medium text-foreground">{region.name}</span>
                </div>
                <button
                  onClick={() => handleRemoveRegion(region.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label={`Remove ${region.name}`}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarSection>
  )
}
