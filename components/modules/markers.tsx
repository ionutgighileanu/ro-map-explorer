"use client"

import { useState } from 'react'
import { T, IB, AB, ABO, PRESETS, I, mkPt, mkLabel } from '@/components/ui-constants'
import type { PointStyle, LabelStyle } from '@/components/ui-constants'
import { Section, Accordion, PointCtrl, LabelCtrl, Sub, SliderRow, useToggleSet } from '@/components/shared-controls'

interface Marker {
  id: string
  name: string
  style: PointStyle
  label: LabelStyle
  x: number
  y: number
  z: number
}

export default function MarkersModule() {
  const [mIn, setMIn] = useState('')
  const [markers, setMarkers] = useState<Marker[]>([
    {id:'m1',name:'Home',style:mkPt(),label:mkLabel(),x:44.43,y:26.10,z:0}
  ])
  const [openM, togM] = useToggleSet()

  const addM = () => {
    if (!mIn.trim()) return
    const m: Marker = {id:Date.now().toString(),name:mIn.trim(),style:mkPt(PRESETS[markers.length%PRESETS.length]),label:mkLabel(),x:44.43,y:26.10,z:0}
    setMarkers(p=>[...p,m]); setMIn(''); togM(m.id)
  }

  const updM = (id: string, fn: (m: Marker) => Marker) => setMarkers(p=>p.map(m=>m.id===id?fn(m):m))

  return (
    <Section title="Markers" icon={I.pin()} defaultOpen={true}>
      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <input value={mIn} onChange={e=>setMIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addM()} placeholder="Marker name..." className="s-input" style={IB}/>
        <button onClick={addM} disabled={!mIn.trim()} className="add-btn" style={!mIn.trim()?ABO:AB}>{I.plus()}</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {markers.map(m=>(
          <Accordion key={m.id} name={m.name} isOpen={openM.has(m.id)} onToggle={()=>togM(m.id)} onRemove={()=>setMarkers(p=>p.filter(x=>x.id!==m.id))}>
            <Sub>Appearance</Sub>
            <PointCtrl s={m.style} onChange={s=>updM(m.id,o=>({...o,style:s}))}/>
            <Sub>Label</Sub>
            <div style={{background:'rgba(255,255,255,0.03)',borderRadius:6,border:'1px solid rgba(255,255,255,0.05)',padding:'8px 10px',display:'flex',flexDirection:'column',gap:7}}>
              <LabelCtrl label={m.label} onChange={l=>updM(m.id,o=>({...o,label:l}))}/>
            </div>
            <Sub>Position</Sub>
            <div style={{background:'rgba(255,255,255,0.03)',borderRadius:6,border:'1px solid rgba(255,255,255,0.05)',padding:'8px 10px',display:'flex',flexDirection:'column',gap:7}}>
              <SliderRow label="Latitude" value={m.x} onChange={v=>updM(m.id,o=>({...o,x:v}))} min={43} max={48} step={0.01}/>
              <SliderRow label="Longitude" value={m.y} onChange={v=>updM(m.id,o=>({...o,y:v}))} min={22} max={30} step={0.01}/>
              <SliderRow label="Altitude" value={m.z} onChange={v=>updM(m.id,o=>({...o,z:v}))} min={0} max={2000} step={10}/>
            </div>
          </Accordion>
        ))}
        {markers.length===0 && <p style={{fontSize:11,color:T.muted,textAlign:'center',padding:'8px 0'}}>No markers yet.</p>}
      </div>
    </Section>
  )
}
