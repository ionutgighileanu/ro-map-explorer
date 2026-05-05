import type { CSSProperties } from 'react'

export const T = {
  bg: '#1a1d2e',
  fg: '#f0f1f5',
  card: '#21243a',
  muted: '#9a9cb8',
  primary: '#00d4e8',
  glassBorder: 'rgba(255,255,255,0.12)',
  glass: 'rgba(22,25,42,0.78)',
  secondary: 'rgba(40,44,70,0.6)',
  inputBg: 'rgba(40,44,70,0.5)',
} as const

export const PRESETS = ['#00e5ff','#7c4dff','#ff4081','#76ff03','#ffab00','#2979ff','#ff6e40','#e040fb','#64ffda','#ffd740']

export const JUDETE = ["Alba","Arad","Arges","Bacau","Bihor","Bistrita-Nasaud","Botosani","Braila","Brasov","Bucuresti","Buzau","Calarasi","Caras-Severin","Cluj","Constanta","Covasna","Dambovita","Dolj","Galati","Giurgiu","Gorj","Harghita","Hunedoara","Ialomita","Iasi","Ilfov","Maramures","Mehedinti","Mures","Neamt","Olt","Prahova","Salaj","Satu Mare","Sibiu","Suceava","Teleorman","Timis","Tulcea","Valcea","Vaslui","Vrancea"]

export const IB: CSSProperties = {background:T.inputBg,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:T.fg,outline:'none',width:'100%'}
export const SI: CSSProperties = {...IB,paddingLeft:32}
export const AB: CSSProperties = {display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,minWidth:32,borderRadius:8,background:'rgba(0,212,232,0.12)',border:'none',color:T.primary,cursor:'pointer',flexShrink:0}
export const ABO: CSSProperties = {...AB,opacity:.35,cursor:'not-allowed'}
export const GP: CSSProperties = {background:T.glass,backdropFilter:'blur(24px) saturate(1.8)',WebkitBackdropFilter:'blur(24px) saturate(1.8)',border:`1px solid ${T.glassBorder}`}
export const FB = (active: boolean): CSSProperties => ({display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer',transition:'all .2s',border:active?'1px solid rgba(0,212,232,0.3)':`1px solid ${T.glassBorder}`,background:active?'rgba(0,212,232,0.12)':T.secondary,color:active?T.primary:T.muted})

export interface PointStyle {
  color: string
  size: number
  shadow: boolean
  shadowBlur: number
  shadowColor: string
  outlineOn: boolean
  outlineColor: string
  outlineW: number
}

export interface LabelStyle {
  enabled: boolean
  position: 'top' | 'bottom' | 'left' | 'right'
  bgColor: string
  textColor: string
  primary: string
  secondary: string
}

export interface LineStyle {
  color: string
  width: number
  shadow: boolean
  shadowBlur: number
  shadowColor: string
  outlineOn: boolean
  outlineColor: string
  outlineW: number
}

export const mkPt = (c = '#00e5ff'): PointStyle => ({color:c,size:12,shadow:false,shadowBlur:8,shadowColor:'#000000',outlineOn:false,outlineColor:'#ffffff',outlineW:2})
export const mkLabel = (): LabelStyle => ({enabled:false,position:'top',bgColor:'#00d4e8',textColor:'#ffffff',primary:'',secondary:''})
export const mkLn = (c = '#00e5ff'): LineStyle => ({color:c,width:3,shadow:false,shadowBlur:6,shadowColor:'#000000',outlineOn:false,outlineColor:'#000000',outlineW:1})

export const I = {
  map: (s=20)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3Z"/><path d="m9 4v13"/><path d="m15 7v13"/></svg>),
  bus: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>),
  route: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>),
  construction: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>),
  hex: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>),
  pin: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>),
  search: (s=14)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>),
  x: (s=14)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>),
  plus: (s=14)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>),
  minus: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>),
  chevron: (s=14)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>),
  grip: ()=>(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.3}}><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>),
  download: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>),
  layers: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/></svg>),
  sat: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13"/><path d="m17 11 4.3 4.3a2.41 2.41 0 0 1 0 3.4l-2.6 2.6a2.41 2.41 0 0 1-3.4 0L11 17"/><path d="m14 10 3-3"/><path d="m7 17 3-3"/><circle cx="12" cy="12" r="2"/></svg>),
  panelOpen: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>),
  panelClose: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>),
  logout: (s=16)=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>),
}
