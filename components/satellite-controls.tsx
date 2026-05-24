"use client"

import { useState } from 'react'
import { T, I } from '@/components/ui-constants'
import { Toggle, SliderRow } from '@/components/shared-controls'

export interface SatelliteSettings {
  // Master override
  emptyMap: boolean
  // Symbol label toggles
  allLabels: boolean
  placesLabels: boolean
  regionsLabels: boolean
  subregionsLabels: boolean
  countriesLabels: boolean
  watersLabels: boolean
  roadsLabels: boolean
  poiLabels: boolean
  // Line / fill overlay toggles
  roadsVisual: boolean
  borderCountries: boolean
  borderAdmin: boolean
  waterOutlines: boolean
  // Visual effects
  terrain3D: boolean
  terrainExaggeration: number
  sky: boolean
}

export const defaultSatelliteSettings: SatelliteSettings = {
  emptyMap: false,
  allLabels: true,
  placesLabels: true,
  regionsLabels: true,
  subregionsLabels: true,
  countriesLabels: true,
  watersLabels: true,
  roadsLabels: true,
  poiLabels: true,
  roadsVisual: true,
  borderCountries: true,
  borderAdmin: true,
  waterOutlines: true,
  terrain3D: false,
  terrainExaggeration: 1.5,
  sky: false,
}

interface SatelliteControlsProps {
  settings: SatelliteSettings
  onChange: (s: SatelliteSettings) => void
}

export default function SatelliteControls({ settings, onChange }: SatelliteControlsProps) {
  const [open, setOpen] = useState(true)
  const u = <K extends keyof SatelliteSettings>(k: K, v: SatelliteSettings[K]) =>
    onChange({ ...settings, [k]: v })

  const dimmed = settings.emptyMap

  return (
    <div style={{ borderTop: `1px solid ${T.glassBorder}`, marginTop: 2 }}>
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ color: T.primary }}>{I.sat(14)}</span>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', flex: 1, textAlign: 'left', color: T.muted }}>
          Satellite Controls
        </span>
        <span style={{ transition: 'transform .2s', transform: open ? 'rotate(0)' : 'rotate(-90deg)', display: 'flex', color: T.muted }}>
          {I.chevron(12)}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>

          {/* Harta goala — master override */}
          <div style={{
            background: dimmed ? 'rgba(0,212,232,0.08)' : T.secondary,
            borderRadius: 8, padding: '8px 10px',
            border: dimmed ? '1px solid rgba(0,212,232,0.25)' : `1px solid ${T.glassBorder}`,
            transition: 'all .2s',
          }}>
            <Toggle label="Harta goala" value={settings.emptyMap} onChange={v => u('emptyMap', v)} />
          </div>

          {/* Rest of controls — dimmed when emptyMap is ON */}
          <div style={{ opacity: dimmed ? 0.4 : 1, transition: 'opacity .2s', display: 'flex', flexDirection: 'column', gap: 5, pointerEvents: dimmed ? 'none' : 'auto' }}>

            {/* Labels */}
            <div style={{ background: T.secondary, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Toggle label="All Labels" value={settings.allLabels} onChange={v => u('allLabels', v)} />
              {settings.allLabels && (
                <div style={{ paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 4, borderLeft: `2px solid rgba(0,212,232,0.2)` }}>
                  <Toggle label="Places" value={settings.placesLabels} onChange={v => u('placesLabels', v)} />
                  <Toggle label="Regions" value={settings.regionsLabels} onChange={v => u('regionsLabels', v)} />
                  <Toggle label="Subregions" value={settings.subregionsLabels} onChange={v => u('subregionsLabels', v)} />
                  <Toggle label="Countries" value={settings.countriesLabels} onChange={v => u('countriesLabels', v)} />
                  <Toggle label="Waters" value={settings.watersLabels} onChange={v => u('watersLabels', v)} />
                  <Toggle label="Roads" value={settings.roadsLabels} onChange={v => u('roadsLabels', v)} />
                  <Toggle label="POI" value={settings.poiLabels} onChange={v => u('poiLabels', v)} />
                </div>
              )}
            </div>

            {/* Overlay layers */}
            <div style={{ background: T.secondary, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Toggle label="Drumuri vizuale" value={settings.roadsVisual} onChange={v => u('roadsVisual', v)} />
              <Toggle label="Granite tari" value={settings.borderCountries} onChange={v => u('borderCountries', v)} />
              <Toggle label="Delimitari admin." value={settings.borderAdmin} onChange={v => u('borderAdmin', v)} />
              <Toggle label="Ape (contur)" value={settings.waterOutlines} onChange={v => u('waterOutlines', v)} />
            </div>

            {/* Visual effects */}
            <div style={{ background: T.secondary, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Toggle label="3D Terrain" value={settings.terrain3D} onChange={v => u('terrain3D', v)} />
              {settings.terrain3D && (
                <SliderRow label="Exaggeration" value={settings.terrainExaggeration} onChange={v => u('terrainExaggeration', v)} min={0.5} max={3} step={0.1} />
              )}
              <div style={{ height: 1, background: T.glassBorder }} />
              <Toggle label="Sky / Atmosphere" value={settings.sky} onChange={v => u('sky', v)} />
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
