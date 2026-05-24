"use client"

import { useState, type ReactNode, type CSSProperties } from 'react'
import { T, IB, I } from '@/components/ui-constants'
import type { PointStyle, LabelStyle, LineStyle } from '@/components/ui-constants'
import ColorPicker from '@/components/color-picker'

export { type PointStyle, type LabelStyle, type LineStyle }

export function useToggleSet(): [Set<string>, (id: string) => void] {
  const [s, set] = useState<Set<string>>(new Set())
  return [s, (id: string) => set(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })]
}

export function Section({ title, icon, children, defaultOpen = false, extra }: { title: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean; extra?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{borderBottom:`1px solid ${T.glassBorder}`}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px'}}>
        <button onClick={()=>setOpen(!open)} className="sec-btn" style={{display:'flex',alignItems:'center',gap:10,flex:1,background:'none',border:'none',cursor:'pointer',color:T.muted,padding:0}}>
          <span style={{color:T.primary}}>{icon}</span>
          <span style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em'}}>{title}</span>
        </button>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {extra}
          <span onClick={()=>setOpen(!open)} style={{transition:'transform .2s',transform:open?'rotate(0)':'rotate(-90deg)',display:'flex',cursor:'pointer',color:T.muted}}>{I.chevron()}</span>
        </div>
      </div>
      {open && <div style={{padding:'0 20px 16px'}}>{children}</div>}
    </div>
  )
}

export function SliderRow({ label, value, onChange, min=0, max=20, step=1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <span style={{fontSize:10,color:T.muted,minWidth:55,whiteSpace:'nowrap'}}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} style={{flex:1,height:4,accentColor:T.primary,cursor:'pointer'}}/>
      <span style={{fontSize:10,color:T.muted,minWidth:22,textAlign:'right',fontFamily:'monospace'}}>{typeof value==='number'&&value%1!==0?value.toFixed(2):value}</span>
    </div>
  )
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <span style={{fontSize:10,color:T.muted}}>{label}</span>
      <div onClick={()=>onChange(!value)} className="tog-track" style={{width:28,height:16,borderRadius:8,background:value?T.primary:'#444',cursor:'pointer',position:'relative'}}>
        <div className="tog-thumb" style={{width:12,height:12,borderRadius:6,background:'#fff',position:'absolute',top:2,left:value?14:2}}/>
      </div>
    </div>
  )
}

export function Sub({ children }: { children: ReactNode }) {
  return (
    <div style={{display:'flex',alignItems:'center',marginTop:4}}>
      <span style={{fontSize:11,color:T.primary,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',background:'rgba(0,212,232,0.12)',padding:'4px 10px',borderRadius:6}}>{children}</span>
    </div>
  )
}

export interface FillConfig { enabled: boolean; color: string; opacity: number }
export interface ShapeConfig { enabled: boolean; color: string; width: number }

export const mkFill = (color = '#00e5ff'): FillConfig => ({ enabled: true, color, opacity: 1 })
export const mkShape = (color = '#00e5ff'): ShapeConfig => ({ enabled: false, color, width: 2 })

export function ShapeFillCtrl({ s, onChange }: { s: { filled: FillConfig; shape: ShapeConfig }; onChange: (s: { filled: FillConfig; shape: ShapeConfig }) => void }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:5}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:10,color:T.muted,flex:1}}>Filled</span>
        {s.filled.enabled && <ColorPicker color={s.filled.color} onChange={c=>onChange({...s,filled:{...s.filled,color:c}})} label="Fill"/>}
        <div onClick={()=>onChange({...s,filled:{...s.filled,enabled:!s.filled.enabled}})} className="tog-track" style={{width:28,height:16,borderRadius:8,background:s.filled.enabled?T.primary:'#444',cursor:'pointer',position:'relative',flexShrink:0}}>
          <div className="tog-thumb" style={{width:12,height:12,borderRadius:6,background:'#fff',position:'absolute',top:2,left:s.filled.enabled?14:2,transition:'left .15s'}}/>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:10,color:T.muted,flex:1}}>Shape</span>
        {s.shape.enabled && <ColorPicker color={s.shape.color} onChange={c=>onChange({...s,shape:{...s.shape,color:c}})} label="Line"/>}
        <div onClick={()=>onChange({...s,shape:{...s.shape,enabled:!s.shape.enabled}})} className="tog-track" style={{width:28,height:16,borderRadius:8,background:s.shape.enabled?T.primary:'#444',cursor:'pointer',position:'relative',flexShrink:0}}>
          <div className="tog-thumb" style={{width:12,height:12,borderRadius:6,background:'#fff',position:'absolute',top:2,left:s.shape.enabled?14:2,transition:'left .15s'}}/>
        </div>
      </div>
      {s.shape.enabled && <SliderRow label="Width" value={s.shape.width} onChange={v=>onChange({...s,shape:{...s.shape,width:v}})} min={1} max={10}/>}
    </div>
  )
}

export function ModeToggle({ mode, onChange }: { mode: 'filled' | 'shape'; onChange: (m: 'filled' | 'shape') => void }) {
  return (
    <div style={{display:'flex',borderRadius:5,overflow:'hidden',border:`1px solid ${T.glassBorder}`,background:'rgba(40,44,70,0.5)',fontSize:9,fontWeight:500,flexShrink:0}}>
      {(['filled','shape'] as const).map(m=>(
        <button key={m} className="mode-btn" onClick={()=>onChange(m)} style={{padding:'2px 7px',background:mode===m?'rgba(0,212,232,0.15)':'none',color:mode===m?T.primary:T.muted,border:'none',cursor:'pointer',textTransform:'capitalize'}}>{m}</button>
      ))}
    </div>
  )
}

export function Accordion({ name, isOpen, onToggle, onRemove, children, extra }: { name: string; isOpen: boolean; onToggle: () => void; onRemove?: () => void; children?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="item-group" style={{background:T.secondary,borderRadius:8}}>
      <div className="acc-row" style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:isOpen?'8px 8px 0 0':'8px'}}>
        <button onClick={onToggle} style={{display:'flex',alignItems:'center',gap:8,flex:1,background:'none',border:'none',cursor:'pointer',color:T.fg,padding:0,minWidth:0}}>
          <span style={{transition:'transform .2s',transform:isOpen?'rotate(0)':'rotate(-90deg)',display:'flex',flexShrink:0}}>{I.chevron()}</span>
          <span style={{fontSize:12,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </button>
        {extra}
        {onRemove && <button onClick={onRemove} className="rm-btn" style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:0}}>{I.x(12)}</button>}
      </div>
      {isOpen && <div style={{padding:'0 10px 10px',borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:8,display:'flex',flexDirection:'column',gap:8}}>{children}</div>}
    </div>
  )
}

const innerBox: CSSProperties = {background:'rgba(255,255,255,0.03)',borderRadius:6,border:'1px solid rgba(255,255,255,0.05)',padding:'8px 10px',display:'flex',flexDirection:'column',gap:7}

export function PointCtrl({ s, onChange }: { s: PointStyle; onChange: (s: PointStyle) => void }) {
  const u = (k: keyof PointStyle, v: PointStyle[keyof PointStyle]) => onChange({...s,[k]:v} as PointStyle)
  return (
    <>
      <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.color} onChange={c=>u('color',c)} label="Color"/></div>
      <SliderRow label="Size" value={s.size} onChange={v=>u('size',v)} min={1} max={100}/>
      <div style={innerBox}>
        <Toggle label="Shadow" value={s.shadow} onChange={v=>u('shadow',v)}/>
        {s.shadow && <>
          <SliderRow label="Blur" value={s.shadowBlur} onChange={v=>u('shadowBlur',v)} min={0} max={30}/>
          <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.shadowColor} onChange={c=>u('shadowColor',c)} label="Color"/></div>
        </>}
      </div>
      <div style={innerBox}>
        <Toggle label="Outline" value={s.outlineOn} onChange={v=>u('outlineOn',v)}/>
        {s.outlineOn && <>
          <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.outlineColor} onChange={c=>u('outlineColor',c)} label="Color"/></div>
          <SliderRow label="Thickness" value={s.outlineW} onChange={v=>u('outlineW',v)} min={1} max={10}/>
        </>}
      </div>
    </>
  )
}

export function LineCtrl({ s, onChange }: { s: LineStyle; onChange: (s: LineStyle) => void }) {
  const u = (k: keyof LineStyle, v: LineStyle[keyof LineStyle]) => onChange({...s,[k]:v} as LineStyle)
  return (
    <>
      <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.color} onChange={c=>u('color',c)} label="Line Color"/></div>
      <SliderRow label="Width" value={s.width} onChange={v=>u('width',v)} min={1} max={12}/>
      <div style={innerBox}>
        <Toggle label="Shadow" value={s.shadow} onChange={v=>u('shadow',v)}/>
        {s.shadow && <>
          <SliderRow label="Blur" value={s.shadowBlur} onChange={v=>u('shadowBlur',v)} min={0} max={20}/>
          <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.shadowColor} onChange={c=>u('shadowColor',c)} label="Color"/></div>
        </>}
      </div>
      <div style={innerBox}>
        <Toggle label="Outline" value={s.outlineOn} onChange={v=>u('outlineOn',v)}/>
        {s.outlineOn && <>
          <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.outlineColor} onChange={c=>u('outlineColor',c)} label="Color"/></div>
          <SliderRow label="Thickness" value={s.outlineW} onChange={v=>u('outlineW',v)} min={1} max={8}/>
        </>}
      </div>
    </>
  )
}

export function LabelCtrl({ label, onChange }: { label: LabelStyle; onChange: (l: LabelStyle) => void }) {
  const u = (k: keyof LabelStyle, v: LabelStyle[keyof LabelStyle]) => onChange({...label,[k]:v} as LabelStyle)
  const positions = [{id:'top',name:'Top'},{id:'bottom',name:'Bottom'},{id:'left',name:'Left'},{id:'right',name:'Right'}] as const
  return (
    <>
      <Toggle label="Show Label" value={label.enabled} onChange={v=>u('enabled',v)}/>
      {label.enabled && <>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:10,color:T.muted}}>Position</span>
          <div style={{display:'flex',borderRadius:6,overflow:'hidden',border:`1px solid ${T.glassBorder}`,background:'rgba(40,44,70,0.5)'}}>
            {positions.map(p=>(
              <button key={p.id} className="mode-btn" onClick={()=>u('position',p.id)} style={{padding:'3px 8px',fontSize:10,fontWeight:500,background:label.position===p.id?'rgba(0,212,232,0.15)':'none',color:label.position===p.id?T.primary:T.muted,border:'none',cursor:'pointer'}}>{p.name}</button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={label.bgColor} onChange={c=>u('bgColor',c)} label="Background"/></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={label.textColor} onChange={c=>u('textColor',c)} label="Text Color"/></div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <span style={{fontSize:10,color:T.muted}}>Primary Text</span>
          <input className="s-input" value={label.primary} onChange={e=>u('primary',e.target.value)} placeholder="e.g. România" style={{...IB,padding:'6px 10px',fontSize:11}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <span style={{fontSize:10,color:T.muted}}>Secondary Text</span>
          <input className="s-input" value={label.secondary} onChange={e=>u('secondary',e.target.value)} placeholder="e.g. 1%" style={{...IB,padding:'6px 10px',fontSize:11}}/>
        </div>
      </>}
    </>
  )
}
