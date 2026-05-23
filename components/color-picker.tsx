"use client"

import { useState, useRef, useEffect } from 'react'
import { T } from '@/components/ui-constants'

const hexToRgb = (h: string): [number,number,number] => { const n=parseInt(h.replace('#',''),16); return [(n>>16)&255,(n>>8)&255,n&255] }
const rgbToHex = (r: number,g: number,b: number) => '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('')
const rgbToHsv = (r: number,g: number,b: number): [number,number,number] => { r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d+6)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;}return[h,mx?d/mx:0,mx] }
const hsvToRgb = (h: number,s: number,v: number): [number,number,number] => { const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return[Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)] }

const parseColorInput = (c: string): { hex: string; opacity: number } => {
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/)
  if (m) {
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1
    return { hex: rgbToHex(+m[1], +m[2], +m[3]), opacity: Math.round(a * 100) }
  }
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return { hex: c, opacity: 100 }
  return { hex: '#d9d9d9', opacity: 100 }
}

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
}

export default function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const { hex: parsedHex, opacity: parsedOpacity } = parseColorInput(color)
  const [h0,s0,v0] = rgbToHsv(...hexToRgb(parsedHex))
  const [hue, setHue] = useState(h0)
  const [sat, setSat] = useState(s0)
  const [val, setVal] = useState(v0)
  const [hexIn, setHexIn] = useState(parsedHex.slice(1).toUpperCase())
  const [opacity, setOpacity] = useState(parsedOpacity)
  const [opIn, setOpIn] = useState(String(parsedOpacity))

  useEffect(() => {
    const { hex: h, opacity: op } = parseColorInput(color)
    const [r,g,b] = hexToRgb(h)
    const [hh,s,v] = rgbToHsv(r,g,b)
    if(v>0&&s>0) setHue(hh)
    setSat(s); setVal(v)
    setHexIn(h.slice(1).toUpperCase())
    setOpacity(op); setOpIn(String(op))
  }, [color])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openPicker = () => {
    if (open) { setOpen(false); return }
    const r = dotRef.current?.getBoundingClientRect()
    if (r) {
      const popH = 270, popW = 244
      let top = r.bottom + 6, left = r.left
      if (top + popH > window.innerHeight) top = r.top - popH - 6
      if (left + popW > window.innerWidth) left = window.innerWidth - popW - 8
      if (left < 4) left = 4
      setPos({ top, left })
    }
    setOpen(true)
  }

  const mkDrag = (fn: (e: MouseEvent) => void) => (e: React.MouseEvent) => {
    e.preventDefault(); fn(e.nativeEvent)
    const mv = (ev: MouseEvent) => fn(ev)
    const up = () => { window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up) }
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up)
  }

  const buildOutput = (h: number, s: number, v: number, op: number): string => {
    const [r,g,b] = hsvToRgb(h,s,v)
    if (op >= 100) return rgbToHex(r,g,b)
    return `rgba(${r},${g},${b},${+(op/100).toFixed(2)})`
  }

  const commit = (h: number, s: number, v: number, op: number) => {
    const out = buildOutput(h,s,v,op)
    onChange(out)
    setHexIn(rgbToHex(...hsvToRgb(h,s,v)).slice(1).toUpperCase())
  }

  const svDrag = mkDrag(e => {
    const r = cvRef.current?.getBoundingClientRect(); if(!r) return
    const x = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)), y = Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))
    setSat(x); setVal(1-y); commit(hue,x,1-y,opacity)
  })

  const hueDrag = mkDrag(e => {
    const el = ref.current?.querySelector('[data-hue]') as HTMLElement; if(!el) return
    const r = el.getBoundingClientRect()
    const x = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))
    setHue(x*360); commit(x*360,sat,val,opacity)
  })

  const alphaDrag = mkDrag(e => {
    const el = ref.current?.querySelector('[data-alpha]') as HTMLElement; if(!el) return
    const r = el.getBoundingClientRect()
    const x = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))
    const op = Math.round(x*100)
    setOpacity(op); setOpIn(String(op)); commit(hue,sat,val,op)
  })

  const hexSubmit = () => {
    let v = hexIn.replace('#','').trim()
    if(v.length===3) v=v.split('').map(c=>c+c).join('')
    if(/^[0-9a-fA-F]{6}$/.test(v)) {
      const hex = '#'+v.toLowerCase()
      const [r,g,b] = hexToRgb(hex)
      const [hh,s,vv] = rgbToHsv(r,g,b)
      if(vv>0&&s>0) setHue(hh)
      setSat(s); setVal(vv)
      const out = opacity >= 100 ? hex : `rgba(${r},${g},${b},${+(opacity/100).toFixed(2)})`
      onChange(out)
    } else {
      setHexIn(parsedHex.slice(1).toUpperCase())
    }
  }

  const opSubmit = () => {
    const v = Math.max(0, Math.min(100, parseInt(opIn) || 0))
    setOpacity(v); setOpIn(String(v)); commit(hue,sat,val,v)
  }

  const pH = rgbToHex(...hsvToRgb(hue,1,1))
  const [cr,cg,cb] = hsvToRgb(hue,sat,val)
  const dotBg = /^#[0-9a-fA-F]{6}$/.test(color) || /^rgba?\(/.test(color) ? color : '#d9d9d9'

  return (
    <div style={{position:'relative',display:'flex',alignItems:'center',gap:6}}>
      <div ref={dotRef} onClick={openPicker} className="cdot" style={{width:14,height:14,borderRadius:6,background:dotBg,border:'1px solid rgba(255,255,255,0.15)',cursor:'pointer',flexShrink:0}}/>
      {label && <span style={{fontSize:12,color:T.fg,whiteSpace:'nowrap'}}>{label}</span>}

      {open && (
        <div ref={ref} style={{position:'fixed',top:pos.top,left:pos.left,zIndex:999999,background:'#2c2c2c',border:'1px solid #444',borderRadius:8,padding:12,width:244,boxShadow:'0 12px 40px rgba(0,0,0,.6)',display:'flex',flexDirection:'column',gap:10}}>

          {/* HSV square */}
          <div ref={cvRef} onMouseDown={svDrag} style={{position:'relative',width:220,height:150,borderRadius:6,cursor:'crosshair',overflow:'hidden',border:'1px solid #555'}}>
            <div style={{position:'absolute',inset:0,background:pH}}/>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to right,#fff,transparent)'}}/>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent,#000)'}}/>
            <div style={{position:'absolute',left:`${sat*100}%`,top:`${(1-val)*100}%`,width:12,height:12,borderRadius:'50%',border:'2px solid #fff',boxShadow:'0 0 3px rgba(0,0,0,.5)',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
          </div>

          {/* Hue slider */}
          <div data-hue onMouseDown={hueDrag} style={{position:'relative',width:220,height:12,borderRadius:6,cursor:'pointer',background:'linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)'}}>
            <div style={{position:'absolute',left:`${(hue/360)*100}%`,top:'50%',width:14,height:14,borderRadius:'50%',border:'2px solid #fff',boxShadow:'0 0 3px rgba(0,0,0,.5)',transform:'translate(-50%,-50%)',background:pH,pointerEvents:'none'}}/>
          </div>

          {/* Opacity (alpha) slider */}
          <div data-alpha onMouseDown={alphaDrag} style={{position:'relative',width:220,height:12,borderRadius:6,cursor:'pointer'}}>
            <div style={{position:'absolute',inset:0,borderRadius:6,backgroundImage:'linear-gradient(45deg,#888 25%,transparent 25%),linear-gradient(-45deg,#888 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#888 75%),linear-gradient(-45deg,transparent 75%,#888 75%)',backgroundSize:'8px 8px',backgroundPosition:'0 0,0 4px,4px -4px,-4px 0'}}/>
            <div style={{position:'absolute',inset:0,borderRadius:6,background:`linear-gradient(to right,rgba(${cr},${cg},${cb},0),rgba(${cr},${cg},${cb},1))`}}/>
            <div style={{position:'absolute',left:`${opacity}%`,top:'50%',width:14,height:14,borderRadius:'50%',border:'2px solid #fff',boxShadow:'0 0 3px rgba(0,0,0,.5)',transform:'translate(-50%,-50%)',background:`rgba(${cr},${cg},${cb},${opacity/100})`,pointerEvents:'none'}}/>
          </div>

          {/* Hex input + opacity + eyedropper */}
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <div className="hex-input" style={{display:'flex',alignItems:'center',background:'#3a3a3a',borderRadius:6,border:'1px solid #555',flex:1,overflow:'hidden'}}>
              <span style={{fontSize:11,color:'#777',padding:'0 4px 0 8px',userSelect:'none',fontFamily:'monospace'}}>#</span>
              <input value={hexIn}
                onChange={e=>setHexIn(e.target.value.toUpperCase().replace(/[^0-9A-F]/g,'').slice(0,6))}
                onBlur={hexSubmit} onKeyDown={e=>e.key==='Enter'&&hexSubmit()}
                style={{background:'transparent',border:'none',outline:'none',color:'#eee',fontSize:12,padding:'0 4px 0 0',width:56,fontFamily:'monospace'}}
                maxLength={6}/>
            </div>
            <div style={{display:'flex',alignItems:'center',background:'#3a3a3a',borderRadius:6,border:'1px solid #555',overflow:'hidden',flexShrink:0}}>
              <input
                value={opIn}
                onChange={e=>setOpIn(e.target.value.replace(/[^0-9]/g,'').slice(0,3))}
                onBlur={opSubmit}
                onKeyDown={e=>e.key==='Enter'&&opSubmit()}
                style={{background:'transparent',border:'none',outline:'none',color:'#eee',fontSize:12,padding:'0 2px 0 6px',width:28,fontFamily:'monospace',textAlign:'right'}}
                maxLength={3}
              />
              <span style={{fontSize:11,color:'#777',padding:'0 6px 0 1px',userSelect:'none',fontFamily:'monospace'}}>%</span>
            </div>
            <button
              onClick={async () => {
                if (!(window as unknown as {EyeDropper?:unknown}).EyeDropper) return
                try {
                  const result = await new (window as unknown as {EyeDropper:new()=>{open:()=>Promise<{sRGBHex:string}>}}).EyeDropper().open()
                  onChange(result.sRGBHex); setOpen(false)
                } catch {}
              }}
              title="Pick color from screen"
              style={{width:28,height:28,borderRadius:6,background:'#3a3a3a',border:'1px solid #555',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9"/><path d="m15 6 3 3"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
