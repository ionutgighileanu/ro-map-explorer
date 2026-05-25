"use client"

import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { T } from '@/components/ui-constants'
import { Section, SliderRow, Toggle } from '@/components/shared-controls'
import ColorPicker from '@/components/color-picker'
import { useMap } from '@/context/map-context'

function LayoutIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>
  )
}

function SubSection({ title, enabled, onToggle, children }: {
  title: string
  enabled: boolean
  onToggle: (v: boolean) => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ borderRadius: 6, border: `1px solid ${T.glassBorder}`, overflow: 'hidden', background: 'rgba(40,44,70,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', gap: 8 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.fg }}
        >
          <span style={{ display: 'flex', transition: 'transform .2s', transform: open ? 'rotate(0)' : 'rotate(-90deg)', color: T.muted }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.07em' }}>{title}</span>
        </button>
        <div onClick={e => e.stopPropagation()}>
          <Toggle label="" value={enabled} onChange={onToggle} />
        </div>
      </div>
      {open && (
        <div style={{ padding: '8px 10px', borderTop: `1px solid ${T.glassBorder}`, display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function SliderNumRow({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: T.muted, minWidth: 55, whiteSpace: 'nowrap' as const }}>{label}</span>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, height: 4, accentColor: T.primary, cursor: 'pointer' }}
      />
      <input
        type="number" min={min} max={max} value={value}
        onChange={e => {
          const v = parseInt(e.target.value)
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)))
        }}
        style={{ width: 36, background: 'rgba(40,44,70,0.5)', border: `1px solid ${T.glassBorder}`, borderRadius: 5, padding: '2px 4px', color: T.fg, fontSize: 10, outline: 'none', fontFamily: 'monospace', textAlign: 'right' as const }}
      />
    </div>
  )
}

function NumInput({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: T.muted, minWidth: 55, whiteSpace: 'nowrap' as const }}>{label}</span>
      <input
        type="number" min={min} max={max} value={value}
        onChange={e => {
          const v = parseInt(e.target.value)
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)))
        }}
        style={{ flex: 1, background: 'rgba(40,44,70,0.5)', border: `1px solid ${T.glassBorder}`, borderRadius: 5, padding: '3px 7px', color: T.fg, fontSize: 11, outline: 'none', fontFamily: 'monospace' }}
      />
    </div>
  )
}

function CrosshairOverlay({ color, thickness, opacity, rect }: {
  color: string; thickness: number; opacity: number; rect: DOMRect
}) {
  const alpha = opacity / 100
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
      <div style={{
        position: 'absolute',
        left: Math.round(cx - thickness / 2),
        top: rect.top,
        width: thickness,
        height: rect.height,
        background: color,
        opacity: alpha,
      }} />
      <div style={{
        position: 'absolute',
        left: rect.left,
        top: Math.round(cy - thickness / 2),
        width: rect.width,
        height: thickness,
        background: color,
        opacity: alpha,
      }} />
    </div>
  )
}

function GridOverlay({ columns, rows, gutter, margin, color, opacity, rect }: {
  columns: number; rows: number; gutter: number; margin: number; color: string; opacity: number; rect: DOMRect
}) {
  const alpha = opacity / 100
  const availW = Math.max(0, rect.width - 2 * margin)
  const availH = Math.max(0, rect.height - 2 * margin)
  const colW = Math.max(0, columns > 1 ? (availW - (columns - 1) * gutter) / columns : availW)
  const rowH = Math.max(0, rows > 1 ? (availH - (rows - 1) * gutter) / rows : availH)

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
      {Array.from({ length: columns }, (_, i) => (
        <div key={`c${i}`} style={{
          position: 'absolute',
          left: Math.round(rect.left + margin + i * (colW + gutter)),
          top: rect.top + margin,
          width: Math.round(colW),
          height: availH,
          background: color,
          opacity: alpha,
        }} />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <div key={`r${i}`} style={{
          position: 'absolute',
          left: rect.left + margin,
          top: Math.round(rect.top + margin + i * (rowH + gutter)),
          width: availW,
          height: Math.round(rowH),
          background: color,
          opacity: alpha,
        }} />
      ))}
    </div>
  )
}

export default function LayoutModule() {
  const { map } = useMap()
  const [mapRect, setMapRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  const [crosshairEnabled, setCrosshairEnabled] = useState(false)
  const [crosshairColor, setCrosshairColor] = useState('#00d4e8')
  const [crosshairThickness, setCrosshairThickness] = useState(1)
  const [crosshairOpacity, setCrosshairOpacity] = useState(80)

  const [gridEnabled, setGridEnabled] = useState(false)
  const [gridColumns, setGridColumns] = useState(12)
  const [gridRows, setGridRows] = useState(12)
  const [gridGutter, setGridGutter] = useState(16)
  const [gridMargin, setGridMargin] = useState(32)
  const [gridColor, setGridColor] = useState('#00d4e8')
  const [gridOpacity, setGridOpacity] = useState(10)

  useEffect(() => {
    const update = () => {
      if (map) setMapRect(map.getContainer().getBoundingClientRect())
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [map])

  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      {mounted && crosshairEnabled && mapRect && createPortal(
        <CrosshairOverlay color={crosshairColor} thickness={crosshairThickness} opacity={crosshairOpacity} rect={mapRect} />,
        document.body
      )}
      {mounted && gridEnabled && mapRect && createPortal(
        <GridOverlay
          columns={gridColumns} rows={gridRows}
          gutter={gridGutter} margin={gridMargin}
          color={gridColor} opacity={gridOpacity}
          rect={mapRect}
        />,
        document.body
      )}

      <Section title="Layout" icon={<LayoutIcon />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          <SubSection title="Center Crosshair" enabled={crosshairEnabled} onToggle={setCrosshairEnabled}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ColorPicker color={crosshairColor} onChange={setCrosshairColor} label="Color" />
            </div>
            <SliderRow label="Thickness" value={crosshairThickness} onChange={setCrosshairThickness} min={1} max={5} step={1} />
            <SliderRow label="Opacity %" value={crosshairOpacity} onChange={setCrosshairOpacity} min={0} max={100} step={1} />
          </SubSection>

          <SubSection title="Layout Grid" enabled={gridEnabled} onToggle={setGridEnabled}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ColorPicker color={gridColor} onChange={setGridColor} label="Color" />
            </div>
            <SliderRow label="Opacity %" value={gridOpacity} onChange={setGridOpacity} min={0} max={100} step={1} />
            <SliderNumRow label="Columns" value={gridColumns} onChange={setGridColumns} min={1} max={24} />
            <SliderNumRow label="Rows" value={gridRows} onChange={setGridRows} min={1} max={24} />
            <NumInput label="Gutter px" value={gridGutter} onChange={setGridGutter} min={0} max={200} />
            <NumInput label="Margin px" value={gridMargin} onChange={setGridMargin} min={0} max={400} />
          </SubSection>

        </div>
      </Section>
    </>
  )
}
