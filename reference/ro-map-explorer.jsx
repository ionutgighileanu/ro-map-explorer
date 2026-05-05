import { useState, useRef, useEffect } from "react";

// --- Icons ---
const I = {
  map:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3Z"/><path d="m9 4v13"/><path d="m15 7v13"/></svg>,
  bus:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>,
  route:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  construction:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>,
  hex:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  pin:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  search:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  x:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  plus:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  minus:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>,
  chevron:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  grip:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.3}}><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>,
  download:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  layers:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/></svg>,
  sat:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13"/><path d="m17 11 4.3 4.3a2.41 2.41 0 0 1 0 3.4l-2.6 2.6a2.41 2.41 0 0 1-3.4 0L11 17"/><path d="m14 10 3-3"/><path d="m7 17 3-3"/><circle cx="12" cy="12" r="2"/></svg>,
  panelOpen:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>,
  panelClose:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>,
};

const T={bg:'#1a1d2e',fg:'#f0f1f5',card:'#21243a',muted:'#9a9cb8',primary:'#00d4e8',glassBorder:'rgba(255,255,255,0.12)',glass:'rgba(22,25,42,0.78)',secondary:'rgba(40,44,70,0.6)',inputBg:'rgba(40,44,70,0.5)'};
const PRESETS=['#00e5ff','#7c4dff','#ff4081','#76ff03','#ffab00','#2979ff','#ff6e40','#e040fb','#64ffda','#ffd740'];
const JUDETE=["Alba","Arad","Arges","Bacau","Bihor","Bistrita-Nasaud","Botosani","Braila","Brasov","Bucuresti","Buzau","Calarasi","Caras-Severin","Cluj","Constanta","Covasna","Dambovita","Dolj","Galati","Giurgiu","Gorj","Harghita","Hunedoara","Ialomita","Iasi","Ilfov","Maramures","Mehedinti","Mures","Neamt","Olt","Prahova","Salaj","Satu Mare","Sibiu","Suceava","Teleorman","Timis","Tulcea","Valcea","Vaslui","Vrancea"];

// --- HSV ---
const hexToRgb=h=>{const n=parseInt(h.replace('#',''),16);return[(n>>16)&255,(n>>8)&255,n&255];};
const rgbToHex=(r,g,b)=>'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
const rgbToHsv=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d+6)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;}return[h,mx?d/mx:0,mx];};
const hsvToRgb=(h,s,v)=>{const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return[Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];};

// --- Figma Color Picker ---
function ColorPicker({color,onChange,label}){
  const[open,setOpen]=useState(false);const ref=useRef(null),cvRef=useRef(null),dotRef=useRef(null);
  const[pos,setPos]=useState({top:0,left:0});
  const[h0,s0,v0]=rgbToHsv(...hexToRgb(color));
  const[hue,setHue]=useState(h0);const[sat,setSat]=useState(s0);const[val,setVal]=useState(v0);
  const[hexIn,setHexIn]=useState(color.replace('#','').toUpperCase());
  useEffect(()=>{const[r,g,b]=hexToRgb(color);const[h,s,v]=rgbToHsv(r,g,b);if(v>0&&s>0)setHue(h);setSat(s);setVal(v);setHexIn(color.replace('#','').toUpperCase());},[color]);
  const commit=(h,s,v)=>{const hex=rgbToHex(...hsvToRgb(h,s,v));onChange(hex);setHexIn(hex.replace('#','').toUpperCase());};
  useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target)&&dotRef.current&&!dotRef.current.contains(e.target))setOpen(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[open]);
  const openPicker=()=>{
    if(open){setOpen(false);return;}
    const r=dotRef.current?.getBoundingClientRect();
    if(r){
      const popH=230,popW=244;
      let top=r.bottom+6,left=r.left;
      if(top+popH>window.innerHeight)top=r.top-popH-6;
      if(left+popW>window.innerWidth)left=window.innerWidth-popW-8;
      if(left<4)left=4;
      setPos({top,left});
    }
    setOpen(true);
  };
  const mkDrag=fn=>e=>{e.preventDefault();fn(e);const mv=ev=>fn(ev);const up=()=>{window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up);};window.addEventListener('mousemove',mv);window.addEventListener('mouseup',up);};
  const svDrag=mkDrag(e=>{const t=e.touches?.[0]||e;const r=cvRef.current?.getBoundingClientRect();if(!r)return;const x=Math.max(0,Math.min(1,(t.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(t.clientY-r.top)/r.height));setSat(x);setVal(1-y);commit(hue,x,1-y);});
  const hueDrag=mkDrag(e=>{const t=e.touches?.[0]||e;const el=ref.current?.querySelector('[data-hue]');if(!el)return;const r=el.getBoundingClientRect();const x=Math.max(0,Math.min(1,(t.clientX-r.left)/r.width));setHue(x*360);commit(x*360,sat,val);});
  const hexSubmit=()=>{let v=hexIn.replace('#','').trim();if(v.length===3)v=v.split('').map(c=>c+c).join('');if(/^[0-9a-fA-F]{6}$/.test(v))onChange('#'+v.toLowerCase());else setHexIn(color.replace('#','').toUpperCase());};
  const pH=rgbToHex(...hsvToRgb(hue,1,1));
  return(
    <div style={{position:'relative',display:'flex',alignItems:'center',gap:6}}>
      <div ref={dotRef} onClick={openPicker} className="cdot" style={{width:14,height:14,borderRadius:6,background:color,border:'1px solid rgba(255,255,255,0.15)',cursor:'pointer',flexShrink:0}}/>
      {label&&<span style={{fontSize:12,color:T.fg,whiteSpace:'nowrap'}}>{label}</span>}
      {open&&<div ref={ref} style={{position:'fixed',top:pos.top,left:pos.left,zIndex:999999,background:'#2c2c2c',border:'1px solid #444',borderRadius:8,padding:12,width:244,boxShadow:'0 12px 40px rgba(0,0,0,.6)',display:'flex',flexDirection:'column',gap:10}}>
        <div ref={cvRef} onMouseDown={svDrag} style={{position:'relative',width:220,height:150,borderRadius:6,cursor:'crosshair',overflow:'hidden',border:'1px solid #555'}}>
          <div style={{position:'absolute',inset:0,background:pH}}/><div style={{position:'absolute',inset:0,background:'linear-gradient(to right,#fff,transparent)'}}/><div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent,#000)'}}/>
          <div style={{position:'absolute',left:`${sat*100}%`,top:`${(1-val)*100}%`,width:12,height:12,borderRadius:'50%',border:'2px solid #fff',boxShadow:'0 0 3px rgba(0,0,0,.5)',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
        </div>
        <div data-hue onMouseDown={hueDrag} style={{position:'relative',width:220,height:14,borderRadius:7,cursor:'pointer',background:'linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)'}}>
          <div style={{position:'absolute',left:`${(hue/360)*100}%`,top:'50%',width:14,height:14,borderRadius:'50%',border:'2px solid #fff',boxShadow:'0 0 3px rgba(0,0,0,.5)',transform:'translate(-50%,-50%)',background:pH,pointerEvents:'none'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:28,height:28,borderRadius:6,background:color,border:'1px solid #555',flexShrink:0}}/>
          <div className="hex-input" style={{display:'flex',alignItems:'center',background:'#3a3a3a',borderRadius:6,border:'1px solid #555',flex:1,overflow:'hidden'}}>
            <span style={{padding:'0 8px',fontSize:11,color:'#888',borderRight:'1px solid #555',lineHeight:'28px',userSelect:'none'}}>Hex</span>
            <input value={hexIn} onChange={e=>setHexIn(e.target.value.toUpperCase().replace(/[^0-9A-F]/g,'').slice(0,6))} onBlur={hexSubmit} onKeyDown={e=>e.key==='Enter'&&hexSubmit()} style={{background:'transparent',border:'none',outline:'none',color:'#eee',fontSize:12,padding:'0 8px',width:62,fontFamily:'monospace'}} maxLength={6}/>
          </div>
          <button onClick={async()=>{if(!window.EyeDropper)return;try{const r=await new window.EyeDropper().open();onChange(r.sRGBHex);setOpen(false);}catch{}}} title="Pick color from screen" className="eye-btn" style={{width:28,height:28,borderRadius:6,background:'#3a3a3a',border:'1px solid #555',display:'flex',alignItems:'center',justifyContent:'center',cursor:window.EyeDropper?'pointer':'not-allowed',opacity:window.EyeDropper?1:.4,flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9"/><path d="m15 6 3 3"/></svg>
          </button>
        </div>
      </div>}
    </div>
  );
}

// --- Shared UI ---
const IB={background:T.inputBg,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:T.fg,outline:'none',width:'100%'};
const SI={...IB,paddingLeft:32};
const AB={display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,minWidth:32,borderRadius:8,background:'rgba(0,212,232,0.12)',border:'none',color:T.primary,cursor:'pointer',flexShrink:0};
const ABO={...AB,opacity:.35,cursor:'not-allowed'};
const RB={background:'none',border:'none',cursor:'pointer',color:T.muted,padding:0,opacity:.4,transition:'opacity .15s'};
const GP={background:T.glass,backdropFilter:'blur(24px) saturate(1.8)',WebkitBackdropFilter:'blur(24px) saturate(1.8)',border:`1px solid ${T.glassBorder}`};
const FB=a=>({display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer',transition:'all .2s',border:a?'1px solid rgba(0,212,232,0.3)':`1px solid ${T.glassBorder}`,background:a?'rgba(0,212,232,0.12)':T.secondary,color:a?T.primary:T.muted});

function Section({title,icon,children,defaultOpen=false}){
  const[open,setOpen]=useState(defaultOpen);
  return(<div style={{borderBottom:`1px solid ${T.glassBorder}`}}>
    <button onClick={()=>setOpen(!open)} className="sec-btn" style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'14px 20px',background:'none',border:'none',cursor:'pointer',color:T.muted}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{color:T.primary}}>{icon}</span><span style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em'}}>{title}</span></div>
      <span style={{transition:'transform .2s',transform:open?'rotate(0)':'rotate(-90deg)',display:'flex'}}>{I.chevron()}</span>
    </button>{open&&<div style={{padding:'0 20px 16px'}}>{children}</div>}
  </div>);
}

function SliderRow({label,value,onChange,min=0,max=20,step=1}){
  return(<div style={{display:'flex',alignItems:'center',gap:8}}>
    <span style={{fontSize:10,color:T.muted,minWidth:55,whiteSpace:'nowrap'}}>{label}</span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} style={{flex:1,height:4,accentColor:T.primary,cursor:'pointer'}}/>
    <span style={{fontSize:10,color:T.muted,minWidth:22,textAlign:'right',fontFamily:'monospace'}}>{typeof value==='number'&&value%1!==0?value.toFixed(2):value}</span>
  </div>);
}

function Toggle({value,onChange,label}){
  return(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    <span style={{fontSize:10,color:T.muted}}>{label}</span>
    <div onClick={()=>onChange(!value)} className="tog-track" style={{width:28,height:16,borderRadius:8,background:value?T.primary:'#444',cursor:'pointer',position:'relative'}}>
      <div className="tog-thumb" style={{width:12,height:12,borderRadius:6,background:'#fff',position:'absolute',top:2,left:value?14:2}}/>
    </div>
  </div>);
}

// Subsection header with pill badge
function Sub({children}){return(
  <div style={{display:'flex',alignItems:'center',marginTop:4}}>
    <span style={{fontSize:11,color:T.primary,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',background:'rgba(0,212,232,0.12)',padding:'4px 10px',borderRadius:6}}>{children}</span>
  </div>
);}

// Filled/Shape mode toggle
function ModeToggle({mode,onChange}){
  return(<div style={{display:'flex',borderRadius:5,overflow:'hidden',border:`1px solid ${T.glassBorder}`,background:'rgba(40,44,70,0.5)',fontSize:9,fontWeight:500,flexShrink:0}}>
    {['filled','shape'].map(m=><button key={m} className="mode-btn" onClick={()=>onChange(m)} style={{padding:'2px 7px',background:mode===m?'rgba(0,212,232,0.15)':'none',color:mode===m?T.primary:T.muted,border:'none',cursor:'pointer',textTransform:'capitalize'}}>{m}</button>)}
  </div>);
}

function Accordion({name,isOpen,onToggle,onRemove,children,extra}){
  return(<div className="item-group" style={{background:T.secondary,borderRadius:8}}>
    <div className="acc-row" style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:isOpen?'8px 8px 0 0':'8px'}}>
      <button onClick={onToggle} style={{display:'flex',alignItems:'center',gap:8,flex:1,background:'none',border:'none',cursor:'pointer',color:T.fg,padding:0,minWidth:0}}>
        <span style={{transition:'transform .2s',transform:isOpen?'rotate(0)':'rotate(-90deg)',display:'flex',flexShrink:0}}>{I.chevron()}</span>
        <span style={{fontSize:12,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
      </button>
      {extra}
      {onRemove&&<button onClick={onRemove} className="rm-btn" style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:0}}>{I.x(12)}</button>}
    </div>
    {isOpen&&<div style={{padding:'0 10px 10px',borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:8,display:'flex',flexDirection:'column',gap:8}}>{children}</div>}
  </div>);
}

// Point style (marker / waypoint)
function PointCtrl({s,onChange}){const u=(k,v)=>onChange({...s,[k]:v});return(<>
  <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.color} onChange={c=>u('color',c)} label="Color"/></div>
  <SliderRow label="Size" value={s.size} onChange={v=>u('size',v)} min={1} max={100}/>
  <div style={{background:'rgba(255,255,255,0.03)',borderRadius:6,border:'1px solid rgba(255,255,255,0.05)',padding:'8px 10px',display:'flex',flexDirection:'column',gap:7}}>
    <Toggle label="Shadow" value={s.shadow} onChange={v=>u('shadow',v)}/>
    {s.shadow&&<><SliderRow label="Blur" value={s.shadowBlur} onChange={v=>u('shadowBlur',v)} min={0} max={30}/>
    <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.shadowColor} onChange={c=>u('shadowColor',c)} label="Color"/></div></>}
  </div>
  <div style={{background:'rgba(255,255,255,0.03)',borderRadius:6,border:'1px solid rgba(255,255,255,0.05)',padding:'8px 10px',display:'flex',flexDirection:'column',gap:7}}>
    <Toggle label="Outline" value={s.outlineOn} onChange={v=>u('outlineOn',v)}/>
    {s.outlineOn&&<><div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.outlineColor} onChange={c=>u('outlineColor',c)} label="Color"/></div>
    <SliderRow label="Thickness" value={s.outlineW} onChange={v=>u('outlineW',v)} min={1} max={10}/></>}
  </div>
</>);}

// Line style (route / road)
function LineCtrl({s,onChange}){const u=(k,v)=>onChange({...s,[k]:v});return(<>
  <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.color} onChange={c=>u('color',c)} label="Line Color"/></div>
  <SliderRow label="Width" value={s.width} onChange={v=>u('width',v)} min={1} max={12}/>
  <div style={{background:'rgba(255,255,255,0.03)',borderRadius:6,border:'1px solid rgba(255,255,255,0.05)',padding:'8px 10px',display:'flex',flexDirection:'column',gap:7}}>
    <Toggle label="Shadow" value={s.shadow} onChange={v=>u('shadow',v)}/>
    {s.shadow&&<><SliderRow label="Blur" value={s.shadowBlur} onChange={v=>u('shadowBlur',v)} min={0} max={20}/>
    <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.shadowColor} onChange={c=>u('shadowColor',c)} label="Color"/></div></>}
  </div>
  <div style={{background:'rgba(255,255,255,0.03)',borderRadius:6,border:'1px solid rgba(255,255,255,0.05)',padding:'8px 10px',display:'flex',flexDirection:'column',gap:7}}>
    <Toggle label="Outline" value={s.outlineOn} onChange={v=>u('outlineOn',v)}/>
    {s.outlineOn&&<><div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={s.outlineColor} onChange={c=>u('outlineColor',c)} label="Color"/></div>
    <SliderRow label="Thickness" value={s.outlineW} onChange={v=>u('outlineW',v)} min={1} max={8}/></>}
  </div>
</>);}

const mkPt=(c='#00e5ff')=>({color:c,size:12,shadow:false,shadowBlur:8,shadowColor:'#000000',outlineOn:false,outlineColor:'#ffffff',outlineW:2});
const mkLabel=()=>({enabled:false,position:'top',bgColor:'#00d4e8',textColor:'#ffffff',primary:'',secondary:''});
const mkLn=(c='#00e5ff')=>({color:c,width:3,shadow:false,shadowBlur:6,shadowColor:'#000000',outlineOn:false,outlineColor:'#000000',outlineW:1});

// Label controls for markers
function LabelCtrl({label,onChange}){
  const u=(k,v)=>onChange({...label,[k]:v});
  const positions=[{id:'top',name:'Top'},{id:'bottom',name:'Bottom'},{id:'left',name:'Left'},{id:'right',name:'Right'}];
  return(<>
    <Toggle label="Show Label" value={label.enabled} onChange={v=>u('enabled',v)}/>
    {label.enabled&&<>
      {/* Position selector */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:10,color:T.muted}}>Position</span>
        <div style={{display:'flex',borderRadius:6,overflow:'hidden',border:`1px solid ${T.glassBorder}`,background:'rgba(40,44,70,0.5)'}}>
          {positions.map(p=><button key={p.id} className="mode-btn" onClick={()=>u('position',p.id)} style={{padding:'3px 8px',fontSize:10,fontWeight:500,background:label.position===p.id?'rgba(0,212,232,0.15)':'none',color:label.position===p.id?T.primary:T.muted,border:'none',cursor:'pointer'}}>{p.name}</button>)}
        </div>
      </div>
      {/* Colors */}
      <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={label.bgColor} onChange={c=>u('bgColor',c)} label="Background"/></div>
      <div style={{display:'flex',alignItems:'center',gap:8}}><ColorPicker color={label.textColor} onChange={c=>u('textColor',c)} label="Text Color"/></div>
      {/* Primary text */}
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        <span style={{fontSize:10,color:T.muted}}>Primary Text</span>
        <input className="s-input" value={label.primary} onChange={e=>u('primary',e.target.value)} placeholder="e.g. România" style={{...IB,padding:'6px 10px',fontSize:11}}/>
      </div>
      {/* Secondary text */}
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        <span style={{fontSize:10,color:T.muted}}>Secondary Text</span>
        <input className="s-input" value={label.secondary} onChange={e=>u('secondary',e.target.value)} placeholder="e.g. 1%" style={{...IB,padding:'6px 10px',fontSize:11}}/>
      </div>
    </>}
  </>);
}

// --- Fake Map ---
function FakeMap({mapStyle}){
  const bg={dark:'linear-gradient(135deg,#0d1117,#161b22 30%,#1a2233 60%,#0d1117)',satellite:'linear-gradient(135deg,#1a3a2a,#2d4a3a 30%,#1a3a2a 60%,#0d2a1a)'};
  return(<div style={{position:'absolute',inset:0,background:bg[mapStyle]||bg.dark,overflow:'hidden'}}>
    <svg width="100%" height="100%" style={{position:'absolute',inset:0,opacity:.06}}>{Array.from({length:30},(_,i)=><line key={`h${i}`} x1="0" y1={i*40} x2="2000" y2={i*40} stroke="#fff" strokeWidth=".5"/>)}{Array.from({length:50},(_,i)=><line key={`v${i}`} x1={i*40} y1="0" x2={i*40} y2="2000" stroke="#fff" strokeWidth=".5"/>)}</svg>
    <svg viewBox="0 0 600 400" style={{position:'absolute',top:'15%',left:'35%',width:'55%',height:'70%',opacity:.12}}><path d="M120,80 L180,40 L260,30 L340,50 L400,40 L450,80 L480,130 L500,180 L480,240 L440,280 L380,310 L300,330 L220,320 L160,290 L120,240 L100,180 L110,130 Z" fill="none" stroke={T.primary} strokeWidth="2"/></svg>
    <div style={{position:'absolute',top:'52%',left:'62%',transform:'translate(-50%,-50%)'}}><div style={{width:8,height:8,borderRadius:'50%',background:T.primary,boxShadow:`0 0 12px ${T.primary}`,animation:'pulse 2s infinite'}}/><span style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',fontSize:10,color:T.muted,whiteSpace:'nowrap'}}>București</span></div>
    <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.4)}}`}</style>
  </div>);
}

// ========== MAIN ==========
export default function App(){
  const[collapsed,setCollapsed]=useState(false);
  const[mapStyle,setMapStyle]=useState("dark");
  const[placeLabels,setPlaceLabels]=useState(true);
  const useToggleSet=()=>{const[s,set]=useState(new Set());return[s,id=>set(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;})];};

  // MARKERS
  const[mIn,setMIn]=useState("");
  const[markers,setMarkers]=useState([{id:'m1',name:'Home',style:mkPt(),label:mkLabel(),x:44.43,y:26.10,z:0}]);
  const[openM,togM]=useToggleSet();
  const addM=()=>{if(!mIn.trim())return;const m={id:Date.now().toString(),name:mIn.trim(),style:mkPt(PRESETS[markers.length%PRESETS.length]),label:mkLabel(),x:44.43,y:26.10,z:0};setMarkers(p=>[...p,m]);setMIn("");togM(m.id);};
  const updM=(id,fn)=>setMarkers(p=>p.map(m=>m.id===id?fn(m):m));

  // STB
  const[sIn,setSIn]=useState("");
  const[stb,setStb]=useState([{id:'s1',line:'41',style:mkLn('#00e5ff')},{id:'s2',line:'205',style:mkLn('#7c4dff')},{id:'s3',line:'Tram 1',style:mkLn('#ff4081')}]);
  const[openS,togS]=useToggleSet();
  const addS=()=>{if(!sIn.trim())return;const r={id:Date.now().toString(),line:sIn.trim(),style:mkLn(PRESETS[stb.length%PRESETS.length])};setStb(p=>[...p,r]);setSIn("");togS(r.id);};

  // ROUTE PLANNER
  const[wIn,setWIn]=useState("");
  const[wps,setWps]=useState([{id:'w1',name:'Bucharest',style:mkPt('#00e5ff')},{id:'w2',name:'Pitesti',style:mkPt('#7c4dff')}]);
  const[openW,togW]=useToggleSet();
  const addW=()=>{if(!wIn .trim()||wps.length>=25)return;const w={id:Date.now().toString(),name:wIn.trim(),style:mkPt(PRESETS[wps.length%PRESETS.length])};setWps(p=>[...p,w]);setWIn("");};
  const[rStyle,setRStyle]=useState(mkLn('#00e5ff'));
  const[rOpen,setROpen]=useState(false);

  // INFRASTRUCTURE
  const[rdIn,setRdIn]=useState("");
  const[roads,setRoads]=useState([{id:'r1',name:'A1 (Pitesti - Sibiu)',style:mkLn('#76ff03')},{id:'r2',name:'DN1 (Bucuresti - Brasov)',style:mkLn('#ffab00')},{id:'r3',name:'E81',style:mkLn('#2979ff')}]);
  const[openR,togR]=useToggleSet();
  const addR=()=>{if(!rdIn .trim())return;const r={id:Date.now().toString(),name:rdIn.trim(),style:mkLn(PRESETS[(roads.length+3)%PRESETS.length])};setRoads(p=>[...p,r]);setRdIn("");togR(r.id);};

  // BORDERS
  const[cIn,setCIn]=useState("");
  const[countries,setCountries]=useState([]);
  const[openC,togC]=useToggleSet();
  const[openBCountries,setOpenBCountries]=useState(false);
  const[openBJudete,setOpenBJudete]=useState(false);
  const[openBBuc,setOpenBBuc]=useState(false);
  const addC=()=>{const n=cIn.trim();if(!n||countries.some(c=>c.name.toLowerCase()===n.toLowerCase()))return;const c={id:Date.now().toString(),name:n,color:'#00e5ff',mode:'filled'};setCountries(p=>[...p,c]);setCIn("");togC(c.id);};
  const[selJ,setSelJ]=useState("");const[jCol,setJCol]=useState("#76ff03");
  const[judete,setJudete]=useState([]);
  const avJ=JUDETE.filter(j=>!judete.some(jj=>jj.name===j));
  const addJ=()=>{if(!selJ)return;setJudete(p=>[...p,{id:Date.now().toString(),name:selJ,color:jCol,mode:'filled'}]);setSelJ("");};
  const allJ=()=>{const e=new Set(judete.map(j=>j.name));setJudete(p=>[...p,...JUDETE.filter(j=>!e.has(j)).map(n=>({id:`${Date.now()}-${n}`,name:n,color:'#76ff03',mode:'filled'}))]);};

  // BUCHAREST
  const SECTORS=['Sector 1','Sector 2','Sector 3','Sector 4','Sector 5','Sector 6'];
  const[bucFull,setBucFull]=useState({enabled:false,color:'#00e5ff',mode:'filled'});
  const[openSec,setOpenSec]=useState(false);
  const[sectors,setSectors]=useState(SECTORS.map((s,i)=>({id:`sec${i+1}`,name:s,enabled:false,color:PRESETS[i%PRESETS.length],mode:'filled'})));
  const toggleSector=(id)=>setSectors(p=>p.map(s=>s.id===id?{...s,enabled:!s.enabled}:s));
  const selectAllSectors=()=>setSectors(p=>p.map(s=>({...s,enabled:true})));
  const deselectAllSectors=()=>setSectors(p=>p.map(s=>({...s,enabled:false})));

  const nav=[{icon:I.pin(),l:'Markers'},{icon:I.bus(),l:'STB Routes'},{icon:I.route(),l:'Route Planner'},{icon:I.construction(),l:'Infrastructure'},{icon:I.hex(),l:'Borders'}];

  return(
    <div style={{position:'relative',width:'100%',height:'100vh',overflow:'hidden',fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",color:T.fg,background:T.bg}}>
      <FakeMap mapStyle={mapStyle}/>

      {collapsed&&<aside style={{position:'fixed',top:0,left:0,zIndex:20,height:'100%',width:56,...GP,display:'flex',flexDirection:'column',alignItems:'center',padding:'16px 0',gap:4,boxShadow:'4px 0 30px rgba(0,0,0,.4)'}}>
        <button onClick={()=>setCollapsed(false)} className="panel-btn" style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:'none',border:'none',color:T.fg,cursor:'pointer',marginBottom:16}}>{I.panelOpen()}</button>
        {nav.map((n,i)=><button key={i} onClick={()=>setCollapsed(false)} title={n.l} className="nav-btn" style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:'none',border:'none',color:T.muted,cursor:'pointer'}}>{n.icon}</button>)}
        <div style={{flex:1}}/>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,borderTop:`1px solid ${T.glassBorder}`,paddingTop:12}}>
          <button style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:'none',border:'none',color:T.muted,cursor:'pointer'}} className="nav-btn">{I.download()}</button>
          {[['dark',I.layers()],['satellite',I.sat()]].map(([id,ic])=><button key={id} onClick={()=>setMapStyle(id)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:mapStyle===id?'rgba(0,212,232,0.15)':'none',border:'none',color:mapStyle===id?T.primary:T.muted,cursor:'pointer'}} className="nav-btn">{ic}</button>)}
        </div>
        <div style={{display:'flex',flexDirection:'column',width:36,borderRadius:8,overflow:'hidden',border:`1px solid ${T.glassBorder}`,background:T.secondary,margin:'8px 0'}}>
          <button style={{display:'flex',alignItems:'center',justifyContent:'center',height:36,background:'none',border:'none',borderBottom:`1px solid ${T.glassBorder}`,color:T.muted,cursor:'pointer'}} className="zm-btn">{I.plus(16)}</button>
          <button style={{display:'flex',alignItems:'center',justifyContent:'center',height:36,background:'none',border:'none',color:T.muted,cursor:'pointer'}} className="zm-btn">{I.minus()}</button>
        </div>
      </aside>}

      <aside style={{position:'fixed',top:0,left:0,zIndex:20,height:'100%',width:340,transition:'transform .3s ease,opacity .3s ease',transform:collapsed?'translateX(-100%)':'translateX(0)',opacity:collapsed?0:1,pointerEvents:collapsed?'none':'auto'}}>
        <div style={{height:'100%',...GP,borderRadius:'0 16px 16px 0',display:'flex',flexDirection:'column',boxShadow:'4px 0 30px rgba(0,0,0,.4)'}}>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingRight:12,borderBottom:`1px solid ${T.glassBorder}`}}>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'20px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:8,background:'rgba(0,212,232,0.12)',color:T.primary}}>{I.map()}</div>
              <div><h1 style={{fontSize:16,fontWeight:600,margin:0}}>RO-MAP Explorer</h1><p style={{fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:'.06em',margin:0}}>GIS Dashboard</p></div>
            </div>
            <button onClick={()=>setCollapsed(true)} className="panel-btn" style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:8,background:'none',border:'none',color:T.muted,cursor:'pointer'}}>{I.panelClose()}</button>
          </div>

          <div style={{flex:1,overflowY:'auto',overflowX:'visible'}} className="sb-scroll">

            {/* MARKERS */}
            <Section title="Markers" icon={I.pin()} defaultOpen={true}>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <input value={mIn} onChange={e=>setMIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addM()} placeholder="Marker name..." className="s-input" style={IB}/>
                <button onClick={addM} disabled={!mIn.trim()} className="add-btn" style={!mIn.trim()?ABO:AB}>{I.plus()}</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {markers.map(m=><Accordion key={m.id} name={m.name} isOpen={openM.has(m.id)} onToggle={()=>togM(m.id)} onRemove={()=>setMarkers(p=>p.filter(x=>x.id!==m.id))}>
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
                </Accordion>)}
                {markers.length===0&&<p style={{fontSize:11,color:T.muted,textAlign:'center',padding:'8px 0'}}>No markers yet.</p>}
              </div>
            </Section>

            {/* STB ROUTES */}
            <Section title="STB Routes" icon={I.bus()}>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <div style={{position:'relative',flex:1}}><div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.muted}}>{I.search()}</div>
                <input value={sIn} onChange={e=>setSIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addS()} placeholder="Line number (e.g. 41, 205)" className="s-input" style={SI}/></div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {stb.map(r=><Accordion key={r.id} name={`Line ${r.line}`} isOpen={openS.has(r.id)} onToggle={()=>togS(r.id)} onRemove={()=>setStb(p=>p.filter(x=>x.id!==r.id))}>
                  <LineCtrl s={r.style} onChange={s=>setStb(p=>p.map(x=>x.id===r.id?{...x,style:s}:x))}/>
                </Accordion>)}
                {stb.length===0&&<p style={{fontSize:11,color:T.muted,textAlign:'center',padding:'8px 0'}}>No active routes.</p>}
              </div>
            </Section>

            {/* ROUTE PLANNER */}
            <Section title="Route Planner" icon={I.route()}>
              <div style={{marginBottom:10}}>
                <Accordion name="Route Line Settings" isOpen={rOpen} onToggle={()=>setROpen(!rOpen)} onRemove={()=>setRStyle(mkLn())}>
                  <LineCtrl s={rStyle} onChange={setRStyle}/>
                </Accordion>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:4}}>
                <input value={wIn} onChange={e=>setWIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addW()} placeholder="Add waypoint..." className="s-input" style={IB}/>
                <button onClick={addW} disabled={!wIn.trim()||wps.length>=25} className="add-btn" style={!wIn.trim()||wps.length>=25?ABO:AB}>{I.plus()}</button>
              </div>
              <p style={{fontSize:10,color:T.muted,marginBottom:10}}>{wps.length}/25 waypoints</p>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {wps.map((w,i)=><Accordion key={w.id} name={`${i+1}. ${w.name}`} isOpen={openW.has(w.id)} onToggle={()=>togW(w.id)} onRemove={()=>setWps(p=>p.filter(x=>x.id!==w.id))}>
                  <PointCtrl s={w.style} onChange={s=>setWps(p=>p.map(x=>x.id===w.id?{...x,style:s}:x))}/>
                </Accordion>)}
              </div>
              <button disabled={wps.length<2} style={{width:'100%',marginTop:10,background:'rgba(0,212,232,0.12)',color:T.primary,border:'1px solid rgba(0,212,232,0.2)',borderRadius:8,padding:'8px 0',fontSize:12,fontWeight:500,cursor:wps.length<2?'not-allowed':'pointer',opacity:wps.length<2?.4:1}} className="act-btn">Calculate Route</button>
            </Section>

            {/* INFRASTRUCTURE */}
            <Section title="Infrastructure" icon={I.construction()}>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <div style={{position:'relative',flex:1}}><div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.muted}}>{I.search()}</div>
                <input value={rdIn} onChange={e=>setRdIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addR()} placeholder="Road ID (A, DN, E, DJ...)" className="s-input" style={SI}/></div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {roads.map(r=><Accordion key={r.id} name={r.name} isOpen={openR.has(r.id)} onToggle={()=>togR(r.id)} onRemove={()=>setRoads(p=>p.filter(x=>x.id!==r.id))}>
                  <LineCtrl s={r.style} onChange={s=>setRoads(p=>p.map(x=>x.id===r.id?{...x,style:s}:x))}/>
                </Accordion>)}
                {roads.length===0&&<p style={{fontSize:11,color:T.muted,textAlign:'center',padding:'8px 0'}}>No highlighted roads.</p>}
              </div>
            </Section>

            {/* BORDERS */}
            <Section title="Borders" icon={I.hex()}>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {/* Countries */}
                <Accordion name={`Countries${countries.length?` (${countries.length})`:''}`} isOpen={openBCountries} onToggle={()=>setOpenBCountries(!openBCountries)}>
                  <div style={{display:'flex',gap:8,marginBottom:6}}>
                    <input value={cIn} onChange={e=>setCIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addC()} placeholder="Search country..." className="s-input" style={IB}/>
                    <button onClick={addC} disabled={!cIn.trim()} className="add-btn" style={!cIn.trim()?ABO:AB}>{I.plus()}</button>
                  </div>
                  {countries.length>0&&<div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {countries.map(c=><Accordion key={c.id} name={c.name} isOpen={openC.has(c.id)} onToggle={()=>togC(c.id)} onRemove={()=>setCountries(p=>p.filter(x=>x.id!==c.id))}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{display:'flex',borderRadius:6,overflow:'hidden',border:`1px solid ${T.glassBorder}`,background:'rgba(40,44,70,0.5)',fontSize:10,fontWeight:500}}>
                          {['filled','shape'].map(m=><button key={m} onClick={()=>setCountries(p=>p.map(x=>x.id===c.id?{...x,mode:m}:x))} style={{padding:'4px 10px',background:c.mode===m?'rgba(0,212,232,0.15)':'none',color:c.mode===m?T.primary:T.muted,border:'none',cursor:'pointer',textTransform:'capitalize'}} className="mode-btn">{m}</button>)}
                        </div>
                        <ColorPicker color={c.color} onChange={cl=>setCountries(p=>p.map(x=>x.id===c.id?{...x,color:cl}:x))} label={c.mode==='filled'?'Fill':'Line'}/>
                      </div>
                    </Accordion>)}
                  </div>}
                </Accordion>

                {/* Jud.RO */}
                <Accordion name={`Jud.RO${judete.length?` (${judete.length}/42)`:''}`} isOpen={openBJudete} onToggle={()=>setOpenBJudete(!openBJudete)}
                  extra={avJ.length===0
                    ?<button onClick={e=>{e.stopPropagation();setJudete([])}} style={{fontSize:10,background:'rgba(255,75,75,0.12)',color:'#ff4b4b',border:'none',padding:'4px 8px',borderRadius:6,cursor:'pointer'}} className="sel-all">Deselect All</button>
                    :<button onClick={e=>{e.stopPropagation();allJ()}} style={{fontSize:10,background:'rgba(0,212,232,0.12)',color:T.primary,border:'none',padding:'4px 8px',borderRadius:6,cursor:'pointer'}} className="sel-all">Select All</button>
                  }>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                    <select value={selJ} onChange={e=>setSelJ(e.target.value)} style={{flex:1,background:T.inputBg,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:T.fg,outline:'none',cursor:'pointer'}} className="s-select">
                      <option value="">Select county...</option>{avJ.map(j=><option key={j} value={j}>{j}</option>)}
                    </select>
                    <ColorPicker color={jCol} onChange={setJCol}/>
                    <button onClick={addJ} disabled={!selJ} className="add-btn" style={!selJ?ABO:AB}>{I.plus()}</button>
                  </div>
                  {judete.length>0&&<div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:200,overflowY:'auto'}}>
                    {judete.map(j=><div key={j.id} className="item-group j-row" style={{display:'flex',alignItems:'center',gap:6,background:T.secondary,borderRadius:8,padding:'6px 8px'}}>
                      <ColorPicker color={j.color} onChange={c=>setJudete(p=>p.map(x=>x.id===j.id?{...x,color:c}:x))}/>
                      <span style={{fontSize:12,flex:1}}>{j.name}</span>
                      <ModeToggle mode={j.mode||'filled'} onChange={m=>setJudete(p=>p.map(x=>x.id===j.id?{...x,mode:m}:x))}/>
                      <button onClick={()=>setJudete(p=>p.filter(x=>x.id!==j.id))} className="rm-btn" style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:0}}>{I.x(12)}</button>
                    </div>)}
                  </div>}
                </Accordion>

                {/* București */}
                <Accordion name={`București${bucFull.enabled||sectors.some(s=>s.enabled)?` (${(bucFull.enabled?1:0)+sectors.filter(s=>s.enabled).length})`:''}`} isOpen={openBBuc} onToggle={()=>setOpenBBuc(!openBBuc)}
                  extra={sectors.every(s=>s.enabled)
                    ?<button onClick={e=>{e.stopPropagation();deselectAllSectors()}} style={{fontSize:10,background:'rgba(255,75,75,0.12)',color:'#ff4b4b',border:'none',padding:'4px 8px',borderRadius:6,cursor:'pointer'}} className="sel-all">Deselect All</button>
                    :<button onClick={e=>{e.stopPropagation();selectAllSectors()}} style={{fontSize:10,background:'rgba(0,212,232,0.12)',color:T.primary,border:'none',padding:'4px 8px',borderRadius:6,cursor:'pointer'}} className="sel-all">Select All</button>
                  }>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {/* Full mode */}
                    <div className="item-group j-row" style={{display:'flex',alignItems:'center',gap:6,background:bucFull.enabled?'rgba(0,212,232,0.08)':T.secondary,borderRadius:8,padding:'8px 10px',border:bucFull.enabled?'1px solid rgba(0,212,232,0.2)':'1px solid transparent',transition:'all .2s'}}>
                      <Toggle label="" value={bucFull.enabled} onChange={v=>setBucFull(p=>({...p,enabled:v}))}/>
                      <span style={{fontSize:12,fontWeight:500,flex:1}}>Full</span>
                      <ModeToggle mode={bucFull.mode} onChange={m=>setBucFull(p=>({...p,mode:m}))}/>
                      <ColorPicker color={bucFull.color} onChange={c=>setBucFull(p=>({...p,color:c}))}/>
                    </div>

                    {/* Sectors accordion */}
                    <Accordion name={`Sectoare (${sectors.filter(s=>s.enabled).length}/6)`} isOpen={openSec} onToggle={()=>setOpenSec(!openSec)} onRemove={deselectAllSectors}>
                      <div style={{display:'flex',flexDirection:'column',gap:4}}>
                        {sectors.map(s=>(
                          <div key={s.id} className="item-group j-row" style={{display:'flex',alignItems:'center',gap:6,background:s.enabled?'rgba(0,212,232,0.08)':T.secondary,borderRadius:8,padding:'8px 10px',border:s.enabled?'1px solid rgba(0,212,232,0.2)':'1px solid transparent',transition:'all .2s'}}>
                            <Toggle label="" value={s.enabled} onChange={()=>toggleSector(s.id)}/>
                            <span style={{fontSize:12,flex:1,fontWeight:s.enabled?500:400,color:s.enabled?T.fg:T.muted,transition:'all .2s'}}>{s.name}</span>
                            <ModeToggle mode={s.mode} onChange={m=>setSectors(p=>p.map(x=>x.id===s.id?{...x,mode:m}:x))}/>
                            <ColorPicker color={s.color} onChange={c=>setSectors(p=>p.map(x=>x.id===s.id?{...x,color:c}:x))}/>
                          </div>
                        ))}
                      </div>
                    </Accordion>
                  </div>
                </Accordion>
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div style={{flexShrink:0,padding:'12px 16px',borderTop:`1px solid ${T.glassBorder}`,display:'flex',flexDirection:'column',gap:4}}>
            <button className="exp-btn" style={FB(false)}>{I.download()}<span>Export</span></button>
            <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:`1px solid ${T.glassBorder}`,background:T.secondary}}>
              <button style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:36,background:'none',border:'none',borderRight:`1px solid ${T.glassBorder}`,color:T.muted,cursor:'pointer'}} className="zm-btn">{I.plus(16)}</button>
              <button style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:36,background:'none',border:'none',color:T.muted,cursor:'pointer'}} className="zm-btn">{I.minus()}</button>
            </div>
            <div style={{height:1,background:T.glassBorder,margin:'6px 0'}}/>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 12px',background:T.secondary,borderRadius:8,border:`1px solid ${T.glassBorder}`}}>
                <span style={{fontSize:12,fontWeight:500,color:placeLabels?T.fg:T.muted,transition:'color .2s'}}>Place Labels</span>
                <Toggle label="" value={placeLabels} onChange={setPlaceLabels}/>
              </div>
              <button onClick={()=>setMapStyle('dark')} className="ft-btn" style={FB(mapStyle==='dark')}>{I.layers()}<span>Standard</span></button>
              <button onClick={()=>setMapStyle('satellite')} className="ft-btn" style={FB(mapStyle==='satellite')}>{I.sat()}<span>Satellite</span></button>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        .sb-scroll::-webkit-scrollbar{width:4px}
        .sb-scroll::-webkit-scrollbar-track{background:transparent}
        .sb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px}
        .sb-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.25)}

        /* transitions on everything */
        .tr{transition:all .2s ease}

        /* nav icon buttons */
        .nav-btn{transition:all .2s ease}
        .nav-btn:hover{background:rgba(40,44,70,0.5)!important;color:#00d4e8!important}

        /* section header hover */
        .sec-btn{transition:all .2s ease}
        .sec-btn:hover{background:rgba(40,44,70,0.35)!important}

        /* remove buttons - hidden until parent hover */
        .item-group .rm-btn{opacity:0;transition:opacity .15s ease,color .15s ease}
        .item-group:hover .rm-btn{opacity:1}
        .rm-btn:hover{color:#ff4081!important}

        /* accordion row hover */
        .acc-row{transition:background .2s ease}
        .acc-row:hover{background:rgba(40,44,70,0.8)!important}

        /* add buttons */
        .add-btn{transition:all .2s ease}
        .add-btn:hover:not(:disabled){background:rgba(0,212,232,0.25)!important;transform:scale(1.05)}
        .add-btn:active:not(:disabled){transform:scale(0.95)}

        /* color dot */
        .cdot{transition:transform .15s ease,box-shadow .15s ease}
        .cdot:hover{transform:scale(1.25);box-shadow:0 0 8px rgba(255,255,255,0.2)}

        /* input focus */
        .s-input{transition:all .2s ease}
        .s-input:focus{box-shadow:0 0 0 1px rgba(0,212,232,0.5)!important;border-color:rgba(0,212,232,0.4)!important}

        /* footer style buttons */
        .ft-btn{transition:all .2s ease}
        .ft-btn:hover{background:rgba(0,212,232,0.18)!important;color:#00d4e8!important;border-color:rgba(0,212,232,0.3)!important}

        /* zoom buttons */
        .zm-btn{transition:all .2s ease}
        .zm-btn:hover{background:#00d4e8!important;color:#1a1d2e!important}

        /* collapse/panel buttons */
        .panel-btn{transition:all .2s ease}
        .panel-btn:hover{background:rgba(40,44,70,0.5)!important;color:#f0f1f5!important}

        /* toggle hover */
        .tog-track{transition:background .2s ease}
        .tog-track:hover{filter:brightness(1.2)}
        .tog-thumb{transition:left .2s ease}

        /* slider thumb glow on hover */
        input[type="range"]{transition:all .15s ease}
        input[type="range"]:hover{filter:brightness(1.15)}
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#00d4e8;border:2px solid #1a1d2e;cursor:pointer;box-shadow:0 0 6px rgba(0,212,232,0.5);transition:box-shadow .2s ease,transform .15s ease}
        input[type="range"]::-webkit-slider-thumb:hover{box-shadow:0 0 10px rgba(0,212,232,0.8);transform:scale(1.15)}

        /* action button (calculate route) */
        .act-btn{transition:all .2s ease}
        .act-btn:hover:not(:disabled){background:rgba(0,212,232,0.22)!important;border-color:rgba(0,212,232,0.4)!important;box-shadow:0 0 12px rgba(0,212,232,0.15)}
        .act-btn:active:not(:disabled){transform:scale(0.98)}

        /* select all button */
        .sel-all{transition:all .2s ease}
        .sel-all:hover:not(:disabled){background:rgba(0,212,232,0.25)!important}

        /* mode toggle buttons (filled/shape) */
        .mode-btn{transition:all .15s ease}
        .mode-btn:hover{background:rgba(0,212,232,0.1)!important;color:#00d4e8!important}

        /* select dropdown */
        .s-select{transition:all .2s ease}
        .s-select:focus{box-shadow:0 0 0 1px rgba(0,212,232,0.5)!important;border-color:rgba(0,212,232,0.4)!important}
        .s-select:hover{border-color:rgba(255,255,255,0.2)!important}

        /* judet row */
        .j-row{transition:background .15s ease}
        .j-row:hover{background:rgba(40,44,70,0.8)!important}

        /* export btn special */
        .exp-btn{transition:all .2s ease}
        .exp-btn:hover{background:rgba(0,212,232,0.18)!important;color:#00d4e8!important;border-color:rgba(0,212,232,0.3)!important}

        /* eyedropper btn */
        .eye-btn{transition:all .15s ease}
        .eye-btn:hover{background:#505050!important;border-color:#666!important}

        /* color picker hex input */
        .hex-input{transition:border-color .2s ease}
        .hex-input:focus-within{border-color:#00d4e8!important}
      `}</style>
    </div>
  );
}
