// CR-132 Design Review — Screen 6: Online Ordering (Before vs After)
import React, { useState } from 'react';

const C = { orange:'#F26B33', orangeLight:'#FDF0EB', green:'#329937', dark:'#1A1A2E', gray:'#6B7280', border:'#E5E7EB', bg:'#F7F7F7', white:'#FFFFFF' };

const NewBadge = () => <span style={{background:C.orangeLight,color:C.orange,border:`1px solid ${C.orange}30`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>NEW</span>;
const MovedBadge = ({from}) => <span style={{background:'#F0FFF4',color:'#059669',border:`1px solid #05966930`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>FROM {from}</span>;

const Card = ({title,desc,children,allNew,accent}) => (
  <div style={{background:C.white,border:`1.5px solid ${allNew||accent?C.orange+'55':C.border}`,borderRadius:12,marginBottom:16,overflow:'hidden',boxShadow:allNew||accent?`0 0 0 3px ${C.orange}10`:'0 1px 3px rgba(0,0,0,0.06)'}}>
    <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,background:allNew?C.orangeLight:C.white}}>
      <div style={{fontSize:14,fontWeight:700,color:C.dark}}>{title}{allNew&&<NewBadge/>}</div>
      {desc&&<div style={{fontSize:11,color:C.gray,marginTop:2}}>{desc}</div>}
    </div>
    <div style={{padding:'16px 20px'}}>{children}</div>
  </div>
);

const TRow = ({label,isNew,isMoved,movedFrom,hint,type='toggle',options,highlight}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${C.border}`,background:isNew&&highlight?C.orangeLight:'transparent',margin:isNew?'0 -20px':'0',padding:isNew?'8px 20px':'8px 0'}}>
    <div>
      <span style={{fontSize:12,fontWeight:600,color:C.dark}}>{label}</span>
      {isNew&&<NewBadge/>}
      {isMoved&&<MovedBadge from={movedFrom||'STEP 5'}/>}
      {hint&&<div style={{fontSize:10,color:C.gray,marginTop:1}}>{hint}</div>}
    </div>
    {type==='toggle'&&<div data-testid={`toggle-${label.toLowerCase().replace(/\s+/g,'-')}`} style={{width:36,height:20,borderRadius:10,background:C.green,position:'relative',flexShrink:0}}><div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,right:2}}/></div>}
    {type==='select'&&<select style={{fontSize:11,border:`1px solid ${C.border}`,borderRadius:6,padding:'3px 8px',flexShrink:0}}>{(options||[]).map(o=><option key={o}>{o}</option>)}</select>}
  </div>
);

const FakeInput = ({label,placeholder,isNew,isMoved,movedFrom,hint}) => (
  <div style={{marginBottom:10,padding:isNew||isMoved?'8px 12px':'0',background:isNew?C.orangeLight:isMoved?'#F0FFF4':'transparent',borderRadius:isNew||isMoved?8:0,border:isNew?`1px solid ${C.orange}30`:isMoved?`1px solid #05966930`:'none'}}>
    <label style={{fontSize:11,fontWeight:600,color:C.dark,display:'block',marginBottom:4}}>{label}{isNew&&<NewBadge/>}{isMoved&&<MovedBadge from={movedFrom||'STEP 5'}/>}</label>
    {hint&&<div style={{fontSize:10,color:C.gray,marginBottom:4}}>{hint}</div>}
    <input readOnly placeholder={placeholder} style={{width:'100%',fontSize:11,border:`1px solid ${C.border}`,borderRadius:6,padding:'6px 10px',color:C.gray,boxSizing:'border-box'}}/>
  </div>
);

const Grid2 = ({children}) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>{children}</div>;
const InfoBox = ({color,bg,text}) => <div style={{background:bg,border:`1px solid ${color}30`,borderRadius:8,padding:'8px 14px',marginBottom:16,fontSize:11,color,fontWeight:600}}>{text}</div>;

const NEW_STEPS = ['Basic Settings','⏸ Printer Setup','Channels & Info','Tax & Charges','Order & Kitchen','Online Ordering','Aggregator','Inventory','Room & Hospitality'];
const OLD_STEPS = ['Restaurant Identity','Channels & Payments','Charges & Tips','Order & Kitchen','Inventory & Extras','Owner Info'];

const Sidebar = ({steps,active,label}) => (
  <div style={{width:176,background:C.white,borderRight:`1px solid ${C.border}`,flexShrink:0,display:'flex',flexDirection:'column'}}>
    <div style={{padding:'12px 14px 8px',borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:9,fontWeight:700,color:C.orange,letterSpacing:1,marginBottom:2}}>{label}</div>
      <div style={{fontSize:12,fontWeight:800,color:C.dark}}>Restaurant Setup</div>
    </div>
    <div style={{padding:'8px 10px',flex:1,overflowY:'auto'}}>
      {steps.map((s,i)=>{
        const isActive=i===active, isDeferred=s.startsWith('⏸');
        return <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:7,marginBottom:2,background:isActive?C.orangeLight:'transparent',borderLeft:isActive?`3px solid ${C.orange}`:'3px solid transparent',opacity:isDeferred?0.45:1}}>
          <div style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,flexShrink:0,background:isActive?C.orange:C.border,color:isActive?'#fff':C.gray}}>{i+1}</div>
          <span style={{fontSize:10,fontWeight:isActive?700:500,color:isActive?C.orange:C.gray,lineHeight:1.3}}>{s.replace('⏸ ','')}{isDeferred?' (deferred)':''}</span>
        </div>;
      })}
    </div>
  </div>
);

const OldScreen = () => (
  <div style={{flex:1,overflowY:'auto',padding:'16px 20px 80px'}}>
    <InfoBox color="#6B7280" bg="#F9FAFB" text="Online Ordering had no dedicated screen in the old wizard — these fields were scattered across Step 4 (Order & Kitchen) and Step 5 (Inventory & Extras)."/>
    <Card title="From Step 4 — Order & Kitchen">
      <TRow label="Confirm Web Orders" hint="Manual confirmation for online orders"/>
      <TRow label="Show Scan Pop Up" hint="Scan popup on dashboard"/>
    </Card>
    <Card title="From Step 5 — Inventory & Extras">
      <FakeInput label="Online Ordering Link" placeholder="https://order.example.com" hint="Shared as a link for online orders"/>
    </Card>
  </div>
);

const NewScreen = ({highlight}) => (
  <div style={{flex:1,overflowY:'auto',padding:'16px 20px 80px'}}>
    <Card title="Confirm & Scan Orders" desc="How online orders are confirmed and scanned">
      <TRow label="Confirm Web Orders" isMoved movedFrom="STEP 4" hint="Require manual confirmation for online/web orders" highlight={highlight}/>
      <TRow label="Show Scan Pop Up" isMoved movedFrom="STEP 4" hint="Show scan popup on dashboard for QR orders" highlight={highlight}/>
    </Card>

    <Card title="Confirm Order Tone" desc="Audio feedback for incoming online orders" allNew>
      <TRow label="Confirm Order Tone" isNew type="select" options={['Default','Buzzer','Chime','Silent']} hint="Sound played when a new online order arrives" highlight={highlight}/>
      <TRow label="Show Confirm Order Tab" isNew hint="Show a dedicated confirmation tab in the order screen" highlight={highlight}/>
    </Card>

    <Card title="Online Ordering Link" desc="Direct order link for customers" accent>
      <FakeInput label="Online Ordering Link" isMoved movedFrom="STEP 5" placeholder="https://order.example.com" hint="Share this link for direct online ordering"/>
    </Card>
  </div>
);

export default function Screen6ComparisonPage() {
  const [highlight,setHighlight] = useState(true);
  return (
    <div style={{minHeight:'100vh',background:'#EAEAEA',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:C.dark,color:'#fff',padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><span style={{fontSize:11,color:'#aaa',marginRight:8}}>CR-132 Design Review</span><span style={{fontSize:14,fontWeight:700}}>Screen 6 — Online Ordering: Before vs After</span></div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#ccc',cursor:'pointer'}}><input data-testid="highlight-toggle" type="checkbox" checked={highlight} onChange={e=>setHighlight(e.target.checked)}/>Highlight NEW</label>
          <a href="/screen5-compare" style={{fontSize:11,color:'#aaa',textDecoration:'none'}}>← S5</a>
          <a href="/screen7-compare" style={{fontSize:11,color:C.orange,textDecoration:'none'}}>S7 →</a>
          <a href="/settings-preview" style={{fontSize:11,color:'#aaa',textDecoration:'none'}}>All</a>
        </div>
      </div>
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:'8px 24px',display:'flex',gap:20,alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:2,background:C.orangeLight,border:`1px solid ${C.orange}55`}}/><span style={{fontSize:11,color:C.gray}}>New field</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:2,background:'#F0FFF4',border:`1px solid #05966930`}}/><span style={{fontSize:11,color:C.gray}}>Consolidated from old steps</span></div>
        <div style={{marginLeft:'auto',fontSize:11,color:C.gray}}>OLD: scattered across 2 steps, 3 fields &nbsp;|&nbsp;<strong style={{color:C.orange}}>NEW: 3 sections, +2 new fields, 3 consolidated</strong></div>
      </div>
      <div style={{display:'flex',height:'calc(100vh - 88px)',gap:0}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',borderRight:'3px solid #ddd'}}>
          <div style={{background:'#4B5563',color:'#fff',padding:'8px 20px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,background:'#6B7280',padding:'2px 8px',borderRadius:99}}>CURRENT</span>
            <span style={{fontSize:13,fontWeight:600}}>Steps 4 + 5 (scattered)</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'#9CA3AF'}}>No dedicated screen</span>
          </div>
          <div style={{display:'flex',flex:1,overflow:'hidden',background:C.bg}}>
            <Sidebar steps={OLD_STEPS} active={3} label="OLD WIZARD"/>
            <OldScreen/>
          </div>
          <div style={{background:'#374151',padding:'8px 20px',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
            <button style={{background:C.green,color:'#fff',border:'none',borderRadius:8,padding:'7px 20px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Save & Continue →</button>
          </div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column'}}>
          <div style={{background:C.orange,color:'#fff',padding:'8px 20px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,background:'rgba(255,255,255,0.25)',padding:'2px 8px',borderRadius:99}}>PROPOSED</span>
            <span style={{fontSize:13,fontWeight:600}}>Screen 6: Online Ordering</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'rgba(255,255,255,0.75)'}}>3 cards · 9 steps total</span>
          </div>
          <div style={{display:'flex',flex:1,overflow:'hidden',background:C.bg}}>
            <Sidebar steps={NEW_STEPS} active={5} label="NEW WIZARD"/>
            <NewScreen highlight={highlight}/>
          </div>
          <div style={{background:'#fff',borderTop:`1px solid ${C.border}`,padding:'8px 20px',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
            <button data-testid="screen6-save-continue" style={{background:C.green,color:'#fff',border:'none',borderRadius:8,padding:'7px 20px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Save & Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
