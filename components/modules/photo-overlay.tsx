"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { T, I } from '@/components/ui-constants'
import { Section, SliderRow, Toggle } from '@/components/shared-controls'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/tiff']

function ImgIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <circle cx="9" cy="9" r="2"/>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  )
}

export default function PhotoOverlayModule() {
  const [enabled, setEnabled] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(0.5)
  const [dragging, setDragging] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevUrlRef = useRef<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => () => { if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current) }, [])

  const loadFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) return
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    const url = URL.createObjectURL(file)
    prevUrlRef.current = url
    setImageSrc(url)
    setEnabled(true)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [loadFile])

  const handleRemove = () => {
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    prevUrlRef.current = null
    setImageSrc(null)
    setEnabled(false)
  }

  return (
    <>
      {/* Fullscreen overlay — portalled to document.body, above map (z-40), below sidebar (z-20 is sidebar but overlay is pointer-events:none so OK) */}
      {mounted && enabled && imageSrc && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            pointerEvents: 'none',
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity,
          }}
        />,
        document.body
      )}

      {/* Sidebar section */}
      <Section
        title="Photo Overlay"
        icon={<ImgIcon />}
        extra={
          <div onClick={e => e.stopPropagation()}>
            <Toggle label="" value={enabled} onChange={setEnabled} />
          </div>
        }
      >
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            borderRadius: 8,
            border: `2px dashed ${dragging ? T.primary : T.glassBorder}`,
            background: dragging ? 'rgba(0,212,232,0.08)' : 'rgba(40,44,70,0.4)',
            padding: '18px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            gap: 6,
            transition: 'border-color .15s, background .15s',
            position: 'relative' as const,
            overflow: 'hidden',
          }}
        >
          {imageSrc && (
            <img
              src={imageSrc}
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.22, pointerEvents: 'none',
              }}
            />
          )}
          <span style={{ position: 'relative', color: dragging ? T.primary : T.muted, transition: 'color .15s' }}>
            <ImgIcon />
          </span>
          <span style={{ position: 'relative', fontSize: 11, color: T.muted, textAlign: 'center' as const, lineHeight: 1.5 }}>
            {imageSrc ? 'Drop new image to replace' : 'Drop image here or click to browse'}
          </span>
          <span style={{ position: 'relative', fontSize: 10, color: T.muted, opacity: 0.55 }}>
            JPG · PNG · TIFF
          </span>
        </div>

        {/* Opacity slider + remove — only when an image is loaded */}
        {imageSrc && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            <SliderRow label="Opacity" value={opacity} onChange={setOpacity} min={0} max={1} step={0.01} />
            <button
              onClick={handleRemove}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                padding: '6px 10px', borderRadius: 6,
                background: 'rgba(255,80,80,0.08)',
                border: '1px solid rgba(255,80,80,0.2)',
                color: '#ff6060', fontSize: 11, cursor: 'pointer',
              }}
            >
              {I.x(12)} Remove image
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.tif,.tiff"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) loadFile(f)
            e.target.value = ''
          }}
        />
      </Section>
    </>
  )
}
